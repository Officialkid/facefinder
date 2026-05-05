import { useState, useCallback } from 'react'
import { Toast, ToastType } from '@/types'
import { generateId } from '@/lib/utils'

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration: number = 5000
  ) => {
    setToast({
      id: generateId(),
      type,
      title,
      message,
      duration
    })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const success = useCallback((title: string, message?: string) => {
    showToast('success', title, message)
  }, [showToast])

  const error = useCallback((title: string, message?: string) => {
    showToast('error', title, message)
  }, [showToast])

  const warning = useCallback((title: string, message?: string) => {
    showToast('warning', title, message)
  }, [showToast])

  const info = useCallback((title: string, message?: string) => {
    showToast('info', title, message)
  }, [showToast])

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info
  }
}
