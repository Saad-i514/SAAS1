"""
LangGraph agent for the Business Management System.
- General chat/DB queries  → Ollama cloud (qwen model) via OpenAI-compatible API
- Image vision/OCR         → Mistral pixtral model
Scoped per authenticated user (multi-tenant safe).
"""
from __future__ import annotations

import logging
from typing import Annotated, TypedDict, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages

from app.agent.tools import (
    get_dashboard_summary,
    get_summary_by_date,
    get_products,
    get_suppliers,
    get_recent_transactions,
    search_customer_transactions,
    get_top_products,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Full app navigation & usage guide — fed into system prompt so the bot can
# guide users around the entire application.
# ---------------------------------------------------------------------------
APP_GUIDE = """
## BizManager Pro — Complete App Guide

### Pages & Navigation
| Page | Role Access | URL |
|------|-------------|-----|
| Dashboard | Admin, Operator | / |
| Suppliers | Admin, Operator | /suppliers |
| Products | Admin, Operator | /products |
| Employees/Users | Admin only | /users |
| Reports | Admin only | /reports |
| Tenant Management | SuperAdmin only | / |

---

### 📊 Dashboard
- Shows KPI cards: Net Profit/Loss, Total Sales, Items Sold, Returns
- Secondary KPIs: Total Products, Suppliers, Low Stock alerts, Purchases
- Charts: 12-month Revenue Trend (Sales vs Purchases), Product Category Distribution
- Top Products (last 30 days by quantity sold)
- Recent Activity (latest transactions)
- Timeframe filter: Today / 7 Days / 30 Days / 1 Year / All Time
- **Bulk Order** button: add multiple products in one order
- **Customer Search** button: find all transactions for a customer/shop
- Live updates via SSE (real-time when new transactions are recorded)

---

### 🏭 Suppliers Page (/suppliers)
- List all suppliers with: Supplier No, Name, Email, Phone, Status
- Add new supplier (Admin/Operator)
- Edit supplier details
- Delete supplier (Admin only)
- Click a supplier row to view all their transactions
- Search suppliers by name

---

### 📦 Products Page (/products)
- List all products with: Article No, Name, Category, Purchase Price, Sale Price, Margin %, Stock Qty, Status
- Add new product: requires Article No (SKU), Name, Category, Purchase Price, Sale Price
- Edit product details
- Delete product (Admin only)
- Low stock warning: products with ≤5 units are highlighted in amber
- Filter by category, status, or search by name/article no
- **Quick Transaction** button: record a single sale/purchase
- **Bulk Order** button: multi-item order entry
- **Customer Search** button: find customer transaction history
- Margin preview shown when adding/editing (sale price - purchase price)

---

### 💰 Transactions (accessed via Products/Dashboard modals)
**Transaction Types:**
- **Sale**: Selling to a customer → reduces stock
- **Purchase**: Buying from supplier → increases stock
- **Reverse**: Cancel/reverse a sale → restores stock
- **Return**: Customer returning goods
- **Payment**: Recording a payment received

**Single Transaction fields**: Product Name, Type, Quantity, Unit Price, Discount, Customer Name, Order No, Payment Term (Cash/Credit), Supplier

**Bulk Order**: Multiple products under one order number, same customer/supplier, atomic (all succeed or all fail)

---

### 📈 Reports Page (/reports) — Admin only
- Sales summary with profit/loss breakdown
- Customer search: find all transactions for a specific shop/customer
- Download CSV reports
- Date range filtering

---

### 👥 Users/Employees Page (/users) — Admin only
- Manage team members
- Roles: Admin (full access) | Operator (limited — no delete, no reports, no users page)
- Add, edit, deactivate users

---

### 🔐 Roles & Permissions
| Feature | SuperAdmin | Admin | Operator |
|---------|-----------|-------|----------|
| Dashboard | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ |
| Products | ✅ | ✅ | ✅ |
| Delete records | ✅ | ✅ | ❌ |
| Users page | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Tenant Management | ✅ | ❌ | ❌ |

---

### 💡 Tips
- Low stock alert: any product with ≤5 units in hand shows a warning
- All financial amounts are in Pakistani Rupees (Rs)
- Transactions are immutable once saved (use Reverse type to undo a sale)
- Bulk orders are atomic — if one item fails (e.g. out of stock), the whole order is cancelled
- Real-time updates: dashboard refreshes automatically when new transactions are recorded
"""


# ---------------------------------------------------------------------------
# Agent State
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    company_id: int
    company_name: str
    user_role: str


# ---------------------------------------------------------------------------
# Build the agent graph
# ---------------------------------------------------------------------------

def build_agent(
    ollama_api_key: str,
    mistral_api_key: str,
    company_id: int,
    company_name: str,
    user_role: str,
):
    """
    Build and return a compiled LangGraph agent bound to a specific company.
    Uses Ollama cloud gpt-oss:120b via OpenAI-compatible /v1 endpoint.
    Endpoint: https://ollama.com/v1/chat/completions
    """
    tools = [
        get_dashboard_summary,
        get_summary_by_date,
        get_products,
        get_suppliers,
        get_recent_transactions,
        search_customer_transactions,
        get_top_products,
    ]

    # Ollama cloud via OpenAI-compatible /v1 endpoint
    # Works with: https://ollama.com/v1/chat/completions + Bearer token
    from langchain_openai import ChatOpenAI

    llm = ChatOpenAI(
        model="gpt-oss:120b",
        base_url="https://ollama.com/v1",
        api_key=ollama_api_key,
        temperature=0.1,
        timeout=60,
        max_retries=2,
    )

    llm_with_tools = llm.bind_tools(tools)

    system_prompt = f"""Hello! I am the **{company_name} AI Assistant** 🤖

I'm your intelligent business assistant. Here's what I can do for you:

📊 **Ask me anything about your business data:**
- "What are my sales this month?"
- "Show me low stock products"
- "Who are my top customers?"
- "What's my profit this week?"
- "Show me recent transactions"
- "Search transactions for [customer name]"

📸 **Upload an image to scan:**
- Invoices, receipts, product labels, supplier cards
- I'll extract the data and ask for your confirmation before saving anything

🗺️ **App navigation help:**
- "How do I add a product?"
- "Where can I find reports?"
- "How do I record a bulk order?"

---

## 🛠️ Tool Selection Rules (CRITICAL — always follow these)

| User asks about | Tool to use |
|----------------|-------------|
| Today's summary / KPIs | `get_dashboard_summary(timeframe="daily")` |
| **Yesterday / "the day before today" / "last day"** | `get_dashboard_summary(timeframe="yesterday")` |
| This week | `get_dashboard_summary(timeframe="weekly")` |
| This month | `get_dashboard_summary(timeframe="monthly")` |
| This year | `get_dashboard_summary(timeframe="yearly")` |
| All time totals | `get_dashboard_summary(timeframe="all")` |
| A specific date like "May 20" or "2026-05-15" | `get_summary_by_date(date="YYYY-MM-DD")` |
| List of recent transactions | `get_recent_transactions(limit=N)` |
| Customer/shop history | `search_customer_transactions(customer_name=...)` |
| Products / inventory | `get_products(...)` |
| Suppliers | `get_suppliers(...)` |
| Top selling products | `get_top_products(days=N)` |

**NEVER use `get_recent_transactions` to answer summary/KPI questions.**
**ALWAYS use `get_dashboard_summary` or `get_summary_by_date` for totals, profit, sales amounts.**

---

**Important rules I follow:**
- I ONLY answer questions about YOUR business data or app usage — I won't answer unrelated questions
- I will NEVER save or modify data without your explicit confirmation
- I will ALWAYS show you what I'm about to save and ask "Confirm?" before doing anything
- You can always revert any change I make
- If I'm unsure, I'll say so clearly

**Your company**: {company_name}
**Your role**: {user_role}
**Company ID**: {company_id}
**Timezone**: PKT (UTC+5) — all date calculations use this timezone

{APP_GUIDE}

When using database tools, ALWAYS pass company_id={company_id} to ensure your data stays isolated from other companies.
"""

    def call_model(state: AgentState):
        messages = state["messages"]
        full_messages = [SystemMessage(content=system_prompt)] + list(messages)
        try:
            response = llm_with_tools.invoke(full_messages)
            return {"messages": [response]}
        except Exception as e:
            err_str = str(e).lower()
            logger.error(f"LLM call error: {e}", exc_info=True)
            if "429" in err_str or "rate_limit" in err_str or "rate limit" in err_str:
                msg = "⚠️ Too many requests right now. Please wait a few seconds and try again."
            elif "401" in err_str or "unauthorized" in err_str or "forbidden" in err_str:
                msg = "⚠️ AI service authentication error. Please contact support."
            elif "timeout" in err_str or "timed out" in err_str:
                msg = "⚠️ The request timed out. Please try again."
            elif "connection" in err_str or "network" in err_str:
                msg = "⚠️ Could not connect to AI service. Please check your internet connection and try again."
            else:
                msg = "⚠️ I encountered an error processing your request. Please try again in a moment."
            return {"messages": [AIMessage(content=msg)]}

    def should_continue(state: AgentState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    tool_node = ToolNode(tools)

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")

    return graph.compile()
