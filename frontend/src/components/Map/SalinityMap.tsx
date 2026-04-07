'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import api from '@/lib/api'
import Cookies from 'js-cookie'
import 'leaflet/dist/leaflet.css'

// ĐBSCL center coordinates
const DBSCL_CENTER: [number, number] = [9.8, 105.8]
const DEFAULT_ZOOM = 8

// Observation data type from API
interface Observation {
  id: number
  station_id: number
  station_name: string
  salinity: number
  ph: number | null
  dissolved_oxygen: number | null
  temperature: number | null
  latitude: number
  longitude: number
  measured_at: string
}

interface ObservationsResponse {
  items: Observation[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

interface SalinityMapProps {
  startDate?: string
  endDate?: string
  onMarkerClick?: (observation: Observation) => void
}

/**
 * Get color based on salinity value (g/L)
 * - 0-5: green (safe)
 * - 5-15: yellow (moderate)
 * - 15-25: orange (high)
 * - >25: red (critical)
 */
function getSalinityColor(salinity: number): string {
  if (salinity <= 5) return '#22c55e'  // green-500
  if (salinity <= 15) return '#eab308' // yellow-500
  if (salinity <= 25) return '#f97316' // orange-500
  return '#ef4444' // red-500
}

/**
 * Format date for display in Vietnamese locale
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Convert salinity to intensity (0-1) for heatmap
 * Normalizes based on threshold scale
 */
function salinityToIntensity(salinity: number): number {
  // Scale: 0-30+ g/L mapped to 0-1 intensity
  return Math.min(salinity / 30, 1)
}

/**
 * Heatmap layer component using react-leaflet's useMap hook
 */
interface HeatmapLayerProps {
  points: Array<[number, number, number]> // [lat, lng, intensity]
  visible: boolean
}

function HeatmapLayer({ points, visible }: HeatmapLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!visible || points.length === 0) return

    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#22c55e',   // green - safe
        0.33: '#eab308',  // yellow - moderate
        0.66: '#f97316',  // orange - high
        1.0: '#ef4444'    // red - critical
      }
    })

    heatLayer.addTo(map)

    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, points, visible])

  return null
}

export default function SalinityMap({ startDate, endDate, onMarkerClick }: SalinityMapProps) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)

  useEffect(() => {
    const fetchObservations = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = Cookies.get('access_token')
        
        const params = new URLSearchParams({
          page: '1',
          page_size: '1000',
        })
        
        // Convert date to datetime format with appropriate time
        // start_date: beginning of day (00:00:00)
        // end_date: end of day (23:59:59)
        if (startDate) params.append('start_date', `${startDate}T00:00:00`)
        if (endDate) params.append('end_date', `${endDate}T23:59:59`)

        const response = await api.get<ObservationsResponse>(`/api/observations?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        setObservations(response.data.items)
      } catch (err) {
        console.error('Failed to fetch observations:', err)
        setError('Không thể tải dữ liệu quan trắc')
      } finally {
        setLoading(false)
      }
    }

    fetchObservations()
  }, [startDate, endDate])

  // Prepare heatmap data: [lat, lng, intensity]
  const heatmapData: Array<[number, number, number]> = observations.map((obs) => [
    obs.latitude,
    obs.longitude,
    salinityToIntensity(obs.salinity)
  ])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600 font-medium">Đang tải dữ liệu...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-bold text-lg leading-none"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Độ mặn (g/L)</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-xs text-gray-600">0 - 5 (An toàn)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#eab308]" />
            <span className="text-xs text-gray-600">5 - 15 (Trung bình)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f97316]" />
            <span className="text-xs text-gray-600">15 - 25 (Cao)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span className="text-xs text-gray-600">&gt;25 (Nguy hiểm)</span>
          </div>
        </div>
      </div>

      {/* Heatmap Toggle */}
      <div className="absolute top-4 right-4 z-[1000]">
        <label className="flex items-center gap-3 cursor-pointer select-none bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2.5 border border-gray-200 hover:border-cyan-300 transition-colors">
          <span className="text-sm font-medium text-gray-700">Hiển thị Heatmap</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500 transition-all duration-300" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transform peer-checked:translate-x-5 transition-transform duration-300" />
          </div>
        </label>
      </div>

      {/* Map */}
      <MapContainer
        center={DBSCL_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <HeatmapLayer points={heatmapData} visible={showHeatmap} />

        {!showHeatmap && observations.map((obs) => (
          <CircleMarker
            key={obs.id}
            center={[obs.latitude, obs.longitude]}
            radius={10}
            pathOptions={{
              fillColor: getSalinityColor(obs.salinity),
              fillOpacity: 0.8,
              color: '#fff',
              weight: 2,
            }}
            eventHandlers={{
              click: () => onMarkerClick?.(obs),
            }}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <h3 className="font-bold text-gray-800 text-base mb-2 border-b pb-1">
                  {obs.station_name}
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Độ mặn:</span>
                    <span 
                      className="font-semibold"
                      style={{ color: getSalinityColor(obs.salinity) }}
                    >
                      {obs.salinity.toFixed(2)} g/L
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Thời gian:</span>
                    <span className="font-medium">{formatDate(obs.measured_at)}</span>
                  </p>
                  {obs.ph !== null && (
                    <p className="flex justify-between">
                      <span className="text-gray-500">pH:</span>
                      <span className="font-medium">{obs.ph.toFixed(1)}</span>
                    </p>
                  )}
                  {obs.dissolved_oxygen !== null && (
                    <p className="flex justify-between">
                      <span className="text-gray-500">DO:</span>
                      <span className="font-medium">{obs.dissolved_oxygen.toFixed(1)} mg/L</span>
                    </p>
                  )}
                  {obs.temperature !== null && (
                    <p className="flex justify-between">
                      <span className="text-gray-500">Nhiệt độ:</span>
                      <span className="font-medium">{obs.temperature.toFixed(1)}°C</span>
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
