'use client'

import { motion } from 'framer-motion'
import { getProcessingStatus } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'

interface ProcessingStateProps {
  progress: number
  onCancel?: () => void
  showCancel?: boolean
}

export default function ProcessingState({ 
  progress, 
  onCancel,
  showCancel = true 
}: ProcessingStateProps) {
  const status = getProcessingStatus(progress)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="relative rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-neutral-0 to-accent-50 p-8 sm:p-12 shadow-large overflow-hidden">
        {/* Animated background */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-primary-100/50 via-accent-100/30 to-primary-100/50" 
          style={{ 
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite'
          }} 
        />

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
              className="inline-block text-5xl mb-4"
            >
              🔍
            </motion.div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
              Finding Matches
            </h2>
          </div>

          {/* Progress Bar */}
          <ProgressBar 
            progress={progress} 
            variant="gradient"
            size="md"
          />

          {/* Status Message */}
          <motion.div
            key={status.message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <div className="flex items-center justify-center space-x-3">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-2xl"
              >
                {status.icon}
              </motion.span>
              <p className="text-lg font-medium text-neutral-700">
                {status.message}
              </p>
            </div>
            {status.timeRemaining > 0 && (
              <p className="text-sm text-neutral-500">
                ~{status.timeRemaining}s remaining
              </p>
            )}
          </motion.div>

          {/* Animated dots */}
          <div className="flex justify-center space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 rounded-full bg-primary-600"
              />
            ))}
          </div>

          {/* Cancel button */}
          {showCancel && onCancel && (
            <div className="text-center pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                Cancel Search
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
