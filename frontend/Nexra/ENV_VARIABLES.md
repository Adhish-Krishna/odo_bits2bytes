# Environment Variables Configuration

This file explains all environment variables needed for the authentication system.

## Frontend Environment Variables (.env)

### Required Variables

#### API Configuration
```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api

# For production:
VITE_API_URL=https://api.yourdomain.com/api
```

#### OAuth Configuration (Optional)
```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple OAuth
VITE_APPLE_CLIENT_ID=com.yourdomain.web
```

## Backend Environment Variables (.env)

### Required Variables

#### App Configuration
```env
# Server port
PORT=3000

# Environment (development, staging, production)
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

#### Authentication
```env
# JWT Secret Key (use strong, random string)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345

# Token expiration (in hours)
JWT_EXPIRY=24

# Refresh token expiration (in days)
REFRESH_TOKEN_EXPIRY=7
```

#### Database
```env
# PostgreSQL Example
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db

# MongoDB Example
DATABASE_URL=mongodb://user:password@localhost:27017/auth_db

# SQLite Example (development only)
DATABASE_URL=sqlite:./database.db
```

#### Google OAuth (if enabled)
```env
# Get from Google Cloud Console
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Apple OAuth (if enabled)
```env
# Get from Apple Developer Console
APPLE_CLIENT_ID=com.yourdomain.web
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_KEY_PATH=./keys/AuthKey_XXXXXXXXXX.p8
```

#### Email Service (for password recovery)

##### Using SendGrid
```env
# Email service provider
EMAIL_PROVIDER=sendgrid

# SendGrid API key
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# From email address
FROM_EMAIL=noreply@yourdomain.com
```

##### Using AWS SES
```env
EMAIL_PROVIDER=aws-ses
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
FROM_EMAIL=noreply@yourdomain.com
```

##### Using Gmail
```env
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=your-email@gmail.com
```

#### Password Reset
```env
# Password reset token expiration (in hours)
RESET_TOKEN_EXPIRY=1

# Email verification token expiration (in hours)
EMAIL_TOKEN_EXPIRY=24
```

#### Security
```env
# CORS allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Bcrypt rounds for password hashing
BCRYPT_ROUNDS=10
```

#### Logging
```env
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Log file path
LOG_FILE_PATH=./logs/app.log
```

#### Monitoring (Optional)
```env
# Sentry error tracking
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Google Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```

---

## Setup Instructions

### Frontend Setup

1. **Copy template to actual file:**
```bash
cp .env.example .env
```

2. **Edit .env with your values:**
```bash
# Development
VITE_API_URL=http://localhost:3000/api

# Production
VITE_API_URL=https://api.yourdomain.com/api
```

3. **For OAuth support (optional):**
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_APPLE_CLIENT_ID=your-app-id
```

4. **Run development server:**
```bash
npm run dev
```

### Backend Setup

1. **Create .env file:**
```bash
touch .env
```

2. **Copy template content:**
```bash
cp .env.example .env
```

3. **Fill in required values** (see sections above)

4. **Verify database connection:**
```bash
npm run db:migrate
```

5. **Start backend:**
```bash
npm start
```

---

## Environment-Specific Configurations

### Development Environment
```env
# Frontend
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=dev-google-client-id
VITE_APPLE_CLIENT_ID=dev-apple-client-id

# Backend
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite:./dev.db
JWT_SECRET=dev-secret-not-secure
LOG_LEVEL=debug
```

### Staging Environment
```env
# Frontend
VITE_API_URL=https://staging-api.yourdomain.com/api

# Backend
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://user:pass@staging-db:5432/auth_db
JWT_SECRET=staging-secret-key
LOG_LEVEL=info
EMAIL_PROVIDER=sendgrid
```

### Production Environment
```env
# Frontend
VITE_API_URL=https://api.yourdomain.com/api

# Backend
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@prod-db:5432/auth_db
JWT_SECRET=use-strong-random-secret
LOG_LEVEL=warn
EMAIL_PROVIDER=sendgrid
SENTRY_DSN=https://sentry-url
```

---

## Secure Secret Generation

### Generate JWT Secret
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Generate API Keys
- **Google**: https://console.cloud.google.com
- **Apple**: https://developer.apple.com
- **SendGrid**: https://app.sendgrid.com/settings/api_keys

---

## Managing Secrets in Production

### Do's ✅
- Use environment variable files (.env)
- Store secrets in secret manager (AWS Secrets Manager, Hashicorp Vault)
- Use different secrets for each environment
- Rotate secrets regularly
- Use strong, random values
- Never commit .env to version control

### Don'ts ❌
- Store secrets in code
- Commit .env to git
- Share secrets in plain text
- Use weak/predictable values
- Reuse secrets across environments
- Log sensitive information

---

## Verification Checklist

Before deployment, verify:
- [ ] All required variables are set
- [ ] No variables are undefined
- [ ] Secrets are strong and random
- [ ] Database connection works
- [ ] Email service is configured
- [ ] OAuth credentials are valid
- [ ] CORS origins are correct
- [ ] JWT secret is secure
- [ ] Logging is configured
- [ ] Error tracking is enabled

---

## Troubleshooting

### "Cannot find module" errors
- Check if all environment variables are defined
- Verify paths in environment variables
- Check file permissions

### "Connection refused" errors
- Verify database is running
- Check DATABASE_URL is correct
- Verify CORS origins include frontend URL

### "Invalid token" errors
- Check JWT_SECRET is the same on all servers
- Verify token hasn't expired
- Check Authorization header format

### Email not sending
- Verify EMAIL_PROVIDER is set
- Check email service credentials
- Verify FROM_EMAIL is valid
- Check email service is not rate-limited

---

## Environment Variable Validation

Add this to your backend startup:
```javascript
const requiredVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'FRONTEND_URL',
  'PORT'
];

for (const variable of requiredVars) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}
```

---

## Resources

- [Environment Variables Best Practices](https://12factor.net/config)
- [Securing Node.js with Environment Variables](https://nodejs.org/en/)
- [React Environment Variables](https://vitejs.dev/guide/env-and-modes.html)

---

**Last Updated**: 2024  
**Version**: 1.0
