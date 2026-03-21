from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models import TransactionTypeEnum

class TransactionBase(BaseModel):
    transaction_id: Optional[str] = None
    order_no: Optional[str] = None
    type: TransactionTypeEnum
    
    # Financial details
    previous_credit: Optional[float] = 0.0
    debit: Optional[float] = 0.0
    current_credit: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    
    # Inventory details
    product_name: Optional[str] = None
    quantity: Optional[int] = 0
    unit_price: Optional[float] = 0.0
    
    customer_name: Optional[str] = None
    payment_term: Optional[str] = None

class TransactionCreate(TransactionBase):
    supplier_id: Optional[int] = None
    date: Optional[datetime] = None
    add_to_stock: Optional[bool] = False

class TransactionUpdate(BaseModel):
    # Depending on what can be updated
    pass

class TransactionInDBBase(TransactionBase):
    id: int
    company_id: int
    supplier_id: Optional[int] = None
    date: datetime

    class Config:
        from_attributes = True

class Transaction(TransactionInDBBase):
    pass
