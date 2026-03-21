import csv
import io
from typing import Any, List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/sales-summary")
def get_sales_report(
    timeframe: str = Query("daily", description="daily, weekly, monthly, yearly"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Returns a detailed JSON object of the sales to be beautifully rendered on the frontend.
    The response contains an array of itemized records and a 'total' summary object at the end.
    """
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
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
    sales_query = db.query(models.Transaction, models.Product).outerjoin(
        models.Product,
        (models.Product.name == models.Transaction.product_name) & (models.Product.company_id == company_id)
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.SALE,
        models.Transaction.date >= start_date
    ).order_by(models.Transaction.date.desc()).all()
    
    items = []
    total_sales = 0.0
    total_cost = 0.0
    total_qty = 0
    
    for tx, product in sales_query:
        qty = tx.quantity or 0
        sale_p = (tx.unit_price or 0) * qty
        cost_p = (product.product_price if product else 0) * qty
        
        profit = sale_p - cost_p
        
        items.append({
            "date": tx.date.isoformat(),
            "transaction_id": tx.transaction_id,
            "product_name": tx.product_name,
            "category": product.category if product else "N/A",
            "quantity": qty,
            "unit_sale_price": tx.unit_price,
            "total_sale_price": sale_p,
            "total_cost_price": cost_p,
            "profit": profit
        })
        
        total_sales += sale_p
        total_cost += cost_p
        total_qty += qty
        
    summary = {
        "total_sales": total_sales,
        "total_cost": total_cost,
        "total_profit": total_sales - total_cost if total_sales > total_cost else 0,
        "total_loss": total_cost - total_sales if total_cost > total_sales else 0,
        "total_quantity": total_qty
    }
    
    return {
        "timeframe": timeframe,
        "items": items,
        "summary": summary
    }

@router.get("/csv/{report_type}")
def download_report_csv(
    report_type: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    company_id = current_user.company_id
    
    stream = io.StringIO()
    writer = csv.writer(stream)
    
    if report_type == "products":
        writer.writerow(["Article No", "Name", "Category", "Product Price", "Sale Price", "In Hand Qty", "Status"])
        products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
        for p in products:
            writer.writerow([p.article_no, p.name, p.category, p.product_price, p.sale_price, p.in_hand_qty, p.status])
            
    elif report_type == "suppliers":
        writer.writerow(["Supplier No", "Name", "Email", "Phone", "Status"])
        suppliers = db.query(models.Supplier).filter(models.Supplier.company_id == company_id).all()
        for s in suppliers:
            writer.writerow([s.supplier_no, s.name, s.email, s.phone, s.status])
            
    elif report_type == "transactions":
        writer.writerow(["Date", "Type", "Transaction ID", "Order No", "Debit", "Discount", "Product", "Qty", "Customer/Supplier"])
        transactions = db.query(models.Transaction).filter(models.Transaction.company_id == company_id).all()
        for t in transactions:
            writer.writerow([
                t.date.strftime("%Y-%m-%d %H:%M:%S") if t.date else "",
                t.type.value,
                t.transaction_id or "",
                t.order_no or "",
                t.debit,
                t.discount,
                t.product_name or "",
                t.quantity,
                t.customer_name or t.supplier_id or ""
            ])
    
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={report_type}_report.csv"
    return response
