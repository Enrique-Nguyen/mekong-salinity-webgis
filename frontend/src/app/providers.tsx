'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider, ToastContainer } from '@/components/Toast'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  )
}
