from typing import Optional
from pydantic import BaseModel, field_validator, Field
from datetime import datetime


class ProductBase(BaseModel):
    article_no: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    product_price: float = Field(..., ge=0)
    sale_price: float = Field(..., ge=0)
    in_hand_qty: Optional[int] = Field(0, ge=0)
    category: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field("Active", max_length=20)
    dynamic_data: Optional[dict] = {}

    @field_validator("article_no", "name", mode="before")
    @classmethod
    def not_blank_and_sanitize(cls, v):
        if not str(v or "").strip():
            raise ValueError("Field cannot be blank")
        sanitized = str(v).strip()
        if len(sanitized) > 200:
            raise ValueError("Field exceeds maximum length")
        return sanitized
    
    @field_validator("category", mode="before")
    @classmethod
    def sanitize_category(cls, v):
        if v:
            v = str(v).strip()
            if len(v) > 100:
                raise ValueError("Category name too long")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    product_price: Optional[float] = Field(None, ge=0)
    sale_price: Optional[float] = Field(None, ge=0)
    in_hand_qty: Optional[int] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)
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
    
    @field_validator("category", mode="before")
    @classmethod
    def sanitize_category(cls, v):
        if v:
            v = str(v).strip()
            if len(v) > 100:
                raise ValueError("Category name too long")
        return v


class ProductInDBBase(ProductBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Product(ProductInDBBase):
    pass
