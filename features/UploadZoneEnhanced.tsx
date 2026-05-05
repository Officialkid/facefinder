'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadedFile } from '@/types'
import { validateImageFile, createFilePreview, formatFileSize } from '@/lib/utils'
import { uploadPreview, fadeInScale, scaleIn } from '@/lib/animations'
import Button from '@/components/ui/Button'

interface UploadZoneProps {
  onFileSelect: (file: UploadedFile | null) => void
  uploadedFile: UploadedFile | null
  disabled?: boolean
}

export default function UploadZoneEnhanced({ 
  onFileSelect, 
  uploadedFile,
  disabled = false
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }, [disabled])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }, [])

  const processFile = async (file: File) => {
    setError(null)
    setIsProcessing(true)
    
    // Simulate processing delay for smooth animation
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setIsProcessing(false)
      return
    }

    try {
      const preview = await createFilePreview(file)
      onFileSelect({
        file,
        preview,
        size: file.size,
        name: file.name
      })
      setIsProcessing(false)
    } catch (err) {
      setError('Failed to process file')
      setIsProcessing(false)
    }
  }

  const handleRemove = useCallback(() => {
    onFileSelect(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileSelect])

  const handleClick = () => {
    if (!disabled && !isProcessing) fileInputRef.current?.click()
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div
            key="upload"
            variants={fadeInScale}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative cursor-pointer rounded-2xl border-2 border-dashed p-12 sm:p-16 text-center
              transition-all duration-300 overflow-hidden group
              ${disabled 
                ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60' 
                : isDragging 
                  ? 'border-primary-500 bg-primary-50 scale-[1.02] shadow-primary' 
                  : error
                    ? 'border-accent-400 bg-accent-50'
                    : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50/50 hover:shadow-soft'
              }
            `}
          >
            {/* Animated gradient background */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-primary-100/0 via-accent-100/0 to-primary-100/0"
              animate={{
                backgroundPosition: isDragging ? ['0% 0%', '100% 100%'] : '0% 0%',
              }}
              transition={{ duration: 2, repeat: isDragging ? Infinity : 0 }}
              style={{
                backgroundSize: '200% 200%',
              }}
            />
            
            <div className="relative z-10 space-y-4">
              {/* Animated icon */}
              <motion.div
                animate={{ 
                  y: isDragging ? -10 : isProcessing ? [0, -5, 0] : 0,
                  scale: isDragging ? 1.1 : isProcessing ? [1, 1.05, 1] : 1,
                  rotate: isProcessing ? [0, 360] : 0,
                }}
                transition={{ 
                  y: { type: 'spring', stiffness: 300 },
                  scale: { type: 'spring', stiffness: 300 },
                  rotate: { duration: 2, repeat: isProcessing ? Infinity : 0, ease: 'linear' }
                }}
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-large ${
                  error ? 'bg-accent-500' : 'bg-gradient-to-br from-primary-500 to-accent-500'
                }`}
              >
                {isProcessing ? (
                  <motion.svg 
                    className="w-8 h-8 text-white"
                    fill="none" 
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </motion.svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </motion.div>

              {/* Text with stagger animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-xl sm:text-2xl font-display font-bold text-neutral-900 mb-2">
                  {isDragging ? 'Drop to upload' : isProcessing ? 'Processing...' : error ? 'Upload failed' : 'Drop your photo here'}
                </h3>
                <p className="text-neutral-600 mb-4">
                  {error || (isProcessing ? 'Please wait' : 'or click to browse')}
                </p>
                <p className="text-sm text-neutral-500">
                  JPG, PNG, WEBP • Max 10MB
                </p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            variants={uploadPreview}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative rounded-2xl border-2 border-primary-500 bg-primary-50 p-6 overflow-hidden"
          >
            {/* Success gradient background with animation */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-primary-100 via-accent-50 to-primary-100"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{
                backgroundSize: '200% 200%',
                opacity: 0.5,
              }}
            />
            
            <div className="relative z-10 flex items-center space-x-4">
              {/* Preview Image with zoom effect */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden shadow-medium ring-2 ring-primary-500 group"
              >
                <motion.img 
                  src={uploadedFile.preview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>

              {/* File Info with stagger */}
              <motion.div 
                className="flex-1 min-w-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <motion.svg 
                    className="w-5 h-5 text-primary-600 flex-shrink-0"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.3 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </motion.svg>
                  <span className="text-sm font-semibold text-primary-700">
                    Upload complete
                  </span>
                </div>
                <p className="text-sm text-neutral-700 truncate font-medium">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </motion.div>

              {/* Remove Button with hover effect */}
              <motion.div
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.4 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="hover:bg-neutral-100 hover:rotate-90 transition-all duration-300"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
