# Quick Start Guide - Authentication System

## 5-Minute Setup

### Step 1: Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Update .env with your API URL
VITE_API_URL=http://localhost:3000/api
```

### Step 2: Start Frontend
```bash
npm run dev
# Frontend running at http://localhost:5173
```

### Step 3: Test Screens
- Welcome: http://localhost:5173 ✓ Default screen
- Sign In: Click "Continue with Email" → Shows Sign In form ✓
- Sign Up: Click "Sign Up" → Shows Sign Up form ✓
- Forgot Password: Click "Forgot Password" in Sign In → Shows recovery form ✓
- Reset Password: Complete forgot password flow → Shows reset form ✓

## Features at a Glance

### 🎯 Welcome Screen
- Email input field
- Social login buttons (Google, Apple)
- Navigation to Sign In/Sign Up

### 🔐 Sign In Screen
- Email and password fields
- Password visibility toggle
- Remember me checkbox
- "Forgot Password" link
- Error message display
- Social login buttons
- Sign Up link

### 📝 Sign Up Screen
- Multi-step form
- First step: Email entry
- Second step: Complete profile (First Name, Last Name, Password, Confirm Password)
- Password strength validation
- Password visibility toggles
- Error handling
- Social login buttons
- Sign In link

### 🔑 Forgot Password Screen
- Email input field
- Sends recovery email
- Success confirmation
- Auto-navigate to reset password

### 🔄 Reset Password Screen
- New password field
- Confirm password field
- Password visibility toggles
- Validation feedback
- Success message
- Auto-redirect to Sign In

## API Integration

### Current Mock Setup
The app is ready to connect to a backend API. All screens include error handling and loading states.

### To Connect Your API:

1. **Update API URL** in `.env`:
```
VITE_API_URL=http://your-backend-url/api
```

2. **Backend should implement** these endpoints:
   - `POST /auth/login`
   - `POST /auth/signup`
   - `POST /auth/forgot-password`
   - `POST /auth/reset-password`
   - `POST /auth/google`
   - `POST /auth/apple`

3. **Token handling** - automatically managed:
   - JWT tokens stored in localStorage
   - Sent in Authorization header for requests
   - Cleared on logout

## Code Examples

### Use Authentication in Components
```tsx
import { useAuth } from './context/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) return <p>Please sign in</p>

  return (
    <div>
      <p>Hello, {user?.firstName}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Protect Routes
```tsx
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
```

### Handle Errors
```tsx
const handleLogin = async (email: string, password: string) => {
  try {
    await login(email, password)
    // Success - user is now logged in
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed'
    setError(message)
  }
}
```

## Customization

### Change Colors
Edit `src/styles/Auth.css`:
```css
.btn-primary {
  background-color: #7ac243; /* Change this */
}
```

### Change API Base URL
Edit `.env`:
```
VITE_API_URL=http://your-api-url/api
```

### Add New Fields
1. Add field to form component
2. Update state
3. Include in API request
4. Handle in backend

### Enable Social Login
See `OAUTH_SETUP.md` for detailed instructions

## Validation Rules

| Field | Rules |
|-------|-------|
| Email | Valid email format required |
| Password | Minimum 8 characters |
| First Name | Required, non-empty |
| Last Name | Required, non-empty |
| Confirm Password | Must match password |

## File Structure

```
src/
├── components/
│   ├── AuthRouter.tsx        # Screen navigation
│   ├── Welcome.tsx           # Welcome screen
│   ├── SignIn.tsx            # Login form
│   ├── SignUp.tsx            # Registration form
│   ├── ForgotPassword.tsx     # Password recovery
│   ├── CreateNewPassword.tsx  # Password reset
│   └── ProtectedRoute.tsx     # Route protection
│
├── context/
│   └── AuthContext.tsx       # Auth state & logic
│
├── services/
│   └── authAPI.ts            # API calls
│
├── utils/
│   └── auth.ts               # Helper functions
│
└── styles/
    ├── Auth.css              # Global styles
    ├── Welcome.css           # Welcome styles
    ├── SignIn.css            # Sign In styles
    ├── SignUp.css            # Sign Up styles
    ├── ForgotPassword.css     # Forgot Password styles
    └── CreateNewPassword.css  # Reset styles
```

## Troubleshooting

### "Cannot find module" errors
```bash
# Make sure all files are created
ls src/components/
ls src/context/
ls src/services/
ls src/styles/
```

### API Connection fails
- Check `.env` has correct `VITE_API_URL`
- Ensure backend is running
- Check browser DevTools → Network tab for request details

### Styles not loading
- Check CSS imports in components
- Verify `.css` files exist in `src/styles/`
- Clear cache: `npm run dev` and refresh browser

### Form not submitting
- Check browser console for errors
- Verify backend is handling the endpoint
- Check network request payload

## Next Steps

1. **Implement Backend** - See `BACKEND_EXAMPLE.js` for reference
2. **Setup OAuth** - See `OAUTH_SETUP.md` for Google/Apple setup
3. **Add Email Service** - For password recovery emails
4. **Deploy** - Build and deploy frontend
5. **Monitor** - Set up error tracking and analytics

## Support Files

- `AUTH_IMPLEMENTATION.md` - Complete implementation guide
- `BACKEND_EXAMPLE.js` - Reference backend implementation
- `OAUTH_SETUP.md` - OAuth integration guide
- `.env.example` - Environment variables template

## Performance Tips

- Components use React.memo (already optimized)
- Forms validate on blur for better UX
- Tokens cached in localStorage
- Error messages auto-clear
- Loading states prevent double-submit

## Security Reminders

✅ Do:
- Use HTTPS in production
- Validate input on frontend AND backend
- Use secure password requirements
- Implement rate limiting on backend
- Keep JWT secrets safe

❌ Don't:
- Store passwords in localStorage
- Send sensitive data in URL
- Expose API keys in frontend code
- Trust frontend validation alone
- Use localStorage for sensitive data in production

---

**Ready to go!** Start with `npm run dev` and test the authentication flows.
