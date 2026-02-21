from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Enum, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SuperAdmin"
    ADMIN = "Admin"
    OPERATOR = "Operator"

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="company", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="company", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="company", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.OPERATOR, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="users")


class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    supplier_no = Column(String, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="Active")
    dynamic_data = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="suppliers")
    transactions = relationship("Transaction", back_populates="supplier")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    article_no = Column(String, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    product_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    in_hand_qty = Column(Integer, default=0)
    status = Column(String, default="Active")
    dynamic_data = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="products")


class TransactionTypeEnum(str, enum.Enum):
    PURCHASE = "purchase"
    PAYMENT = "payment"
    SALE = "sale"
    REVERSE = "reverse"

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True) # Nullable for sales to random customers if not tracked
    
    transaction_id = Column(String, index=True, nullable=True) # generated or provided
    order_no = Column(String, index=True, nullable=True)
    type = Column(Enum(TransactionTypeEnum), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    
    # Financial details
    previous_credit = Column(Float, default=0.0)
    debit = Column(Float, default=0.0) # AMOUNT
    current_credit = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    
    # Inventory details
    product_name = Column(String, nullable=True) # Could link to Product directly, but denormalizing for history is safer
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    
    customer_name = Column(String, nullable=True) # for sales
    payment_term = Column(String, nullable=True) # Cash / Credit
    
    company = relationship("Company", back_populates="transactions")
    supplier = relationship("Supplier", back_populates="transactions")


# Future: Dynamic Columns table could be simply JSON in base models, or an EAV table
class DynamicColumn(Base):
    __tablename__ = "dynamic_columns"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    table_name = Column(String, nullable=False)
    column_name = Column(String, nullable=False)
    data_type = Column(String, nullable=False) # e.g., 'string', 'number', 'boolean'
