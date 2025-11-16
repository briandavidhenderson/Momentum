/**
 * Optimistic Update Hook
 * Provides instant UI updates with background database syncing
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/logger'

export type SyncStatus = 'synced' | 'syncing' | 'error'

interface OptimisticUpdate<T> {
  id: string
  optimisticValue: T
  previousValue: T
  updateFn: () => Promise<void>
  retryCount: number
  timestamp: number
}

interface UseOptimisticStateOptions {
  debounceMs?: number
  maxRetries?: number
  onError?: (error: Error) => void
  onSuccess?: () => void
}

/**
 * Generic hook for optimistic UI updates with background sync
 *
 * @template T - The type of state being managed
 * @param key - Unique identifier for this optimistic state
 * @param initialValue - Initial state value
 * @param options - Configuration options
 * @returns [currentValue, optimisticUpdate, syncStatus, pendingCount]
 */
export function useOptimisticState<T>(
  key: string,
  initialValue: T,
  options: UseOptimisticStateOptions = {}
) {
  const {
    debounceMs = 0,
    maxRetries = 3,
    onError,
    onSuccess
  } = options

  const [currentValue, setCurrentValue] = useState<T>(initialValue)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [pendingCount, setPendingCount] = useState(0)

  // Queue of pending updates
  const queueRef = useRef<Map<string, OptimisticUpdate<T>>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const processingRef = useRef(false)

  /**
   * Process the queue of pending updates
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.size === 0) {
      return
    }

    processingRef.current = true
    setSyncStatus('syncing')

    const updates = Array.from(queueRef.current.values())
    const errors: Error[] = []

    for (const update of updates) {
      try {
        await update.updateFn()
        queueRef.current.delete(update.id)
        logger.info(`Successfully synced optimistic update: ${key}/${update.id}`)

        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        logger.error(`Failed to sync optimistic update: ${key}/${update.id}`, err)

        // Retry logic
        if (update.retryCount < maxRetries) {
          update.retryCount++
          logger.info(`Retrying update (${update.retryCount}/${maxRetries}): ${key}/${update.id}`)
          // Keep in queue for retry
        } else {
          // Max retries exceeded - rollback
          logger.error(`Max retries exceeded for ${key}/${update.id}, rolling back`)
          queueRef.current.delete(update.id)
          setCurrentValue(update.previousValue)
          errors.push(err)

          if (onError) {
            onError(err)
          }
        }
      }
    }

    setPendingCount(queueRef.current.size)

    if (queueRef.current.size === 0) {
      setSyncStatus('synced')
    } else if (errors.length > 0) {
      setSyncStatus('error')
    }

    processingRef.current = false

    // If there are still items in queue (retries), process again after delay
    if (queueRef.current.size > 0) {
      setTimeout(processQueue, 1000)
    }
  }, [key, maxRetries, onError, onSuccess])

  /**
   * Apply an optimistic update
   */
  const optimisticUpdate = useCallback((
    updateId: string,
    newValue: T,
    updateFn: () => Promise<void>
  ) => {
    // Store previous value for potential rollback
    const previousValue = currentValue

    // Immediately update UI
    setCurrentValue(newValue)

    // Add to queue
    queueRef.current.set(updateId, {
      id: updateId,
      optimisticValue: newValue,
      previousValue,
      updateFn,
      retryCount: 0,
      timestamp: Date.now()
    })

    setPendingCount(queueRef.current.size)

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Process queue after debounce delay
    if (debounceMs > 0) {
      debounceTimerRef.current = setTimeout(processQueue, debounceMs)
    } else {
      processQueue()
    }
  }, [currentValue, debounceMs, processQueue])

  /**
   * Manually trigger a sync (flush queue)
   */
  const flush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    processQueue()
  }, [processQueue])

  /**
   * Clear all pending updates and reset to synced state
   */
  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    queueRef.current.clear()
    setPendingCount(0)
    setSyncStatus('synced')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Update current value when initial value changes (from Firestore subscription)
  useEffect(() => {
    // Only update if we're not syncing and have no pending updates
    if (syncStatus === 'synced' && queueRef.current.size === 0) {
      setCurrentValue(initialValue)
    }
  }, [initialValue, syncStatus])

  return {
    value: currentValue,
    optimisticUpdate,
    syncStatus,
    pendingCount,
    flush,
    reset
  }
}
