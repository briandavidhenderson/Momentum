/**
 * Optimistic Projects Hook
 * Wraps useProjects with optimistic update capabilities for workpackages
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Workpackage } from '@/lib/types'
import { useProjects } from './useProjects'
import { logger } from '@/lib/logger'
import { useToast } from '@/lib/toast'

export type ProjectsSyncStatus = 'synced' | 'syncing' | 'error'

export function useOptimisticProjects() {
  const baseHook = useProjects()
  const { workpackages: firestoreWorkpackages, handleUpdateWorkpackage: baseUpdateWorkpackage } = baseHook

  const [optimisticWorkpackages, setOptimisticWorkpackages] = useState<Workpackage[]>([])
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set())
  const { error: errorToast } = useToast()

  // Sync optimistic workpackages with Firestore when no pending operations
  useEffect(() => {
    if (syncingIds.size === 0 && errorIds.size === 0) {
      setOptimisticWorkpackages(firestoreWorkpackages)
    }
  }, [firestoreWorkpackages, syncingIds.size, errorIds.size])

  /**
   * Create optimistic workpackagesMap
   */
  const optimisticWorkpackagesMap = useMemo(() => {
    const map = new Map<string, Workpackage>()
    optimisticWorkpackages.forEach(wp => map.set(wp.id, wp))
    return map
  }, [optimisticWorkpackages])

  /**
   * Overall sync status
   */
  const syncStatus: ProjectsSyncStatus = useMemo(() => {
    if (errorIds.size > 0) return 'error'
    if (syncingIds.size > 0) return 'syncing'
    return 'synced'
  }, [syncingIds.size, errorIds.size])

  /**
   * Mark workpackage as syncing
   */
  const markSyncing = useCallback((workpackageId: string) => {
    setSyncingIds(prev => new Set(prev).add(workpackageId))
    setErrorIds(prev => {
      const next = new Set(prev)
      next.delete(workpackageId)
      return next
    })
  }, [])

  /**
   * Mark workpackage as synced
   */
  const markSynced = useCallback((workpackageId: string) => {
    setSyncingIds(prev => {
      const next = new Set(prev)
      next.delete(workpackageId)
      return next
    })
  }, [])

  /**
   * Mark workpackage as error
   */
  const markError = useCallback((workpackageId: string) => {
    setSyncingIds(prev => {
      const next = new Set(prev)
      next.delete(workpackageId)
      return next
    })
    setErrorIds(prev => new Set(prev).add(workpackageId))
  }, [])

  /**
   * Optimistic update workpackage
   */
  const handleUpdateWorkpackage = useCallback(async (
    workpackageId: string,
    updates: Partial<Workpackage>
  ) => {
    // Store previous state for rollback
    const previousWorkpackages = optimisticWorkpackages

    // Optimistically update UI
    const updatedWorkpackages = optimisticWorkpackages.map(wp =>
      wp.id === workpackageId ? { ...wp, ...updates } : wp
    )
    setOptimisticWorkpackages(updatedWorkpackages)
    markSyncing(workpackageId)

    try {
      await baseUpdateWorkpackage(workpackageId, updates)
      markSynced(workpackageId)
    } catch (err) {
      logger.error('Error updating workpackage', err)
      // Rollback to previous state
      setOptimisticWorkpackages(previousWorkpackages)
      markError(workpackageId)
      errorToast('Failed to update. Please try again.')
    }
  }, [optimisticWorkpackages, baseUpdateWorkpackage, markSyncing, markSynced, markError, errorToast])

  /**
   * Optimistic update task helpers (person assignment)
   */
  const handleUpdateTaskHelpers = useCallback(async (
    workpackageId: string,
    taskId: string,
    newHelpers: string[]
  ) => {
    // Store previous state for rollback
    const previousWorkpackages = optimisticWorkpackages

    // Find the workpackage and update the task
    const updatedWorkpackages = optimisticWorkpackages.map(wp => {
      if (wp.id === workpackageId && wp.tasks) {
        const updatedTasks = wp.tasks.map(task =>
          task.id === taskId ? { ...task, helpers: newHelpers } : task
        )
        return { ...wp, tasks: updatedTasks }
      }
      return wp
    })

    // Optimistically update UI
    setOptimisticWorkpackages(updatedWorkpackages)
    markSyncing(workpackageId)

    try {
      // Find the updated tasks array and send to Firestore
      const updatedWp = updatedWorkpackages.find(wp => wp.id === workpackageId)
      if (updatedWp) {
        await baseUpdateWorkpackage(workpackageId, { tasks: updatedWp.tasks })
      }
      markSynced(workpackageId)
    } catch (err) {
      logger.error('Error updating task helpers', err)
      // Rollback to previous state
      setOptimisticWorkpackages(previousWorkpackages)
      markError(workpackageId)
      errorToast('Failed to assign person. Please try again.')
    }
  }, [optimisticWorkpackages, baseUpdateWorkpackage, markSyncing, markSynced, markError, errorToast])

  /**
   * Optimistic update task dates (Gantt drag)
   */
  const handleUpdateTaskDates = useCallback(async (
    workpackageId: string,
    taskId: string,
    start: Date,
    end: Date
  ) => {
    // Store previous state for rollback
    const previousWorkpackages = optimisticWorkpackages

    // Find the workpackage and update the task
    const updatedWorkpackages = optimisticWorkpackages.map(wp => {
      if (wp.id === workpackageId && wp.tasks) {
        const updatedTasks = wp.tasks.map(task =>
          task.id === taskId ? { ...task, start, end } : task
        )
        return { ...wp, tasks: updatedTasks }
      }
      return wp
    })

    // Optimistically update UI
    setOptimisticWorkpackages(updatedWorkpackages)
    markSyncing(workpackageId)

    try {
      // Find the updated tasks array and send to Firestore
      const updatedWp = updatedWorkpackages.find(wp => wp.id === workpackageId)
      if (updatedWp) {
        await baseUpdateWorkpackage(workpackageId, { tasks: updatedWp.tasks })
      }
      markSynced(workpackageId)
    } catch (err) {
      logger.error('Error updating task dates', err)
      // Rollback to previous state
      setOptimisticWorkpackages(previousWorkpackages)
      markError(workpackageId)
      errorToast('Failed to update task dates. Please try again.')
    }
  }, [optimisticWorkpackages, baseUpdateWorkpackage, markSyncing, markSynced, markError, errorToast])

  return {
    ...baseHook,
    workpackages: optimisticWorkpackages,
    workpackagesMap: optimisticWorkpackagesMap,
    handleUpdateWorkpackage,
    handleUpdateTaskHelpers, // New optimistic helper function
    handleUpdateTaskDates,   // New optimistic helper function
    projectsSyncStatus: syncStatus,
  }
}
