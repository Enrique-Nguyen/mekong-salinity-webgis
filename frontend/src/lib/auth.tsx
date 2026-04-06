'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from './api'

// User type matching backend UserResponse schema
export interface User {
  id: string
  username: string
  email: string
  role: string
  created_at: string
  is_active: boolean
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  register: (username: string, email: string, password: string) => Promise<User>
}

const TOKEN_KEY = 'access_token'

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Fetch current user from /auth/me
  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return null
    }

    try {
      const response = await api.get<User>('/auth/me')
      return response.data
    } catch (error) {
      // Token invalid or expired
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
  }, [])

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      try {
        const currentUser = await fetchUser()
        setUser(currentUser)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [fetchUser])

  // Login function: POST /auth/login with form data
  const login = useCallback(async (username: string, password: string): Promise<void> => {
    // Backend expects form data for OAuth2 password flow
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token } = response.data
    localStorage.setItem(TOKEN_KEY, access_token)

    // Fetch user after successful login
    const currentUser = await fetchUser()
    setUser(currentUser)
  }, [fetchUser])

  // Register function: POST /auth/register with JSON
  const register = useCallback(async (
    username: string,
    email: string,
    password: string
  ): Promise<User> => {
    const response = await api.post<User>('/auth/register', {
      username,
      email,
      password,
    })

    return response.data
  }, [])

  // Logout function: clear token and user state
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
