/**
 * OAuth Integration Guide and Examples
 */

// ============================================
// GOOGLE OAUTH INTEGRATION
// ============================================

/*
Installation:
npm install @react-oauth/google

Setup Steps:
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 Credentials (Web Application)
5. Add authorized redirect URIs:
   - http://localhost:5173 (development)
   - https://yourdomain.com (production)
6. Copy Client ID to .env as VITE_GOOGLE_CLIENT_ID

Implementation in SignIn.tsx:
*/

// Example Google OAuth Implementation:
/*
import { GoogleLogin } from '@react-oauth/google';

const handleGoogleLogin = (credentialResponse) => {
  const { credential } = credentialResponse;
  try {
    await loginWithGoogle(credential);
  } catch (error) {
    setError(error.message);
  }
};

// In JSX:
<GoogleLogin
  onSuccess={handleGoogleLogin}
  onError={() => setError('Google login failed')}
/>
*/

// ============================================
// APPLE OAUTH INTEGRATION
// ============================================

/*
Installation:
npm install @apple/sign-in-js

Setup Steps:
1. Go to https://developer.apple.com
2. Create App ID with "Sign in with Apple" capability
3. Create Service ID for web
4. Configure redirect URIs:
   - https://yourdomain.com/auth/apple (production)
   - localhost:5173 (development)
5. Download private key for backend
6. Copy Service ID to .env as VITE_APPLE_CLIENT_ID

Implementation in SignIn.tsx:
*/

// Example Apple OAuth Implementation:
/*
import AppleSignIn from '@apple/sign-in-js';

useEffect(() => {
  AppleSignIn.auth.init({
    clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
    teamId: 'YOUR_TEAM_ID',
    keyId: 'YOUR_KEY_ID',
    redirectUri: window.location.origin + '/auth/apple',
    scope: AppleSignIn.ScopeType.EMAIL_AND_NAME,
    redirectMethod: 'form',
    usePopup: true,
  });
}, []);

const handleAppleLogin = async () => {
  try {
    const response = await AppleSignIn.auth.authorize();
    const idToken = response.authorization.id_token;
    await loginWithApple(idToken);
  } catch (error) {
    setError(error.message);
  }
};
*/

// ============================================
// BACKEND OAUTH VERIFICATION (Node.js/Express)
// ============================================

/*
Google Token Verification:
npm install google-auth-library

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    
    // Create or update user in database
    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = await User.create({
        googleId: sub,
        email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || '',
        avatar: picture
      });
    }
    
    const token = generateToken(user);
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

Apple Token Verification:
npm install jsonwebtoken

const jwt = require('jsonwebtoken');
const fs = require('fs');

app.post('/api/auth/apple', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // Apple public keys (fetch from https://appleid.apple.com/auth/keys)
    // In production, cache these and refresh periodically
    
    const decoded = jwt.decode(idToken, { complete: true });
    const kid = decoded.header.kid;
    
    // Verify signature using Apple's public key
    const payload = jwt.verify(idToken, applePublicKey);
    
    const { sub, email } = payload;
    
    // Create or update user in database
    let user = await User.findOne({ appleId: sub });
    if (!user) {
      user = await User.create({
        appleId: sub,
        email,
        // Note: Apple only provides name on first signup
      });
    }
    
    const token = generateToken(user);
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});
*/

// ============================================
// ENVIRONMENT VARIABLES NEEDED
// ============================================

/*
.env file should contain:

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple OAuth
VITE_APPLE_CLIENT_ID=com.your-domain.web

# Backend Environment Variables
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=com.your-domain.web
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=YOURKEY123
APPLE_KEY_PATH=./private-key.p8

# Email Service (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend
FRONTEND_URL=http://localhost:5173
*/

// ============================================
// TESTING OAUTH FLOWS
// ============================================

/*
Testing Checklist:

1. Google OAuth:
   [ ] Client ID correctly set in .env
   [ ] Redirect URI whitelisted in Google Console
   [ ] Login button displays and is clickable
   [ ] Redirects to Google login page
   [ ] Returns valid ID token
   [ ] Backend verifies token correctly
   [ ] User created/updated in database
   [ ] JWT token returned to frontend
   [ ] User logged in on app

2. Apple OAuth:
   [ ] Service ID correctly configured
   [ ] Private key uploaded to backend
   [ ] Redirect URI configured
   [ ] Login button displays and is clickable
   [ ] Apple sign-in popup appears
   [ ] Valid ID token returned
   [ ] Backend verifies token
   [ ] User created with appleId
   [ ] Subsequent logins match existing user
   [ ] Email pre-filled (if provided)

3. Email/Password:
   [ ] Sign up form validates input
   [ ] Password requirements enforced
   [ ] User created in database
   [ ] Password properly hashed
   [ ] Sign in with credentials works
   [ ] Wrong password rejected
   [ ] Unknown email rejected
   [ ] JWT token issued on successful login
   [ ] Token persisted in localStorage

4. Password Reset:
   [ ] Forgot password email sent
   [ ] Reset link valid for 1 hour
   [ ] Reset password form validates
   [ ] Password updated in database
   [ ] Old password no longer works
   [ ] New password works for login
*/

// ============================================
// PRODUCTION CHECKLIST
// ============================================

/*
Before deploying to production:

Security:
[ ] Use HTTPS everywhere
[ ] Use httpOnly cookies instead of localStorage for tokens
[ ] Implement CSRF protection
[ ] Set secure and samesite cookie attributes
[ ] Validate all inputs on backend
[ ] Implement rate limiting on auth endpoints
[ ] Use strong password hashing (bcrypt, argon2)
[ ] Implement token refresh mechanism
[ ] Add email verification for signups
[ ] Implement account lockout after failed attempts
[ ] Use helmet.js for HTTP headers
[ ] Enable CORS properly (don't use *)

OAuth:
[ ] Use production OAuth app credentials
[ ] All redirect URIs use HTTPS
[ ] Client secrets never exposed in frontend code
[ ] Implement state parameter for CSRF protection
[ ] Verify nonce parameter for OpenID Connect
[ ] Cache Apple public keys with refresh
[ ] Monitor for suspicious OAuth activity

Database:
[ ] Encrypt sensitive data at rest
[ ] Backup database regularly
[ ] Use connection pooling
[ ] Implement database access logging
[ ] Use parameterized queries
[ ] Set up database replication for high availability

Email:
[ ] Use production email service (SendGrid, AWS SES, etc.)
[ ] Add email rate limiting
[ ] Implement bounce and complaint handling
[ ] Track email delivery
[ ] Test email templates
[ ] Implement email list hygiene

Monitoring:
[ ] Set up error tracking (Sentry, etc.)
[ ] Monitor API response times
[ ] Log all authentication events
[ ] Alert on suspicious activity
[ ] Set up uptime monitoring
[ ] Monitor SSL certificate expiration
*/
