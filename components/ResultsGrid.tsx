'use client'

import { motion } from 'framer-motion'

interface Result {
  id: number
  confidence: number
  filename: string
  timestamp: string
}

interface ResultsGridProps {
  results: Result[]
  onReset: () => void
}

export default function ResultsGrid({ results, onReset }: ResultsGridProps) {
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return { color: 'bg-green-100 text-green-700 border-green-300', label: 'High', icon: '✓' }
    } else if (confidence >= 75) {
      return { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Medium', icon: '⚠' }
    } else {
      return { color: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Low', icon: '!' }
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
            Found <span className="font-semibold text-primary-600">{results.length} matches</span> in 47 seconds
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors">
            Download All
          </button>
          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-soft hover:shadow-primary transition-all duration-300 hover:-translate-y-0.5"
          >
            New Search
          </button>
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
          <select className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-0 border border-neutral-300 rounded-lg hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all">
            <option>Confidence (High to Low)</option>
            <option>Confidence (Low to High)</option>
            <option>Filename</option>
            <option>Date</option>
          </select>
        </div>

        <p className="text-sm text-neutral-500">
          Showing all {results.length} results
        </p>
      </motion.div>

      {/* Results Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {results.map((result) => {
          const badge = getConfidenceBadge(result.confidence)
          
          return (
            <motion.div
              key={result.id}
              variants={item}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group relative rounded-xl border border-neutral-200 bg-neutral-0 overflow-hidden shadow-soft hover:shadow-large transition-all duration-300"
            >
              {/* Image Placeholder */}
              <div className="relative aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                     style={{ backgroundSize: '200% 100%' }} 
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/0 to-neutral-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Quick actions */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex space-x-2">
                    <button className="p-3 bg-neutral-0 rounded-full shadow-large hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button className="p-3 bg-neutral-0 rounded-full shadow-large hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Confidence Badge */}
                <div className="absolute top-3 right-3">
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color} backdrop-blur-sm`}>
                    <span className="mr-1">{badge.icon}</span>
                    {result.confidence}%
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                    {badge.label} Match
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(result.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm font-mono text-neutral-700 truncate" title={result.filename}>
                  {result.filename}
                </p>

                <div className="flex items-center space-x-2 pt-2">
                  <button className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
                    Download
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-colors">
                    Details
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Load More */}
      {results.length >= 12 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-8"
        >
          <button className="px-6 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
            Load More Results
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
