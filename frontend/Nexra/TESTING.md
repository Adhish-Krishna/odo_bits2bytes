# Testing Guide - Authentication System

## Manual Testing Checklist

### Welcome Screen
- [ ] Page loads correctly
- [ ] Email input field is visible
- [ ] "Continue with Email" button works
- [ ] "Continue with Google" button displays
- [ ] "Continue with Apple" button displays
- [ ] "Sign Up" link navigates to Sign Up screen
- [ ] Responsive on mobile view

### Sign In Screen
- [ ] Back button navigates to Welcome
- [ ] Email field accepts valid email format
- [ ] Email field rejects invalid formats
- [ ] Password field shows password when toggled
- [ ] Password field hides password when toggled
- [ ] "Remember Me" checkbox works
- [ ] "Forgot Password" link navigates to recovery
- [ ] "Sign Up" link navigates to Sign Up
- [ ] Sign In button is disabled until form is filled
- [ ] Error message displays on failed login
- [ ] Loading state shows during login
- [ ] Successful login (with valid API)
- [ ] Google button navigates to Google login
- [ ] Apple button navigates to Apple login

### Sign Up Screen
- [ ] Back button navigates to Welcome
- [ ] Email input accepts valid emails
- [ ] Email input shows validation error for invalid format
- [ ] First Name field accepts text
- [ ] Last Name field accepts text
- [ ] Password field shows toggle button
- [ ] Confirm Password field shows toggle button
- [ ] Error message shows when passwords don't match
- [ ] Error message shows when password too short
- [ ] Submit button disabled when form incomplete
- [ ] Submit button disabled when passwords don't match
- [ ] Loading state shows during signup
- [ ] Error message displays on failed signup
- [ ] Successful signup (with valid API)
- [ ] "Sign In" link navigates to Sign In
- [ ] Google button works
- [ ] Apple button works
- [ ] Multi-step form transitions smoothly

### Forgot Password Screen
- [ ] Back button navigates to Sign In
- [ ] Email field accepts valid emails
- [ ] Email field rejects invalid format
- [ ] Submit button disabled until email entered
- [ ] Loading state shows during submission
- [ ] Success message displays after submission
- [ ] Auto-navigates to reset password screen
- [ ] Error message displays on failed request
- [ ] Responsive on mobile

### Password Reset Screen
- [ ] Back button navigates back
- [ ] New Password field accepts input
- [ ] Confirm Password field accepts input
- [ ] Password visibility toggles work
- [ ] Error message shows when passwords don't match
- [ ] Error message shows when password too short
- [ ] Submit button disabled when form incomplete
- [ ] Loading state shows during submission
- [ ] Success message displays after reset
- [ ] Auto-navigates to Sign In after success
- [ ] Error message displays on failed reset
- [ ] Token validation works correctly

## Unit Testing Examples

### Test Auth Context
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../context/AuthContext';

describe('useAuth', () => {
  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('should set user and token on successful login', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      // Mock successful login
      // await result.current.login('test@example.com', 'password');
    });

    // expect(result.current.user).not.toBeNull();
    // expect(result.current.token).not.toBeNull();
  });

  it('should clear user on logout', () => {
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
```

### Test Validation Functions
```typescript
import { validateEmail, validatePassword } from '../utils/auth';

describe('Validation Functions', () => {
  it('should validate correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  it('should validate strong password', () => {
    const result = validatePassword('MyPass123');
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject weak password', () => {
    const result = validatePassword('weak');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

## Integration Testing

### Test Authentication Flow
```typescript
describe('Authentication Flow', () => {
  it('should complete full signup flow', async () => {
    // 1. Navigate to signup
    // 2. Fill email
    // 3. Click continue
    // 4. Fill profile info
    // 5. Submit
    // 6. Verify user created
    // 7. Verify token stored
  });

  it('should complete login flow', async () => {
    // 1. Navigate to signin
    // 2. Fill credentials
    // 3. Submit
    // 4. Verify user logged in
    // 5. Verify token stored
  });

  it('should complete password reset flow', async () => {
    // 1. Click forgot password
    // 2. Enter email
    // 3. Verify email sent
    // 4. Open reset link
    // 5. Enter new password
    // 6. Verify password changed
    // 7. Login with new password
  });
});
```

## API Testing

### Test Login Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Test Signup Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test Token Verification
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Performance Testing

### Test Component Render Time
```typescript
import { render } from '@testing-library/react';
import SignIn from '../components/SignIn';

describe('Performance', () => {
  it('should render SignIn component quickly', () => {
    const start = performance.now();
    render(<SignIn onNavigate={jest.fn()} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(1000); // Less than 1 second
  });
});
```

## Security Testing

### Password Security
- [ ] Password not logged in console
- [ ] Password not sent in plain text (HTTPS only)
- [ ] Password hashed on backend
- [ ] Brute force protection active
- [ ] Password reset token expires
- [ ] Token not exposed in URL parameters

### Token Security
- [ ] Token expires after timeout
- [ ] Token refreshes automatically
- [ ] Token not exposed in localStorage warnings
- [ ] Token sent only over HTTPS
- [ ] CSRF tokens validated

### Input Validation
- [ ] XSS prevention (script tags blocked)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Email validation on backend
- [ ] Password requirements enforced
- [ ] Required fields validated
- [ ] Rate limiting applied

## Accessibility Testing

- [ ] Form labels associated with inputs
- [ ] Error messages announced to screen readers
- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Icons have alt text

## Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Error Scenario Testing

- [ ] Network error handling
- [ ] API timeout handling
- [ ] Invalid token handling
- [ ] Expired token handling
- [ ] Missing required fields
- [ ] Invalid email format
- [ ] Weak password
- [ ] Existing user email
- [ ] Non-existent user

## Test Coverage Goals

- Components: 80%+
- Hooks: 85%+
- Utils: 90%+
- Services: 85%+
- Overall: 80%+

## Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (if configured)
npm run test:e2e
```

## Test Data

### Valid Test Credentials
```
Email: test@example.com
Password: TestPass123
```

### Invalid Test Cases
```
Email: invalid-email
Password: weak
```

## Continuous Testing

- [ ] Setup CI/CD pipeline
- [ ] Run tests on every commit
- [ ] Generate coverage reports
- [ ] Alert on test failures
- [ ] Monitor performance metrics
- [ ] Security scanning enabled
