'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toast, ToastType } from '@/types'

interface ToastNotificationProps {
  toast: Toast | null
  onClose: () => void
}

const toastConfig: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: {
    icon: '✓',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-300'
  },
  error: {
    icon: '✕',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-300'
  },
  warning: {
    icon: '⚠',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300'
  },
  info: {
    icon: 'ℹ',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-300'
  }
}

export default function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  useEffect(() => {
    if (toast && toast.duration) {
      const timer = setTimeout(onClose, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast, onClose])

  if (!toast) return null

  const config = toastConfig[toast.type]

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`
              relative rounded-xl border-2 ${config.border} ${config.bg} 
              p-4 shadow-large backdrop-blur-sm
            `}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${config.bg} ${config.color} font-bold text-lg border ${config.border}
              `}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${config.color} mb-1`}>
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-sm text-neutral-600">
                    {toast.message}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className={`
                  flex-shrink-0 p-1 rounded-lg hover:bg-neutral-200/50 
                  transition-colors ${config.color}
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            {toast.duration && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-1 ${config.bg} rounded-b-xl`}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
