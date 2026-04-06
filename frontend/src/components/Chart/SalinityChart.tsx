'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import api from '@/lib/api'
import Cookies from 'js-cookie'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Observation {
  id: number
  station_id: string
  salinity: number
  measured_at: string
  created_at: string
}

interface PaginatedResponse {
  items: Observation[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

interface Station {
  id: string
  name: string
}

// Vietnamese date formatting helper
function formatDateVietnamese(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SalinityChart() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch stations list first
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = Cookies.get('access_token')
        const response = await api.get<Station[]>('/api/stations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        setStations(response.data)
        if (response.data.length > 0) {
          setSelectedStation(response.data[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch stations:', err)
        // Fallback: will extract stations from observations
      }
    }
    fetchStations()
  }, [])

  // Fetch observations when station changes
  useEffect(() => {
    const fetchObservations = async () => {
      if (!selectedStation) return

      setLoading(true)
      setError(null)

      try {
        const token = Cookies.get('access_token')
        const response = await api.get<PaginatedResponse>('/api/observations', {
          params: {
            station_id: selectedStation,
            page: 1,
            page_size: 1000,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        setObservations(response.data.items)

        // Extract unique stations from observations if stations list is empty
        if (stations.length === 0 && response.data.items.length > 0) {
          const uniqueStationIds = Array.from(
            new Set(response.data.items.map((o) => o.station_id))
          )
          setStations(uniqueStationIds.map((id) => ({ id, name: id })))
        }
      } catch (err) {
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.')
        console.error('Failed to fetch observations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchObservations()
  }, [selectedStation, stations.length])

  // Prepare chart data
  const chartData = useMemo(() => {
    const sortedData = [...observations].sort(
      (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    )

    return {
      labels: sortedData.map((o) => formatDateVietnamese(o.measured_at)),
      datasets: [
        {
          label: `Độ mặn - ${selectedStation}`,
          data: sortedData.map((o) => o.salinity),
          borderColor: 'rgb(14, 165, 233)',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(14, 165, 233)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          tension: 0.3,
          fill: true,
        },
      ],
    }
  }, [observations, selectedStation])

  // Store original dates for tooltips
  const originalDates = useMemo(() => {
    return [...observations]
      .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
      .map((o) => o.measured_at)
  }, [observations])

  // Chart options with Vietnamese locale
  const chartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            font: {
              family: 'system-ui, sans-serif',
              size: 12,
            },
            usePointStyle: true,
            padding: 20,
          },
        },
        title: {
          display: true,
          text: 'Biểu đồ độ mặn theo thời gian',
          font: {
            family: 'system-ui, sans-serif',
            size: 16,
            weight: 'bold' as const,
          },
          color: '#1e40af',
          padding: {
            top: 10,
            bottom: 20,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(30, 64, 175, 0.95)',
          titleFont: {
            size: 13,
          },
          bodyFont: {
            size: 12,
          },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex
              return formatDateFull(originalDates[index])
            },
            label: (context) => {
              const value = context.parsed.y ?? 0
              return `Độ mặn: ${value.toFixed(2)} g/L`
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Thời gian',
            font: {
              family: 'system-ui, sans-serif',
              size: 12,
              weight: 'bold' as const,
            },
            color: '#475569',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
          ticks: {
            font: {
              size: 11,
            },
            color: '#64748b',
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 12,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Độ mặn (g/L)',
            font: {
              family: 'system-ui, sans-serif',
              size: 12,
              weight: 'bold' as const,
            },
            color: '#475569',
          },
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
          ticks: {
            font: {
              size: 11,
            },
            color: '#64748b',
            callback: (value) => `${value} g/L`,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    }),
    [originalDates]
  )

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-blue-900">
            Biểu đồ độ mặn theo thời gian
          </h2>

          {/* Station Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="station-select"
              className="text-sm font-medium text-slate-600 whitespace-nowrap"
            >
              Chọn trạm:
            </label>
            <select
              id="station-select"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-colors cursor-pointer min-w-[160px]"
              disabled={loading && stations.length === 0}
            >
              {stations.length === 0 ? (
                <option value="">Đang tải...</option>
              ) : (
                stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name || station.id}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setSelectedStation(selectedStation)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                         hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : observations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-500">Không có dữ liệu cho trạm này</p>
          </div>
        ) : (
          <div className="h-[400px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {!loading && !error && observations.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              <strong className="text-slate-700">{observations.length}</strong> điểm dữ liệu
            </span>
            {observations.length > 0 && (
              <>
                <span>
                  Min:{' '}
                  <strong className="text-slate-700">
                    {Math.min(...observations.map((o) => o.salinity)).toFixed(2)} g/L
                  </strong>
                </span>
                <span>
                  Max:{' '}
                  <strong className="text-slate-700">
                    {Math.max(...observations.map((o) => o.salinity)).toFixed(2)} g/L
                  </strong>
                </span>
                <span>
                  Trung bình:{' '}
                  <strong className="text-slate-700">
                    {(
                      observations.reduce((sum, o) => sum + o.salinity, 0) / observations.length
                    ).toFixed(2)}{' '}
                    g/L
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
