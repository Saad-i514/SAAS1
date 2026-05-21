from typing import Optional
from pydantic import BaseModel, field_validator, Field
from datetime import datetime


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    credit_limit: Optional[float] = Field(0.0, ge=0)
    status: Optional[str] = Field("Active", max_length=20)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v):
        v = str(v or "").strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def valid_email(cls, v):
        if v:
            v = str(v).strip()
            if v and "@" not in v:
                raise ValueError("Invalid email address")
        return v or None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    credit_limit: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v):
        if v is not None:
            v = str(v).strip()
            if not v:
                raise ValueError("Name cannot be blank")
        return v


class CustomerPayment(BaseModel):
    """Record a payment received from a customer."""
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class CustomerInDB(CustomerBase):
    id: int
    company_id: int
    outstanding_balance: float = 0.0
    total_purchased: float = 0.0
    total_paid: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class Customer(CustomerInDB):
    pass
