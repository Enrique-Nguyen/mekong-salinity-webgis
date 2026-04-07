'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { SalinityMap } from '@/components/Map'
import { SalinityChart } from '@/components/Chart'
import { UploadForm } from '@/components/Upload'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth()

  // Date range filter state
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title */}
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Hệ thống Giám sát Xâm nhập mặn ĐBSCL
            </h1>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              {/* Admin Panel Link */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-sm font-medium text-purple-600 
                             bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors
                             flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700">{user?.username}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Admin</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 
                           bg-slate-100 hover:bg-red-50 rounded-lg transition-colors duration-200
                           flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Date Range Filter */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Lọc theo thời gian:</span>
            <div className="flex items-center gap-2">
              <label htmlFor="start-date" className="text-sm text-slate-600">Từ:</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="end-date" className="text-sm text-slate-600">Đến:</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           bg-white transition-colors"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 
                           hover:bg-red-50 rounded-lg transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-full">
          {/* Left Panel - Map (70%) */}
          <div className="lg:col-span-7 min-h-[500px] lg:min-h-[calc(100vh-280px)]">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full">
              <SalinityMap
                startDate={startDate || undefined}
                endDate={endDate || undefined}
              />
            </div>
          </div>

          {/* Right Panel - Chart & Upload (30%) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Chart */}
            <div className="flex-1 min-h-[400px]">
              <SalinityChart />
            </div>

            {/* Upload Form */}
            <div>
              <UploadForm />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200 mt-auto">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} Hệ thống Giám sát Xâm nhập mặn ĐBSCL
            </p>
            <p>
              Phát triển bởi nhóm nghiên cứu khoa học - Đại học
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
