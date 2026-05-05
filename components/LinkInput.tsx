'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LinkInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function LinkInput({ value, onChange, disabled }: LinkInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (value.trim().length === 0) {
      setIsValid(null)
      return
    }

    // Simple URL validation
    const urlPattern = /^https?:\/\/.+/
    setIsValid(urlPattern.test(value))
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      <label 
        htmlFor="dataset-link" 
        className="block text-sm font-bold tracking-wide text-neutral-600 mb-3"
      >
        YOUR ALBUM OR DATASET
        {disabled && (
          <span className="ml-2 text-xs font-normal text-neutral-500">(Upload a photo first)</span>
        )}
      </label>

      <div className="relative group">
        <div className={`
          relative flex items-center gap-2 rounded-xl border bg-neutral-0 transition-all duration-300 p-1
          ${disabled 
            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed' 
            : isFocused 
              ? 'border-primary-400 shadow-soft' 
              : isValid === true
                ? 'border-primary-300'
                : isValid === false
                  ? 'border-accent-400'
                  : 'border-neutral-300 hover:border-neutral-400'
          }
        `}>
          <div className="pl-3 pr-1">
            <svg 
              className={`w-5 h-5 transition-colors ${
                disabled 
                  ? 'text-neutral-400' 
                  : isValid === true
                    ? 'text-primary-600'
                    : isValid === false
                      ? 'text-accent-600'
                      : 'text-neutral-500'
              }`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
              />
            </svg>
          </div>

          <input
            id="dataset-link"
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder="Paste Google Drive, Pixieset, or album link..."
            className={`
              flex-1 py-3 pr-2 bg-transparent text-neutral-800 placeholder:text-neutral-400
              focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-500
              text-sm
            `}
          />

          <button
            type="button"
            disabled={disabled}
            className="px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Upload files
          </button>

          {isValid !== null && !disabled && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="pr-2"
            >
              {isValid ? (
                <svg 
                  className="w-5 h-5 text-primary-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              ) : (
                <svg 
                  className="w-5 h-5 text-accent-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: isValid === false ? 1 : 0,
          height: isValid === false ? 'auto' : 0
        }}
        className="overflow-hidden"
      >
        <p className="mt-2 text-sm text-accent-700 flex items-center space-x-1">
          <svg 
            className="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span>Please enter a valid URL starting with http:// or https://</span>
        </p>
      </motion.div>

      <div className="mt-3 flex flex-wrap gap-2">
        {['Google Drive', 'Pixieset', 'Google Photos', 'Dropbox', 'Direct link'].map((source) => (
          <span
            key={source}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-neutral-50 border border-neutral-200 text-neutral-600"
          >
            <span className="mr-1 text-primary-600">✓</span>
            {source}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
