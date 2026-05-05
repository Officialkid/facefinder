'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SearchResult } from '@/types'
import { staggerContainer, fadeInDown, fadeInUp } from '@/lib/animations'
import ResultCardEnhanced from './ResultCardEnhanced'
import ButtonEnhanced from '@/components/ui/ButtonEnhanced'

interface ResultsGridEnhancedProps {
  results: SearchResult[]
  onReset?: () => void
  onDownloadAll?: () => void
  searchTime?: number
}

type SortOption = 'confidence-high' | 'confidence-low' | 'filename' | 'date'

export default function ResultsGridEnhanced({ 
  results, 
  onReset,
  onDownloadAll,
  searchTime = 47
}: ResultsGridEnhancedProps) {
  const [sortBy, setSortBy] = useState<SortOption>('confidence-high')

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'confidence-high':
        return b.confidence - a.confidence
      case 'confidence-low':
        return a.confidence - b.confidence
      case 'filename':
        return a.filename.localeCompare(b.filename)
      case 'date':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      default:
        return 0
    }
  })

  const handleDownload = (result: SearchResult) => {
    console.log('Download:', result)
  }

  const handleViewDetails = (result: SearchResult) => {
    console.log('View details:', result)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Header with slide down animation */}
      <motion.div
        variants={fadeInDown}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200"
      >
        <div>
          <motion.h2 
            className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Search Complete
          </motion.h2>
          <motion.p 
            className="text-neutral-600"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Found{' '}
            <motion.span 
              className="font-semibold text-primary-600"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, delay: 0.3 }}
            >
              {results.length} matches
            </motion.span>
            {' '}in {searchTime} seconds
          </motion.p>
        </div>

        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {onDownloadAll && (
            <ButtonEnhanced
              variant="secondary"
              size="md"
              onClick={onDownloadAll}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Download All
            </ButtonEnhanced>
          )}
          {onReset && (
            <ButtonEnhanced
              variant="primary"
              size="md"
              onClick={onReset}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              New Search
            </ButtonEnhanced>
          )}
        </motion.div>
      </motion.div>

      {/* Sort Controls with fade in */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-600">Sort by:</span>
          <motion.select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-0 border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <option value="confidence-high">Confidence (High to Low)</option>
            <option value="confidence-low">Confidence (Low to High)</option>
            <option value="filename">Filename</option>
            <option value="date">Date</option>
          </motion.select>
        </div>

        <motion.p 
          className="text-sm text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Showing all {results.length} results
        </motion.p>
      </motion.div>

      {/* Results Grid with stagger animation */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {sortedResults.map((result, index) => (
          <ResultCardEnhanced
            key={result.id}
            result={result}
            index={index}
            onDownload={handleDownload}
            onViewDetails={handleViewDetails}
          />
        ))}
      </motion.div>

      {/* Load More with bounce animation */}
      {results.length >= 12 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-8"
        >
          <ButtonEnhanced 
            variant="secondary" 
            size="md"
            icon={
              <motion.svg 
                className="w-5 h-5"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            }
          >
            Load More Results
          </ButtonEnhanced>
        </motion.div>
      )}

      {/* Success celebration animation */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 1, delay: 0.2 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="text-6xl">✨</div>
      </motion.div>
    </motion.div>
  )
}
