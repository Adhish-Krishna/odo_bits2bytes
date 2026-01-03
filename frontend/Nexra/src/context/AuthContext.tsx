import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  loginWithApple: (idToken: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token)
    } else {
      localStorage.removeItem('authToken')
    }
  }, [token])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Login failed')
      setToken(data.token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Signup failed')
      setToken(data.token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const forgotPassword = async (email: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (resetToken: string, newPassword: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Reset failed')
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Google login failed')
      setToken(data.token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithApple = async (idToken: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Apple login failed')
      setToken(data.token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        signup,
        forgotPassword,
        resetPassword,
        loginWithGoogle,
        loginWithApple,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
