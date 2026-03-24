# Vercel Deployment Setup

## Your URLs
- **Frontend:** https://saas-1-pied.vercel.app
- **Backend:** https://saas-1-six.vercel.app

## Backend Vercel Environment Variables

Go to: https://vercel.com/your-username/your-backend-project/settings/environment-variables

Add these variables:

```
DATABASE_URL
postgresql://postgres.qpmrltgnfxgeqocewrnw:yOMWp45oIhDUizka@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres

BACKEND_CORS_ORIGINS
https://saas-1-pied.vercel.app,http://localhost:5173,http://localhost:5174

SECRET_KEY
your-secret-key-generate-random-string-here
```

## Frontend Vercel Environment Variables

Go to: https://vercel.com/your-username/your-frontend-project/settings/environment-variables

Add this variable:

```
VITE_API_URL
https://saas-1-six.vercel.app/api/v1
```

## After Adding Variables

1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Wait for both frontend and backend to redeploy
4. Test login with:
   - Email: `admin@meerab.com`
   - Password: `password123`

## Test Backend is Working

Visit: https://saas-1-six.vercel.app/health

Should return: `{"status":"healthy","cors_origins":"..."}`

## Test Database Connection

Visit: https://saas-1-six.vercel.app/test-db

Should return: `{"status":"connected","user_count":4}`

## Login Credentials

### Admin Users:
- `admin@meerab.com` / `password123`
- `m83367754@gmail.com` / `password123`
- `meerab.traders@saas.com` / `password123`

### Super Admin:
- `msaadbinmazhar@gmail.com` / `mazhar@41900`
