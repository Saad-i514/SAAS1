from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.api import deps
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[schemas.transaction.Transaction])
def read_transactions(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    transaction_type: Optional[str] = Query(None, description="Filter by type: purchase, sale, reverse, return, payment"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    query = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id
    )
    if supplier_id:
        query = query.filter(models.Transaction.supplier_id == supplier_id)
    if transaction_type:
        # Normalize to lowercase for comparison
        normalized = transaction_type.lower()
        try:
            tx_enum = models.TransactionTypeEnum(normalized)
            query = query.filter(models.Transaction.type == tx_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid transaction type: {transaction_type}")
    
    transactions = query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()
    return transactions


@router.get("/by-supplier/{supplier_id}", response_model=List[schemas.transaction.Transaction])
def get_transactions_by_supplier(
    supplier_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all transactions for a specific supplier (shop), with product details."""
    # Verify supplier belongs to this company
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    transactions = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id,
        models.Transaction.supplier_id == supplier_id
    ).order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()
    
    return transactions


@router.post("/", response_model=schemas.transaction.Transaction)
def create_transaction(
    *,
    db: Session = Depends(deps.get_db),
    transaction_in: schemas.transaction.TransactionCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Normalize transaction type to lowercase enum value
    raw_type = transaction_in.type
    if isinstance(raw_type, str):
        normalized_type = raw_type.lower()
        try:
            tx_type = models.TransactionTypeEnum(normalized_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transaction type '{raw_type}'. Must be one of: purchase, sale, reverse, return, payment"
            )
    else:
        tx_type = raw_type

    # Validate quantity
    if transaction_in.quantity is not None and transaction_in.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    
    # Validate prices
    if transaction_in.unit_price is not None and transaction_in.unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit price cannot be negative")

    create_data = transaction_in.model_dump(exclude={"add_to_stock", "type"})
    transaction = models.Transaction(
        **create_data,
        type=tx_type,
        company_id=current_user.company_id
    )
    db.add(transaction)
    
    # Update product inventory if product_name is provided
    if transaction_in.product_name and transaction_in.quantity:
        product = db.query(models.Product).filter(
            models.Product.name == transaction_in.product_name,
            models.Product.company_id == current_user.company_id
        ).first()
        
        if product:
            if tx_type == models.TransactionTypeEnum.PURCHASE:
                product.in_hand_qty += transaction_in.quantity
            elif tx_type == models.TransactionTypeEnum.SALE:
                if product.in_hand_qty < transaction_in.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock. Available: {product.in_hand_qty}, Requested: {transaction_in.quantity}"
                    )
                product.in_hand_qty -= transaction_in.quantity
            elif tx_type == models.TransactionTypeEnum.REVERSE:
                product.in_hand_qty += transaction_in.quantity
            elif tx_type == models.TransactionTypeEnum.RETURN:
                if transaction_in.add_to_stock:
                    product.in_hand_qty += transaction_in.quantity
            db.add(product)
    
    try:
        db.commit()
        db.refresh(transaction)
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to record transaction")
    
    return transaction


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a transaction (Admin only)."""
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete transactions")
    
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.company_id == current_user.company_id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    return {"ok": True}
