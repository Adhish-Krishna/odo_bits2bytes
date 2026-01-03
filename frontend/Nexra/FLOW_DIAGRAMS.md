# Authentication Flow Diagram & User Journey

## 🎯 User Flows

### Sign Up Flow
```
Welcome Screen
    ↓
    ├─→ "Sign Up" link
    ↓
Sign Up Screen (Step 1: Email)
    ↓
    ├─→ Enter email & continue
    ↓
Sign Up Screen (Step 2: Profile)
    ↓
    ├─→ Enter name, password
    ├─→ Confirm password
    ↓
Submit Registration
    ↓
Backend Processing
    ├─→ Validate input
    ├─→ Hash password
    ├─→ Create user
    ├─→ Generate JWT
    ↓
Success
    ↓
→ Authenticated User
→ User data stored in context
→ Token stored in localStorage
→ Redirect to dashboard (or next screen)
```

### Sign In Flow
```
Welcome Screen
    ↓
    ├─→ "Continue with Email"
    ↓
Sign In Screen
    ↓
    ├─→ Enter email
    ├─→ Enter password
    ↓
Click "Sign In"
    ↓
Backend Processing
    ├─→ Validate credentials
    ├─→ Check password hash
    ├─→ Generate JWT
    ↓
Success
    ↓
→ Authenticated User
→ User data stored in context
→ Token stored in localStorage
→ Redirect to dashboard
```

### Password Reset Flow
```
Sign In Screen
    ↓
    ├─→ "Forgot Password" link
    ↓
Forgot Password Screen
    ↓
    ├─→ Enter email
    ↓
Click "Continue"
    ↓
Backend Processing
    ├─→ Find user by email
    ├─→ Generate reset token
    ├─→ Send email with link
    ↓
Success Message
    ↓
Auto-navigate to Reset Password Screen
    ↓
User clicks email link or receives token
    ↓
Create New Password Screen
    ↓
    ├─→ Enter new password
    ├─→ Confirm password
    ↓
Click "Continue"
    ↓
Backend Processing
    ├─→ Validate token
    ├─→ Hash new password
    ├─→ Update password
    ↓
Success
    ↓
Auto-redirect to Sign In
    ↓
User logs in with new password
```

### Google OAuth Flow
```
Any Screen
    ↓
    ├─→ "Continue with Google" button
    ↓
Redirect to Google Login
    ↓
User authenticates with Google
    ↓
Google returns ID token
    ↓
Frontend sends ID token to backend
    ↓
Backend Processing
    ├─→ Verify token with Google
    ├─→ Extract user info
    ├─→ Find or create user
    ├─→ Generate JWT
    ↓
Success
    ↓
→ Authenticated User
→ User data stored in context
→ Token stored in localStorage
→ Redirect to dashboard
```

### Apple OAuth Flow
```
Any Screen
    ↓
    ├─→ "Continue with Apple" button
    ↓
Apple Sign-In popup appears
    ↓
User authenticates with Apple
    ↓
Apple returns ID token
    ↓
Frontend sends ID token to backend
    ↓
Backend Processing
    ├─→ Verify token with Apple
    ├─→ Extract user info
    ├─→ Find or create user
    ├─→ Generate JWT
    ↓
Success
    ↓
→ Authenticated User
→ User data stored in context
→ Token stored in localStorage
→ Redirect to dashboard
```

---

## 🔄 Component Interaction Flow

```
App.tsx
  └── AuthProvider
       └── AuthRouter
            ├── useAuth (access auth state)
            │
            └── Screen Components
                 ├── Welcome
                 ├── SignIn
                 │    └── calls login()
                 ├── SignUp
                 │    └── calls signup()
                 ├── ForgotPassword
                 │    └── calls forgotPassword()
                 └── CreateNewPassword
                      └── calls resetPassword()

AuthContext
  ├── State
  │    ├── user
  │    ├── token
  │    ├── isLoading
  │    └── isAuthenticated
  │
  └── Methods
       ├── login()
       ├── signup()
       ├── forgotPassword()
       ├── resetPassword()
       ├── loginWithGoogle()
       ├── loginWithApple()
       └── logout()

API Service (authAPI)
  ├── login()
  ├── signup()
  ├── forgotPassword()
  ├── resetPassword()
  ├── loginWithGoogle()
  ├── loginWithApple()
  └── verifyToken()
```

