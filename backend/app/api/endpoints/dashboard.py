from typing import Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app import models
from app.api import deps
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

_EMPTY_SUMMARY = {
    "product_count": 0, "supplier_count": 0,
    "sales_amount": 0, "cost_price": 0,
    "profit": 0, "loss": 0, "sales_items": 0,
    "returns_amount": 0, "returns_items": 0,
    "low_stock_count": 0, "total_purchase": 0,
}


def _get_company_id(current_user: models.User, db: Session):
    """Resolve company_id; SuperAdmin without a company gets the first one."""
    if current_user.company_id is not None:
        return current_user.company_id
    first = db.query(models.Company).first()
    return first.id if first else None


def _start_date(timeframe: str) -> datetime:
    now = datetime.utcnow()
    if timeframe == "daily":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if timeframe == "weekly":
        return now - timedelta(days=7)
    if timeframe == "monthly":
        return now - timedelta(days=30)
    if timeframe == "yearly":
        return now - timedelta(days=365)
    return datetime.min  # "all" or unknown → no lower bound


def _sum_debit(db: Session, company_id: int, tx_type, start: datetime) -> float:
    """Helper: sum of stored debit for a given type and date range."""
    result = db.query(
        func.coalesce(func.sum(models.Transaction.debit), 0)
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == tx_type,
        models.Transaction.date >= start,
    ).scalar()
    return float(result or 0)


def _sum_debit_range(
    db: Session, company_id: int, tx_type,
    start: datetime, end: datetime
) -> float:
    """Helper: sum of stored debit for a given type within a date window."""
    result = db.query(
        func.coalesce(func.sum(models.Transaction.debit), 0)
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == tx_type,
        models.Transaction.date >= start,
        models.Transaction.date < end,
    ).scalar()
    return float(result or 0)


