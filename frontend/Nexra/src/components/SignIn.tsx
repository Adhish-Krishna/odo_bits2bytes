import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { AuthScreen } from './AuthRouter'
import '../styles/SignIn.css'

interface SignInProps {
  onNavigate: (screen: AuthScreen) => void
}

const SignIn = ({ onNavigate }: SignInProps) => {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    try {
      await login(email, password)
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email)
      }
      onNavigate('welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="signin-container">
      <div className="signin-left">
        <div className="signin-left-content">
          <h2>Welcome Back</h2>
          <p>Access your account and manage everything from one place</p>
        </div>
      </div>

      <div className="signin-right">
        <button className="back-button" onClick={() => onNavigate('welcome')}>
          ←
        </button>

        <div className="signin-right-content">
          <div className="signin-header">
            <h1>Sign In</h1>
            <p>Enter your credentials below</p>
          </div>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <label className="checkbox">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a
                href="#"
                className="forgot-link"
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate('forgot-password')
                }}
              >
                Forgot Password?
              </a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="signin-divider">Or sign in with</div>

            <button className="btn btn-social btn-google">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <button className="btn btn-social btn-apple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 13.5c-.17-1.46.72-2.73 1.77-3.54.72-.58 1.35-1.38 1.35-2.36 0-1.51-1.08-2.82-2.41-2.82-.89 0-1.67.42-2.2 1.01.04-.33.07-.63.07-.95C15.63 2.62 14.02 1 12 1c-2.04 0-3.65 1.62-3.65 3.62 0 .32.03.62.07.95-.53-.59-1.31-1.01-2.2-1.01-1.33 0-2.41 1.31-2.41 2.82 0 .98.63 1.78 1.35 2.36 1.05.81 1.94 2.08 1.77 3.54-.14 1.14.06 2.41 1.51 3.72.19.17.4.36.63.56.23-.2.44-.39.63-.56 1.45-1.31 1.65-2.58 1.51-3.72z"/>
              </svg>
              Apple
            </button>

            <div className="auth-link">
              Don't have an account?{' '}
              <span onClick={() => onNavigate('signup')}>Create one now</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignIn
