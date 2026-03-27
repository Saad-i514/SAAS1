from typing import Optional
from pydantic import BaseModel, field_validator, Field
from datetime import datetime


class SupplierBase(BaseModel):
    supplier_no: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field("Active", max_length=20)
    dynamic_data: Optional[dict] = {}

    @field_validator("supplier_no", "name", mode="before")
    @classmethod
    def not_blank_and_sanitize(cls, v):
        if not str(v or "").strip():
            raise ValueError("Field cannot be blank")
        # Basic sanitization - remove leading/trailing whitespace
        sanitized = str(v).strip()
        # Prevent excessively long strings
        if len(sanitized) > 200:
            raise ValueError("Field exceeds maximum length")
        return sanitized

    @field_validator("email", mode="before")
    @classmethod
    def valid_email(cls, v):
        if v:
            v = str(v).strip()
            if "@" not in v or len(v) > 100:
                raise ValueError("Invalid email address")
        return v
    
    @field_validator("phone", mode="before")
    @classmethod
    def sanitize_phone(cls, v):
        if v:
            v = str(v).strip()
            if len(v) > 20:
                raise ValueError("Phone number too long")
        return v


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    dynamic_data: Optional[dict] = None

    @field_validator("name", mode="before")
    @classmethod
    def not_blank_and_sanitize(cls, v):
        if v is not None:
            v = str(v).strip()
            if not v:
                raise ValueError("Name cannot be blank")
            if len(v) > 200:
                raise ValueError("Name exceeds maximum length")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def valid_email(cls, v):
        if v:
            v = str(v).strip()
            if "@" not in v or len(v) > 100:
                raise ValueError("Invalid email address")
        return v
    
    @field_validator("phone", mode="before")
    @classmethod
    def sanitize_phone(cls, v):
        if v:
            v = str(v).strip()
            if len(v) > 20:
                raise ValueError("Phone number too long")
        return v


class SupplierInDBBase(SupplierBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Supplier(SupplierInDBBase):
    pass