@router.get("/summary")
def get_dashboard_summary(
    timeframe: str = Query("monthly", description="daily | weekly | monthly | yearly | all"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    try:
        company_id = _get_company_id(current_user, db)
        if company_id is None:
            return {**_EMPTY_SUMMARY, "timeframe": timeframe}

        start = _start_date(timeframe)

        # ── Query 1: Combined Counts (One Trip) ─────────────────────────────
        counts = db.query(
            db.query(func.count(models.Product.id)).filter(models.Product.company_id == company_id).label("products"),
            db.query(func.count(models.Supplier.id)).filter(models.Supplier.company_id == company_id).label("suppliers"),
            db.query(func.count(models.Product.id)).filter(
                models.Product.company_id == company_id,
                models.Product.in_hand_qty <= 5,
                models.Product.status == "Active"
            ).label("low_stock")
        ).first()

        # ── Query 2: Combined Transaction Aggregates (One Trip) ─────────────
        tx_stats = db.query(
            models.Transaction.type,
            func.sum(models.Transaction.debit).label("total_debit"),
            func.sum(models.Transaction.quantity).label("total_qty")
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.date >= start
        ).group_by(models.Transaction.type).all()

        stats_map = {row.type: row for row in tx_stats}
        
        # Helper to get stats safely
        def get_stat(t_type):
            return stats_map.get(t_type) or type('obj', (object,), {'total_debit': 0, 'total_qty': 0})

        sale_stats = get_stat(models.TransactionTypeEnum.SALE)
        return_stats = get_stat(models.TransactionTypeEnum.REVERSE)
        purchase_stats = get_stat(models.TransactionTypeEnum.PURCHASE)

        # ── Query 3: Cost calculation (Needs JOIN, stays dedicated) ─────────
        cost_agg = db.query(
            func.coalesce(
                func.sum(models.Product.product_price * models.Transaction.quantity), 0
            ).label("total_cost")
        ).select_from(models.Transaction).join(
            models.Product,
            and_(
                models.Product.name == models.Transaction.product_name,
                models.Product.company_id == company_id,
            )
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == models.TransactionTypeEnum.SALE,
            models.Transaction.date >= start,
        ).first()

        total_sale_net = float(sale_stats.total_debit or 0)
        total_sales_items = int(sale_stats.total_qty or 0)
        total_cost = float(cost_agg.total_cost or 0)
        total_return = float(return_stats.total_debit or 0)
        total_return_items = int(return_stats.total_qty or 0)
        total_purchase = float(purchase_stats.total_debit or 0)

        net = total_sale_net - total_cost
        profit = round(net, 2) if net > 0 else 0
        loss = round(abs(net), 2) if net < 0 else 0

        return {
            "product_count": counts.products,
            "supplier_count": counts.suppliers,
            "sales_amount": round(total_sale_net, 2),
            "cost_price": round(total_cost, 2),
            "profit": profit,
            "loss": loss,
            "sales_items": total_sales_items,
            "returns_amount": round(total_return, 2),
            "returns_items": total_return_items,
            "low_stock_count": counts.low_stock,
            "total_purchase": round(total_purchase, 2),
            "timeframe": timeframe,
        }
    except Exception as e:
        logger.error(f"Dashboard summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dashboard error: {e}")


@router.get("/charts")
def get_dashboard_charts(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    try:
        company_id = _get_company_id(current_user, db)
        if company_id is None:
            return {
                "monthly_sales": [],
                "sales_distribution": [{"name": "No Products", "value": 1}],
                "top_products": [],
            }

        now = datetime.utcnow()
        # Ensure we start exactly from the beginning of the month, 11 months ago
        # (meaning 12 months total including the current month)
        start_month = now.month - 11
        start_year = now.year
        while start_month <= 0:
            start_month += 12
            start_year -= 1

        m_start_threshold = datetime(start_year, start_month, 1)

        # Execute ONE aggregated query grouped by year, month, and transaction type
        grouped_data = db.query(
            func.extract('year', models.Transaction.date).label('year'),
            func.extract('month', models.Transaction.date).label('month'),
            models.Transaction.type,
            func.sum(models.Transaction.debit).label('total')
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type.in_([models.TransactionTypeEnum.SALE, models.TransactionTypeEnum.PURCHASE]),
            models.Transaction.date >= m_start_threshold
        ).group_by(
            func.extract('year', models.Transaction.date),
            func.extract('month', models.Transaction.date),
            models.Transaction.type
        ).all()

        # Place the DB results into a quick lookup dictionary: {(year, month, 'sale'): total}
        data_map = {}
        for row in grouped_data:
            # SQLAlchemy extract returns float/Decimal sometimes depending on dialect
            yy = int(row.year)
            mm = int(row.month)
            t_type = row.type.value if hasattr(row.type, 'value') else row.type
            data_map[(yy, mm, t_type)] = float(row.total or 0)

        # Build the exact 12-month sequence expected by the frontend
        monthly_sales = []
        for i in range(11, -1, -1):
            target_month = now.month - i
            target_year = now.year
            while target_month <= 0:
                target_month += 12
                target_year -= 1

            # Get name strictly via standard datetime formatting
            month_date = datetime(target_year, target_month, 1)
            label = f"{month_date.strftime('%b')} '{target_year % 100:02d}"

            sales_val = data_map.get((target_year, target_month, models.TransactionTypeEnum.SALE.value), 0.0)
            purchase_val = data_map.get((target_year, target_month, models.TransactionTypeEnum.PURCHASE.value), 0.0)
            
            monthly_sales.append({
                "name": label,
                "sales": round(sales_val, 2),
                "purchases": round(purchase_val, 2),
            })

        # ── category distribution ────────────────────────────────────────────
        cat_results = db.query(
            func.coalesce(models.Product.category, "Uncategorized").label("category"),
            func.count(models.Product.id).label("count"),
        ).filter(
            models.Product.company_id == company_id
        ).group_by(
            func.coalesce(models.Product.category, "Uncategorized")
        ).order_by(func.count(models.Product.id).desc()).all()

        sales_distribution = [{"name": r.category, "value": r.count} for r in cat_results]
        if not sales_distribution:
            sales_distribution = [{"name": "No Products", "value": 1}]

        # ── top 5 products by qty sold (last 30 days) ────────────────────────
        thirty_ago = now - timedelta(days=30)
        top_products = db.query(
            models.Transaction.product_name,
            func.sum(models.Transaction.quantity).label("total_qty"),
            func.sum(models.Transaction.debit).label("total_revenue"),
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == models.TransactionTypeEnum.SALE,
            models.Transaction.date >= thirty_ago,
            models.Transaction.product_name.isnot(None),
        ).group_by(
            models.Transaction.product_name
        ).order_by(
            func.sum(models.Transaction.quantity).desc()
        ).limit(5).all()

        return {
            "monthly_sales": monthly_sales,
            "sales_distribution": sales_distribution,
            "top_products": [
                {
                    "name": r.product_name,
                    "qty": int(r.total_qty or 0),
                    "revenue": round(float(r.total_revenue or 0), 2),
                }
                for r in top_products
            ],
        }
    except Exception as e:
        logger.error(f"Dashboard charts error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Charts error: {e}")


@router.get("/recent-transactions")
def get_recent_transactions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    company_id = _get_company_id(current_user, db)
    if company_id is None:
        return []

    transactions = (
        db.query(models.Transaction)
        .filter(models.Transaction.company_id == company_id)
        .order_by(models.Transaction.date.desc())
        .limit(limit)
        .all()
    )
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
