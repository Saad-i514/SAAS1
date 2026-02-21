from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models import RoleEnum

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = "Operator"
    is_active: Optional[bool] = True
    company_id: Optional[int] = None

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # Admin might create a company when registering or it goes to existing

class UserUpdate(UserBase):
    password: Optional[str] = None

class CompanyBase(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class UserInDBBase(UserBase):
    id: Optional[int] = None
    company_id: Optional[int] = None
    company: Optional[CompanyBase] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str
