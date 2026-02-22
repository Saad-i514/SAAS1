# Free Tier Deployment Guide

This guide details how to deploy your Multi-tenant SaaS application using the fully **free tiers** (or generous allowances) across AWS and Supabase.

## Architecture Overview

1. **Database**: Supabase (PostgreSQL - Generous Free Tier)
2. **Backend**: AWS Elastic Beanstalk (EC2 `t2.micro` or `t3.micro` - 12 Months Free Tier)
3. **Frontend**: AWS S3 + Amazon CloudFront (AWS Free Tier)

---

## Step 1: Deploy the Database (Supabase Free Tier)

Supabase offers a generous free tier for PostgreSQL hosting that is perfect for getting started.

1. Go to [Supabase](https://supabase.com/) and create an account.
2. Click **New Project** and select your organization.
3. Name your project (e.g., `SAAS_PROD`), set a secure Database Password, and choose a region close to your target AWS region (e.g., `us-east-1`).
4. Wait a few minutes for the database to provision.
5. Once ready, click on the **Project Settings** (gear icon) -> **Database**.
6. Under **Connection string**, change the dropdown to **URI** and copy the string. It looks like:
   `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   *(Ensure you use the connection pooler IPv4 string for best compatibility with serverless environments).*

**Run Migrations:**
Set this as your `DATABASE_URL` locally and run your Alembic migrations against the Supabase database:
```bash
set DATABASE_URL=postgresql://postgres.[ref]:[password]@...
cd backend
alembic upgrade head
```

---

## Step 2: Deploy the Backend (AWS Elastic Beanstalk Free Tier)

AWS offers 750 hours/month of `t2.micro` or `t3.micro` EC2 instances for the first 12 months, which Elastic Beanstalk uses under the hood.

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Search for **Elastic Beanstalk** and click **Create Application**.
3. **Application Name**: `SaasBackend`
4. **Platform**: Select **Docker**.
5. **Application code**: 
   - Select **Upload your code**.
   - Zip your entire `backend` directory (ensure `Dockerfile`, `requirements.txt`, and the `app/` folder are at the root of the ZIP file).
   - Click **Local file** and upload the ZIP.
6. Click **Configure more options**.
7. Under **Instances**, ensure the instance type is set to `t2.micro` or `t3.micro` to stay within the AWS Free Tier.
8. Under **Software**, add your environment variables:
   - `DATABASE_URL`: Your Supabase connection string from Step 1.
   - `CORS_ORIGINS`: `*` (or your future CloudFront domain).
   - `SECRET_KEY`: A random secure string.
9. Click **Create app**. 
10. AWS will create an environment. This takes 5-10 minutes. Once done, copy the **Environment URL** (e.g., `http://saasbackend-env.eba-xxxx.us-east-1.elasticbeanstalk.com`). You will use this as your API URL for the frontend.

---

## Step 3: Deploy the Frontend (AWS S3 + CloudFront Free Tier)

AWS Free Tier includes 5GB of S3 standard storage and 1TB of CloudFront data transfer out per month.

**1. Build for Production**
In your `frontend` directory, create or edit `.env.production` (or inject during build) to point to your new backend URL from Elastic Beanstalk:
```env
VITE_API_URL=http://<your-elastic-beanstalk-url>/api/v1
```
Then build the React app:
```bash
cd frontend
npm run build
```
This prepares a production-ready `dist` folder.

**2. Create S3 Bucket**
1. Search for **S3** in the AWS Console and click **Create bucket**.
2. Name it (e.g., `saas-frontend-myname`). It must be globally unique.
3. Leave "Block all public access" **checked** (CloudFront will access it securely via OAC).
4. Click **Create bucket**.
5. Click your new bucket, go to the **Objects** tab, and **Upload** all files/folders inside your `frontend/dist` directory.

**3. Set up CloudFront (CDN)**
1. Search for **CloudFront** and click **Create Distribution**.
2. **Origin domain**: Select your S3 bucket from the dropdown.
3. **Origin access**: Select **Origin access control settings (recommended)**. Click **Create control setting**, name it, and click **Create**.
4. **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
5. **Web Application Firewall (WAF)**: Select "Do not enable security protections" (WAF is *not* free tier eligible).
6. **Settings**: Set Default root object to `index.html`.
7. Click **Create distribution**.

**4. Update S3 Permissions & Routing**
1. On the CloudFront distribution completion page, copy the generated **S3 Bucket Policy**.
2. Go back to your S3 Bucket -> **Permissions** -> **Bucket Policy** -> **Edit** and paste the policy. Save changes.
3. Go back to your CloudFront distribution -> **Error pages**.
4. Click **Create custom error response**:
   - HTTP error code: `404: Not Found`
   - Customize error response: `Yes`
   - Response page path: `/index.html`
   - HTTP Response code: `200: OK`
   *(This ensures React Router works correctly when refreshing pages like `/dashboard`).*

**Access Your App:**
Use the **Distribution domain name** (e.g., `d1234abcd.cloudfront.net`) provided by CloudFront. Your multi-tenant SaaS application is now live utilizing free-tier infrastructure!
