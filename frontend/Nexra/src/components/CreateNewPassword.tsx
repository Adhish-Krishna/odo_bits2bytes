import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { AuthScreen } from './AuthRouter'
import '../styles/CreateNewPassword.css'

interface CreateNewPasswordProps {
  token: string
  onNavigate: (screen: AuthScreen) => void
}

const CreateNewPassword = ({ token, onNavigate }: CreateNewPasswordProps) => {
  const { resetPassword, isLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      await resetPassword(token, password)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-left">
        <div className="reset-password-left-content">
          <h2>Create New Password</h2>
          <p>Choose a strong password to secure your account</p>
        </div>
      </div>

      <div className="reset-password-right">
        <button className="back-button" onClick={() => onNavigate('signin')}>
          ←
        </button>

        <div className="reset-password-right-content">
          {!submitted ? (
            <>
              <div className="reset-password-header">
                <h1>New Password</h1>
                <p>Create a strong password for your account</p>
              </div>

              <form onSubmit={handleSubmit} className="reset-password-form">
                <div className="form-group">
                  <label htmlFor="password">New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="At least 8 characters"
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

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
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
              <h2>Password Reset Successful!</h2>
              <p>Your password has been updated successfully</p>
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

export default CreateNewPassword
