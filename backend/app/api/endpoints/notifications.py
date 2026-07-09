"""
Notification endpoints.

POST /notifications/daily-summary
  — Called by Vercel Cron at end of day (23:55 PKT = 18:55 UTC)
  — Secured with CRON_SECRET header to prevent public access
  — Queries today's KPIs and sends summary email to NOTIFY_EMAIL

POST /notifications/test-email
  — Admin-only endpoint to send a test email immediately
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app import models
from app.api import deps
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

_PKT = timezone(timedelta(hours=5))


def _get_today_utc_range():
    """Return (start_utc, end_utc) for today in PKT."""
    now_pkt = datetime.now(_PKT)
    start_pkt = now_pkt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_pkt   = start_pkt + timedelta(days=1)
    start_utc = start_pkt.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc   = end_pkt.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc


def _build_daily_summary(db: Session, company_id: int) -> dict:
    """Query today's KPIs for a company."""
    start_utc, end_utc = _get_today_utc_range()

    # Transaction aggregates
    tx_stats = db.query(
        models.Transaction.type,
        func.sum(models.Transaction.debit).label("total_debit"),
        func.sum(models.Transaction.quantity).label("total_qty"),
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.date >= start_utc,
        models.Transaction.date < end_utc,
    ).group_by(models.Transaction.type).all()

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

    # Cost of goods sold
    cost_row = db.query(
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
        models.Transaction.date < end_utc,
    ).first()

    total_cost = float(cost_row.total_cost or 0)
    net = total_sale - total_cost
    profit = round(net, 2) if net > 0 else 0
    loss   = round(abs(net), 2) if net < 0 else 0

    # Low stock count
    low_stock = db.query(func.count(models.Product.id)).filter(
        models.Product.company_id == company_id,
        models.Product.in_hand_qty <= 5,
        models.Product.status == "Active",
    ).scalar() or 0

    return {
        "sales_amount":    round(total_sale, 2),
        "sales_qty":       total_qty_sold,
        "cost_price":      round(total_cost, 2),
        "profit":          profit,
        "loss":            loss,
        "returns_amount":  round(total_return, 2),
        "total_purchase":  round(total_purchase, 2),
        "low_stock_count": int(low_stock),
    }


def _get_top_products_today(db: Session, company_id: int) -> list:
    start_utc, end_utc = _get_today_utc_range()
    results = db.query(
        models.Transaction.product_name,
        func.sum(models.Transaction.quantity).label("total_qty"),
        func.sum(models.Transaction.debit).label("total_revenue"),
    ).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.type == models.TransactionTypeEnum.SALE,
        models.Transaction.date >= start_utc,
        models.Transaction.date < end_utc,
        models.Transaction.product_name.isnot(None),
    ).group_by(models.Transaction.product_name).order_by(
        func.sum(models.Transaction.quantity).desc()
    ).limit(5).all()

    return [
        {
            "product_name":   r.product_name,
            "total_qty_sold": int(r.total_qty or 0),
            "total_revenue":  round(float(r.total_revenue or 0), 2),
        }
        for r in results
    ]


def _get_recent_transactions_today(db: Session, company_id: int) -> list:
    start_utc, end_utc = _get_today_utc_range()
    txs = db.query(models.Transaction).filter(
        models.Transaction.company_id == company_id,
        models.Transaction.date >= start_utc,
        models.Transaction.date < end_utc,
    ).order_by(models.Transaction.date.desc()).limit(10).all()

    return [
        {
            "type":          t.type.value if t.type else "",
            "product_name":  t.product_name,
            "customer_name": t.customer_name,
            "amount":        t.debit or 0,
            "order_no":      t.order_no,
        }
        for t in txs
    ]


# ---------------------------------------------------------------------------
# Cron endpoint — called by Vercel Cron
# ---------------------------------------------------------------------------

@router.api_route("/daily-summary", methods=["GET", "POST"])
async def send_daily_summary_cron(
    authorization: str = Header(None),
    x_cron_secret: str = Header(None, alias="x-cron-secret"),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Triggered by Vercel Cron at 23:55 PKT (18:55 UTC) every day.
    Sends end-of-day summary email to NOTIFY_EMAIL for every active company.

    Vercel Cron makes a GET request with `Authorization: Bearer <CRON_SECRET>`
    (auto-injected when a CRON_SECRET env var is set). We accept that, and also
    a manual `x-cron-secret` header for testing.
    """
    # Extract the secret from either Vercel's Bearer header or the manual header.
    provided = None
    if authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()
    elif x_cron_secret:
        provided = x_cron_secret

    if not settings.CRON_SECRET or provided != settings.CRON_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not settings.RESEND_API_KEY:
        return {"status": "skipped", "reason": "RESEND_API_KEY not configured"}

    from app.services.email import send_daily_summary

    companies = db.query(models.Company).all()
    results = []
    date_label = datetime.now(_PKT).strftime("%d %b %Y")

    for company in companies:
        try:
            summary      = _build_daily_summary(db, company.id)
            top_products = _get_top_products_today(db, company.id)
            recent_txs   = _get_recent_transactions_today(db, company.id)

            sent = await send_daily_summary(
                company_name=company.name,
                summary=summary,
                top_products=top_products,
                recent_transactions=recent_txs,
                date_label=date_label,
                to_email=settings.NOTIFY_EMAIL,
                from_email=settings.NOTIFY_FROM,
            )
            results.append({"company": company.name, "sent": sent})
        except Exception as e:
            logger.error(f"Daily summary failed for {company.name}: {e}", exc_info=True)
            results.append({"company": company.name, "sent": False, "error": str(e)})

    return {"status": "done", "date": date_label, "results": results}


# ---------------------------------------------------------------------------
# Test email endpoint — Admin only, for verifying setup
# ---------------------------------------------------------------------------

@router.post("/test-email")
async def send_test_email(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Send a test daily summary email immediately.
    Admin only — use this to verify your Resend + email setup.
    """
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    if not settings.RESEND_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="RESEND_API_KEY is not configured. Add it to your Vercel environment variables.",
        )

    from app.services.email import send_daily_summary

    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            raise HTTPException(status_code=400, detail="No company found")
        company_id = first.id

    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    company_name = company.name if company else "Test Company"

    summary      = _build_daily_summary(db, company_id)
    top_products = _get_top_products_today(db, company_id)
    recent_txs   = _get_recent_transactions_today(db, company_id)
    date_label   = datetime.now(_PKT).strftime("%d %b %Y") + " (TEST)"

    sent = await send_daily_summary(
        company_name=company_name,
        summary=summary,
        top_products=top_products,
        recent_transactions=recent_txs,
        date_label=date_label,
        to_email=settings.NOTIFY_EMAIL,
        from_email=settings.NOTIFY_FROM,
    )

    if sent:
        return {
            "status": "sent",
            "to": settings.NOTIFY_EMAIL,
            "message": f"Test email sent to {settings.NOTIFY_EMAIL}",
        }
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to send email. Check RESEND_API_KEY and NOTIFY_FROM in your environment variables.",
        )
