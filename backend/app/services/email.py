"""
Email notification service using Resend API.
Sends:
  1. Transaction alert — fired on every sale/purchase/bulk order
  2. Daily summary — fired at end of day via cron endpoint

Set in Vercel environment variables:
  RESEND_API_KEY   — from resend.com (free tier: 3000 emails/month)
  NOTIFY_EMAIL     — recipient address (gulraiz.butt9@gmail.com)
  NOTIFY_FROM      — sender address (must be verified in Resend, e.g. noreply@yourdomain.com)
                     For testing you can use: onboarding@resend.dev
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# PKT timezone (UTC+5)
_PKT = timezone(timedelta(hours=5))


def _fmt_currency(amount: float) -> str:
    return f"Rs {amount:,.2f}"


def _fmt_dt(dt: Optional[datetime]) -> str:
    if not dt:
        return "—"
    local = dt.replace(tzinfo=timezone.utc).astimezone(_PKT)
    return local.strftime("%d %b %Y, %I:%M %p")


def _get_resend_client():
    """Return configured resend module or None if key not set."""
    try:
        import resend
        from app.core.config import settings
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not set — email notifications disabled")
            return None
        resend.api_key = settings.RESEND_API_KEY
        return resend
    except ImportError:
        logger.warning("resend package not installed — email notifications disabled")
        return None


# ---------------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------------

def _base_html(title: str, body: str, company_name: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
  .container {{ max-width: 600px; margin: 0 auto; background: white;
               border-radius: 12px; overflow: hidden;
               box-shadow: 0 4px 6px rgba(0,0,0,0.07); }}
  .header {{ background: linear-gradient(135deg, #4f46e5, #7c3aed);
             padding: 24px 32px; color: white; }}
  .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
  .header p  {{ margin: 4px 0 0; font-size: 13px; opacity: 0.85; }}
  .body {{ padding: 28px 32px; }}
  .stat-grid {{ display: grid; grid-template-columns: 1fr 1fr;
               gap: 12px; margin: 20px 0; }}
  .stat {{ background: #f1f5f9; border-radius: 8px; padding: 14px 16px; }}
  .stat .label {{ font-size: 11px; color: #64748b; font-weight: 600;
                  text-transform: uppercase; letter-spacing: 0.05em; }}
  .stat .value {{ font-size: 20px; font-weight: 800; color: #1e293b; margin-top: 4px; }}
  .stat.green .value {{ color: #059669; }}
  .stat.red   .value {{ color: #dc2626; }}
  .stat.blue  .value {{ color: #2563eb; }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }}
  th {{ background: #f8fafc; padding: 10px 12px; text-align: left;
        font-size: 11px; font-weight: 700; color: #64748b;
        text-transform: uppercase; letter-spacing: 0.05em;
        border-bottom: 2px solid #e2e8f0; }}
  td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #374151; }}
  tr:last-child td {{ border-bottom: none; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 20px;
            font-size: 11px; font-weight: 700; text-transform: uppercase; }}
  .badge-sale     {{ background: #d1fae5; color: #065f46; }}
  .badge-purchase {{ background: #dbeafe; color: #1e40af; }}
  .badge-reverse  {{ background: #ffedd5; color: #9a3412; }}
  .badge-return   {{ background: #fef3c7; color: #92400e; }}
  .badge-payment  {{ background: #ede9fe; color: #5b21b6; }}
  .footer {{ background: #f8fafc; padding: 16px 32px; font-size: 12px;
             color: #94a3b8; border-top: 1px solid #e2e8f0; }}
  .divider {{ border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }}
  h2 {{ font-size: 15px; font-weight: 700; color: #1e293b; margin: 24px 0 12px; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📊 {title}</h1>
    <p>{company_name} · BizManager Pro</p>
  </div>
  <div class="body">
    {body}
  </div>
  <div class="footer">
    This is an automated notification from BizManager Pro.
    Sent at {datetime.now(_PKT).strftime("%d %b %Y, %I:%M %p")} PKT
  </div>
</div>
</body>
</html>"""


