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

### 2. Backend Deployment (Google Cloud Run)
To deploy the FastAPI backend to Google Cloud Run, we have containerized it using Docker. It provides a generous free tier of 2 million requests/month.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Enable the **Cloud Run API** and **Cloud Build API**.
3. Go to **Cloud Run** and click **Create Service** (or "Deploy Container" -> "Service").
4. Select **Continuously deploy new revisions from a source repository**.
5. Connect your GitHub account and select your `Saad-i514/SAAS1` repository.
6. In the Build Configuration:
   - Branch: `^main$`
   - Build Type: **Dockerfile**
   - Source location: `/backend/Dockerfile`
7. In the Service settings:
   - Authentication: Select **Allow unauthenticated invocations**.
8. Scroll down to **Container, Variables & Secrets**, click the **Variables** tab:
   - Add Name: `DATABASE_URL`
   - Add Value: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres` (Make sure you use the IPv4 Pooler URL, port 5432).
9. Click **Create** to deploy. Once finished, copy the URL it provides (e.g. `https://saas-backend-xxxxx-uc.a.run.app`).

### 3. Frontend Deployment (Vercel / Netlify / GitHub Pages)
1. Push your code to GitHub.
2. Go to Vercel and import the repo.
3. Framework Preset: `Vite`
4. Add Environment Variable: `VITE_API_URL` pointing to your deployed Google Cloud Run URL with `/api/v1` appended (e.g., `https://saas-backend-xxxxx-uc.a.run.app/api/v1`).
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