---

## 📱 Screen Navigation Tree

```
Welcome Screen (Default)
├── → Sign In (email/password)
│   ├── → Forgot Password
│   │   └── → Create New Password
│   │       └── → Sign In (login with new password)
│   └── → Sign Up
│
├── → Sign Up (registration)
│   ├── Step 1: Enter email
│   └── Step 2: Complete profile
│       └── → Sign In (login after signup)
│
├── → Google OAuth
│   └── → Authenticated (if successful)
│
└── → Apple OAuth
    └── → Authenticated (if successful)
```

---

## 🔐 Authentication State Diagram

```
Initial State
    └── user: null
    └── token: null
    └── isAuthenticated: false

↓ User Logs In Successfully

Authenticated State
    ├── user: {id, email, firstName, lastName}
    ├── token: "JWT_TOKEN_HERE"
    ├── isAuthenticated: true
    └── Token stored in localStorage

↓ User Performs Action

Request to Protected Resource
    ├── Authorization: Bearer JWT_TOKEN_HERE
    ├── Request processed
    └── Response received

↓ User Logs Out

Back to Initial State
    ├── user: null
    ├── token: null
    ├── isAuthenticated: false
    └── Token removed from localStorage
```

---

## 🔄 API Request/Response Flow

```
Frontend (SignIn Component)
    │
    ├─→ User enters credentials
    │
    ├─→ Client-side validation
    │
    ├─→ submit form
    │   │
    │   └─→ login(email, password)
    │
    ├─→ authAPI.login() called
    │
    ├─→ HTTP POST /auth/login
    │   └─→ {email, password}
    │
    ├─→ Backend processes
    │   ├─→ Validate input
    │   ├─→ Query database
    │   ├─→ Compare password
    │   └─→ Generate JWT
    │
    ├─→ Backend responds
    │   └─→ {token, user}
    │
    ├─→ Frontend receives response
    │
    ├─→ Update AuthContext
    │   ├─→ setToken()
    │   └─→ setUser()
    │
    ├─→ Store token in localStorage
    │
    ├─→ Update UI
    │   └─→ Show success message
    │
    └─→ Navigate to next screen
        └─→ onNavigate('dashboard')
```

---

## 💾 Data Flow Through App

```
Form Input
    ↓
Form State (component state)
    ├─→ setEmail()
    ├─→ setPassword()
    └─→ ...
    ↓
Validation
    ├─→ validateEmail()
    ├─→ validatePassword()
    └─→ Show errors
    ↓
Submit Handler
    ├─→ auth.login()
    ├─→ auth.signup()
    └─→ ...
    ↓
API Service
    ├─→ HTTP request
    ├─→ JWT header
    └─→ Error handling
    ↓
Backend Processing
    ├─→ Database operations
    ├─→ Token generation
    └─→ Response
    ↓
Response Handler
    ├─→ Extract token/user
    └─→ Extract error
    ↓
Update Global State (AuthContext)
    ├─→ setToken()
    ├─→ setUser()
    └─→ setIsLoading()
    ↓
Persist to Storage
    ├─→ localStorage.setItem('authToken')
    └─→ localStorage.setItem('userData')
    ↓
Update UI
    ├─→ Show success
    ├─→ Show error
    └─→ Navigate
```

---

## 🛡️ Security Data Flow

