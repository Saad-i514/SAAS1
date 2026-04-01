import asyncio
import json
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.api import deps
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

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

    create_data = transaction_in.model_dump(exclude={"add_to_stock", "type", "debit"})
    transaction = models.Transaction(
        **create_data,
        type=tx_type,
        debit=debit,
        company_id=current_user.company_id,
    )
    db.add(transaction)

    try:
        db.commit()
        db.refresh(transaction)
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to record transaction")

    # Broadcast SSE event
    _broadcast(current_user.company_id, {
        "type": "transaction_created",
        "tx_type": tx_type.value,
        "product": transaction_in.product_name,
        "quantity": qty,
        "amount": debit,
    })

    return transaction


# ── Bulk / multi-item order ───────────────────────────────────────────────────

@router.post("/bulk", response_model=schemas.transaction.BulkOrderResponse)
def create_bulk_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: schemas.transaction.BulkOrderCreate,
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

        db.commit()
        for tx in created_transactions:
            db.refresh(tx)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to record bulk order")

    # Broadcast SSE
    _broadcast(company_id, {
        "type": "bulk_order_created",
        "tx_type": tx_type.value,
        "order_no": order_no,
        "items_count": len(created_transactions),
        "total_amount": round(total_amount, 2),
        "customer": order_in.customer_name,
    })

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

    db.delete(transaction)
    db.commit()
    return {"ok": True}
