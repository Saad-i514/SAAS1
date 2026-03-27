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

        # ── product / supplier counts ────────────────────────────────────────
        product_count = db.query(func.count(models.Product.id)).filter(
            models.Product.company_id == company_id
        ).scalar() or 0

        supplier_count = db.query(func.count(models.Supplier.id)).filter(
            models.Supplier.company_id == company_id
        ).scalar() or 0

        # ── sales: use stored debit (already net of discount) ────────────────
        sales_agg = db.query(
            func.coalesce(func.sum(models.Transaction.debit), 0).label("net_sale"),
            func.coalesce(func.sum(models.Transaction.quantity), 0).label("total_qty"),
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == models.TransactionTypeEnum.SALE,
            models.Transaction.date >= start,
        ).first()

        total_sale_net = float(sales_agg.net_sale or 0)
        total_sales_items = int(sales_agg.total_qty or 0)

        # ── cost of goods sold via JOIN on product name ──────────────────────
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

        total_cost = float(cost_agg.total_cost or 0)
        net = total_sale_net - total_cost
        profit = round(net, 2) if net > 0 else 0
        loss = round(abs(net), 2) if net < 0 else 0

        # ── returns (REVERSE type) ───────────────────────────────────────────
        returns_agg = db.query(
            func.coalesce(func.sum(models.Transaction.debit), 0).label("total_return"),
            func.coalesce(func.sum(models.Transaction.quantity), 0).label("total_qty"),
        ).filter(
            models.Transaction.company_id == company_id,
            models.Transaction.type == models.TransactionTypeEnum.REVERSE,
            models.Transaction.date >= start,
        ).first()

        total_return = float(returns_agg.total_return or 0)
        total_return_items = int(returns_agg.total_qty or 0)

        # ── low stock (≤ 5 units, active products) ───────────────────────────
        low_stock_count = db.query(func.count(models.Product.id)).filter(
            models.Product.company_id == company_id,
            models.Product.in_hand_qty <= 5,
            models.Product.status == "Active",
        ).scalar() or 0

        # ── total purchases in period ────────────────────────────────────────
        total_purchase = _sum_debit(
            db, company_id, models.TransactionTypeEnum.PURCHASE, start
        )

        return {
            "product_count": product_count,
            "supplier_count": supplier_count,
            "sales_amount": round(total_sale_net, 2),
            "cost_price": round(total_cost, 2),
            "profit": profit,
            "loss": loss,
            "sales_items": total_sales_items,
            "returns_amount": round(total_return, 2),
            "returns_items": total_return_items,
            "low_stock_count": low_stock_count,
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
        monthly_sales = []

        # Build 12-month rolling window — NO nested functions (avoids closure bug)
        for i in range(11, -1, -1):
            target_month = now.month - i
            target_year = now.year
            while target_month <= 0:
                target_month += 12
                target_year -= 1

            m_start = datetime(target_year, target_month, 1)
            m_end = (
                datetime(target_year + 1, 1, 1)
                if target_month == 12
                else datetime(target_year, target_month + 1, 1)
            )
            label = f"{m_start.strftime('%b')} '{target_year % 100:02d}"

            # Inline queries — no closure, dates are local variables
            sales_val = float(
                db.query(func.coalesce(func.sum(models.Transaction.debit), 0))
                .filter(
                    models.Transaction.company_id == company_id,
                    models.Transaction.type == models.TransactionTypeEnum.SALE,
                    models.Transaction.date >= m_start,
                    models.Transaction.date < m_end,
                ).scalar() or 0
            )
            purchase_val = float(
                db.query(func.coalesce(func.sum(models.Transaction.debit), 0))
                .filter(
                    models.Transaction.company_id == company_id,
                    models.Transaction.type == models.TransactionTypeEnum.PURCHASE,
                    models.Transaction.date >= m_start,
                    models.Transaction.date < m_end,
                ).scalar() or 0
            )

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
