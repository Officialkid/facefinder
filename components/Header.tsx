'use client'

import { motion } from 'framer-motion'

export default function Header() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/95 border-b border-neutral-200"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                <svg 
                  className="w-5 h-5 text-white" 
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
            </div>
            <h2 className="font-sans text-3xl font-black tracking-tight text-neutral-900 leading-none">
              Face <span className="text-primary-600">Finder</span>
            </h2>
          </div>

          <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-bold tracking-wide">
            BETA
          </span>
        </div>
      </div>
    </motion.header>
  )
}
