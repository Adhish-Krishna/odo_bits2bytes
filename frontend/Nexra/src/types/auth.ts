/**
 * TypeScript Type Definitions for Authentication System
 */

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData extends LoginCredentials {
  firstName: string
  lastName: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetData {
  token: string
  newPassword: string
}

export interface SocialLoginRequest {
  idToken: string
}

// ============================================
// API Response Types
// ============================================

export interface AuthResponse {
  success: boolean
  token: string
  user: User
  message?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ErrorResponse {
  success: false
  message: string
  code?: string
}

// ============================================
// Context Types
// ============================================

export interface AuthContextType {
  // State
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean

  // Methods
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  loginWithApple: (idToken: string) => Promise<void>
  logout: () => void
}

// ============================================
// Component Props Types
// ============================================

export interface NavigableScreenProps {
  onNavigate: (screen: AuthScreen) => void
}

export type AuthScreen = 'welcome' | 'signin' | 'signup' | 'forgot-password' | 'reset-password'

export interface WelcomeProps extends NavigableScreenProps {}

export interface SignInProps extends NavigableScreenProps {}

export interface SignUpProps extends NavigableScreenProps {}

export interface ForgotPasswordProps extends NavigableScreenProps {
  onTokenReceived: (token: string) => void
}

export interface CreateNewPasswordProps extends NavigableScreenProps {
  token: string
}

export interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// ============================================
// Form Validation Types
// ============================================

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

// ============================================
// Token Types
// ============================================

export interface JWTPayload {
  id: string
  email: string
  iat?: number
  exp?: number
}

export interface DecodedToken {
  header: {
    alg: string
    typ: string
  }
  payload: JWTPayload
  signature: string
}

// ============================================
// Form State Types
// ============================================

export interface LoginFormState {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignUpFormState {
  email: string
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
}

export interface PasswordResetFormState {
  newPassword: string
  confirmPassword: string
}

export interface ForgotPasswordFormState {
  email: string
}

// ============================================
// Error Types
// ============================================

export interface AuthError extends Error {
  code?: string
  statusCode?: number
  details?: unknown
}

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  details?: Record<string, unknown>
}

// ============================================
// OAuth Types
// ============================================

export interface GoogleCredentialResponse {
  credential: string
  clientId?: string
}

export interface AppleAuthorizationResponse {
  authorization?: {
    id_token?: string
    code?: string
    state?: string
  }
  user?: {
    name?: {
      firstName?: string
      lastName?: string
    }
    email?: string
  }
}

// ============================================
// API Service Types
// ============================================

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

export interface FetchOptions extends RequestConfig {
  retries?: number
  retryDelay?: number
}

// ============================================
// Utility Function Types
// ============================================

export type EmailValidator = (email: string) => boolean
export type PasswordValidator = (password: string) => PasswordValidationResult
export type PasswordMatcher = (password: string, confirmPassword: string) => boolean
export type TokenDecoder = (token: string) => JWTPayload | null
export type TokenExpiryChecker = (token: string) => boolean

// ============================================
// Async Operation Types
// ============================================

export type AsyncFunction<T = void> = () => Promise<T>
export type AsyncAction<T, R = void> = (data: T) => Promise<R>

// ============================================
// Hook Types
// ============================================

export interface UseAuthReturn {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: AsyncAction<LoginCredentials>
  signup: AsyncAction<SignUpData>
  logout: () => void
}

export interface UseFormReturn<T> {
  values: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  setFieldValue: (field: keyof T, value: unknown) => void
  setFieldTouched: (field: keyof T, touched: boolean) => void
  handleSubmit: (onSubmit: (values: T) => Promise<void>) => (e: React.FormEvent) => Promise<void>
  resetForm: () => void
}

export interface UseErrorReturn {
  error: string | null
  setError: (error: string | null) => void
  clearError: () => void
  handleError: (error: unknown) => void
}

// ============================================
// Enum Types
// ============================================

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
}

// ============================================
// Configuration Types
// ============================================

export interface AuthConfig {
  apiBaseUrl: string
  tokenKey: string
  tokenExpiryKey: string
  refreshTokenKey: string
  autoRefreshToken: boolean
  tokenRefreshInterval: number
}

export interface OAuth2Config {
  clientId: string
  clientSecret?: string
  redirectUri: string
  scope?: string[]
  responseType?: string
}
