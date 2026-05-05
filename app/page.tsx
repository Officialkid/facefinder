'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import UploadZone from '@/components/UploadZone'
import LinkInput from '@/components/LinkInput'
import CTAButton from '@/components/CTAButton'
import ResultsGrid from '@/components/ResultsGrid'
import ProcessingState from '@/components/ProcessingState'
import { apiClient, SearchSettings } from '@/lib/api-client'

interface UiResult {
  id: number
  confidence: number
  filename: string
  timestamp: string
}

type PageStage = 'landing' | 'setup' | 'processing' | 'results'

type SearchMode = 'faster' | 'moretime' | 'complex'

const MODE_CONFIG: Record<SearchMode, { label: string }> = {
  faster: { label: 'Faster' },
  moretime: { label: 'More Time' },
  complex: { label: 'Complex' },
}

function normalizeUploadError(message: string): string {
  const value = (message || '').toLowerCase()

  if (value.includes('multiple faces detected')) {
    return 'We detected more than one clear face in the uploaded photo. Use a photo where only your face is visible or crop tighter around you.'
  }

  if (value.includes('no face detected')) {
    return 'We could not detect your face in that upload. Angled photos are okay, but use one clear face with better lighting and less blur.'
  }

  if (value.includes('invalid file') || value.includes('no file')) {
    return 'Upload a valid image file (JPG, JPEG, PNG, or WEBP) and try again.'
  }

  return message || 'Upload failed. Please try a clearer single-face photo.'
}

