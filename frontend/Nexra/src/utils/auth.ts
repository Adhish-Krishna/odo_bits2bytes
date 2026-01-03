/**
 * Email validation using regex pattern
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Password validation rules
 */
export const validatePassword = (password: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Check if passwords match
 */
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword && password.length > 0
}

/**
 * Store JWT token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token)
}

/**
 * Get JWT token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken')
}

/**
 * Remove JWT token from localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken')
}

/**
 * Decode JWT token (basic implementation)
 */
export const decodeToken = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true

  const expirationTime = (decoded.exp as number) * 1000
  return Date.now() >= expirationTime
}

/**
 * Format error messages for display
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

/**
 * Check if user session is valid
 */
export const isSessionValid = (): boolean => {
  const token = getAuthToken()
  if (!token) return false
  return !isTokenExpired(token)
}
