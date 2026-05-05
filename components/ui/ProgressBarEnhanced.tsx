'use client'

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface ProgressBarEnhancedProps {
  progress: number
  showLabel?: boolean
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'accent' | 'gradient'
  className?: string
  animated?: boolean
}

export default function ProgressBarEnhanced({ 
  progress, 
  showLabel = true,
  showPercentage = true,
  size = 'md',
  variant = 'gradient',
  className = '',
  animated = true
}: ProgressBarEnhancedProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)
  
  // Smooth spring animation for progress
  const springProgress = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  useEffect(() => {
    springProgress.set(clampedProgress)
  }, [clampedProgress, springProgress])

  // Transform for width percentage
  const width = useTransform(springProgress, (value) => `${value}%`)
  
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

  // Get status text based on progress
  const getStatusText = () => {
    if (clampedProgress < 25) return 'Starting...'
    if (clampedProgress < 50) return 'Processing...'
    if (clampedProgress < 75) return 'Almost there...'
    if (clampedProgress < 100) return 'Finalizing...'
    return 'Complete!'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          {showPercentage && (
            <motion.span 
              className="font-semibold text-neutral-900 tabular-nums"
              key={Math.round(clampedProgress)}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {Math.round(clampedProgress)}%
            </motion.span>
          )}
          <motion.span 
            className="text-neutral-600"
            key={getStatusText()}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {getStatusText()}
          </motion.span>
        </div>
      )}
      
      <div className={`relative ${sizes[size]} bg-neutral-200 rounded-full overflow-hidden`}>
        {/* Background pulse effect */}
        {animated && clampedProgress > 0 && clampedProgress < 100 && (
          <motion.div
            className="absolute inset-0 bg-primary-300/30"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}

        {/* Progress bar */}
        <motion.div
          className={`absolute inset-y-0 left-0 ${variants[variant]} rounded-full`}
          style={{ 
            width,
            backgroundSize: '200% 100%',
          }}
        >
          {/* Shimmer effect */}
          {animated && clampedProgress > 0 && clampedProgress < 100 && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: 'linear',
                repeatDelay: 0.5
              }}
            />
          )}

          {/* Glow effect at the end */}
          {animated && clampedProgress > 0 && (
            <motion.div
              className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-white/40 to-transparent"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
        </motion.div>

        {/* Completion flash */}
        {clampedProgress === 100 && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </div>

      {/* Progress milestones */}
      {animated && (
        <div className="flex justify-between px-1">
          {[25, 50, 75, 100].map((milestone) => (
            <motion.div
              key={milestone}
              className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                clampedProgress >= milestone ? 'bg-primary-600' : 'bg-neutral-300'
              }`}
              initial={{ scale: 0 }}
              animate={{ 
                scale: clampedProgress >= milestone ? [1, 1.5, 1] : 1,
              }}
              transition={{ 
                duration: 0.3,
                delay: clampedProgress >= milestone ? 0 : 0
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
