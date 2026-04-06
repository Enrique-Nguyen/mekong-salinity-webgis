import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const TOKEN_KEY = 'access_token'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Authorization Bearer token if exists
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor: handle 401 errors, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Only access localStorage and window in browser environment
      if (typeof window !== 'undefined') {
        // Clear auth token
        localStorage.removeItem(TOKEN_KEY)
        
        // Redirect to login page (avoid infinite loop if already on login)
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/register') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
