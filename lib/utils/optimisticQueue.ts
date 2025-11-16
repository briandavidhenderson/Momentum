/**
 * Optimistic Update Queue Utilities
 * Helper functions for managing collections with optimistic updates
 */

import { logger } from '@/lib/logger'

/**
 * Update a single item in an array by ID
 */
export function updateItemInArray<T extends { id: string }>(
  array: T[],
  itemId: string,
  updates: Partial<T>
): T[] {
  return array.map(item =>
    item.id === itemId ? { ...item, ...updates } : item
  )
}

/**
 * Move an item in an array from one index to another
 */
export function reorderArray<T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const result = Array.from(array)
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

/**
 * Move an item to a different position by ID
 */
export function moveItemInArray<T extends { id: string }>(
  array: T[],
  itemId: string,
  newIndex: number
): T[] {
  const oldIndex = array.findIndex(item => item.id === itemId)
  if (oldIndex === -1) return array
  return reorderArray(array, oldIndex, newIndex)
}

/**
 * Update item order based on new positions
 */
export function updateArrayOrder<T extends { id: string; order?: number }>(
  array: T[]
): T[] {
  return array.map((item, index) => ({
    ...item,
    order: index
  }))
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Batch multiple updates into a single operation
 */
export class UpdateBatcher<T> {
  private updates: Map<string, T> = new Map()
  private timer: NodeJS.Timeout | null = null
  private readonly delayMs: number
  private readonly onBatchReady: (updates: Map<string, T>) => Promise<void>

  constructor(
    delayMs: number,
    onBatchReady: (updates: Map<string, T>) => Promise<void>
  ) {
    this.delayMs = delayMs
    this.onBatchReady = onBatchReady
  }

  /**
   * Add an update to the batch
   */
  add(key: string, value: T): void {
    this.updates.set(key, value)

    // Reset timer
    if (this.timer) {
      clearTimeout(this.timer)
    }

    this.timer = setTimeout(() => this.flush(), this.delayMs)
  }

  /**
   * Flush all pending updates immediately
   */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.updates.size === 0) {
      return
    }

    const updatesToProcess = new Map(this.updates)
    this.updates.clear()

    try {
      await this.onBatchReady(updatesToProcess)
      logger.info(`Successfully batched ${updatesToProcess.size} updates`)
    } catch (error) {
      logger.error('Failed to process batch updates', error)
      // Re-add failed updates
      updatesToProcess.forEach((value, key) => {
        this.updates.set(key, value)
      })
      throw error
    }
  }

  /**
   * Clear all pending updates
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.updates.clear()
  }
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn(...args)
    }, delayMs)
  }
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRun >= limitMs) {
      fn(...args)
      lastRun = now
    }
  }
}