def _badge(tx_type: str) -> str:
    return f'<span class="badge badge-{tx_type}">{tx_type}</span>'


# ---------------------------------------------------------------------------
# 1. Transaction alert email
# ---------------------------------------------------------------------------

def build_transaction_email(
    company_name: str,
    tx_type: str,
    order_no: str,
    items: list[dict],
    total_amount: float,
    customer_name: Optional[str],
    payment_term: Optional[str],
    tx_date: datetime,
) -> tuple[str, str]:
    """Return (subject, html) for a transaction notification."""

    type_label = tx_type.upper()
    subject = f"[{company_name}] New {type_label} — {order_no} — {_fmt_currency(total_amount)}"

    rows = ""
    for item in items:
        qty = item.get("quantity", 0)
        price = item.get("unit_price", 0)
        disc = item.get("discount", 0)
        total = round(max(0.0, qty * price - disc), 2)
        rows += f"""<tr>
          <td>{item.get('product_name', '—')}</td>
          <td style="text-align:center">{qty}</td>
          <td style="text-align:right">{_fmt_currency(price)}</td>
          <td style="text-align:right">{_fmt_currency(disc) if disc else '—'}</td>
          <td style="text-align:right; font-weight:700">{_fmt_currency(total)}</td>
        </tr>"""

    customer_row = f"<p><strong>Customer / Shop:</strong> {customer_name}</p>" if customer_name else ""
    payment_row = f"<p><strong>Payment Term:</strong> {payment_term or 'Cash'}</p>" if payment_term else ""

    body = f"""
    <p style="color:#64748b; font-size:13px; margin:0 0 16px">
      A new transaction has been recorded in your system.
    </p>

    <div class="stat-grid">
      <div class="stat blue">
        <div class="label">Transaction Type</div>
        <div class="value" style="font-size:16px">{_badge(tx_type)} {type_label}</div>
      </div>
      <div class="stat">
        <div class="label">Order No</div>
        <div class="value" style="font-size:16px">{order_no}</div>
      </div>
      <div class="stat green">
        <div class="label">Total Amount</div>
        <div class="value">{_fmt_currency(total_amount)}</div>
      </div>
      <div class="stat">
        <div class="label">Date & Time</div>
        <div class="value" style="font-size:13px; margin-top:6px">{_fmt_dt(tx_date)}</div>
      </div>
    </div>

    {customer_row}
    {payment_row}

    <h2>📦 Items ({len(items)})</h2>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Discount</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right; font-weight:700; padding-top:12px">
            Grand Total
          </td>
          <td style="text-align:right; font-weight:800; font-size:15px; color:#4f46e5; padding-top:12px">
            {_fmt_currency(total_amount)}
          </td>
        </tr>
      </tfoot>
    </table>
    """

    html = _base_html(f"New {type_label} — {order_no}", body, company_name)
    return subject, html


# ---------------------------------------------------------------------------
# 2. Daily summary email
# ---------------------------------------------------------------------------

