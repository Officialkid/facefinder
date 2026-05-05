'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchResult } from '@/types'
import { getConfidenceBadge, formatDate } from '@/lib/utils'
import { cardHover, imageZoom, fadeInScale, staggerItem } from '@/lib/animations'
import Badge from '@/components/ui/Badge'
import ButtonEnhanced from '@/components/ui/ButtonEnhanced'

interface ResultCardEnhancedProps {
  result: SearchResult
  onDownload?: (result: SearchResult) => void
  onViewDetails?: (result: SearchResult) => void
  index?: number
}

export default function ResultCardEnhanced({ 
  result, 
  onDownload,
  onViewDetails,
  index = 0
}: ResultCardEnhancedProps) {
  const [isHovered, setIsHovered] = useState(false)
  const badge = getConfidenceBadge(result.confidence)

  return (
    <motion.div
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        className="relative rounded-xl border border-neutral-200 bg-neutral-0 overflow-hidden shadow-soft transition-shadow duration-300 group-hover:shadow-large"
      >
        {/* Glow effect on hover */}
        <motion.div
          className="absolute -inset-0.5 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ zIndex: -1 }}
        />

        {/* Image Container */}
        <div className="relative aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
          {/* Shimmer loading effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'linear'
            }}
          />
          
          {/* Image zoom on hover */}
          <motion.div
            className="absolute inset-0"
            variants={imageZoom}
            initial="rest"
            animate={isHovered ? "hover" : "rest"}
          >
            {/* Placeholder gradient */}
            <div className="w-full h-full bg-gradient-to-br from-primary-100 via-accent-50 to-primary-100" />
          </motion.div>

          {/* Overlay gradient on hover */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/20 to-neutral-900/0"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Quick actions overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <div className="flex space-x-2">
                  <motion.button
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.05 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onViewDetails?.(result)}
                    className="p-3 bg-neutral-0 rounded-full shadow-large backdrop-blur-sm hover:bg-neutral-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </motion.button>
                  <motion.button
                    initial={{ scale: 0, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -90 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDownload?.(result)}
                    className="p-3 bg-neutral-0 rounded-full shadow-large backdrop-blur-sm hover:bg-neutral-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confidence Badge */}
          <motion.div 
            className="absolute top-3 right-3 z-20"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, delay: index * 0.05 + 0.2 }}
          >
            <Badge 
              variant={badge.level === 'high' ? 'success' : badge.level === 'medium' ? 'warning' : 'error'}
              className="backdrop-blur-md"
            >
              <span>{badge.icon}</span>
              <span className="font-bold">{result.confidence}%</span>
            </Badge>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div 
          className="p-4 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.1 }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.15 }}
            >
              <Badge 
                variant={badge.level === 'high' ? 'success' : badge.level === 'medium' ? 'warning' : 'error'}
                size="sm"
              >
                {badge.label} Match
              </Badge>
            </motion.div>
            <motion.span 
              className="text-xs text-neutral-500"
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.15 }}
            >
              {formatDate(result.timestamp)}
            </motion.span>
          </div>

          {/* Filename */}
          <motion.p 
            className="text-sm font-mono text-neutral-700 truncate"
            title={result.filename}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.2 }}
          >
            {result.filename}
          </motion.p>

          {/* Action buttons */}
          <motion.div 
            className="flex items-center space-x-2 pt-1"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.25 }}
          >
            <ButtonEnhanced
              variant="primary"
              size="sm"
              onClick={() => onDownload?.(result)}
              className="flex-1"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Download
            </ButtonEnhanced>
            <ButtonEnhanced
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails?.(result)}
            >
              Details
            </ButtonEnhanced>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
