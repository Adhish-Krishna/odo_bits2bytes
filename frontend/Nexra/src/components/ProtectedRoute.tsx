import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Protected Route Component
 * Redirects to sign in if user is not authenticated
 */
export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return fallback || <p>Please sign in to continue</p>
  }

  return children
}

export default ProtectedRoute
