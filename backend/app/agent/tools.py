"""
Database query tools for the LangGraph agent.
Each tool is scoped to the authenticated user's company (multi-tenant safe).
All tools are READ-ONLY — no INSERT/UPDATE/DELETE.
"""
from __future__ import annotations

import logging
from typing import Optional
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# PKT timezone offset (UTC+5) — used as default for all date calculations
_TZ_OFFSET = 5


from app.utils import utc_date_to_local


# ---------------------------------------------------------------------------
# Internal helper: run a full KPI summary between two UTC datetimes
# ---------------------------------------------------------------------------

def _run_summary(db, company_id: int, start_utc, end_utc=None) -> dict:
    """
    Core KPI aggregation between start_utc and end_utc.
    end_utc=None means no upper bound (open-ended).
    Returns sales, purchases, returns, profit, loss, product/supplier/low-stock counts.
    """
    from app import models
    from sqlalchemy import func, and_
    from datetime import datetime

    # ── Counts (not time-filtered — always current totals) ──────────────────
    counts = db.query(
        db.query(func.count(models.Product.id))
          .filter(models.Product.company_id == company_id).label("products"),
        db.query(func.count(models.Supplier.id))
          .filter(models.Supplier.company_id == company_id).label("suppliers"),
        db.query(func.count(models.Product.id))
          .filter(
              models.Product.company_id == company_id,
              models.Product.in_hand_qty <= 5,
              models.Product.status == "Active"
          ).label("low_stock")
    ).first()

    # ── Transaction aggregates ───────────────────────────────────────────────
    tx_q = db.query(
        models.Transaction.type,
        func.sum(models.Transaction.debit).label("total_debit"),
        func.sum(models.Transaction.quantity).label("total_qty"),
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.date >= start_utc,
    )
    if end_utc:
        tx_q = tx_q.filter(models.Transaction.date < end_utc)
    tx_stats = tx_q.group_by(models.Transaction.type).all()

    stats_map = {row.type: row for row in tx_stats}

    def _s(t):
        return stats_map.get(t) or type("_", (), {"total_debit": 0, "total_qty": 0})()

    sale_s     = _s(models.TransactionTypeEnum.SALE)
    purchase_s = _s(models.TransactionTypeEnum.PURCHASE)
    return_s   = _s(models.TransactionTypeEnum.REVERSE)

    total_sale     = float(sale_s.total_debit or 0)
    total_purchase = float(purchase_s.total_debit or 0)
    total_return   = float(return_s.total_debit or 0)
    total_qty_sold = int(sale_s.total_qty or 0)

    # ── Cost of goods sold (join product purchase price × qty sold) ──────────
    cost_q = db.query(
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
        models.Transaction.date >= start_utc,
    )
    if end_utc:
        cost_q = cost_q.filter(models.Transaction.date < end_utc)
    cost_row = cost_q.first()

    total_cost = float(cost_row.total_cost or 0)
    net = total_sale - total_cost
    profit = round(net, 2) if net > 0 else 0
    loss   = round(abs(net), 2) if net < 0 else 0

    return {
        "product_count":   counts.products,
        "supplier_count":  counts.suppliers,
        "low_stock_count": counts.low_stock,
        "sales_amount":    round(total_sale, 2),
        "sales_qty":       total_qty_sold,
        "cost_price":      round(total_cost, 2),
        "profit":          profit,
        "loss":            loss,
        "returns_amount":  round(total_return, 2),
        "total_purchase":  round(total_purchase, 2),
    }


# ---------------------------------------------------------------------------
# Tool 1 — Dashboard summary (today / yesterday / weekly / monthly / yearly / all)
# ---------------------------------------------------------------------------

