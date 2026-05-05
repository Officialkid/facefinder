import { ConfidenceBadge, ConfidenceLevel, ProcessingPhase, ProcessingStatus } from '@/types'

// Format file size to human readable
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Validate URL format
export const isValidUrl = (url: string): boolean => {
  if (!url || url.trim().length === 0) return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Get confidence badge based on score
export const getConfidenceBadge = (confidence: number): ConfidenceBadge => {
  if (confidence >= 90) {
    return {
      level: 'high',
      color: 'bg-green-100 text-green-700 border-green-300',
      label: 'High',
      icon: '✓'
    }
  } else if (confidence >= 75) {
    return {
      level: 'medium',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      label: 'Medium',
      icon: '⚠'
    }
  } else {
    return {
      level: 'low',
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      label: 'Low',
      icon: '!'
    }
  }
}

// Get processing status based on progress
export const getProcessingStatus = (progress: number): ProcessingStatus => {
  let phase: ProcessingPhase
  let message: string
  let icon: string

  if (progress < 25) {
    phase = 'uploading'
    message = 'Uploading and validating...'
    icon = '📤'
  } else if (progress < 50) {
    phase = 'analyzing'
    message = 'Analyzing facial features...'
    icon = '🧠'
  } else if (progress < 75) {
    phase = 'searching'
    message = 'Searching dataset...'
    icon = '🔎'
  } else if (progress < 95) {
    phase = 'finalizing'
    message = 'Finalizing results...'
    icon = '✨'
  } else {
    phase = 'complete'
    message = 'Almost done!'
    icon = '✅'
  }

  const timeRemaining = Math.max(0, Math.ceil((100 - progress) * 0.6))

  return { phase, progress, message, icon, timeRemaining }
}

// Format date to readable string
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WEBP.' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large (${formatFileSize(file.size)}). Max size is 10MB.` }
  }

  return { valid: true }
}

// Create file preview URL
export const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
