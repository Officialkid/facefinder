'use client'

import { motion } from 'framer-motion'

interface ProcessingStateProps {
  progress: number
  scannedCount?: number
  totalImages?: number
  etaSeconds?: number
  modeLabel?: string
}

export default function ProcessingState({ progress, scannedCount = 0, totalImages = 0, etaSeconds = 0, modeLabel = 'More Time' }: ProcessingStateProps) {
  const getPhaseMessage = () => {
    if (progress < 25) return { icon: '📤', text: 'Uploading and validating...' }
    if (progress < 50) return { icon: '🧠', text: 'Analyzing facial features...' }
    if (progress < 75) return { icon: '🔎', text: 'Searching dataset...' }
    if (progress < 95) return { icon: '✨', text: 'Finalizing results...' }
    return { icon: '✅', text: 'Almost done!' }
  }

  const phase = getPhaseMessage()
  const timeRemaining = Math.max(0, etaSeconds || Math.ceil((100 - progress) * 0.8))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="relative rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-neutral-0 to-accent-50 p-8 sm:p-12 shadow-large overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-100/50 via-accent-100/30 to-primary-100/50 animate-shimmer" 
             style={{ backgroundSize: '200% 100%' }} 
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
            <p className="text-sm text-neutral-600">Strategy: <span className="font-semibold text-primary-700">{modeLabel}</span></p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="relative h-3 bg-neutral-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 rounded-full"
                style={{ backgroundSize: '200% 100%' }}
              >
                <motion.div
                  animate={{ x: ['0%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </motion.div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-neutral-900">
                {Math.round(progress)}%
              </span>
              <span className="text-neutral-600">
                {timeRemaining > 0 ? `~${timeRemaining}s remaining` : 'Completing...'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 text-center">
              <p className="text-xs text-neutral-500">Images scanned</p>
              <p className="text-xl font-extrabold text-neutral-900">
                {scannedCount.toLocaleString()}{totalImages > 0 ? ` / ${totalImages.toLocaleString()}` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 text-center">
              <p className="text-xs text-neutral-500">Estimated remaining</p>
              <p className="text-xl font-extrabold text-neutral-900">{timeRemaining}s</p>
            </div>
          </div>

          {/* Status Message */}
          <motion.div
            key={phase.text}
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
                {phase.icon}
              </motion.span>
              <p className="text-lg font-medium text-neutral-700">
                {phase.text}
              </p>
            </div>
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
          <div className="text-center pt-4">
            <button className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              Cancel Search
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
