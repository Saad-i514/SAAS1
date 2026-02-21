from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class SupplierBase(BaseModel):
    supplier_no: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = "Active"
    dynamic_data: Optional[dict] = {}

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    dynamic_data: Optional[dict] = None

class SupplierInDBBase(SupplierBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Supplier(SupplierInDBBase):
    pass
