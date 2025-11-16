/**
 * Bulk Operations Utilities
 * Functions for performing batch operations on multiple items
 */

import {
  updateProject,
  deleteProject,
  updateEvent,
  deleteEvent,
  updateInventoryItem,
  deleteInventoryItem,
  updateOrder,
  deleteOrder,
  updateProfile,
} from "./firestoreService"
import { deleteProfileCascade } from "./services/deleteService"
import type { Project, CalendarEvent, InventoryItem, Order, PersonProfile } from "./types"

// ============================================================================
// TYPES
// ============================================================================

export interface BulkOperationResult {
  success: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

export interface BulkUpdateOptions {
  onProgress?: (current: number, total: number) => void
  onError?: (id: string, error: any) => void
  continueOnError?: boolean
}

// ============================================================================
// PROJECT BULK OPERATIONS
// ============================================================================

/**
 * Bulk update projects
 */
export async function bulkUpdateProjects(
  projectIds: string[],
  updates: Partial<Project>,
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < projectIds.length; i++) {
    const id = projectIds[i]

    try {
      await updateProject(id, updates)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, projectIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

/**
 * Bulk delete projects
 */
export async function bulkDeleteProjects(
  projectIds: string[],
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < projectIds.length; i++) {
    const id = projectIds[i]

    try {
      await deleteProject(id)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, projectIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

// ============================================================================
// EVENT BULK OPERATIONS
// ============================================================================

/**
 * Bulk update events
 */
export async function bulkUpdateEvents(
  eventIds: string[],
  updates: Partial<CalendarEvent>,
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < eventIds.length; i++) {
    const id = eventIds[i]

    try {
      await updateEvent(id, updates)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, eventIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

/**
 * Bulk delete events
 */
export async function bulkDeleteEvents(
  eventIds: string[],
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < eventIds.length; i++) {
    const id = eventIds[i]

    try {
      await deleteEvent(id)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, eventIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

// ============================================================================
// INVENTORY BULK OPERATIONS
// ============================================================================

/**
 * Bulk update inventory items
 */
export async function bulkUpdateInventory(
  itemIds: string[],
  updates: Partial<InventoryItem>,
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < itemIds.length; i++) {
    const id = itemIds[i]

    try {
      await updateInventoryItem(id, updates)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, itemIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

/**
 * Bulk delete inventory items
 */
export async function bulkDeleteInventory(
  itemIds: string[],
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < itemIds.length; i++) {
    const id = itemIds[i]

    try {
      await deleteInventoryItem(id)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, itemIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

// ============================================================================
// ORDER BULK OPERATIONS
// ============================================================================

/**
 * Bulk update orders
 */
export async function bulkUpdateOrders(
  orderIds: string[],
  updates: Partial<Order>,
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < orderIds.length; i++) {
    const id = orderIds[i]

    try {
      await updateOrder(id, updates)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, orderIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

/**
 * Bulk delete orders
 */
export async function bulkDeleteOrders(
  orderIds: string[],
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < orderIds.length; i++) {
    const id = orderIds[i]

    try {
      await deleteOrder(id)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, orderIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

// ============================================================================
// PROFILE BULK OPERATIONS
// ============================================================================

/**
 * Bulk update profiles
 */
export async function bulkUpdateProfiles(
  profileIds: string[],
  updates: Partial<PersonProfile>,
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < profileIds.length; i++) {
    const id = profileIds[i]

    try {
      await updateProfile(id, updates)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, profileIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

/**
 * Bulk delete profiles (admin only)
 */
export async function bulkDeleteProfiles(
  profileIds: string[],
  options: BulkUpdateOptions = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  const continueOnError = options.continueOnError ?? true

  for (let i = 0; i < profileIds.length; i++) {
    const id = profileIds[i]

    try {
      await deleteProfileCascade(id)
      result.success++

      if (options.onProgress) {
        options.onProgress(i + 1, profileIds.length)
      }
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      result.errors.push({ id, error: errorMessage })

      if (options.onError) {
        options.onError(id, error)
      }

      if (!continueOnError) {
        break
      }
    }
  }

  return result
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bulk operation result for display
 */
export function formatBulkOperationResult(result: BulkOperationResult): string {
  const total = result.success + result.failed
  let message = `Completed: ${result.success}/${total} successful`

  if (result.failed > 0) {
    message += `, ${result.failed} failed`
  }

  return message
}

/**
 * Check if bulk operation was successful
 */
export function isBulkOperationSuccessful(result: BulkOperationResult): boolean {
  return result.failed === 0
}

/**
 * Get list of failed IDs from bulk operation
 */
export function getFailedIds(result: BulkOperationResult): string[] {
  return result.errors.map((e) => e.id)
}
