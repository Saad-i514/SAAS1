import csv
import io
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
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
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_date


@router.get("/sales-summary")
def get_sales_report(
    timeframe: str = Query("daily", description="daily, weekly, monthly, yearly"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    start_date = get_date_range(timeframe)

    sales_query = db.query(models.Transaction, models.Product).outerjoin(
        models.Product,
        and_(
            models.Product.name == models.Transaction.product_name,
            models.Product.company_id == company_id
        )
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
        sale_p = round((tx.unit_price or 0) * qty, 2)
        cost_p = round((product.product_price if product else 0) * qty, 2)
        profit = round(sale_p - cost_p, 2)

        items.append({
            "date": tx.date.isoformat() if tx.date else None,
            "transaction_id": tx.transaction_id,
            "order_no": tx.order_no,
            "product_name": tx.product_name,
            "category": product.category if product else "N/A",
            "quantity": qty,
            "unit_sale_price": tx.unit_price or 0,
            "total_sale_price": sale_p,
            "total_cost_price": cost_p,
            "profit": profit,
            "customer_name": tx.customer_name,
            "payment_term": tx.payment_term,
            "discount": tx.discount or 0,
        })

        total_sales += sale_p
        total_cost += cost_p
        total_qty += qty

    total_profit = round(total_sales - total_cost, 2)
    summary = {
        "total_sales": round(total_sales, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": total_profit if total_profit > 0 else 0,
        "total_loss": abs(total_profit) if total_profit < 0 else 0,
        "total_quantity": total_qty
    }

    return {
        "timeframe": timeframe,
        "items": items,
        "summary": summary
    }


@router.get("/supplier-sales/{supplier_id}")
def get_supplier_sales_report(
    supplier_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all sales/transactions for a specific supplier (shop), grouped by category."""
    company_id = current_user.company_id
    
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == company_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    transactions = db.query(models.Transaction, models.Product).outerjoin(
        models.Product,
        and_(
            models.Product.name == models.Transaction.product_name,
            models.Product.company_id == company_id
        )
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.supplier_id == supplier_id
    ).order_by(models.Transaction.date.desc()).all()

    items = []
    category_summary = {}
    total_amount = 0.0
    total_qty = 0

    for tx, product in transactions:
        qty = tx.quantity or 0
        amount = round((tx.unit_price or 0) * qty, 2)
        category = (product.category if product else None) or "Uncategorized"

        items.append({
            "date": tx.date.isoformat() if tx.date else None,
            "type": tx.type.value if tx.type else None,
            "order_no": tx.order_no,
            "product_name": tx.product_name,
            "category": category,
            "quantity": qty,
            "unit_price": tx.unit_price or 0,
            "total_amount": amount,
            "payment_term": tx.payment_term,
            "discount": tx.discount or 0,
        })

        if category not in category_summary:
            category_summary[category] = {"qty": 0, "amount": 0.0, "transactions": 0}
        category_summary[category]["qty"] += qty
        category_summary[category]["amount"] = round(category_summary[category]["amount"] + amount, 2)
        category_summary[category]["transactions"] += 1
        total_amount += amount
        total_qty += qty

    return {
        "supplier": {
            "id": supplier.id,
            "name": supplier.name,
            "supplier_no": supplier.supplier_no,
            "phone": supplier.phone,
            "email": supplier.email,
        },
        "items": items,
        "category_summary": [
            {"category": k, **v} for k, v in category_summary.items()
        ],
        "total_amount": round(total_amount, 2),
        "total_qty": total_qty,
        "total_transactions": len(items)
    }


@router.get("/csv/{report_type}")
def download_report_csv(
    report_type: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    if report_type not in ["products", "suppliers", "transactions"]:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    company_id = current_user.company_id
    stream = io.StringIO()
    writer = csv.writer(stream)

    if report_type == "products":
        writer.writerow(["Article No", "Name", "Category", "Purchase Price", "Sale Price", "In Hand Qty", "Status"])
        products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
        for p in products:
            writer.writerow([p.article_no, p.name, p.category or "Uncategorized",
                             p.product_price, p.sale_price, p.in_hand_qty, p.status])

    elif report_type == "suppliers":
        writer.writerow(["Supplier No", "Name", "Email", "Phone", "Status"])
        suppliers = db.query(models.Supplier).filter(models.Supplier.company_id == company_id).all()
        for s in suppliers:
            writer.writerow([s.supplier_no, s.name, s.email or "", s.phone or "", s.status])

    elif report_type == "transactions":
        writer.writerow(["Date", "Type", "Transaction ID", "Order No", "Product", "Qty",
                         "Unit Price", "Total Amount", "Discount", "Customer/Supplier", "Payment Term"])
        transactions = db.query(models.Transaction).filter(
            models.Transaction.company_id == company_id
        ).order_by(models.Transaction.date.desc()).all()
        for t in transactions:
            writer.writerow([
                t.date.strftime("%Y-%m-%d %H:%M:%S") if t.date else "",
                t.type.value if t.type else "",
                t.transaction_id or "",
                t.order_no or "",
                t.product_name or "",
                t.quantity or 0,
                t.unit_price or 0,
                round((t.unit_price or 0) * (t.quantity or 0), 2),
                t.discount or 0,
                t.customer_name or "",
                t.payment_term or ""
            ])

    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={report_type}_report.csv"
    return response
