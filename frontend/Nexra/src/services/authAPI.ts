interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  token?: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const request = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`
  const token = localStorage.getItem('authToken')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`)
  }

  return data as ApiResponse<T>
}

export const authAPI = {
  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, firstName: string, lastName: string) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    }),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  loginWithGoogle: (idToken: string) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  loginWithApple: (idToken: string) =>
    request('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  verifyToken: () =>
    request('/auth/verify', {
      method: 'GET',
    }),
}

export default authAPI
