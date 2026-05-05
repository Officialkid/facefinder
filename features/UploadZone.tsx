'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadedFile } from '@/types'
import { validateImageFile, createFilePreview, formatFileSize } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface UploadZoneProps {
  onFileSelect: (file: UploadedFile | null) => void
  uploadedFile: UploadedFile | null
  maxSize?: number
  acceptedTypes?: string[]
  disabled?: boolean
}

export default function UploadZone({ 
  onFileSelect, 
  uploadedFile,
  disabled = false
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
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
    } catch (err) {
      setError('Failed to process file')
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
    if (!disabled) fileInputRef.current?.click()
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative cursor-pointer rounded-2xl border-2 border-dashed p-12 sm:p-16 text-center
              transition-all duration-300 overflow-hidden
              ${disabled 
                ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60' 
                : isDragging 
                  ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
                  : error
                    ? 'border-accent-400 bg-accent-50'
                    : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50/50'
              }
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100/0 via-accent-100/0 to-primary-100/0 group-hover:from-primary-100/50 group-hover:via-accent-100/30 group-hover:to-primary-100/50 transition-all duration-700" />
            
            <div className="relative z-10 space-y-4">
              <motion.div
                animate={{ 
                  y: isDragging ? -10 : 0,
                  scale: isDragging ? 1.1 : 1 
                }}
                transition={{ type: 'spring', stiffness: 300 }}
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-large ${
                  error ? 'bg-accent-500' : 'bg-gradient-to-br from-primary-500 to-accent-500'
                }`}
              >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </motion.div>

              <div>
                <h3 className="text-xl sm:text-2xl font-display font-bold text-neutral-900 mb-2">
                  {isDragging ? 'Drop to upload' : error ? 'Upload failed' : 'Drop your photo here'}
                </h3>
                <p className="text-neutral-600 mb-4">
                  {error || 'or click to browse'}
                </p>
                <p className="text-sm text-neutral-500">
                  JPG, PNG, WEBP • Max 10MB
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-2xl border-2 border-primary-500 bg-primary-50 p-6 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-accent-50 to-primary-100 opacity-50" />
            
            <div className="relative z-10 flex items-center space-x-4">
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden shadow-medium ring-2 ring-primary-500">
                <img src={uploadedFile.preview} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-primary-700">Upload complete</span>
                </div>
                <p className="text-sm text-neutral-700 truncate font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-neutral-500">{formatFileSize(uploadedFile.size)}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
