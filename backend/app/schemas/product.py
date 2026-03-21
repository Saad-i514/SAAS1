from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ProductBase(BaseModel):
    article_no: str
    name: str
    product_price: float
    sale_price: float
    in_hand_qty: Optional[int] = 0
    category: Optional[str] = None
    status: Optional[str] = "Active"
    dynamic_data: Optional[dict] = {}

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_price: Optional[float] = None
    sale_price: Optional[float] = None
    in_hand_qty: Optional[int] = None
    category: Optional[str] = None
    status: Optional[str] = None
    dynamic_data: Optional[dict] = None

class ProductInDBBase(ProductBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Product(ProductInDBBase):
    pass