@tool
def get_dashboard_summary(company_id: int, timeframe: str = "monthly") -> dict:
    """
    Get business KPI summary including sales, profit, loss, cost, returns,
    purchases, product count, supplier count, and low-stock count.

    timeframe options:
      daily     → from today's local midnight until now
      yesterday → the full previous calendar day (local time, PKT UTC+5)
      weekly    → from last Monday until now
      monthly   → from the 1st of this month until now
      yearly    → from Jan 1 of this year until now
      all       → all time

    Use timeframe="yesterday" when the user asks about "yesterday",
    "the day before today", "last day", or a specific past date that is yesterday.
    """
    try:
        from app.core.database import SessionLocal
        from app.utils import get_date_range
        from datetime import datetime, timedelta, timezone

        db = SessionLocal()
        try:
            tz = timezone(timedelta(hours=_TZ_OFFSET))
            now_local = datetime.now(tz)

            if timeframe == "yesterday":
                # Full yesterday: local midnight yesterday → local midnight today (in UTC)
                local_yesterday_start = (now_local - timedelta(days=1)).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                local_today_start = now_local.replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                start_utc = local_yesterday_start.astimezone(timezone.utc).replace(tzinfo=None)
                end_utc   = local_today_start.astimezone(timezone.utc).replace(tzinfo=None)
                date_label = (now_local - timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                start_utc = get_date_range(timeframe, _TZ_OFFSET)
                end_utc   = None
                date_label = timeframe

            result = _run_summary(db, company_id, start_utc, end_utc)
            result["timeframe"] = date_label
            return result

        finally:
            db.close()

    except Exception as e:
        logger.error(f"get_dashboard_summary error: {e}", exc_info=True)
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Tool 2 — Summary for a specific calendar date  e.g. "2026-05-20"
# ---------------------------------------------------------------------------

@tool
def get_summary_by_date(company_id: int, date: str) -> dict:
    """
    Get full KPI summary for a specific calendar date (YYYY-MM-DD format).
    Use this when the user asks about a specific date like "May 20", "2026-05-20",
    "last Friday", or any named date that is not today/yesterday/this week/month/year.

    Returns sales, profit, loss, cost, returns, purchases, and transaction count
    for that single day only (local PKT time, UTC+5).
    """
    try:
        from app.core.database import SessionLocal
        from app.utils import get_end_of_day_utc

        db = SessionLocal()
        try:
            start_utc, end_utc = get_end_of_day_utc(date, _TZ_OFFSET)
            result = _run_summary(db, company_id, start_utc, end_utc)
            result["date"] = date
            return result
        finally:
            db.close()

    except ValueError:
        return {"error": f"Invalid date format '{date}'. Please use YYYY-MM-DD (e.g. 2026-05-20)."}
    except Exception as e:
        logger.error(f"get_summary_by_date error: {e}", exc_info=True)
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Tool 3 — Products list
# ---------------------------------------------------------------------------

@tool
def get_products(company_id: int, search: Optional[str] = None, low_stock_only: bool = False) -> list:
    """
    List products for the company. Optionally filter by name search or low stock (<=5 units).
    Returns article_no, name, category, purchase_price, sale_price, in_hand_qty, status.
    """
    try:
        from app.core.database import SessionLocal
        from app import models

        db = SessionLocal()
        try:
            q = db.query(models.Product).filter(models.Product.company_id == company_id)
            if search:
                q = q.filter(models.Product.name.ilike(f"%{search}%"))
            if low_stock_only:
                q = q.filter(models.Product.in_hand_qty <= 5, models.Product.status == "Active")
            products = q.order_by(models.Product.name).limit(50).all()
            return [
                {
                    "id": p.id,
                    "article_no": p.article_no,
                    "name": p.name,
                    "category": p.category or "Uncategorized",
                    "purchase_price": p.product_price,
                    "sale_price": p.sale_price,
                    "in_hand_qty": p.in_hand_qty,
                    "status": p.status,
                }
                for p in products
            ]
        finally:
            db.close()
    except Exception as e:
        logger.error(f"get_products error: {e}", exc_info=True)
        return [{"error": str(e)}]


# ---------------------------------------------------------------------------
# Tool 4 — Suppliers list
# ---------------------------------------------------------------------------

@tool
def get_suppliers(company_id: int, search: Optional[str] = None) -> list:
    """
    List suppliers for the company. Optionally filter by name search.
    Returns id, supplier_no, name, email, phone, status.
    """
    try:
        from app.core.database import SessionLocal
        from app import models

        db = SessionLocal()
        try:
            q = db.query(models.Supplier).filter(models.Supplier.company_id == company_id)
            if search:
                q = q.filter(models.Supplier.name.ilike(f"%{search}%"))
            suppliers = q.order_by(models.Supplier.name).limit(50).all()
            return [
                {
                    "id": s.id,
                    "supplier_no": s.supplier_no,
                    "name": s.name,
                    "email": s.email or "",
                    "phone": s.phone or "",
                    "status": s.status,
                }
                for s in suppliers
            ]
        finally:
            db.close()
    except Exception as e:
        logger.error(f"get_suppliers error: {e}", exc_info=True)
        return [{"error": str(e)}]


# ---------------------------------------------------------------------------
# Tool 5 — Recent transactions list
# ---------------------------------------------------------------------------

@tool
def get_recent_transactions(
    company_id: int,
    limit: int = 10,
    transaction_type: Optional[str] = None,
) -> list:
    """
    Get recent transactions for the company (most recent first).
    Use this to LIST individual transactions, not for KPI summaries.
    For summaries (totals, profit, sales amount) use get_dashboard_summary instead.

    transaction_type options: sale | purchase | reverse | return | payment
    Returns id, type, product_name, quantity, amount, customer_name, date, order_no.
    """
    try:
        from app.core.database import SessionLocal
        from app import models

        db = SessionLocal()
        try:
            q = db.query(models.Transaction).filter(
                models.Transaction.company_id == company_id
            )
            if transaction_type:
                try:
                    tx_enum = models.TransactionTypeEnum(transaction_type.lower())
                    q = q.filter(models.Transaction.type == tx_enum)
                except ValueError:
                    pass
            transactions = q.order_by(models.Transaction.date.desc()).limit(min(limit, 50)).all()
            return [
                {
                    "id": t.id,
                    "type": t.type.value if t.type else None,
                    "product_name": t.product_name,
                    "quantity": t.quantity,
                    "amount": t.debit,
                    "customer_name": t.customer_name,
                    "date": utc_date_to_local(t.date) if t.date else None,
                    "order_no": t.order_no,
                }
                for t in transactions
            ]
        finally:
            db.close()
    except Exception as e:
        logger.error(f"get_recent_transactions error: {e}", exc_info=True)
        return [{"error": str(e)}]


# ---------------------------------------------------------------------------
# Tool 6 — Customer transaction search
# ---------------------------------------------------------------------------

@tool
def search_customer_transactions(company_id: int, customer_name: str) -> dict:
    """
    Search all transactions for a specific customer/shop name (partial match).
    Returns transaction list, product summary, total amount, and total quantity.
    """
    try:
        from app.core.database import SessionLocal
        from app import models

        db = SessionLocal()
        try:
            transactions = db.query(models.Transaction).filter(
                models.Transaction.company_id == company_id,
                models.Transaction.customer_name.ilike(f"%{customer_name}%"),
            ).order_by(models.Transaction.date.desc()).limit(100).all()

            product_summary: dict = {}
            total_amount = 0.0
            items = []

            for tx in transactions:
                qty = tx.quantity or 0
                amount = round(tx.debit or 0, 2)
                total_amount += amount
                items.append({
                    "date": utc_date_to_local(tx.date) if tx.date else None,
                    "type": tx.type.value if tx.type else None,
                    "product_name": tx.product_name,
                    "quantity": qty,
                    "amount": amount,
                    "order_no": tx.order_no,
                })
                pname = tx.product_name or "Unknown"
                if pname not in product_summary:
                    product_summary[pname] = {"qty": 0, "amount": 0.0}
                product_summary[pname]["qty"] += qty
                product_summary[pname]["amount"] = round(
                    product_summary[pname]["amount"] + amount, 2
                )

            return {
                "customer_name": customer_name,
                "total_transactions": len(items),
                "total_amount": round(total_amount, 2),
                "product_summary": [{"product": k, **v} for k, v in product_summary.items()],
                "recent_transactions": items[:20],
            }
        finally:
            db.close()
    except Exception as e:
        logger.error(f"search_customer_transactions error: {e}", exc_info=True)
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Tool 7 — Top selling products
# ---------------------------------------------------------------------------

@tool
def get_top_products(company_id: int, days: int = 30) -> list:
    """
    Get top 10 best-selling products by quantity in the last N days.
    Returns product_name, total_qty_sold, total_revenue.
    """
    try:
        from app.core.database import SessionLocal
        from app import models
        from sqlalchemy import func
        from datetime import datetime, timedelta

        db = SessionLocal()
        try:
            since = datetime.utcnow() - timedelta(days=days)
            results = db.query(
                models.Transaction.product_name,
                func.sum(models.Transaction.quantity).label("total_qty"),
                func.sum(models.Transaction.debit).label("total_revenue"),
            ).filter(
                models.Transaction.company_id == company_id,
                models.Transaction.type == models.TransactionTypeEnum.SALE,
                models.Transaction.date >= since,
                models.Transaction.product_name.isnot(None),
            ).group_by(models.Transaction.product_name).order_by(
                func.sum(models.Transaction.quantity).desc()
            ).limit(10).all()

            return [
                {
                    "product_name": r.product_name,
                    "total_qty_sold": int(r.total_qty or 0),
                    "total_revenue": round(float(r.total_revenue or 0), 2),
                }
                for r in results
            ]
        finally:
            db.close()
    except Exception as e:
        logger.error(f"get_top_products error: {e}", exc_info=True)
        return [{"error": str(e)}]
