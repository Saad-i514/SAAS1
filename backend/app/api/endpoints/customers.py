"""Customer Master List endpoint.

Manages the Customer table, wires up credit/ledger tracking, and records
payment history. Customers can be linked to transactions via customer_id.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.api import deps
from app.utils import utc_date_to_local
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _audit(
    db: Session,
    user: models.User,
    action: str,
    resource_type: str,
    resource_id: str,
    description: str,
    request: Optional[Request] = None,
):
    """Helper to write an audit log entry."""
    ip = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else None
    log = models.AuditLog(
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        description=description,
        ip_address=ip,
    )
    db.add(log)


# ── Import customers from existing transactions ───────────────────────────────

@router.post("/import-from-transactions")
def import_customers_from_transactions(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Safe, read-only import: scans all existing transaction customer_name values
    and creates Customer records for any that don't already exist.
    Existing customers and ALL transaction data are never modified.
    """
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can import customers")

    company_id = current_user.company_id
    if company_id is None:
        raise HTTPException(status_code=400, detail="No company associated with this account")

    # Get all distinct non-empty customer names from transactions
    rows = (
        db.query(models.Transaction.customer_name)
        .filter(
            models.Transaction.company_id == company_id,
            models.Transaction.customer_name.isnot(None),
            models.Transaction.customer_name != "",
        )
        .distinct()
        .all()
    )

    names = [r[0].strip() for r in rows if r[0] and r[0].strip()]

    # Get names that already exist in customers table (case-insensitive)
    existing = db.query(models.Customer.name).filter(
        models.Customer.company_id == company_id
    ).all()
    existing_lower = {e[0].lower() for e in existing}

    created = []
    skipped = []

    for name in names:
        if name.lower() in existing_lower:
            skipped.append(name)
            continue

        # Calculate totals from existing transactions (read-only)
        total_purchased = db.query(func.sum(models.Transaction.debit)).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.customer_name.ilike(name),
            models.Transaction.type == models.TransactionTypeEnum.SALE,
        ).scalar() or 0.0

        total_paid = db.query(func.sum(models.Transaction.debit)).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.customer_name.ilike(name),
            models.Transaction.type == models.TransactionTypeEnum.PAYMENT,
        ).scalar() or 0.0

        outstanding = max(0.0, round(total_purchased - total_paid, 2))

        customer = models.Customer(
            company_id=company_id,
            name=name,
            status="Active",
            total_purchased=round(total_purchased, 2),
            total_paid=round(total_paid, 2),
            outstanding_balance=outstanding,
        )
        db.add(customer)
        existing_lower.add(name.lower())
        created.append(name)

    db.commit()

    return {
        "ok": True,
        "created": len(created),
        "skipped": len(skipped),
        "created_names": created,
        "message": f"Imported {len(created)} customers from transaction history. {len(skipped)} already existed.",
    }


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.Customer])
def list_customers(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Search by name/phone/email"),
    status: Optional[str] = Query(None),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            return []
        company_id = first.id

    q = db.query(models.Customer).filter(models.Customer.company_id == company_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            models.Customer.name.ilike(term)
            | models.Customer.phone.ilike(term)
            | models.Customer.email.ilike(term)
        )
    if status:
        q = q.filter(models.Customer.status == status)

    return q.order_by(models.Customer.name).offset(skip).limit(limit).all()


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def customer_stats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            return {}
        company_id = first.id

    total = db.query(func.count(models.Customer.id)).filter(
        models.Customer.company_id == company_id
    ).scalar() or 0

    total_outstanding = db.query(func.sum(models.Customer.outstanding_balance)).filter(
        models.Customer.company_id == company_id
    ).scalar() or 0.0

    over_limit = db.query(func.count(models.Customer.id)).filter(
        models.Customer.company_id == company_id,
        models.Customer.outstanding_balance > models.Customer.credit_limit,
        models.Customer.credit_limit > 0,
    ).scalar() or 0

    return {
        "total_customers": total,
        "total_outstanding": round(total_outstanding, 2),
        "customers_over_limit": over_limit,
    }


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.Customer)
def create_customer(
    *,
    db: Session = Depends(deps.get_db),
    customer_in: schemas.CustomerCreate,
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    if company_id is None:
        raise HTTPException(status_code=400, detail="No company associated with this account")

    # Check for duplicate name within company
    existing = db.query(models.Customer).filter(
        models.Customer.company_id == company_id,
        models.Customer.name.ilike(customer_in.name),
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A customer named '{customer_in.name}' already exists",
        )

    customer = models.Customer(
        **customer_in.model_dump(),
        company_id=company_id,
    )
    db.add(customer)
    db.flush()

    _audit(db, current_user, "CREATE", "customer", customer.id,
           f"Created customer '{customer.name}'", request)

    db.commit()
    db.refresh(customer)
    return customer


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(
    customer_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


# ── Ledger (transaction history) ──────────────────────────────────────────────

@router.get("/{customer_id}/ledger")
def customer_ledger(
    customer_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    tz_offset: int = Query(5, description="Client UTC offset in hours"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Transactions linked by customer_id OR by matching customer_name (legacy)
    txs = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.company_id == current_user.company_id,
            (models.Transaction.customer_id == customer_id)
            | models.Transaction.customer_name.ilike(f"%{customer.name}%"),
        )
        .order_by(models.Transaction.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = []
    running_balance = 0.0
    for tx in reversed(txs):
        amount = tx.debit or 0.0
        if tx.type in (models.TransactionTypeEnum.SALE,):
            running_balance += amount
        elif tx.type in (models.TransactionTypeEnum.PAYMENT, models.TransactionTypeEnum.RETURN):
            running_balance -= amount
        items.append({
            "id": tx.id,
            "date": utc_date_to_local(tx.date, tz_offset) if tx.date else None,
            "type": tx.type.value if tx.type else None,
            "order_no": tx.order_no,
            "product_name": tx.product_name,
            "quantity": tx.quantity,
            "unit_price": tx.unit_price,
            "discount": tx.discount,
            "amount": round(amount, 2),
            "payment_term": tx.payment_term,
            "balance_after": round(running_balance, 2),
        })

    items.reverse()  # back to newest-first

    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "credit_limit": customer.credit_limit,
            "outstanding_balance": customer.outstanding_balance,
            "total_purchased": customer.total_purchased,
            "total_paid": customer.total_paid,
        },
        "transactions": items,
        "total_transactions": len(items),
    }


# ── Record payment from customer ──────────────────────────────────────────────

@router.post("/{customer_id}/payment")
def record_customer_payment(
    customer_id: int,
    payment: schemas.CustomerPayment,
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    prev_balance = customer.outstanding_balance or 0.0
    customer.total_paid = (customer.total_paid or 0.0) + payment.amount
    customer.outstanding_balance = max(0.0, prev_balance - payment.amount)

    # Create a payment transaction record
    tx = models.Transaction(
        company_id=current_user.company_id,
        customer_id=customer_id,
        customer_name=customer.name,
        type=models.TransactionTypeEnum.PAYMENT,
        debit=payment.amount,
        previous_credit=round(prev_balance, 2),
        current_credit=round(customer.outstanding_balance, 2),
        payment_term="Cash",
    )
    db.add(tx)

    _audit(db, current_user, "PAYMENT", "customer", customer_id,
           f"Payment of Rs {payment.amount:.2f} from '{customer.name}'. Balance: {prev_balance:.2f} → {customer.outstanding_balance:.2f}",
           request)

    db.commit()
    db.refresh(customer)
    return {
        "ok": True,
        "previous_balance": round(prev_balance, 2),
        "payment_amount": payment.amount,
        "new_balance": round(customer.outstanding_balance, 2),
    }


# ── Update ────────────────────────────────────────────────────────────────────

@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int,
    customer_in: schemas.CustomerUpdate,
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    _audit(db, current_user, "UPDATE", "customer", customer_id,
           f"Updated customer '{customer.name}'", request)

    db.commit()
    db.refresh(customer)
    return customer


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete customers")

    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    _audit(db, current_user, "DELETE", "customer", customer_id,
           f"Deleted customer '{customer.name}'", request)

    db.delete(customer)
    db.commit()
    return {"ok": True}
