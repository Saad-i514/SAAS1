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


from app.utils import get_date_range


@router.get("/sales-summary")
def get_sales_report(
    timeframe: str = Query("daily", description="daily, weekly, monthly, yearly, all"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            return {"timeframe": timeframe, "items": [],
                    "summary": {"total_sales": 0, "total_cost": 0,
                                "total_profit": 0, "total_loss": 0, "total_quantity": 0}}
        company_id = first.id
    start_date = get_date_range(timeframe)

    sales_query = db.query(
        models.Transaction.date,
        models.Transaction.transaction_id,
        models.Transaction.order_no,
        models.Transaction.product_name,
        models.Transaction.quantity,
        models.Transaction.unit_price,
        models.Transaction.discount,
        models.Transaction.customer_name,
        models.Transaction.payment_term,
        models.Product.category,
        models.Product.product_price
    ).outerjoin(
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

    for row in sales_query:
        qty = row.quantity or 0
        discount = row.discount or 0
        # Net sale = (unit_price × qty) − discount
        sale_p = round(max(0.0, (row.unit_price or 0) * qty - discount), 2)
        cost_p = round((row.product_price or 0) * qty, 2)
        profit = round(sale_p - cost_p, 2)

        items.append({
            "date": row.date.isoformat() if row.date else None,
            "transaction_id": row.transaction_id,
            "order_no": row.order_no,
            "product_name": row.product_name,
            "category": row.category or "N/A",
            "quantity": qty,
            "unit_sale_price": row.unit_price or 0,
            "total_sale_price": sale_p,
            "total_cost_price": cost_p,
            "profit": profit,
            "customer_name": row.customer_name,
            "payment_term": row.payment_term,
            "discount": discount,
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
    timeframe: str = Query("all", description="daily, weekly, monthly, yearly, all"),
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

    start_date = get_date_range(timeframe)

    transactions = db.query(
        models.Transaction.date,
        models.Transaction.type,
        models.Transaction.order_no,
        models.Transaction.product_name,
        models.Transaction.quantity,
        models.Transaction.unit_price,
        models.Transaction.discount,
        models.Transaction.payment_term,
        models.Product.category
    ).outerjoin(
        models.Product,
        and_(
            models.Product.name == models.Transaction.product_name,
            models.Product.company_id == company_id
        )
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.supplier_id == supplier_id,
        models.Transaction.date >= start_date
    ).order_by(models.Transaction.date.desc()).all()

    items = []
    category_summary = {}
    total_amount = 0.0
    total_qty = 0

    for row in transactions:
        qty = row.quantity or 0
        discount = row.discount or 0
        amount = round(max(0.0, (row.unit_price or 0) * qty - discount), 2)
        category = row.category or "Uncategorized"

        items.append({
            "date": row.date.isoformat() if row.date else None,
            "type": row.type.value if row.type else None,
            "order_no": row.order_no,
            "product_name": row.product_name,
            "category": category,
            "quantity": qty,
            "unit_price": row.unit_price or 0,
            "total_amount": amount,
            "payment_term": row.payment_term,
            "discount": discount,
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


@router.get("/customer-search")
def search_customer_report(
    customer_name: str = Query(..., description="Customer / shop name (partial match)"),
    timeframe: str = Query("all", description="daily, weekly, monthly, yearly, all"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """All products sold/purchased for a specific customer/shop name."""
    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            return {"customer_name": customer_name, "items": [], "product_summary": [],
                    "total_amount": 0, "total_qty": 0, "total_transactions": 0}
        company_id = first.id

    start_date = get_date_range(timeframe)

    transactions = db.query(
        models.Transaction.id,
        models.Transaction.date,
        models.Transaction.type,
        models.Transaction.order_no,
        models.Transaction.product_name,
        models.Transaction.quantity,
        models.Transaction.unit_price,
        models.Transaction.discount,
        models.Transaction.debit,
        models.Transaction.payment_term,
        models.Product.category
    ).outerjoin(
        models.Product,
        and_(
            models.Product.name == models.Transaction.product_name,
            models.Product.company_id == company_id,
        )
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.customer_name.ilike(f"%{customer_name}%"),
        models.Transaction.date >= start_date
    ).order_by(models.Transaction.date.desc()).all()

    items = []
    product_summary: dict = {}
    total_amount = 0.0
    total_qty = 0

    for row in transactions:
        qty = row.quantity or 0
        # Use stored debit — already calculated server-side
        amount = round(row.debit or 0, 2)
        category = row.category or "Uncategorized"
        total_amount += amount
        total_qty += qty

        items.append({
            "id": row.id,
            "date": row.date.isoformat() if row.date else None,
            "type": row.type.value if row.type else None,
            "order_no": row.order_no,
            "product_name": row.product_name,
            "category": category,
            "quantity": qty,
            "unit_price": row.unit_price or 0,
            "discount": row.discount or 0,
            "total_amount": amount,
            "payment_term": row.payment_term,
        })

        pname = row.product_name or "Unknown"
        if pname not in product_summary:
            product_summary[pname] = {"qty": 0, "amount": 0.0, "transactions": 0, "category": category}
        product_summary[pname]["qty"] += qty
        product_summary[pname]["amount"] = round(product_summary[pname]["amount"] + amount, 2)
        product_summary[pname]["transactions"] += 1

    return {
        "customer_name": customer_name,
        "items": items,
        "product_summary": [{"product": k, **v} for k, v in product_summary.items()],
        "total_amount": round(total_amount, 2),
        "total_qty": total_qty,
        "total_transactions": len(items),
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
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            raise HTTPException(status_code=404, detail="No company found")
        company_id = first.id
    stream = io.StringIO()
    writer = csv.writer(stream)

    if report_type == "products":
        writer.writerow(["Article No", "Name", "Category", "Purchase Price", "Sale Price", "In Hand Qty", "Status"])
        products = db.query(models.Product).filter(models.Product.company_id == company_id).yield_per(1000)
        for p in products:
            writer.writerow([p.article_no, p.name, p.category or "Uncategorized",
                             p.product_price, p.sale_price, p.in_hand_qty, p.status])

    elif report_type == "suppliers":
        writer.writerow(["Supplier No", "Name", "Email", "Phone", "Status"])
        suppliers = db.query(models.Supplier).filter(models.Supplier.company_id == company_id).yield_per(1000)
        for s in suppliers:
            writer.writerow([s.supplier_no, s.name, s.email or "", s.phone or "", s.status])

    elif report_type == "transactions":
        writer.writerow(["Date", "Type", "Order No", "Product", "Qty",
                         "Unit Price", "Discount", "Net Amount", "Customer/Supplier", "Payment Term"])
        transactions = db.query(models.Transaction).filter(
            models.Transaction.company_id == company_id
        ).order_by(models.Transaction.date.desc()).yield_per(1000)
        for t in transactions:
            writer.writerow([
                t.date.strftime("%Y-%m-%d %H:%M:%S") if t.date else "",
                t.type.value if t.type else "",
                t.order_no or "",
                t.product_name or "",
                t.quantity or 0,
                round(t.unit_price or 0, 2),
                round(t.discount or 0, 2),
                round(t.debit or 0, 2),   # stored net amount (already discount-adjusted)
                t.customer_name or "",
                t.payment_term or "",
            ])

    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={report_type}_report.csv"
    return response
