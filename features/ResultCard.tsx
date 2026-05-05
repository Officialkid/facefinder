'use client'

import { motion } from 'framer-motion'
import { SearchResult } from '@/types'
import { getConfidenceBadge, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface ResultCardProps {
  result: SearchResult
  onDownload?: (result: SearchResult) => void
  onViewDetails?: (result: SearchResult) => void
  index?: number
}

export default function ResultCard({ 
  result, 
  onDownload,
  onViewDetails,
  index = 0
}: ResultCardProps) {
  const badge = getConfidenceBadge(result.confidence)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative rounded-xl border border-neutral-200 bg-neutral-0 overflow-hidden shadow-soft hover:shadow-large transition-all duration-300"
    >
      {/* Image Placeholder */}
      <div className="relative aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
        {/* Shimmer effect */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" 
          style={{ 
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite'
          }} 
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/0 to-neutral-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Quick actions */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewDetails?.(result)}
              className="p-3 bg-neutral-0 rounded-full shadow-large"
            >
              <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDownload?.(result)}
              className="p-3 bg-neutral-0 rounded-full shadow-large"
            >
              <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant={badge.level === 'high' ? 'success' : badge.level === 'medium' ? 'warning' : 'error'}>
            <span>{badge.icon}</span>
            <span>{result.confidence}%</span>
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Badge 
            variant={badge.level === 'high' ? 'success' : badge.level === 'medium' ? 'warning' : 'error'}
            size="sm"
          >
            {badge.label} Match
          </Badge>
          <span className="text-xs text-neutral-500">
            {formatDate(result.timestamp)}
          </span>
        </div>

        <p className="text-sm font-mono text-neutral-700 truncate" title={result.filename}>
          {result.filename}
        </p>

        <div className="flex items-center space-x-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onDownload?.(result)}
            className="flex-1"
          >
            Download
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewDetails?.(result)}
          >
            Details
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
