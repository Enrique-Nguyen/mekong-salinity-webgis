'use client'

import { useToast, ToastType } from './ToastContext'

// Toast type icons
const icons: Record<ToastType, JSX.Element> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

// Toast type styles
const styles: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-500 text-white',
    border: 'border-emerald-200',
  },
  error: {
    bg: 'bg-red-50',
    icon: 'bg-red-500 text-white',
    border: 'border-red-200',
  },
  warning: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-500 text-white',
    border: 'border-amber-200',
  },
  info: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-500 text-white',
    border: 'border-blue-200',
  },
}

/**
 * Toast container that renders all active toasts
 */
export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = styles[toast.type]
        const icon = icons[toast.type]

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-start gap-3 p-4 rounded-xl shadow-lg border
              ${style.bg} ${style.border}
              animate-slide-in-right
              transform transition-all duration-300
            `}
            role="alert"
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.icon}`}>
              {icon}
            </div>

            {/* Message */}
            <p className="flex-1 text-sm font-medium text-slate-700 pt-1">
              {toast.message}
            </p>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Đóng thông báo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
