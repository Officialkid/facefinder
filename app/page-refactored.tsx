'use client'

import { useState } from 'react'
import { UploadedFile, SearchResult } from '@/types'
import { generateId } from '@/lib/utils'
import { useToast } from '@/lib/useToast'

import Header from '@/components/Header'
import UploadZone from '@/features/UploadZone'
import LinkInput from '@/features/LinkInput'
import FindButton from '@/features/FindButton'
import ProcessingState from '@/features/ProcessingState'
import ResultsGrid from '@/features/ResultsGrid'
import ToastNotification from '@/components/ui/ToastNotification'

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [datasetLink, setDatasetLink] = useState('')
  const [isLinkValid, setIsLinkValid] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [progress, setProgress] = useState(0)
  
  const { toast, hideToast, success, error: showError } = useToast()

  const isReady = uploadedFile !== null && isLinkValid

  const handleSearch = async () => {
    if (!isReady) return

    setIsProcessing(true)
    setProgress(0)

    // Simulate processing with progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.random() * 15
      })
    }, 500)

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      
      // Mock results
      const mockResults: SearchResult[] = Array.from({ length: 12 }, (_, i) => ({
        id: generateId(),
        imageUrl: '',
        confidence: Math.floor(Math.random() * 30) + 70,
        filename: `image_${String(i + 1).padStart(4, '0')}.jpg`,
        timestamp: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      }))

      setTimeout(() => {
        setResults(mockResults)
        setIsProcessing(false)
        success('Search Complete', `Found ${mockResults.length} matches`)
      }, 500)
    }, 5000)
  }

  const handleCancel = () => {
    setIsProcessing(false)
    setProgress(0)
    showError('Search Cancelled', 'You can start a new search anytime')
  }

  const handleReset = () => {
    setUploadedFile(null)
    setDatasetLink('')
    setIsLinkValid(false)
    setResults(null)
    setProgress(0)
  }

  const handleDownloadAll = () => {
    success('Download Started', 'Preparing your files...')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-0 to-primary-50/30">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {!isProcessing && !results && (
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-4 sm:space-y-6">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight text-balance">
                Find Anyone in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
                  Seconds
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto text-balance">
                Upload a face, paste a dataset link, and let AI do the work
              </p>
            </div>

            {/* Main Input Section */}
            <div className="space-y-6 sm:space-y-8">
              <UploadZone 
                onFileSelect={setUploadedFile}
                uploadedFile={uploadedFile}
              />

              <LinkInput 
                value={datasetLink}
                onChange={setDatasetLink}
                disabled={!uploadedFile}
                onValidationChange={setIsLinkValid}
              />

              <FindButton 
                onClick={handleSearch}
                disabled={!isReady}
                isReady={isReady}
              />
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-8 sm:pt-12">
              {[
                { icon: '⚡', title: 'Lightning Fast', desc: 'Results in under 60 seconds' },
                { icon: '🔒', title: 'Secure & Private', desc: 'Your data stays protected' },
                { icon: '🎯', title: 'High Accuracy', desc: 'AI-powered precision matching' },
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="group p-6 rounded-xl bg-neutral-0 border border-neutral-200 hover:border-primary-300 hover:shadow-medium transition-all duration-300"
                >
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="font-semibold text-neutral-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-neutral-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isProcessing && (
          <ProcessingState 
            progress={progress}
            onCancel={handleCancel}
          />
        )}

        {results && !isProcessing && (
          <ResultsGrid 
            results={results} 
            onReset={handleReset}
            onDownloadAll={handleDownloadAll}
          />
        )}
      </div>

      {/* Toast Notifications */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </main>
  )
}
