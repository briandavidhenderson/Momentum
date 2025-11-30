/**
 * Optimistic Day-to-Day Tasks Hook
 * Provides instant UI updates for task operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DayToDayTask } from '@/lib/dayToDayTypes'
import {
  createDayToDayTask,
  subscribeToDayToDayTasks,
  updateDayToDayTask,
  deleteDayToDayTask
} from '@/lib/firestoreService'
import { useAuth } from './useAuth'
import { useToast } from '@/lib/toast'
import { logger } from '@/lib/logger'
import { updateItemInArray, updateArrayOrder, moveItemInArray } from '@/lib/utils/optimisticQueue'

export type TaskSyncStatus = 'synced' | 'syncing' | 'error'

export function useOptimisticDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth()
  const [firestoreTasks, setFirestoreTasks] = useState<DayToDayTask[]>([])
  const [optimisticTasks, setOptimisticTasks] = useState<DayToDayTask[]>([])
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set())
  const { success, error: errorToast } = useToast()

  // Subscribe to Firestore tasks
  useEffect(() => {
    const labId = profile?.labId
    if (!labId) return

    const unsubscribe = subscribeToDayToDayTasks({ labId }, (tasks) => {
      setFirestoreTasks(tasks)
      // Only update optimistic tasks if we're not syncing
      if (syncingIds.size === 0) {
        setOptimisticTasks(tasks)
      }
    })

    return () => unsubscribe()
  }, [profile, syncingIds.size])

  // Sync optimistic tasks with Firestore when no pending operations
  useEffect(() => {
    if (syncingIds.size === 0 && errorIds.size === 0) {
      setOptimisticTasks(firestoreTasks)
    }
  }, [firestoreTasks, syncingIds.size, errorIds.size])

  /**
   * Get sync status for a specific task
   */
  const getTaskSyncStatus = useCallback((taskId: string): TaskSyncStatus => {
    if (errorIds.has(taskId)) return 'error'
    if (syncingIds.has(taskId)) return 'syncing'
    return 'synced'
  }, [syncingIds, errorIds])

  /**
   * Overall sync status
   */
  const overallSyncStatus: TaskSyncStatus = useMemo(() => {
    if (errorIds.size > 0) return 'error'
    if (syncingIds.size > 0) return 'syncing'
    return 'synced'
  }, [syncingIds.size, errorIds.size])

  /**
   * Mark task as syncing
   */
  const markSyncing = useCallback((taskId: string) => {
    setSyncingIds(prev => new Set(prev).add(taskId))
    setErrorIds(prev => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  /**
   * Mark task as synced
   */
  const markSynced = useCallback((taskId: string) => {
    setSyncingIds(prev => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  /**
   * Mark task as error
   */
  const markError = useCallback((taskId: string) => {
    setSyncingIds(prev => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
    setErrorIds(prev => new Set(prev).add(taskId))
  }, [])

  /**
   * Create task (no optimistic update - waits for Firestore)
   */
  const handleCreateDayToDayTask = async (
    task: Omit<DayToDayTask, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'labId'>
  ) => {
    if (!currentUser) {
      logger.error('No current user for task creation')
      return
    }

    const labId = profile?.labId
    if (!labId) {
      logger.error('No labId found on profile', new Error('Profile missing labId'), {
        profileId: profile?.id,
        userId: profile?.userId,
        hasLegacyLab: !!profile?.labName
      })
      errorToast('Cannot create task: Your profile is missing a lab assignment. Please contact your administrator or try logging out and logging back in.')
      return
    }

    try {
      const order = optimisticTasks.length
      await createDayToDayTask({
        ...task,
        createdBy: currentUser.uid,
        order,
        labId,
      })
      success('Task created successfully')
    } catch (err) {
      logger.error('Error creating day-to-day task', err)
      errorToast('Failed to create task. Please try again.')
    }
  }

  /**
   * Update task with optimistic UI update
   */
  const handleUpdateDayToDayTask = useCallback(async (
    taskId: string,
    updates: Partial<DayToDayTask>
  ) => {
    // Store previous state for rollback
    const previousTasks = optimisticTasks

    // Optimistically update UI
    const updatedTasks = updateItemInArray(optimisticTasks, taskId, updates)
    setOptimisticTasks(updatedTasks)
    markSyncing(taskId)

    try {
      await updateDayToDayTask(taskId, updates)
      markSynced(taskId)
      success('Task updated successfully')
    } catch (err) {
      logger.error('Error updating task', err)
      // Rollback to previous state
      setOptimisticTasks(previousTasks)
      markError(taskId)
      errorToast('Failed to update task. Please try again.')
    }
  }, [optimisticTasks, markSyncing, markSynced, markError, success, errorToast])

  /**
   * Delete task with optimistic UI update
   */
  const handleDeleteDayToDayTask = useCallback(async (taskId: string) => {
    // Store previous state for rollback
    const previousTasks = optimisticTasks

    // Optimistically remove from UI
    const updatedTasks = optimisticTasks.filter(t => t.id !== taskId)
    setOptimisticTasks(updatedTasks)
    markSyncing(taskId)

    try {
      await deleteDayToDayTask(taskId)
      markSynced(taskId)
      success('Task deleted successfully')
    } catch (err) {
      logger.error('Error deleting task', err)
      // Rollback to previous state
      setOptimisticTasks(previousTasks)
      markError(taskId)
      errorToast('Failed to delete task. Please try again.')
    }
  }, [optimisticTasks, markSyncing, markSynced, markError, success, errorToast])

  /**
   * Move task to different status (optimistic)
   */
  const handleMoveDayToDayTask = useCallback(async (
    taskId: string,
    newStatus: 'todo' | 'working' | 'done'
  ) => {
    // Store previous state for rollback
    const previousTasks = optimisticTasks

    // Optimistically update UI
    const updatedTasks = updateItemInArray(optimisticTasks, taskId, { status: newStatus })
    setOptimisticTasks(updatedTasks)
    markSyncing(taskId)

    try {
      logger.info(`Moving task ${taskId} to status: ${newStatus}`)
      await updateDayToDayTask(taskId, { status: newStatus })
      markSynced(taskId)
      logger.info(`Successfully moved task ${taskId} to ${newStatus}`)
    } catch (err) {
      logger.error('Error moving day-to-day task:', err)
      // Rollback to previous state
      setOptimisticTasks(previousTasks)
      markError(taskId)
      errorToast('Failed to move task. Please try again.')
      throw err
    }
  }, [optimisticTasks, markSyncing, markSynced, markError, errorToast])

  /**
   * Reorder tasks within the same status column (optimistic)
   */
  const handleReorderDayToDayTask = useCallback(async (
    taskId: string,
    newIndex: number
  ) => {
    // Store previous state for rollback
    const previousTasks = optimisticTasks

    // Get the task being moved
    const task = optimisticTasks.find(t => t.id === taskId)
    if (!task) return

    // Filter tasks in the same column
    const columnTasks = optimisticTasks.filter(t => t.status === task.status)
    const otherTasks = optimisticTasks.filter(t => t.status !== task.status)

    // Reorder within column
    const taskIndex = columnTasks.findIndex(t => t.id === taskId)
    const reorderedColumn = moveItemInArray(columnTasks, taskId, newIndex)
    const reorderedWithOrder = updateArrayOrder(reorderedColumn)

    // Combine back with other columns
    const updatedTasks = [...otherTasks, ...reorderedWithOrder].sort((a, b) => {
      // Sort by status first (todo, working, done, history), then by order
      const statusOrder = { todo: 0, working: 1, done: 2, history: 3, blocked: 4 }
      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return (a.order || 0) - (b.order || 0)
    })

    // Optimistically update UI
    setOptimisticTasks(updatedTasks)
    markSyncing(taskId)

    try {
      // Update each task's order in the column
      const updatePromises = reorderedWithOrder.map(t =>
        updateDayToDayTask(t.id, { order: t.order })
      )
      await Promise.all(updatePromises)
      markSynced(taskId)
    } catch (err) {
      logger.error('Error reordering task', err)
      // Rollback to previous state
      setOptimisticTasks(previousTasks)
      markError(taskId)
      errorToast('Failed to reorder task. Please try again.')
    }
  }, [optimisticTasks, markSyncing, markSynced, markError, errorToast])

  return {
    dayToDayTasks: optimisticTasks,
    handleCreateDayToDayTask,
    handleUpdateDayToDayTask,
    handleDeleteDayToDayTask,
    handleMoveDayToDayTask,
    handleReorderDayToDayTask, // New function for reordering
    syncStatus: overallSyncStatus,
    getTaskSyncStatus,
  }
}
