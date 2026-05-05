'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ValidationState } from '@/types'
import { isValidUrl, debounce } from '@/lib/utils'

interface LinkInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  label?: string
  helperText?: string
  onValidationChange?: (isValid: boolean) => void
}

export default function LinkInput({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = 'https://example.com/dataset',
  label = 'Dataset Link',
  helperText = 'Example: https://example.com/images/dataset.zip',
  onValidationChange
}: LinkInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [validation, setValidation] = useState<ValidationState>({ isValid: null })

  const validateUrl = useCallback(
    debounce((url: string) => {
      if (url.trim().length === 0) {
        setValidation({ isValid: null })
        onValidationChange?.(false)
        return
      }

      const valid = isValidUrl(url)
      setValidation({ 
        isValid: valid,
        error: valid ? undefined : 'Please enter a valid URL starting with http:// or https://'
      })
      onValidationChange?.(valid)
    }, 500),
    [onValidationChange]
  )

  useEffect(() => {
    validateUrl(value)
  }, [value, validateUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      {/* Label */}
      <label htmlFor="dataset-link" className="block text-sm font-semibold text-neutral-700 mb-3">
        {label}
        {disabled && (
          <span className="ml-2 text-xs font-normal text-neutral-500">
            (Upload a photo first)
          </span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Glow effect on focus */}
        {isFocused && !disabled && (
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/30 to-accent-500/30 rounded-xl blur-lg" />
        )}

        <div className={`
          relative flex items-center rounded-xl border-2 bg-neutral-0 transition-all duration-300
          ${disabled 
            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed' 
            : isFocused 
              ? 'border-primary-500 shadow-medium' 
              : validation.isValid === true
                ? 'border-primary-300 shadow-soft'
                : validation.isValid === false
                  ? 'border-accent-400'
                  : 'border-neutral-300 hover:border-neutral-400'
          }
        `}>
          {/* Icon */}
          <div className="pl-4 pr-3">
            <svg 
              className={`w-5 h-5 transition-colors ${
                disabled 
                  ? 'text-neutral-400' 
                  : validation.isValid === true
                    ? 'text-primary-600'
                    : validation.isValid === false
                      ? 'text-accent-600'
                      : 'text-neutral-500'
              }`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>

          {/* Input */}
          <input
            id="dataset-link"
            type="url"
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 py-4 pr-4 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-500 font-mono text-sm"
          />

          {/* Validation Icon */}
          {validation.isValid !== null && !disabled && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="pr-4"
            >
              {validation.isValid ? (
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {validation.isValid === false && validation.error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-sm text-accent-700 flex items-center space-x-1"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{validation.error}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {!disabled && value.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500">{helperText}</p>
      )}
    </motion.div>
  )
}
