'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

interface FindButtonProps {
  onClick: () => void
  disabled: boolean
  isReady: boolean
  isLoading?: boolean
  estimatedTime?: string
}

export default function FindButton({ 
  onClick, 
  disabled, 
  isReady,
  isLoading = false,
  estimatedTime = '30-60 seconds'
}: FindButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative space-y-3"
    >
      {/* Animated glow when ready */}
      {isReady && !isLoading && (
        <motion.div
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-2 bg-gradient-to-r from-accent-500 to-accent-600 rounded-2xl blur-xl"
        />
      )}

      <div className="relative">
        <Button
          onClick={onClick}
          disabled={disabled || isLoading}
          isLoading={isLoading}
          variant="accent"
          size="lg"
          className="w-full relative overflow-hidden"
          icon={
            !isLoading && (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )
          }
        >
          {isLoading ? 'Finding...' : 'Find Me'}
        </Button>

        {/* Shimmer effect when ready */}
        {isReady && !isLoading && (
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 1,
            }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
          />
        )}
      </div>

      {/* Helper text */}
      {disabled && !isLoading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-neutral-500"
        >
          ↑ Complete the steps above to continue
        </motion.p>
      )}

      {isReady && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm text-neutral-600 flex items-center justify-center space-x-2">
            <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Estimated time: {estimatedTime}</span>
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
