from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.core import cache

router = APIRouter()


def _audit(db, user, action, resource_type, resource_id, description, request=None):
    ip = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    db.add(models.AuditLog(
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        description=description,
        ip_address=ip,
    ))


@router.get("/", response_model=List[schemas.supplier.Supplier])
def read_suppliers(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    if company_id is None:
        return []

    # Cache suppliers list for 5 minutes
    cache_key, cached_val = cache.cached(company_id, 300, "suppliers_list", skip, limit)
    if cached_val is not None:
        return cached_val

    result = (
        db.query(models.Supplier)
        .filter(models.Supplier.company_id == company_id)
        .order_by(models.Supplier.name)
        .offset(skip)
        .limit(limit)
        .all()
    )
    serialized = [schemas.supplier.Supplier.model_validate(s).model_dump() for s in result]
    cache.set_tagged(company_id, cache_key, serialized, ttl=300)
    return result


@router.post("/", response_model=schemas.supplier.Supplier)
def create_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_in: schemas.supplier.SupplierCreate,
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Duplicate supplier_no check within the same company
    existing = db.query(models.Supplier).filter(
        models.Supplier.company_id == current_user.company_id,
        models.Supplier.supplier_no == supplier_in.supplier_no,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A supplier with number '{supplier_in.supplier_no}' already exists",
        )

    supplier = models.Supplier(
        **supplier_in.model_dump(),
        company_id=current_user.company_id,
    )
    db.add(supplier)
    db.flush()
    _audit(db, current_user, "CREATE", "supplier", supplier.id,
           f"Created supplier '{supplier.name}'", request)
    db.commit()
    db.refresh(supplier)
    cache.invalidate_company(current_user.company_id)
    return supplier


@router.post("/{supplier_id}/payment", response_model=schemas.supplier.Supplier)
def record_supplier_payment(
    supplier_id: int,
    payment: schemas.supplier.SupplierPayment,
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Record a payment made to a supplier, reducing their outstanding balance."""
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    prev_balance = supplier.outstanding_balance or 0.0
    supplier.total_paid = (supplier.total_paid or 0.0) + payment.amount
    supplier.outstanding_balance = max(0.0, prev_balance - payment.amount)

    # Create a payment transaction record
    tx = models.Transaction(
        company_id=current_user.company_id,
        supplier_id=supplier_id,
        type=models.TransactionTypeEnum.PAYMENT,
        debit=payment.amount,
        previous_credit=round(prev_balance, 2),
        current_credit=round(supplier.outstanding_balance, 2),
        payment_term="Cash",
    )
    db.add(tx)

    _audit(db, current_user, "PAYMENT", "supplier", supplier_id,
           f"Payment of Rs {payment.amount:.2f} to '{supplier.name}'. Balance: {prev_balance:.2f} → {supplier.outstanding_balance:.2f}",
           request)

    db.commit()
    db.refresh(supplier)
    cache.invalidate_company(current_user.company_id)
    return supplier


@router.put("/{supplier_id}", response_model=schemas.supplier.Supplier)
def update_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
    supplier_in: schemas.supplier.SupplierUpdate,
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = supplier_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)

    _audit(db, current_user, "UPDATE", "supplier", supplier_id,
           f"Updated supplier '{supplier.name}'", request)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    cache.invalidate_company(current_user.company_id)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete suppliers")

    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Block delete if supplier has transactions
    tx_count = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id,
        models.Transaction.supplier_id == supplier_id,
    ).count()
    if tx_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete supplier '{supplier.name}' — they have {tx_count} transaction(s). Deactivate instead.",
        )

    _audit(db, current_user, "DELETE", "supplier", supplier_id,
           f"Deleted supplier '{supplier.name}'", request)
    db.delete(supplier)
    db.commit()
    cache.invalidate_company(current_user.company_id)
    return {"ok": True, "deleted": supplier.name}
