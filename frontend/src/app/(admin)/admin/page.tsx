'use client'

import { useEffect, useState } from 'react'
import { getAdminStats, AdminStatsResponse } from '@/lib/admin-api'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats()
        setStats(data)
      } catch (err) {
        setError('Không thể tải thống kê')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Tổng số người dùng"
          value={stats?.total_users || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Người dùng đang hoạt động"
          value={stats?.active_users || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Quản trị viên"
          value={stats?.admin_users || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Upload Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Tổng số uploads"
          value={stats?.total_uploads || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
          color="cyan"
        />
        <StatCard
          title="Đang xử lý"
          value={stats?.pending_uploads || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
        <StatCard
          title="Thành công"
          value={stats?.completed_uploads || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 13l4 4L19 7" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Thất bại"
          value={stats?.failed_uploads || 0}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
          color="red"
        />
      </div>

      {/* Observation Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Thống kê dữ liệu quan trắc</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500">Tổng số điểm đo</p>
            <p className="text-2xl font-bold text-slate-800">
              {(stats?.total_observations || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Độ mặn thấp nhất</p>
            <p className="text-2xl font-bold text-slate-800">
              {stats?.min_salinity != null ? `${stats.min_salinity} g/L` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Độ mặn cao nhất</p>
            <p className="text-2xl font-bold text-slate-800">
              {stats?.max_salinity != null ? `${stats.max_salinity} g/L` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Phạm vi thời gian</p>
            <p className="text-sm font-medium text-slate-800">
              {formatDate(stats?.earliest_date || null)} - {formatDate(stats?.latest_date || null)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'cyan' | 'yellow' | 'red'
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
