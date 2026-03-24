from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app import models
from app.api import deps
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def get_date_range(timeframe: str):
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
    return start_date, now


@router.get("/summary")
def get_dashboard_summary(
    timeframe: str = Query("monthly", description="daily, weekly, monthly, yearly or all"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    
    # If user has no company_id (SuperAdmin without company), get first company or return empty
    if company_id is None:
        first_company = db.query(models.Company).first()
        if first_company:
            company_id = first_company.id
        else:
            # Return empty dashboard if no companies exist
            return {
                "product_count": 0,
                "supplier_count": 0,
                "sales_amount": 0,
                "cost_price": 0,
                "profit": 0,
                "loss": 0,
                "sales_items": 0,
                "returns_amount": 0,
                "returns_items": 0,
                "low_stock_count": 0,
                "total_purchase": 0,
                "timeframe": timeframe
            }
    
    start_date, now = get_date_range(timeframe)

    # Counts using efficient SQL aggregation
    product_count = db.query(func.count(models.Product.id)).filter(
        models.Product.company_id == company_id
    ).scalar() or 0
    
    supplier_count = db.query(func.count(models.Supplier.id)).filter(
        models.Supplier.company_id == company_id
    ).scalar() or 0

    # Sales aggregation using SQL - much faster than Python loops
    sales_agg = db.query(
        func.sum(models.Transaction.unit_price * models.Transaction.quantity).label("total_sale"),
        func.sum(models.Transaction.quantity).label("total_qty"),
        func.count(models.Transaction.id).label("count")
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.SALE,
        models.Transaction.date >= start_date
    ).first()

    total_sale_price = float(sales_agg.total_sale or 0)
    total_sales_items = int(sales_agg.total_qty or 0)

    # Get cost price via JOIN with products
    cost_agg = db.query(
        func.sum(models.Product.product_price * models.Transaction.quantity).label("total_cost")
    ).join(
        models.Product,
        and_(
            models.Product.name == models.Transaction.product_name,
            models.Product.company_id == company_id
        )
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.SALE,
        models.Transaction.date >= start_date
    ).first()

    total_cost_price = float(cost_agg.total_cost or 0)
    net_profit = total_sale_price - total_cost_price
    profit = net_profit if net_profit > 0 else 0
    loss = abs(net_profit) if net_profit < 0 else 0

    # Returns aggregation
    returns_agg = db.query(
        func.sum(models.Transaction.unit_price * models.Transaction.quantity).label("total_return"),
        func.sum(models.Transaction.quantity).label("total_qty")
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.REVERSE,
        models.Transaction.date >= start_date
    ).first()

    total_return_price = float(returns_agg.total_return or 0)
    total_return_items = int(returns_agg.total_qty or 0)

    # Low stock products (in_hand_qty <= 5)
    low_stock_count = db.query(func.count(models.Product.id)).filter(
        models.Product.company_id == company_id,
        models.Product.in_hand_qty <= 5,
        models.Product.status == "Active"
    ).scalar() or 0

    # Total purchases in period
    purchase_agg = db.query(
        func.sum(models.Transaction.unit_price * models.Transaction.quantity).label("total_purchase")
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.PURCHASE,
        models.Transaction.date >= start_date
    ).first()
    total_purchase = float(purchase_agg.total_purchase or 0)

    return {
        "product_count": product_count,
        "supplier_count": supplier_count,
        "sales_amount": round(total_sale_price, 2),
        "cost_price": round(total_cost_price, 2),
        "profit": round(profit, 2),
        "loss": round(loss, 2),
        "sales_items": total_sales_items,
        "returns_amount": round(total_return_price, 2),
        "returns_items": total_return_items,
        "low_stock_count": low_stock_count,
        "total_purchase": round(total_purchase, 2),
        "timeframe": timeframe
    }


@router.get("/charts")
def get_dashboard_charts(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    
    # If user has no company_id, get first company or return empty
    if company_id is None:
        first_company = db.query(models.Company).first()
        if first_company:
            company_id = first_company.id
        else:
            return {
                "monthly_sales": [],
                "sales_distribution": [{"name": "No Data", "value": 1}],
                "top_products": []
            }
    
    now = datetime.utcnow()
    monthly_sales = []

    for i in range(11, -1, -1):
        target_month = now.month - i
        target_year = now.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1

        month_name = datetime(target_year, target_month, 1).strftime("%b")
        start_date = datetime(target_year, target_month, 1)
        if target_month == 12:
            end_date = datetime(target_year + 1, 1, 1)
        else:
            end_date = datetime(target_year, target_month + 1, 1)

        # Use SQL aggregation instead of Python loops
        sales_result = db.query(
            func.coalesce(func.sum(models.Transaction.unit_price * models.Transaction.quantity), 0)
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == models.TransactionTypeEnum.SALE,
            models.Transaction.date >= start_date,
            models.Transaction.date < end_date
        ).scalar()

        purchase_result = db.query(
            func.coalesce(func.sum(models.Transaction.unit_price * models.Transaction.quantity), 0)
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == models.TransactionTypeEnum.PURCHASE,
            models.Transaction.date >= start_date,
            models.Transaction.date < end_date
        ).scalar()

        monthly_sales.append({
            "name": f"{month_name} '{target_year % 100:02d}",
            "sales": round(float(sales_result or 0), 2),
            "purchases": round(float(purchase_result or 0), 2)
        })

    # Category distribution using SQL GROUP BY
    cat_results = db.query(
        func.coalesce(models.Product.category, 'Uncategorized').label('category'),
        func.count(models.Product.id).label('count')
    ).filter(
        models.Product.company_id == company_id
    ).group_by(
        func.coalesce(models.Product.category, 'Uncategorized')
    ).all()

    sales_distribution = [{"name": r.category, "value": r.count} for r in cat_results]
    if not sales_distribution:
        sales_distribution = [{"name": "No Products", "value": 1}]

    # Top selling products (last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    top_products = db.query(
        models.Transaction.product_name,
        func.sum(models.Transaction.quantity).label("total_qty"),
        func.sum(models.Transaction.unit_price * models.Transaction.quantity).label("total_revenue")
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.SALE,
        models.Transaction.date >= thirty_days_ago,
        models.Transaction.product_name.isnot(None)
    ).group_by(
        models.Transaction.product_name
    ).order_by(
        func.sum(models.Transaction.quantity).desc()
    ).limit(5).all()

    top_products_list = [
        {
            "name": r.product_name,
            "qty": int(r.total_qty or 0),
            "revenue": round(float(r.total_revenue or 0), 2)
        }
        for r in top_products
    ]

    return {
        "monthly_sales": monthly_sales,
        "sales_distribution": sales_distribution,
        "top_products": top_products_list
    }


@router.get("/recent-transactions")
def get_recent_transactions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Get recent transactions for dashboard activity feed."""
    transactions = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id
    ).order_by(models.Transaction.date.desc()).limit(limit).all()
    
    return [
        {
            "id": t.id,
            "type": t.type.value if t.type else None,
            "product_name": t.product_name,
            "quantity": t.quantity,
            "debit": t.debit,
            "customer_name": t.customer_name,
            "date": t.date.isoformat() if t.date else None,
            "order_no": t.order_no,
        }
        for t in transactions
    ]