def build_daily_summary_email(
    company_name: str,
    summary: dict,
    top_products: list[dict],
    recent_transactions: list[dict],
    date_label: str,
) -> tuple[str, str]:
    """Return (subject, html) for the end-of-day summary."""

    profit = summary.get("profit", 0)
    loss = summary.get("loss", 0)
    is_profit = profit >= loss

    subject = f"[{company_name}] Daily Summary — {date_label} — {'Profit' if is_profit else 'Loss'} {_fmt_currency(profit if is_profit else loss)}"

    # Top products table
    top_rows = ""
    for i, p in enumerate(top_products[:5], 1):
        top_rows += f"""<tr>
          <td style="color:#94a3b8; font-weight:700">#{i}</td>
          <td>{p.get('product_name', '—')}</td>
          <td style="text-align:center">{p.get('total_qty_sold', 0)}</td>
          <td style="text-align:right; font-weight:700">{_fmt_currency(p.get('total_revenue', 0))}</td>
        </tr>"""

    # Recent transactions table
    tx_rows = ""
    for tx in recent_transactions[:8]:
        tx_rows += f"""<tr>
          <td>{_badge(tx.get('type',''))}</td>
          <td>{tx.get('product_name') or tx.get('customer_name') or '—'}</td>
          <td>{tx.get('customer_name') or '—'}</td>
          <td style="text-align:right; font-weight:700">{_fmt_currency(tx.get('amount', 0))}</td>
        </tr>"""

    net_class = "green" if is_profit else "red"
    net_label = "Net Profit" if is_profit else "Net Loss"
    net_value = profit if is_profit else loss

    body = f"""
    <p style="color:#64748b; font-size:13px; margin:0 0 16px">
      Here is your business summary for <strong>{date_label}</strong>.
    </p>

    <div class="stat-grid">
      <div class="stat {net_class}">
        <div class="label">{net_label}</div>
        <div class="value">{_fmt_currency(net_value)}</div>
      </div>
      <div class="stat blue">
        <div class="label">Total Sales</div>
        <div class="value">{_fmt_currency(summary.get('sales_amount', 0))}</div>
      </div>
      <div class="stat">
        <div class="label">Total Purchases</div>
        <div class="value">{_fmt_currency(summary.get('total_purchase', 0))}</div>
      </div>
      <div class="stat">
        <div class="label">Items Sold</div>
        <div class="value">{summary.get('sales_qty', 0):,}</div>
      </div>
      <div class="stat">
        <div class="label">Returns</div>
        <div class="value">{_fmt_currency(summary.get('returns_amount', 0))}</div>
      </div>
      <div class="stat">
        <div class="label">Low Stock Alerts</div>
        <div class="value" style="color:{'#d97706' if summary.get('low_stock_count',0) > 0 else '#1e293b'}">
          {summary.get('low_stock_count', 0)}
        </div>
      </div>
    </div>

    {'<h2>🏆 Top Products Today</h2><table><thead><tr><th>#</th><th>Product</th><th style="text-align:center">Qty Sold</th><th style="text-align:right">Revenue</th></tr></thead><tbody>' + top_rows + '</tbody></table>' if top_rows else '<p style="color:#94a3b8; font-size:13px">No sales recorded today.</p>'}

    {'<h2>🕐 Recent Transactions</h2><table><thead><tr><th>Type</th><th>Product</th><th>Customer</th><th style="text-align:right">Amount</th></tr></thead><tbody>' + tx_rows + '</tbody></table>' if tx_rows else ''}
    """

    html = _base_html(f"Daily Summary — {date_label}", body, company_name)
    return subject, html


# ---------------------------------------------------------------------------
# Send helpers
# ---------------------------------------------------------------------------

async def send_transaction_notification(
    company_name: str,
    tx_type: str,
    order_no: str,
    items: list[dict],
    total_amount: float,
    customer_name: Optional[str],
    payment_term: Optional[str],
    tx_date: datetime,
    to_email: str,
    from_email: str,
) -> bool:
    """Send transaction alert email. Returns True on success."""
    resend = _get_resend_client()
    if not resend:
        return False
    try:
        subject, html = build_transaction_email(
            company_name, tx_type, order_no, items,
            total_amount, customer_name, payment_term, tx_date
        )
        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Transaction email sent: {order_no} → {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send transaction email: {e}", exc_info=True)
        return False


async def send_daily_summary(
    company_name: str,
    summary: dict,
    top_products: list[dict],
    recent_transactions: list[dict],
    date_label: str,
    to_email: str,
    from_email: str,
) -> bool:
    """Send daily summary email. Returns True on success."""
    resend = _get_resend_client()
    if not resend:
        return False
    try:
        subject, html = build_daily_summary_email(
            company_name, summary, top_products, recent_transactions, date_label
        )
        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Daily summary email sent → {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send daily summary email: {e}", exc_info=True)
        return False
