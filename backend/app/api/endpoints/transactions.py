import asyncio
import json
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.api import deps
from app.core import cache
import logging
from datetime import datetime
from app.utils import get_date_range

logger = logging.getLogger(__name__)
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


def _update_customer_balance(
    db: Session,
    company_id: int,
    customer_name: Optional[str],
    customer_id: Optional[int],
    tx_type: models.TransactionTypeEnum,
    amount: float,
) -> tuple[float, float]:
    """
    Update customer outstanding balance for credit transactions.
    Returns (previous_credit, current_credit).
    """
    if not customer_name and not customer_id:
        return 0.0, 0.0

    customer = None
    if customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.id == customer_id,
            models.Customer.company_id == company_id,
        ).first()
    elif customer_name:
        customer = db.query(models.Customer).filter(
            models.Customer.company_id == company_id,
            models.Customer.name.ilike(customer_name),
        ).first()

    if not customer:
        return 0.0, 0.0

    prev = round(customer.outstanding_balance or 0.0, 2)

    if tx_type == models.TransactionTypeEnum.SALE:
        customer.outstanding_balance = round(prev + amount, 2)
        customer.total_purchased = round((customer.total_purchased or 0.0) + amount, 2)
    elif tx_type in (models.TransactionTypeEnum.PAYMENT, models.TransactionTypeEnum.RETURN):
        customer.outstanding_balance = round(max(0.0, prev - amount), 2)
        if tx_type == models.TransactionTypeEnum.PAYMENT:
            customer.total_paid = round((customer.total_paid or 0.0) + amount, 2)

    return prev, round(customer.outstanding_balance, 2)


def _update_supplier_balance(
    db: Session,
    company_id: int,
    supplier_id: Optional[int],
    tx_type: models.TransactionTypeEnum,
    amount: float,
):
    """Update supplier outstanding balance for purchase/payment transactions."""
    if not supplier_id:
        return

    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == company_id,
    ).first()
    if not supplier:
        return

    if tx_type == models.TransactionTypeEnum.PURCHASE:
        supplier.outstanding_balance = round((supplier.outstanding_balance or 0.0) + amount, 2)
        supplier.total_purchased = round((supplier.total_purchased or 0.0) + amount, 2)
    elif tx_type == models.TransactionTypeEnum.PAYMENT:
        supplier.outstanding_balance = round(max(0.0, (supplier.outstanding_balance or 0.0) - amount), 2)
        supplier.total_paid = round((supplier.total_paid or 0.0) + amount, 2)

# ── SSE event bus (in-memory, per-process) ──────────────────────────────────
# For multi-computer real-time updates via Server-Sent Events
_sse_subscribers: dict[int, list[asyncio.Queue]] = {}  # company_id -> [queues]


def _broadcast(company_id: int, event: dict):
    """Push an event to all SSE subscribers of a company."""
    queues = _sse_subscribers.get(company_id, [])
    dead = []
    for q in queues:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        queues.remove(q)


@router.get("/events")
async def transaction_events(
    token: Optional[str] = Query(None, description="JWT token for SSE auth"),
    db: Session = Depends(deps.get_db),
):
    """SSE endpoint — subscribe to live transaction updates for this company."""
    # Authenticate via query param token (SSE can't send headers)
    if not token:
        from fastapi.responses import Response
        return Response(status_code=401)
    try:
        from jose import jwt
        from app.core.config import settings
        from app import schemas as _schemas
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = _schemas.token.TokenPayload(**payload)
        user = db.query(models.User).filter(models.User.id == int(token_data.sub)).first()
        if not user or not user.is_active:
            from fastapi.responses import Response
            return Response(status_code=401)
    except Exception:
        from fastapi.responses import Response
        return Response(status_code=401)

    company_id = user.company_id
    # SuperAdmin without a company: find first company
    if company_id is None:
        from sqlalchemy.orm import Session as _S
        first = db.query(models.Company).first()
        company_id = first.id if first else None
    if company_id is None:
        from fastapi.responses import Response as _R
        return _R(status_code=403)

    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_subscribers.setdefault(company_id, []).append(q)

    async def event_stream():
        try:
            # Send a heartbeat immediately so the browser knows it's connected
            yield "data: {\"type\":\"connected\"}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"  # keep-alive comment
        finally:
            subs = _sse_subscribers.get(company_id, [])
            if q in subs:
                subs.remove(q)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _resolve_tx_type(raw_type) -> models.TransactionTypeEnum:
    if isinstance(raw_type, models.TransactionTypeEnum):
        return raw_type
    try:
        return models.TransactionTypeEnum(str(raw_type).lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transaction type '{raw_type}'. Must be one of: purchase, sale, reverse, return, payment",
        )


