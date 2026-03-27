# Production Deployment Checklist

## 🔴 CRITICAL - Must Complete Before Production

### 1. Environment Variables & Security

- [ ] **Generate SECRET_KEY**: Run `python -c 'import secrets; print(secrets.token_urlsafe(32))'` and add to `.env`
- [ ] **Remove .env files from git**: Ensure `.env` is in `.gitignore` (already done)
- [ ] **Update DATABASE_URL**: Use production database credentials (not the exposed Supabase URL)
- [ ] **Update BACKEND_CORS_ORIGINS**: Set to your production frontend domain only
- [ ] **Update VITE_API_URL**: Set frontend to production backend URL

### 2. Remove Test/Seed Files

Delete or move to a separate `/scripts` folder:
- [ ] `backend/seed_data.py`
- [ ] `backend/seed_complete_data.py`
- [ ] `backend/seed_pkr_data.py`
- [ ] `backend/test_login.py`
- [ ] `backend/test_dashboard_api.py`
- [ ] `backend/test_dashboard_direct.py`
- [ ] `backend/test_all_passwords.py`
- [ ] `backend/list_all_users.py`
- [ ] `backend/clear_all_data.py`
- [ ] `test-login.html` (root)

### 3. Database Setup

- [ ] **Run migrations**: `cd backend && alembic upgrade head`
- [ ] **Create indexes**: The models now have proper indexes, run a new migration:
  ```bash
  alembic revision --autogenerate -m "add_performance_indexes"
  alembic upgrade head
  ```
- [ ] **Backup strategy**: Set up automated database backups
- [ ] **Connection pooling**: Verify Supabase pooler settings or configure pgBouncer

### 4. Security Hardening

- [x] SECRET_KEY now required (no random generation)
- [x] Token expiration reduced to 8 hours (from 24)
- [x] Rate limiting added to login endpoint (5 attempts per 5 minutes)
- [x] Security headers added (X-Frame-Options, X-Content-Type-Options, HSTS)
- [x] CORS restricted to specific headers (removed wildcard)
- [ ] **Enable HTTPS only**: Ensure all traffic uses HTTPS
- [ ] **Review CORS origins**: Remove all test/staging URLs from production
- [ ] **Add monitoring**: Set up error tracking (Sentry, Rollbar, etc.)

### 5. Code Quality

- [ ] **Remove console.log**: Search frontend for `console.log` and remove debug statements
- [ ] **Remove TODO comments**: Review and address all TODO/FIXME comments
- [ ] **Add error tracking**: Integrate Sentry or similar for production error monitoring
- [ ] **Add health check endpoint**: Create `/health` endpoint for load balancer checks

### 6. Performance Optimization

- [x] Database indexes added to frequently queried columns
- [ ] **Enable gzip compression**: Add compression middleware
- [ ] **Add caching**: Consider Redis for session storage and rate limiting
- [ ] **Optimize queries**: Review N+1 query issues in dashboard endpoints
- [ ] **Add pagination**: Ensure all list endpoints support pagination

### 7. Monitoring & Logging

- [ ] **Structured logging**: Configure JSON logging for production
- [ ] **Log aggregation**: Set up log collection (CloudWatch, Datadog, etc.)
- [ ] **Metrics**: Add application metrics (response times, error rates)
- [ ] **Alerts**: Configure alerts for critical errors and downtime

## 🟡 RECOMMENDED - Should Complete Soon

### 8. Testing

- [ ] Write unit tests for critical business logic
- [ ] Add integration tests for API endpoints
- [ ] Test SSE reconnection behavior
- [ ] Load test with expected production traffic

### 9. Documentation

- [ ] Document API endpoints (OpenAPI/Swagger already available at `/api/v1/docs`)
- [ ] Create user manual
- [ ] Document deployment process
- [ ] Create runbook for common issues

### 10. Backup & Recovery

- [ ] Test database restore procedure
- [ ] Document disaster recovery plan
- [ ] Set up automated backups with retention policy

## 🟢 NICE TO HAVE - Future Improvements

### 11. Advanced Features

- [ ] Implement refresh tokens (currently only access tokens)
- [ ] Add email verification for new users
- [ ] Add password reset functionality
- [ ] Implement audit logging for all data changes
- [ ] Add export to PDF functionality
- [ ] Add bulk import from CSV/Excel

### 12. Infrastructure

- [ ] Set up staging environment
- [ ] Configure CI/CD pipeline
- [ ] Add automated testing in CI
- [ ] Set up blue-green deployment

## Quick Start Commands

### Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (copy from .env.example)
cp .env.example .env
# Edit .env with your values

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your backend URL

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables Reference

### Backend (.env)
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
SECRET_KEY="generate-with-secrets-module"
BACKEND_CORS_ORIGINS="https://yourdomain.com"
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend (.env)
```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
```

## Security Notes

1. **Never commit .env files** - Use .env.example as template
2. **Rotate SECRET_KEY periodically** - Will invalidate all existing tokens
3. **Use strong database passwords** - Minimum 16 characters, mixed case, numbers, symbols
4. **Enable database SSL** - Ensure encrypted connections to database
5. **Review user permissions** - Ensure proper role-based access control
6. **Monitor failed login attempts** - Set up alerts for brute force attempts
7. **Keep dependencies updated** - Regularly update packages for security patches

## Performance Benchmarks

Target metrics for production:
- API response time: < 200ms (p95)
- Dashboard load time: < 2s
- SSE connection time: < 1s
- Database query time: < 50ms (p95)

## Support & Maintenance

- Monitor error rates daily
- Review logs weekly
- Update dependencies monthly
- Backup verification monthly
- Security audit quarterly