export default function Home() {
  const [stage, setStage] = useState<PageStage>('landing')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [datasetLink, setDatasetLink] = useState('')
  const [results, setResults] = useState<UiResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStartingSearch, setIsStartingSearch] = useState(false)

  const [backendProgress, setBackendProgress] = useState(0)
  const [uiProgress, setUiProgress] = useState(0)
  const [scannedCount, setScannedCount] = useState(0)
  const [totalImages, setTotalImages] = useState(0)
  const [etaSeconds, setEtaSeconds] = useState(0)

  const [searchSettings, setSearchSettings] = useState<SearchSettings>({
    confidenceThresholdPct: 88,
    maxResults: 50,
    strictMode: false,
    searchMode: 'moretime',
  })

  const isReady = uploadedFile !== null && datasetLink.trim().length > 0
  const mode = (searchSettings.searchMode || 'moretime') as SearchMode
  const modeConfig = MODE_CONFIG[mode]

  const finalizeResults = (mapped: UiResult[]) => {
    setResults(mapped)
    setStage('results')
    setBackendProgress(100)
    setUiProgress(100)
    setEtaSeconds(0)
  }

  const handleStart = () => {
    setStage('setup')
    setError(null)
  }

  const handleSearch = async () => {
    if (!isReady || !uploadedFile || isStartingSearch) return

    setError(null)
    setIsStartingSearch(true)

    setStage('processing')
    setBackendProgress(10)
    setUiProgress(10)
    setScannedCount(0)
    setTotalImages(0)
    setEtaSeconds(45)

    const progressInterval = setInterval(() => {
      setUiProgress((prev) => Math.min(92, prev + 2))
      setBackendProgress((prev) => Math.min(92, prev + 2))
      setEtaSeconds((prev) => Math.max(0, prev - 1))
    }, 900)

    try {
      const response = await apiClient.processFaces(uploadedFile, datasetLink, searchSettings)
      const processedAt = new Date().toISOString()
      const mapped = response.matches.map((match, index) => ({
        id: index + 1,
        confidence: match.confidence <= 1 ? Math.round(match.confidence * 100) : Math.round(match.confidence),
        filename: match.image_id || `match_${index + 1}.jpg`,
        timestamp: processedAt,
      }))

      finalizeResults(mapped)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process images'
      setError(normalizeUploadError(msg))
      setStage('setup')
    } finally {
      clearInterval(progressInterval)
      setIsStartingSearch(false)
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setDatasetLink('')
    setResults(null)
    setError(null)
    setBackendProgress(0)
    setUiProgress(0)
    setScannedCount(0)
    setTotalImages(0)
    setEtaSeconds(0)
    setStage('setup')
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {error && (
          <div className="max-w-2xl mx-auto mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {stage === 'landing' && (
          <div className="max-w-2xl mx-auto animate-fade-in text-center space-y-6">
            <h1 className="font-sans text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight text-balance">
              Find <span className="text-primary-600">your photos</span> instantly
            </h1>
            <p className="text-lg text-neutral-600 max-w-xl mx-auto text-balance">
              Upload your photo, paste your album link, and we will find every image of you in seconds.
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xl shadow-soft"
            >
              Upload Photo
            </button>
            <p className="text-sm text-neutral-500">Step 1 of 3</p>
          </div>
        )}

        {stage === 'setup' && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center space-y-4">
              <h1 className="font-sans text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight text-balance">
                Find <span className="text-primary-600">your photos</span> instantly
              </h1>
              <p className="text-lg text-neutral-600 max-w-xl mx-auto text-balance">
                Upload your photo, paste your album link - we will find every image of you in seconds.
              </p>
            </div>

            <div className="mt-8 mb-8 flex items-center justify-center gap-2 sm:gap-5 text-sm">
              {['Landing', 'Upload', 'Searching', 'Done'].map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-neutral-600">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center ${index < 2 ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'}`}>
                    {index + 1}
                  </span>
                  <span className="hidden sm:inline">{step}</span>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white shadow-soft p-4 sm:p-6 space-y-6">
              <div>
                <p className="text-sm font-bold tracking-wide text-neutral-600 mb-3">YOUR PHOTO</p>
                <UploadZone onFileSelect={setUploadedFile} uploadedFile={uploadedFile} />
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Best results: use one clear face, avoid heavy blur, and crop out nearby people. Side-angle and older photos are supported, but quality still matters.
                </div>
              </div>

              <div className="flex items-center gap-4 text-neutral-400">
                <div className="h-px bg-neutral-200 flex-1" />
                <span className="text-sm">then</span>
                <div className="h-px bg-neutral-200 flex-1" />
              </div>

              <LinkInput value={datasetLink} onChange={setDatasetLink} disabled={!uploadedFile} />

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-4">
                <p className="text-sm font-bold tracking-wide text-neutral-600">SEARCH SETTINGS</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700">Confidence Threshold</span>
                    <span className="text-primary-700 font-semibold">{searchSettings.confidenceThresholdPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={85}
                    max={95}
                    step={1}
                    value={searchSettings.confidenceThresholdPct}
                    onChange={(e) => setSearchSettings((prev) => ({ ...prev, confidenceThresholdPct: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-neutral-700">Max Results</span>
                    <select
                      value={searchSettings.maxResults}
                      onChange={(e) => setSearchSettings((prev) => ({ ...prev, maxResults: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                    >
                      {[10, 25, 50, 100].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 mt-6 sm:mt-0">
                    <input
                      type="checkbox"
                      checked={searchSettings.strictMode}
                      onChange={(e) => setSearchSettings((prev) => ({ ...prev, strictMode: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-neutral-700">Strict Mode</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Search Strategy</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([
                      { key: 'faster', label: 'Faster', hint: 'Quicker scan, less depth' },
                      { key: 'moretime', label: 'More Time', hint: 'Balanced depth/time' },
                      { key: 'complex', label: 'Complex', hint: 'Deep scan, slower' },
                    ] as const).map((option) => {
                      const active = (searchSettings.searchMode || 'moretime') === option.key
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setSearchSettings((prev) => ({ ...prev, searchMode: option.key }))}
                          className={`rounded-lg border px-3 py-2 text-left ${active ? 'border-primary-600 bg-primary-50' : 'border-neutral-300 bg-white hover:border-primary-300'}`}
                        >
                          <p className="text-sm font-semibold text-neutral-800">{option.label}</p>
                          <p className="text-xs text-neutral-500">{option.hint}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <p className="text-xs text-neutral-500">Strict mode prioritizes precision and may return fewer matches.</p>
              </div>

              <CTAButton onClick={handleSearch} disabled={!isReady} isReady={isReady} isLoading={isStartingSearch} />
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm text-neutral-500">
                <span className="mr-1">🔒</span>No images are stored on our servers. All processing is done in-session and discarded.
              </p>
            </div>
          </div>
        )}

        {stage === 'processing' && (
          <ProcessingState
            progress={uiProgress}
            scannedCount={totalImages > 0 ? Math.min(scannedCount, totalImages) : scannedCount}
            totalImages={totalImages}
            etaSeconds={etaSeconds}
            modeLabel={modeConfig.label}
          />
        )}

        {stage === 'results' && results && results.length > 0 && (
          <ResultsGrid results={results} onReset={handleReset} />
        )}

        {stage === 'results' && results && results.length === 0 && (
          <div className="max-w-2xl mx-auto rounded-3xl border border-neutral-200 bg-white shadow-soft p-8 text-center space-y-4">
            <h2 className="text-2xl font-extrabold text-neutral-900">Unfortunately, we could not find a confident match</h2>
            <p className="text-neutral-600">
              Try a clearer photo, use a larger dataset, or switch strategy to <span className="font-semibold">Complex</span> with a lower confidence threshold.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchSettings((prev) => ({ ...prev, searchMode: 'complex', confidenceThresholdPct: 85 }))
                  setStage('setup')
                }}
                className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold"
              >
                Retry with Deep Search
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
