'use client'

/**
 * Loading skeleton for the Map component
 * Matches the full-height map container with placeholder elements
 */
export default function MapSkeleton() {
  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-100 rounded-lg overflow-hidden animate-pulse">
      {/* Map area placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
        {/* Simulated map grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-300"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>

        {/* Map pin placeholders */}
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-slate-300 rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-slate-300 rounded-full" />
        <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-slate-300 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-slate-300 rounded-full" />
        <div className="absolute bottom-1/4 right-1/3 w-4 h-4 bg-slate-300 rounded-full" />
      </div>

      {/* Legend placeholder */}
      <div className="absolute bottom-6 left-4 z-10 bg-white/80 rounded-lg p-3 w-36">
        <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-200 rounded-full" />
            <div className="h-2 w-16 bg-slate-200 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-200 rounded-full" />
            <div className="h-2 w-20 bg-slate-200 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-200 rounded-full" />
            <div className="h-2 w-14 bg-slate-200 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-200 rounded-full" />
            <div className="h-2 w-18 bg-slate-200 rounded" />
          </div>
        </div>
      </div>

      {/* Heatmap toggle placeholder */}
      <div className="absolute top-4 right-4 z-10 bg-white/80 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="w-11 h-6 bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 bg-white/90 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-600 font-medium">Đang tải bản đồ...</span>
        </div>
      </div>
    </div>
  )
}
