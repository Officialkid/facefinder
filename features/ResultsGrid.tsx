'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SearchResult } from '@/types'
import ResultCard from './ResultCard'
import Button from '@/components/ui/Button'

interface ResultsGridProps {
  results: SearchResult[]
  onReset?: () => void
  onDownloadAll?: () => void
  searchTime?: number
}

type SortOption = 'confidence-high' | 'confidence-low' | 'filename' | 'date'

export default function ResultsGrid({ 
  results, 
  onReset,
  onDownloadAll,
  searchTime = 47
}: ResultsGridProps) {
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200"
      >
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
            Search Complete
          </h2>
          <p className="text-neutral-600">
            Found <span className="font-semibold text-primary-600">{results.length} matches</span> in {searchTime} seconds
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onDownloadAll && (
            <Button
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
            </Button>
          )}
          {onReset && (
            <Button
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
            </Button>
          )}
        </div>
      </motion.div>

      {/* Sort Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-600">Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-0 border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="confidence-high">Confidence (High to Low)</option>
            <option value="confidence-low">Confidence (Low to High)</option>
            <option value="filename">Filename</option>
            <option value="date">Date</option>
          </select>
        </div>

        <p className="text-sm text-neutral-500">
          Showing all {results.length} results
        </p>
      </motion.div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedResults.map((result, index) => (
          <ResultCard
            key={result.id}
            result={result}
            index={index}
            onDownload={handleDownload}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {/* Load More */}
      {results.length >= 12 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-8"
        >
          <Button variant="secondary" size="md">
            Load More Results
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
