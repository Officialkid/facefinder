// Core types for FaceFinder components

export interface UploadedFile {
  file: File
  preview: string
  size: number
  name: string
}

export interface SearchResult {
  id: string
  imageUrl: string
  confidence: number
  filename: string
  timestamp: string
  metadata?: {
    width?: number
    height?: number
    source?: string
  }
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ConfidenceBadge {
  level: ConfidenceLevel
  color: string
  label: string
  icon: string
}

export type ProcessingPhase = 'uploading' | 'analyzing' | 'searching' | 'finalizing' | 'complete'

export interface ProcessingStatus {
  phase: ProcessingPhase
  progress: number
  message: string
  icon: string
  timeRemaining: number
}

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface ValidationState {
  isValid: boolean | null
  error?: string
}
