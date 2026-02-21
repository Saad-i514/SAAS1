from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.transaction.Transaction])
def read_transactions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    transactions = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id
    ).offset(skip).limit(limit).order_by(models.Transaction.date.desc()).all()
    return transactions

@router.post("/", response_model=schemas.transaction.Transaction)
def create_transaction(
    *,
    db: Session = Depends(deps.get_db),
    transaction_in: schemas.transaction.TransactionCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    transaction = models.Transaction(
        **transaction_in.model_dump(),
        company_id=current_user.company_id
    )
    db.add(transaction)
    
    # If it's a purchase/sale, update the product quantity
    if transaction_in.product_name and transaction_in.quantity:
        product = db.query(models.Product).filter(
            models.Product.name == transaction_in.product_name,
            models.Product.company_id == current_user.company_id
        ).first()
        if product:
            if transaction_in.type == models.TransactionTypeEnum.PURCHASE:
                product.in_hand_qty += transaction_in.quantity
            elif transaction_in.type == models.TransactionTypeEnum.SALE:
                product.in_hand_qty -= transaction_in.quantity
            elif transaction_in.type == models.TransactionTypeEnum.REVERSE:
                product.in_hand_qty += transaction_in.quantity # Restock on reverse
            db.add(product)
            
    db.commit()
    db.refresh(transaction)
    return transaction
