'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface UploadZoneProps {
  onFileSelect: (file: File | null) => void
  uploadedFile: File | null
}

export default function UploadZone({ onFileSelect, uploadedFile }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFile(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    onFileSelect(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    onFileSelect(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />

      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.label
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative block cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-12 text-center
              transition-all duration-300
              ${isDragging 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-neutral-200 bg-neutral-50 hover:border-primary-300'
              }
            `}
          >
            <div className="space-y-3">
              <motion.div
                animate={{ 
                  y: isDragging ? -6 : 0,
                  scale: isDragging ? 1.05 : 1 
                }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="mx-auto w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center"
              >
                <svg 
                  className="w-6 h-6 text-primary-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                      d="M12 11c1.656 0 3-1.567 3-3.5S13.656 4 12 4 9 5.567 9 7.5 10.344 11 12 11zm0 1.5c-2.5 0-4.5 1.4-4.5 3.125V18h9v-2.375c0-1.725-2-3.125-4.5-3.125z" 
                  />
                </svg>
              </motion.div>

              <div>
                <h3 className="text-3xl font-extrabold text-neutral-900 mb-2">
                  {isDragging ? 'Drop to upload' : 'Upload your photo'}
                </h3>
                <p className="text-neutral-600 text-lg">
                  Drag and drop or click to select - JPG, PNG, WEBP
                </p>
              </div>
            </div>
          </motion.label>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-2xl border border-primary-300 bg-primary-50 p-4"
          >
            <div className="flex items-center space-x-4">
              {preview && (
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-primary-200">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <svg 
                    className="w-5 h-5 text-primary-700 flex-shrink-0" 
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
                    <span className="text-sm font-semibold text-primary-800">
                    Upload complete
                  </span>
                </div>
                <p className="text-sm text-neutral-700 truncate font-medium">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <button
                onClick={handleRemove}
                className="flex-shrink-0 p-2 rounded-lg bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
