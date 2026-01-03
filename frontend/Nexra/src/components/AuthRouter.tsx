import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Welcome from './Welcome'
import SignIn from './SignIn'
import SignUp from './SignUp'
import ForgotPassword from './ForgotPassword'
import CreateNewPassword from './CreateNewPassword'

export type AuthScreen = 'welcome' | 'signin' | 'signup' | 'forgot-password' | 'reset-password'

export const AuthRouter = () => {
  const { isAuthenticated } = useAuth()
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('welcome')
  const [resetToken, setResetToken] = useState<string>('')

  if (isAuthenticated) {
    return (
      <div className="container">
        <h1>Welcome! You are authenticated.</h1>
        <button onClick={() => setCurrentScreen('welcome')}>Back to Welcome</button>
      </div>
    )
  }

  switch (currentScreen) {
    case 'welcome':
      return <Welcome onNavigate={setCurrentScreen} />
    case 'signin':
      return <SignIn onNavigate={setCurrentScreen} />
    case 'signup':
      return <SignUp onNavigate={setCurrentScreen} />
    case 'forgot-password':
      return <ForgotPassword onNavigate={setCurrentScreen} onTokenReceived={setResetToken} />
    case 'reset-password':
      return <CreateNewPassword token={resetToken} onNavigate={setCurrentScreen} />
    default:
      return <Welcome onNavigate={setCurrentScreen} />
  }
}
