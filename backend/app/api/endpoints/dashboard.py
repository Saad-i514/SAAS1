from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.api import deps
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    
    # Basic counts
    product_count = db.query(models.Product).filter(models.Product.company_id == company_id).count()
    supplier_count = db.query(models.Supplier).filter(models.Supplier.company_id == company_id).count()
    
    # Stock value: sum(in_hand_qty * purchase_price (we only have product_price))
    stock_value_query = db.query(
        func.sum(models.Product.in_hand_qty * models.Product.product_price)
    ).filter(models.Product.company_id == company_id).scalar()
    stock_value = stock_value_query or 0.0
    
    # Financial summaries from transactions
    sales_amount = db.query(func.sum(models.Transaction.debit)).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.SALE
    ).scalar() or 0.0
    
    discount_amount = db.query(func.sum(models.Transaction.discount)).filter(
        models.Transaction.company_id == company_id
    ).scalar() or 0.0
    
    total_debit = db.query(func.sum(models.Transaction.debit)).filter(
        models.Transaction.company_id == company_id
    ).scalar() or 0.0
    
    return {
        "product_count": product_count,
        "supplier_count": supplier_count,
        "stock_value": stock_value,
        "sales_amount": sales_amount,
        "discount_amount": discount_amount,
        "total_amount": total_debit, # simplification
        "credit_summary": 0, # requires deeper logic evaluating supplier current_credit logic
        "debit_summary": total_debit
    }

@router.get("/charts")
def get_dashboard_charts(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    
    # Mock some monthly data for the chart, in a real app group by month using DB functions
    monthly_sales = [
        {"name": "Jan", "sales": 4000, "purchases": 2400},
        {"name": "Feb", "sales": 3000, "purchases": 1398},
        {"name": "Mar", "sales": 2000, "purchases": 9800},
        {"name": "Apr", "sales": 2780, "purchases": 3908},
        {"name": "May", "sales": 1890, "purchases": 4800},
        {"name": "Jun", "sales": 2390, "purchases": 3800},
    ]
    
    sales_distribution = [
        {"name": "Electronics", "value": 400},
        {"name": "Clothing", "value": 300},
        {"name": "Furniture", "value": 300},
        {"name": "Food", "value": 200},
    ]
    
    return {
        "monthly_sales": monthly_sales,
        "sales_distribution": sales_distribution
    }
