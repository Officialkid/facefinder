'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'accent' | 'gradient'
  className?: string
}

export default function ProgressBar({ 
  progress, 
  showLabel = true,
  size = 'md',
  variant = 'gradient',
  className = ''
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)
  
  const sizes = {
    sm: 'h-1.5',
    md: 'h-3',
    lg: 'h-4'
  }

  const variants = {
    primary: 'bg-primary-600',
    accent: 'bg-accent-600',
    gradient: 'bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-neutral-900">
            {Math.round(clampedProgress)}%
          </span>
          <span className="text-neutral-600">
            {clampedProgress < 100 ? 'Processing...' : 'Complete'}
          </span>
        </div>
      )}
      
      <div className={`relative ${sizes[size]} bg-neutral-200 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 ${variants[variant]} rounded-full`}
          style={{ backgroundSize: '200% 100%' }}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['0%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  )
}
