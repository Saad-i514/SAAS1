# Security Guidelines

## 🔒 Critical Security Measures Implemented

### 1. Authentication & Authorization
- JWT-based authentication with configurable expiration (default: 8 hours)
- Role-based access control (SuperAdmin, Admin, Operator)
- Rate limiting on login endpoint (5 attempts per 5 minutes per IP)
- Password hashing using bcrypt
- Token validation on every protected endpoint

### 2. Security Headers
All API responses include:
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `X-XSS-Protection: 1; mode=block` - Enables XSS filtering
- `Strict-Transport-Security` - Enforces HTTPS connections

### 3. CORS Configuration
- Restricted to specific origins (no wildcards in production)
- Credentials allowed only for trusted domains
- Limited to necessary HTTP methods
- Specific headers allowed (no `*` wildcard)

### 4. Input Validation
- All user inputs validated on backend
- SQL injection protection via SQLAlchemy ORM
- Discount validation (cannot exceed line total)
- Stock validation before sales
- Email format validation
- Required field validation

### 5. Database Security
- Parameterized queries (SQLAlchemy ORM)
- Connection pooling for performance
- Indexes on frequently queried columns
- Foreign key constraints enforced

## ⚠️ Known Security Considerations

### 1. Rate Limiting
Current implementation uses in-memory storage. For production with multiple servers:
- **Recommendation**: Use Redis for distributed rate limiting
- **Current**: Works for single-server deployments only

### 2. SSE Authentication
Server-Sent Events (SSE) pass JWT token in query parameter:
- **Risk**: Tokens may appear in server logs
- **Mitigation**: Ensure logs are secured and rotated
- **Alternative**: Consider WebSocket with header-based auth for high-security needs

### 3. Session Management
- No refresh token mechanism (access tokens only)
- **Impact**: Users must re-login after token expiration
- **Recommendation**: Implement refresh tokens for better UX

### 4. Password Policy
- No enforced password complexity requirements
- **Recommendation**: Add minimum length, complexity rules
- **Current**: Relies on user choosing strong passwords

### 5. Account Lockout
- Rate limiting prevents brute force but doesn't lock accounts
- **Recommendation**: Add account lockout after N failed attempts
- **Current**: IP-based rate limiting only

## 🛡️ Security Best Practices

### Environment Variables
```bash
# NEVER commit these files
.env
backend/.env
frontend/.env

# Use .env.example as template
# Generate strong SECRET_KEY:
python -c 'import secrets; print(secrets.token_urlsafe(32))'
```

### Database Credentials
- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Enable SSL/TLS for database connections
- Rotate credentials periodically
- Use connection pooling (Supabase pooler or pgBouncer)

### CORS Configuration
```bash
# Production - specific domain only
BACKEND_CORS_ORIGINS="https://yourdomain.com"

# Development - localhost only
BACKEND_CORS_ORIGINS="http://localhost:5173,http://localhost:5174"

# NEVER use wildcards in production
# WRONG: BACKEND_CORS_ORIGINS="*"
```

### Token Management
- Keep ACCESS_TOKEN_EXPIRE_MINUTES reasonable (8 hours default)
- Shorter for high-security applications (1-2 hours)
- Implement refresh tokens for longer sessions
- Clear tokens on logout (frontend localStorage)

### HTTPS Only
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS header (already implemented)
- Obtain valid SSL certificate (Let's Encrypt, Cloudflare, etc.)

## 🚨 Security Incident Response

### If SECRET_KEY is Compromised
1. Generate new SECRET_KEY immediately
2. All existing tokens will be invalidated
3. All users must re-login
4. Review access logs for suspicious activity
5. Notify affected users if data breach occurred

### If Database Credentials are Exposed
1. Rotate database password immediately
2. Update DATABASE_URL in all environments
3. Review database access logs
4. Check for unauthorized data access
5. Consider data breach notification requirements

### If Suspicious Activity Detected
1. Check application logs for patterns
2. Review failed login attempts
3. Check for unusual API usage
4. Verify no unauthorized data exports
5. Consider temporary account suspension

## 📋 Security Checklist

### Before Production Deployment
- [ ] SECRET_KEY set to strong random value (not default)
- [ ] Database credentials rotated from development
- [ ] CORS origins set to production domain only
- [ ] HTTPS enabled and enforced
- [ ] .env files not committed to git
- [ ] Rate limiting tested and working
- [ ] Security headers verified in responses
- [ ] All test/seed files removed from production
- [ ] Error messages don't expose sensitive info
- [ ] Logging configured (no sensitive data in logs)

### Regular Security Maintenance
- [ ] Update dependencies monthly (security patches)
- [ ] Review access logs weekly
- [ ] Rotate database credentials quarterly
- [ ] Security audit annually
- [ ] Penetration testing annually
- [ ] Review and update CORS origins as needed
- [ ] Monitor failed login attempts
- [ ] Check for SQL injection attempts in logs

## 🔍 Security Monitoring

### What to Monitor
1. **Failed Login Attempts**: Spike indicates brute force attack
2. **API Error Rates**: Unusual errors may indicate probing
3. **Response Times**: Sudden slowdown may indicate DoS
4. **Database Queries**: Unusual patterns may indicate injection attempts
5. **Token Usage**: Multiple IPs using same token indicates compromise

### Recommended Tools
- **Error Tracking**: Sentry, Rollbar, Bugsnag
- **Log Aggregation**: CloudWatch, Datadog, Splunk
- **Uptime Monitoring**: Pingdom, UptimeRobot, StatusCake
- **Security Scanning**: Snyk, OWASP ZAP, Burp Suite

## 📞 Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** open a public GitHub issue
2. Email security contact directly
3. Include detailed description and reproduction steps
4. Allow reasonable time for fix before disclosure
5. We will acknowledge within 48 hours

## 🔗 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
