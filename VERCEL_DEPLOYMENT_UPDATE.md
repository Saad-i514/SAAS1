# Vercel Deployment Update Guide

## ⚠️ IMPORTANT: Your App is Already Deployed

This guide helps you safely update your production Vercel deployment with the new security and performance improvements.

## 🔄 Safe Update Process (Zero Downtime)

### Step 1: Add Environment Variables to Vercel

**Backend (Vercel Project Settings):**

1. Go to your Vercel backend project
2. Navigate to: Settings → Environment Variables
3. Add these variables:

```bash
# CRITICAL: Generate a strong secret key
SECRET_KEY=<generate-with-command-below>

# Optional: Already set in your .env, but good to verify
DATABASE_URL=<your-supabase-url>
BACKEND_CORS_ORIGINS=https://bsmanagement.vercel.app,https://bizmanagement.vercel.app,https://saas-1-pied.vercel.app,https://saas-1-qqmz.vercel.app,https://saas-1-six.vercel.app,https://saas-1-orcin.vercel.app,http://localhost:5173
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Frontend (Vercel Project Settings):**

Already configured, but verify:
```bash
VITE_API_URL=https://saas-1-orcin.vercel.app/api/v1
```

### Step 2: Run Database Migration

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI if not already
npm i -g vercel

# Login
vercel login

# Link to your project
cd backend
vercel link

# Run migration via Vercel CLI
vercel env pull .env.production
alembic upgrade head
```

**Option B: Using Local Connection**
```bash
cd backend

# Update .env with production DATABASE_URL
# Then run:
alembic upgrade head
```

**Option C: Skip for Now (Safe)**
The indexes are optional performance improvements. Your app will work without them.
You can run the migration later when convenient.

### Step 3: Deploy Updated Code

**Backend:**
```bash
cd backend
git add .
git commit -m "Add production security improvements"
git push origin main
```

Vercel will auto-deploy. Monitor the deployment logs for any errors.

**Frontend:**
```bash
cd frontend
git add .
git commit -m "Update frontend configuration"
git push origin main
```

### Step 4: Verify Deployment

1. **Check Backend Health:**
   - Visit: `https://saas-1-orcin.vercel.app/api/v1/docs`
   - Should load Swagger UI without errors

2. **Check Frontend:**
   - Visit your frontend URL
   - Try logging in
   - Verify dashboard loads

3. **Check Logs:**
   - Vercel Dashboard → Your Project → Logs
   - Look for warnings about SECRET_KEY (should be gone after Step 1)

## 🎯 What Changed (Backward Compatible)

### ✅ Safe Changes (No Action Required)
- Security headers added (automatic)
- Rate limiting on login (automatic)
- Input validation enhanced (automatic)
- Database model indexes defined (needs migration)

### ⚠️ Requires Environment Variables
- SECRET_KEY (will use temporary key if not set, but logs warning)
- BACKEND_CORS_ORIGINS (falls back to existing domains if not set)

### 📊 Optional Performance Upgrade
- Database indexes (run migration when ready)

## 🔍 Monitoring After Deployment

### Check These Metrics:
1. **Error Rate** - Should remain at 0%
2. **Response Time** - Should be similar or better
3. **Login Success** - Verify users can still login
4. **Real-time Updates** - Check SSE connections work

### Common Issues & Fixes:

**Issue: "Could not validate credentials" errors**
- **Cause**: SECRET_KEY changed, invalidating existing tokens
- **Fix**: Users need to re-login (expected behavior)

**Issue: CORS errors in browser console**
- **Cause**: BACKEND_CORS_ORIGINS not set correctly
- **Fix**: Add your frontend domain to BACKEND_CORS_ORIGINS in Vercel

**Issue: Rate limiting blocking legitimate users**
- **Cause**: Multiple users behind same IP (corporate network)
- **Fix**: Increase rate limit in `auth.py` or implement Redis-based limiting

## 📋 Rollback Plan (If Needed)

If something goes wrong:

1. **Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Rollback Database Migration:**
   ```bash
   alembic downgrade -1
   ```

3. **Remove Environment Variables:**
   - Go to Vercel Settings → Environment Variables
   - Remove SECRET_KEY if it's causing issues

## 🎉 Benefits After Update

### Security Improvements:
- ✅ Persistent SECRET_KEY (tokens survive restarts)
- ✅ Rate limiting prevents brute force attacks
- ✅ Security headers protect against XSS, clickjacking
- ✅ Input validation prevents injection attacks
- ✅ Token expiration reduced to 8 hours

### Performance Improvements:
- ✅ Database indexes speed up queries (after migration)
- ✅ Optimized CORS configuration
- ✅ Better error handling

### Developer Experience:
- ✅ Comprehensive documentation
- ✅ .env.example templates
- ✅ Production checklist
- ✅ Security guidelines

## 🔐 Security Best Practices (Now Implemented)

1. **SECRET_KEY Management**
   - Generate strong random key
   - Store in Vercel environment variables
   - Never commit to git
   - Rotate periodically

2. **CORS Configuration**
   - Only allow your domains
   - Remove localhost from production
   - Use environment variables

3. **Database Security**
   - Use connection pooling (Supabase pooler)
   - Enable SSL connections
   - Rotate credentials periodically

## 📞 Need Help?

### Vercel-Specific Issues:
- Check Vercel deployment logs
- Verify environment variables are set
- Ensure build succeeds

### Database Issues:
- Verify DATABASE_URL is correct
- Check Supabase connection limits
- Review migration logs

### Application Issues:
- Check browser console for errors
- Review backend logs in Vercel
- Test API endpoints directly

## ✅ Post-Deployment Checklist

- [ ] SECRET_KEY added to Vercel backend environment variables
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Login works
- [ ] Dashboard loads
- [ ] Real-time updates work
- [ ] No errors in Vercel logs
- [ ] Database migration completed (optional)
- [ ] Removed warning logs about SECRET_KEY

## 🚀 Next Steps (Optional)

1. **Run Database Migration** - For performance improvements
2. **Clean Up CORS Origins** - Remove unused Vercel domains
3. **Set Up Monitoring** - Add Sentry or similar
4. **Enable Alerts** - Get notified of errors
5. **Review Logs Weekly** - Check for security issues

---

**Status**: Backward Compatible ✅  
**Deployment Risk**: Low (fallbacks in place)  
**Recommended Action**: Add SECRET_KEY to Vercel, then deploy  
**Estimated Time**: 10-15 minutes
