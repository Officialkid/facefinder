'use client'

import { motion } from 'framer-motion'

interface CTAButtonProps {
  onClick: () => void
  disabled: boolean
  isReady: boolean
  isLoading?: boolean
}

export default function CTAButton({ onClick, disabled, isReady, isLoading = false }: CTAButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative pt-1"
    >
      <motion.button
        onClick={onClick}
        disabled={disabled || isLoading}
        whileHover={!disabled && !isLoading ? { scale: 1.01 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
        className={`
          relative w-full py-4 px-8 rounded-2xl font-bold text-3xl
          transition-all duration-300
          ${disabled || isLoading
            ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white shadow-soft cursor-pointer'
          }
        `}
      >
        <span className="relative z-10 flex items-center justify-center space-x-3">
          <svg 
            className="w-8 h-8" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <span>{isLoading ? 'Checking Photo...' : 'Find Me'}</span>
        </span>
      </motion.button>

      {disabled && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-sm text-neutral-500"
        >
          {!isReady && '↑ Complete the steps above to continue'}
        </motion.p>
      )}

      {isReady && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center"
        >
          <p className="text-sm text-neutral-600 flex items-center justify-center space-x-2">
            <svg 
              className="w-4 h-4 text-primary-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" 
              />
            </svg>
            <span>Estimated time: 30-60 seconds</span>
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
