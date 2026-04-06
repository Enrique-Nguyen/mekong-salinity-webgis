'use client'

/**
 * Loading skeleton for the Chart component
 * Matches the card-like structure with chart placeholder
 */
export default function ChartSkeleton() {
  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title placeholder */}
          <div className="h-5 w-56 bg-slate-200 rounded" />

          {/* Station selector placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-10 w-40 bg-white border border-slate-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-6">
        <div className="h-[400px] flex flex-col">
          {/* Chart title placeholder */}
          <div className="h-4 w-48 bg-slate-200 rounded mx-auto mb-6" />

          {/* Y-axis labels */}
          <div className="flex flex-1">
            <div className="flex flex-col justify-between py-4 pr-3">
              <div className="h-3 w-12 bg-slate-200 rounded" />
              <div className="h-3 w-10 bg-slate-200 rounded" />
              <div className="h-3 w-12 bg-slate-200 rounded" />
              <div className="h-3 w-10 bg-slate-200 rounded" />
              <div className="h-3 w-8 bg-slate-200 rounded" />
            </div>

            {/* Chart area with line placeholder */}
            <div className="flex-1 relative border-l border-b border-slate-200">
              {/* Grid lines */}
              <div className="absolute inset-0">
                <div className="h-full w-full grid grid-rows-4 grid-cols-6">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border-r border-t border-slate-100" />
                  ))}
                </div>
              </div>

              {/* Simulated line chart */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <path
                  d="M 0 200 Q 50 180, 100 190 T 200 160 T 300 180 T 400 120 T 500 140 T 600 100"
                  fill="none"
                  stroke="rgb(226, 232, 240)"
                  strokeWidth="3"
                  className="animate-pulse"
                />
                {/* Area under the line */}
                <path
                  d="M 0 200 Q 50 180, 100 190 T 200 160 T 300 180 T 400 120 T 500 140 T 600 100 L 600 300 L 0 300 Z"
                  fill="rgb(241, 245, 249)"
                  fillOpacity="0.5"
                />
              </svg>

              {/* Data point placeholders */}
              <div className="absolute top-[45%] left-[15%] w-3 h-3 bg-slate-200 rounded-full" />
              <div className="absolute top-[55%] left-[30%] w-3 h-3 bg-slate-200 rounded-full" />
              <div className="absolute top-[40%] left-[50%] w-3 h-3 bg-slate-200 rounded-full" />
              <div className="absolute top-[30%] left-[70%] w-3 h-3 bg-slate-200 rounded-full" />
              <div className="absolute top-[35%] left-[85%] w-3 h-3 bg-slate-200 rounded-full" />
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between pl-16 pr-4 pt-3">
            <div className="h-3 w-12 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-200 rounded" />
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
        <div className="flex flex-wrap gap-4">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-3 w-28 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  )
}