```
Token Management
├── Generation
│   ├─→ Server generates JWT
│   └─→ Contains: {user_id, email, exp}
│
├── Storage
│   ├─→ Frontend stores in localStorage
│   └─→ Note: Consider httpOnly cookies for production
│
├── Transmission
│   ├─→ Authorization header: "Bearer TOKEN"
│   ├─→ Only over HTTPS
│   └─→ Not in URL parameters
│
├── Validation
│   ├─→ Backend verifies signature
│   ├─→ Checks expiration
│   └─→ Validates claims
│
└── Expiration
    ├─→ Default: 24 hours
    ├─→ Can be extended with refresh token
    └─→ Auto-logout when expired

Password Security
├── Input
│   ├─→ User enters password
│   └─→ Client-side validation
│
├── Transmission
│   ├─→ HTTPS only
│   └─→ Not logged anywhere
│
├── Backend Processing
│   ├─→ Hash with bcrypt
│   ├─→ Salt rounds: 10+
│   └─→ Never stored in plain text
│
└── Verification
    ├─→ Compare hashes
    ├─→ Never compare plain text
    └─→ Rate limit attempts
```

---

## 🎯 Error Handling Flow

```
Error Occurs
    ↓
Error Type?
    │
    ├─→ Validation Error
    │   ├─→ Display in form
    │   └─→ Highlight field
    │
    ├─→ Network Error
    │   ├─→ Show error message
    │   └─→ Retry button
    │
    ├─→ Authentication Error
    │   ├─→ Show error message
    │   ├─→ Clear form
    │   └─→ Suggest forgot password
    │
    └─→ Server Error
        ├─→ Show generic message
        ├─→ Log for debugging
        └─→ Suggest retry
```

---

## 📊 State Management Flow

```
AuthContext
├── State
│   ├── user: User | null
│   ├── token: string | null
│   ├── isLoading: boolean
│   └── isAuthenticated: boolean
│
├── Derived State
│   └── isAuthenticated = !!token
│
├── Updates via Methods
│   ├── login() → setToken + setUser
│   ├── signup() → setToken + setUser
│   ├── logout() → setToken(null) + setUser(null)
│   └── ...
│
└── Subscription
    └── useAuth() hook
        └── Used by components
```

---

## ✨ Complete Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER AUTHENTICATION                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌────────────┐
│ Welcome Screen   │──────→│ Sign In/Sign Up  │──────→│ Dashboard  │
│ Entry Point      │       │ Authentication   │       │ Logged In  │
└──────────────────┘       └──────────────────┘       └────────────┘
       ↑                            │                         │
       │                            └─────────────────────────┘
       │                            API Call                  │
       │                    ┌──────────────────┐              │
       │                    │  Backend API     │              │
       │                    │  - Validate      │              │
       │                    │  - Hash Password │              │
       │                    │  - Generate JWT  │              │
       │                    └──────────────────┘              │
       │                            │                         │
       │                    Response with JWT                 │
       │                            ↓                         │
       │                    ┌──────────────────┐              │
       │                    │  Update Context  │              │
       │                    │  - Set User      │              │
       │                    │  - Set Token     │              │
       │                    └──────────────────┘              │
       │                            │                         │
       │                    ┌──────────────────┐              │
       │                    │  Persist Storage │              │
       │                    │  - localStorage  │              │
       │                    │  - Session       │              │
       │                    └──────────────────┘              │
       │                            │                         │
       │                    ┌──────────────────┐              │
       │                    │   Future Requests│              │
       │                    │   - Send JWT     │──────────────┘
       │                    │   - Authenticated│
       │                    └──────────────────┘
       │
       └──────────────────── Logout Flow ──────────────────────
```

---

## 🔗 Integration Points

```
Frontend
├── HTTP Client
│   └── authAPI.ts
│       └── HTTP Requests
│           └── Backend API
│
├── State Management
│   └── AuthContext
│       └── Global Auth State
│           └── Components
│
└── Storage
    └── localStorage
        └── Token Persistence

Backend
├── Request Handler
│   └── Route /auth/*
│       └── Controller
│           └── Service
│
├── Database
│   └── User Model
│       └── CRUD Operations
│
├── Authentication
│   └── JWT Generation
│       └── Token Validation
│
└── Email Service
    └── Password Recovery
        └── Email Sending
```

---

These diagrams help visualize:
- User flows through the app
- Component interactions
- Data flow patterns
- State management
- API communication
- Security considerations
- Error handling
- Integration points

Use these as reference while implementing and debugging the authentication system.
