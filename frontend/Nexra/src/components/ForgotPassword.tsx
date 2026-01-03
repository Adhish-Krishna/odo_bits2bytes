import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { AuthScreen } from './AuthRouter'
import '../styles/ForgotPassword.css'

interface ForgotPasswordProps {
  onNavigate: (screen: AuthScreen) => void
  onTokenReceived: (token: string) => void
}

const ForgotPassword = ({ onNavigate, onTokenReceived }: ForgotPasswordProps) => {
  const { forgotPassword, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    try {
      await forgotPassword(email)
      setSubmitted(true)
      onTokenReceived(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-left">
        <div className="forgot-password-left-content">
          <h2>Forgot Your Password?</h2>
          <p>No worries! Enter your email and we'll send you instructions to reset it</p>
        </div>
      </div>

      <div className="forgot-password-right">
        <button className="back-button" onClick={() => onNavigate('signin')}>
          ←
        </button>

        <div className="forgot-password-right-content">
          {!submitted ? (
            <>
              <div className="forgot-password-header">
                <h1>Reset Password</h1>
                <p>We'll help you get back into your account</p>
              </div>

              <form onSubmit={handleSubmit} className="forgot-password-form">
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

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="auth-link">
                  Remember your password?{' '}
                  <span onClick={() => onNavigate('signin')}>Sign In</span>
                </div>
              </form>
            </>
          ) : (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <h2>Check Your Email</h2>
              <p>We've sent password reset instructions to:</p>
              <p style={{fontWeight: '600', color: '#333'}}>{email}</p>
              <p>Follow the link in the email to reset your password.</p>
              <button 
                className="btn btn-primary"
                onClick={() => onNavigate('signin')}
                style={{marginTop: '1.5rem'}}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