def _apply_inventory(
    db: Session,
    product: models.Product,
    tx_type: models.TransactionTypeEnum,
    quantity: int,
    add_to_stock: bool = False,
):
    """Mutate product.in_hand_qty according to transaction type. Raises on insufficient stock."""
    if tx_type == models.TransactionTypeEnum.PURCHASE:
        product.in_hand_qty += quantity
    elif tx_type == models.TransactionTypeEnum.SALE:
        if product.in_hand_qty < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.in_hand_qty}, Requested: {quantity}",
            )
        product.in_hand_qty -= quantity
    elif tx_type == models.TransactionTypeEnum.REVERSE:
        product.in_hand_qty += quantity
    elif tx_type == models.TransactionTypeEnum.RETURN:
        if add_to_stock:
            product.in_hand_qty += quantity


# ── List / filter ─────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.transaction.Transaction])
def read_transactions(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    supplier_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None, description="Filter by customer/shop name (partial match)"),
    order_no: Optional[str] = Query(None, description="Filter by order number"),
    timeframe: str = Query("all", description="daily, weekly, monthly, yearly, all"),
    tz_offset: int = Query(5, description="Client UTC offset in hours"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    if company_id is None:
        # SuperAdmin: resolve to first company or return empty
        first = db.query(models.Company).first()
        if not first:
            return []
        company_id = first.id

    query = db.query(models.Transaction).filter(
        models.Transaction.company_id == company_id
    )
    
    start_date = get_date_range(timeframe, tz_offset)
    if start_date != datetime.min:
        query = query.filter(models.Transaction.date >= start_date)

    if supplier_id:
        query = query.filter(models.Transaction.supplier_id == supplier_id)
    if transaction_type:
        tx_enum = _resolve_tx_type(transaction_type)
        query = query.filter(models.Transaction.type == tx_enum)
    if customer_name:
        query = query.filter(
            models.Transaction.customer_name.ilike(f"%{customer_name}%")
        )
    if order_no:
        query = query.filter(models.Transaction.order_no.ilike(f"%{order_no}%"))

    return query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()


@router.get("/by-supplier/{supplier_id}", response_model=List[schemas.transaction.Transaction])
def get_transactions_by_supplier(
    supplier_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return (
        db.query(models.Transaction)
        .filter(
            models.Transaction.company_id == current_user.company_id,
            models.Transaction.supplier_id == supplier_id,
        )
        .order_by(models.Transaction.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/by-customer")
def get_transactions_by_customer(
    customer_name: str = Query(..., description="Customer / shop name to search"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Return all transactions for a customer/shop with product summary."""
    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            return {"customer_name": customer_name, "items": [], "product_summary": [],
                    "total_amount": 0, "total_qty": 0, "total_transactions": 0}
        company_id = first.id

    transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.company_id == company_id,
            models.Transaction.customer_name.ilike(f"%{customer_name}%"),
        )
        .order_by(models.Transaction.date.desc())
        .all()
    )

    # Build product summary
    product_summary: dict = {}
    total_amount = 0.0
    total_qty = 0

    items = []
    for tx in transactions:
        qty = tx.quantity or 0
        # Use stored debit — already calculated server-side as max(0, qty*price - discount)
        amount = round(tx.debit or 0, 2)
        total_amount += amount
        total_qty += qty

        items.append({
            "id": tx.id,
            "date": tx.date.isoformat() if tx.date else None,
            "type": tx.type.value if tx.type else None,
            "order_no": tx.order_no,
            "product_name": tx.product_name,
            "quantity": qty,
            "unit_price": tx.unit_price or 0,
            "discount": tx.discount or 0,
            "total_amount": amount,
            "payment_term": tx.payment_term,
        })

        pname = tx.product_name or "Unknown"
        if pname not in product_summary:
            product_summary[pname] = {"qty": 0, "amount": 0.0, "transactions": 0}
        product_summary[pname]["qty"] += qty
        product_summary[pname]["amount"] = round(product_summary[pname]["amount"] + amount, 2)
        product_summary[pname]["transactions"] += 1

    return {
        "customer_name": customer_name,
        "items": items,
        "product_summary": [{"product": k, **v} for k, v in product_summary.items()],
        "total_amount": round(total_amount, 2),
        "total_qty": total_qty,
        "total_transactions": len(items),
    }


# ── Single transaction ────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.transaction.Transaction)
def create_transaction(
    *,
    db: Session = Depends(deps.get_db),
    transaction_in: schemas.transaction.TransactionCreate,
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Operators and Admins must have a company
    company_id = current_user.company_id
    if company_id is None:
        raise HTTPException(status_code=400, detail="No company associated with this account")

    tx_type = _resolve_tx_type(transaction_in.type)

    qty = transaction_in.quantity or 0
    unit_price = transaction_in.unit_price or 0
    discount = transaction_in.discount or 0

    if qty < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    if unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit price cannot be negative")
    if discount < 0:
        raise HTTPException(status_code=400, detail="Discount cannot be negative")
    if discount > qty * unit_price:
        raise HTTPException(status_code=400, detail="Discount cannot exceed the total amount")

    # Recalculate debit server-side — client value is ignored
    debit = round(max(0.0, qty * unit_price - discount), 2)

    # Validate product exists and has enough stock for sales
    if transaction_in.product_name and qty:
        product = db.query(models.Product).filter(
            models.Product.name == transaction_in.product_name,
            models.Product.company_id == current_user.company_id,
        ).first()
        if not product and tx_type in (
            models.TransactionTypeEnum.SALE,
            models.TransactionTypeEnum.PURCHASE,
        ):
            raise HTTPException(
                status_code=404,
                detail=f"Product '{transaction_in.product_name}' not found",
            )
        if product:
            _apply_inventory(db, product, tx_type, qty, transaction_in.add_to_stock or False)
            db.add(product)

    # Wire up customer credit ledger
    prev_credit, curr_credit = _update_customer_balance(
        db, company_id,
        transaction_in.customer_name,
        transaction_in.customer_id if hasattr(transaction_in, 'customer_id') else None,
        tx_type, debit,
    )

    # Wire up supplier balance
    _update_supplier_balance(db, company_id, transaction_in.supplier_id, tx_type, debit)

    create_data = transaction_in.model_dump(exclude={"add_to_stock", "type", "debit", "previous_credit", "current_credit"})
    transaction = models.Transaction(
        **create_data,
        type=tx_type,
        debit=debit,
        previous_credit=prev_credit,
        current_credit=curr_credit,
        company_id=current_user.company_id,
    )
    db.add(transaction)
    db.flush()

    _audit(db, current_user, "CREATE", "transaction", transaction.id,
           f"{tx_type.value.upper()} — {transaction_in.product_name or 'payment'} "
           f"qty={qty} amount=Rs{debit:.2f} customer={transaction_in.customer_name or '-'}",
           request)

    try:
        db.commit()
        db.refresh(transaction)
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to record transaction")

    # Invalidate all caches for this company (dashboard, products, suppliers)
    cache.invalidate_company(current_user.company_id)

    # Invalidate cache after successful transaction
    cache.invalidate_company(current_user.company_id)

    # Broadcast SSE event
    _broadcast(current_user.company_id, {
        "type": "transaction_created",
        "tx_type": tx_type.value,
        "product": transaction_in.product_name,
        "quantity": qty,
        "amount": debit,
    })

    # ── Email notification (fire-and-forget background task) ─────────────────
    try:
        from app.core.config import settings as _cfg
        if _cfg.RESEND_API_KEY:
            import asyncio as _asyncio
            from app.services.email import send_transaction_notification
            # Get company name
            _company = db.query(models.Company).filter(
                models.Company.id == current_user.company_id
            ).first()
            _company_name = _company.name if _company else "Your Company"
            _asyncio.create_task(send_transaction_notification(
                company_name=_company_name,
                tx_type=tx_type.value,
                order_no=transaction.order_no or str(transaction.id),
                items=[{
                    "product_name": transaction_in.product_name,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "discount": discount,
                }],
                total_amount=debit,
                customer_name=transaction_in.customer_name,
                payment_term=transaction_in.payment_term,
                tx_date=transaction.date or datetime.utcnow(),
                to_email=_cfg.NOTIFY_EMAIL,
                from_email=_cfg.NOTIFY_FROM,
            ))
    except Exception as _e:
        logger.warning(f"Email notification skipped: {_e}")

    return transaction


# ── Bulk / multi-item order ───────────────────────────────────────────────────

@router.post("/bulk", response_model=schemas.transaction.BulkOrderResponse)
def create_bulk_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: schemas.transaction.BulkOrderCreate,
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create multiple transaction line-items under one order in a single request.
    All items share the same customer/supplier, order_no, date, and payment_term.
    The entire batch is atomic — if any item fails (e.g. insufficient stock) the
    whole order is rolled back.
    """
    if not order_in.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    tx_type = _resolve_tx_type(order_in.type)
    order_no = order_in.order_no or f"ORD-{uuid.uuid4().hex[:8].upper()}"
    tx_date = order_in.date or datetime.utcnow()
    company_id = current_user.company_id

    created_transactions: list[models.Transaction] = []
    total_amount = 0.0

    # Prepare a list of product names and ensure they are not blank
    product_names = []
    for item in order_in.items:
        if not item.product_name or not item.product_name.strip():
            raise HTTPException(status_code=400, detail="Product name cannot be blank")
        product_names.append(item.product_name)

    # Fetch all referenced products in one query
    products = db.query(models.Product).filter(
        models.Product.company_id == company_id,
        models.Product.name.in_(product_names)
    ).all()
    product_map = {p.name: p for p in products}

    # Pre-validate all stock before touching anything
    if tx_type == models.TransactionTypeEnum.SALE:
        for item in order_in.items:
            product = product_map.get(item.product_name)
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product '{item.product_name}' not found"
                )
            if product.in_hand_qty < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{item.product_name}'. Available: {product.in_hand_qty}, Requested: {item.quantity}",
                )

    # For purchase, validate products exist (they must be in the system to track inventory)
    if tx_type == models.TransactionTypeEnum.PURCHASE:
        for item in order_in.items:
            product = product_map.get(item.product_name)
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product '{item.product_name}' not found. Add it to inventory first.",
                )

    try:
        for item in order_in.items:
            debit = round(max(0.0, item.quantity * item.unit_price - (item.discount or 0)), 2)
            total_amount += debit

            tx = models.Transaction(
                company_id=company_id,
                supplier_id=order_in.supplier_id,
                customer_id=order_in.customer_id,
                order_no=order_no,
                type=tx_type,
                date=tx_date,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount or 0,
                debit=debit,
                customer_name=order_in.customer_name,
                payment_term=order_in.payment_term or "Cash",
            )
            db.add(tx)

            # Update inventory using the pre-fetched objects
            product = product_map.get(item.product_name)
            if product:
                _apply_inventory(db, product, tx_type, item.quantity, order_in.add_to_stock or False)

            created_transactions.append(tx)

        # Wire up customer credit ledger for the whole order total — inside the same transaction
        if order_in.customer_name or order_in.customer_id:
            _update_customer_balance(
                db, company_id,
                order_in.customer_name,
                order_in.customer_id,
                tx_type, round(total_amount, 2),
            )

        # Wire up supplier balance — inside the same transaction
        _update_supplier_balance(db, company_id, order_in.supplier_id, tx_type, round(total_amount, 2))

        _audit(db, current_user, "CREATE", "transaction", order_no,
               f"Bulk {tx_type.value.upper()} order {order_no} — {len(created_transactions)} items, "
               f"total=Rs{total_amount:.2f} customer={order_in.customer_name or '-'}",
               request)

        db.commit()
        for tx in created_transactions:
            db.refresh(tx)

        # Invalidate all caches for this company (dashboard, products, suppliers)
        cache.invalidate_company(company_id)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to record bulk order")

    # Invalidate cache after successful bulk order
    cache.invalidate_company(company_id)

    # Broadcast SSE
    _broadcast(company_id, {
        "type": "bulk_order_created",
        "tx_type": tx_type.value,
        "order_no": order_no,
        "items_count": len(created_transactions),
        "total_amount": round(total_amount, 2),
        "customer": order_in.customer_name,
    })

    # ── Email notification (fire-and-forget background task) ─────────────────
    try:
        from app.core.config import settings as _cfg
        if _cfg.RESEND_API_KEY:
            import asyncio as _asyncio
            from app.services.email import send_transaction_notification
            _company = db.query(models.Company).filter(
                models.Company.id == company_id
            ).first()
            _company_name = _company.name if _company else "Your Company"
            _email_items = [
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "discount": item.discount or 0,
                }
                for item in order_in.items
            ]
            _asyncio.create_task(send_transaction_notification(
                company_name=_company_name,
                tx_type=tx_type.value,
                order_no=order_no,
                items=_email_items,
                total_amount=round(total_amount, 2),
                customer_name=order_in.customer_name,
                payment_term=order_in.payment_term,
                tx_date=tx_date,
                to_email=_cfg.NOTIFY_EMAIL,
                from_email=_cfg.NOTIFY_FROM,
            ))
    except Exception as _e:
        logger.warning(f"Email notification skipped: {_e}")

    return schemas.transaction.BulkOrderResponse(
        order_no=order_no,
        transactions=created_transactions,
        total_amount=round(total_amount, 2),
        items_count=len(created_transactions),
    )


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete transactions")

    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.company_id == current_user.company_id,
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    _audit(db, current_user, "DELETE", "transaction", transaction_id,
           f"Deleted {transaction.type.value if transaction.type else '?'} transaction "
           f"#{transaction_id} — {transaction.product_name or 'payment'} "
           f"Rs{transaction.debit:.2f}",
           request)
    db.delete(transaction)
    db.commit()
    cache.invalidate_company(current_user.company_id)
    return {"ok": True}
