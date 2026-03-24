from typing import Optional, Union
from pydantic import BaseModel, field_validator
from datetime import datetime
from app.models import TransactionTypeEnum

class TransactionBase(BaseModel):
    transaction_id: Optional[str] = None
    order_no: Optional[str] = None
    type: Union[TransactionTypeEnum, str]
    
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

    @field_validator('type', mode='before')
    @classmethod
    def normalize_type(cls, v):
        """Accept both uppercase and lowercase transaction types."""
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator('debit', 'unit_price', mode='before')
    @classmethod
    def non_negative_amounts(cls, v):
        if v is not None and float(v) < 0:
            raise ValueError('Amount cannot be negative')
        return v

    @field_validator('quantity', mode='before')
    @classmethod
    def non_negative_quantity(cls, v):
        if v is not None and int(v) < 0:
            raise ValueError('Quantity cannot be negative')
        return v

class TransactionCreate(TransactionBase):
    supplier_id: Optional[int] = None
    date: Optional[datetime] = None
    add_to_stock: Optional[bool] = False

class TransactionUpdate(BaseModel):
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
