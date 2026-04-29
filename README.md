# Business Management System (SAAS1)

A production-ready multi-tenant SaaS application for business management, inventory tracking, and financial reporting.

## 🚀 Features

- **Multi-tenant Architecture** - Isolated data per company
- **Role-Based Access Control** - SuperAdmin, Admin, Operator roles
- **Inventory Management** - Products, suppliers, stock tracking
- **Transaction Management** - Sales, purchases, payments, returns
- **Real-time Updates** - Server-Sent Events (SSE) for live data
- **Financial Reporting** - Dashboard with charts, profit/loss analysis
- **Bulk Operations** - Multi-item orders with automatic calculations
- **Customer Search** - Transaction history by customer/shop
- **Dynamic Columns** - Extensible data model with JSONB

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database with JSONB support
- **SQLAlchemy** - ORM with Alembic migrations
- **JWT Authentication** - Secure token-based auth
- **Pydantic** - Data validation and serialization

### Frontend
- **React** - UI library with hooks
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first styling
- **Recharts** - Data visualization
- **Axios** - HTTP client

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- npm or yarn

## 🔧 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd SAAS1
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000  
API docs at: http://localhost:8000/api/v1/docs

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

## ⚙️ Configuration

### Backend Environment Variables (.env)

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@host:port/database"

# Security (Required)
SECRET_KEY="your-secret-key-here"

# CORS (Required)
BACKEND_CORS_ORIGINS="http://localhost:5173,https://yourdomain.com"

# Optional
ACCESS_TOKEN_EXPIRE_MINUTES=480  # Default: 8 hours
```

### Frontend Environment Variables (.env)

```bash
# Backend API URL (Required)
VITE_API_URL=http://localhost:8000/api/v1
```

## 🔐 Security Features

- ✅ JWT-based authentication with configurable expiration
- ✅ Rate limiting on login (5 attempts per 5 minutes)
- ✅ Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- ✅ Input validation and sanitization
- ✅ SQL injection protection via ORM
- ✅ CORS configuration
- ✅ Password hashing with bcrypt

## 📦 Database Schema

### Core Tables
- **companies** - Multi-tenant isolation
- **users** - Authentication and roles
- **suppliers** - Vendor management
- **products** - Inventory items
- **transactions** - All business transactions
- **dynamic_columns** - Extensible metadata

## 🚀 Production Deployment

### Deployment Commands

**Backend:**
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
# Deploy dist/ folder to hosting
```

### Recommended Hosting

- **Backend**: Vercel, Railway, Render, AWS
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: Supabase, Railway, AWS RDS

## 📊 API Documentation

Interactive API documentation available at:
- Swagger UI: `/api/v1/docs`
- ReDoc: `/api/v1/redoc`

### Key Endpoints

**Authentication:**
- `POST /api/v1/login/access-token` - Login

**Suppliers:**
- `GET /api/v1/suppliers/` - List suppliers
- `POST /api/v1/suppliers/` - Create supplier
- `PUT /api/v1/suppliers/{id}` - Update supplier
- `DELETE /api/v1/suppliers/{id}` - Delete supplier

**Products:**
- `GET /api/v1/products/` - List products
- `POST /api/v1/products/` - Create product
- `PUT /api/v1/products/{id}` - Update product
- `DELETE /api/v1/products/{id}` - Delete product

**Transactions:**
- `GET /api/v1/transactions/` - List transactions
- `POST /api/v1/transactions/` - Create transaction
- `POST /api/v1/transactions/bulk` - Bulk order entry
- `GET /api/v1/transactions/events` - SSE real-time updates

**Dashboard:**
- `GET /api/v1/dashboard/summary` - KPI summary
- `GET /api/v1/dashboard/charts` - Chart data
- `GET /api/v1/dashboard/recent-transactions` - Recent activity

## 🛠️ Project Structure

```
SAAS1/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security, database
│   │   ├── schemas/      # Pydantic models
│   │   ├── models.py     # SQLAlchemy models
│   │   └── main.py       # FastAPI app
│   ├── alembic/          # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   └── main.jsx      # Entry point
│   └── package.json
└── README.md
```

## 📝 License

[Your License Here]

## 🎯 Roadmap

- [ ] Refresh token mechanism
- [ ] Email verification
- [ ] Password reset flow
- [ ] Bulk import from CSV/Excel
- [ ] Mobile app
- [ ] Multi-language support

---

**Status**: Production Ready ✅  
**Version**: 1.0.0
