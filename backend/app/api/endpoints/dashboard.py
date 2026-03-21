from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.api import deps
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    timeframe: str = Query("monthly", description="daily, weekly, monthly, yearly or all"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    now = datetime.utcnow()
    
    if timeframe == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "weekly":
        start_date = now - timedelta(days=7)
    elif timeframe == "monthly":
        start_date = now - timedelta(days=30)
    elif timeframe == "yearly":
        start_date = now - timedelta(days=365)
    else:
        start_date = datetime.min
        
    # Basic counts
    product_count = db.query(models.Product).filter(models.Product.company_id == company_id).count()
    supplier_count = db.query(models.Supplier).filter(models.Supplier.company_id == company_id).count()
    
    # Query transactions with product join to get cost price
    sales_query = db.query(models.Transaction, models.Product.product_price).outerjoin(
        models.Product,
        (models.Product.name == models.Transaction.product_name) & (models.Product.company_id == company_id)
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == "sale",
        models.Transaction.date >= start_date
    ).all()
    
    total_sale_price = 0.0
    total_cost_price = 0.0
    total_sales_items = 0
    
    for tx, product_cost in sales_query:
        qty = tx.quantity or 0
        sale_p = (tx.unit_price or 0) * qty
        cost_p = (product_cost or 0) * qty
        
        total_sale_price += sale_p
        total_cost_price += cost_p
        total_sales_items += qty
        
    net_profit = total_sale_price - total_cost_price
    profit = net_profit if net_profit > 0 else 0
    loss = abs(net_profit) if net_profit < 0 else 0
    
    # Returns
    returns_query = db.query(models.Transaction).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == "reverse",
        models.Transaction.date >= start_date
    ).all()
    
    total_return_price = sum((t.unit_price or 0) * (t.quantity or 0) for t in returns_query)
    total_return_items = sum(t.quantity or 0 for t in returns_query)

    return {
        "product_count": product_count,
        "supplier_count": supplier_count,
        "sales_amount": total_sale_price,
        "cost_price": total_cost_price,
        "profit": profit,
        "loss": loss,
        "sales_items": total_sales_items,
        "returns_amount": total_return_price,
        "returns_items": total_return_items,
        "timeframe": timeframe
    }

@router.get("/charts")
def get_dashboard_charts(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    
    now = datetime.utcnow()
    monthly_sales = []
    
    # Calculate for the last 12 months including current month
    for i in range(11, -1, -1):
        target_month = now.month - i
        target_year = now.year
        if target_month <= 0:
            target_month += 12
            target_year -= 1
            
        month_name = datetime(target_year, target_month, 1).strftime("%b")
        
        start_date = datetime(target_year, target_month, 1)
        if target_month == 12:
            end_date = datetime(target_year + 1, 1, 1)
        else:
            end_date = datetime(target_year, target_month + 1, 1)
            
        # Get sales for this month
        month_sales = db.query(models.Transaction).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == "sale",
            models.Transaction.date >= start_date,
            models.Transaction.date < end_date
        ).all()
        total_sales = sum((t.unit_price or 0) * (t.quantity or 0) for t in month_sales)
        
        # Get purchases for this month
        month_purchases = db.query(models.Transaction).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == "purchase",
            models.Transaction.date >= start_date,
            models.Transaction.date < end_date
        ).all()
        total_purchases = sum((t.unit_price or 0) * (t.quantity or 0) for t in month_purchases)
        
        monthly_sales.append({
            "name": f"{month_name} '{target_year % 100:02d}", 
            "sales": total_sales, 
            "purchases": total_purchases
        })
    
    # Category distribution
    products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
    cat_dist = {}
    for p in products:
        c = p.category or "Uncategorized"
        cat_dist[c] = cat_dist.get(c, 0) + 1
        
    sales_distribution = [{"name": k, "value": v} for k, v in cat_dist.items()]
    if not sales_distribution:
        sales_distribution = [{"name": "No Products", "value": 1}]
    
    return {
        "monthly_sales": monthly_sales,
        "sales_distribution": sales_distribution
    }
