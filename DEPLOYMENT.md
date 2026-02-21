# Multi-tenant SaaS Business Management System

This is a responsive, multi-tenant SaaS application built with **React (Vite) + Tailwind CSS** on the frontend and **FastAPI + PostgreSQL (Supabase)** on the backend.

## Local Development Setup

1. **Database Setup**
   The application requires a PostgreSQL database. Ensure you have one running locally or a Supabase project.

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   # activate venv (.\venv\Scripts\activate on Windows, source venv/bin/activate on Mac/Linux)
   pip install -r requirements.txt # (or just use the installed ones)
   
   # Set the database URL in an .env file or rely on the default local postgres string:
   # DATABASE_URL=postgresql://postgres:51900@localhost:5432/SAAS_PROD
   
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Supabase + GitHub CI/CD Deployment

### 1. Supabase Database Deployment
1. Go to [Supabase](https://supabase.com/) and create a free project named `SAAS_PROD`.
2. Once the database is provisioned, go to **Settings > Database**.
3. Copy the **Transaction pooler** connection string (IPv4). It will look like: 
   `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
4. Use this string as your `DATABASE_URL` for the backend. Use Alembic locally to run migrations against the Supabase DB:
   ```bash
   set DATABASE_URL=postgresql://...
   alembic upgrade head
   ```

### 2. Backend Deployment (Koyeb / Railway)
Since FastAPI requires a Python environment, it cannot be hosted directly on Supabase edge functions natively without wrappers. 

**Koyeb (Recommended Free Tier - No Card Required)**:
1. Create a free account at [Koyeb.com](https://www.koyeb.com/).
2. Create a high-performance **Web Service** tied to your GitHub Repo.
3. Configure the Builder: Choose **Buildpack** (it will auto-detect Python).
4. Run Command (Override): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Ports: Change the port from `8080` to `8000` (or leave it as `$PORT`).
6. Environment Variables: Add `DATABASE_URL` pointing to your Supabase PostgreSQL DB.
7. Click Deploy!

**Railway (Alternative)**:
1. Go to [Railway.app](https://railway.app/).
2. Click "New Project" -> "Deploy from GitHub Repo".
3. Railway will automatically detect the Python FastAPI setup and build it.
4. Add the `DATABASE_URL` variable to your project variables.

### 3. Frontend Deployment (Vercel / Netlify / GitHub Pages)
1. Push your code to GitHub.
2. Go to Vercel and import the repo.
3. Framework Preset: `Vite`
4. Add Environment Variable: `VITE_API_URL` pointing to your deployed Backend URL (e.g., `https://your-backend.onrender.com/api/v1`).
5. Deploy!

## GitHub Actions CI/CD Pipeline
You can automate deployment by adding the following to `.github/workflows/deploy.yml`:

```yaml
name: Deploy SaaS App

on:
  push:
    branches:
      - main

jobs:
  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      
  # Add deployment steps to Vercel/Render using their respective GitHub Actions here.
```
