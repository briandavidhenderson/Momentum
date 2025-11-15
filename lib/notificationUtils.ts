/**
 * Notification Utilities
 *
 * Provides domain event triggers that automatically generate notifications.
 * Part of Equipment & Inventory System Integration (Phase 4)
 *
 * Purpose: Connect domain events (low stock, low budget, task assignment)
 * to the notification system, eliminating manual notification creation.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb } from './firebase'
import { InventoryItem, FundingAllocation, PersonProfile } from './types'
import { getBudgetNotificationPriority } from './equipmentConfig'
import { logger } from './logger'

export interface NotificationPayload {
  userId: string
  type: string
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
  relatedEntityType?: string
  relatedEntityId?: string
  actionUrl?: string
}

/**
 * Generic notification creator
 * Creates a notification document in Firestore
 */
async function createNotification(payload: NotificationPayload) {
  const db = getFirebaseDb()
  try {
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      createdAt: serverTimestamp(),
      read: false
    })
  } catch (error) {
    logger.error('Error creating notification', error)
    throw error
  }
}

/**
 * LOW STOCK NOTIFICATIONS
 *
 * Triggered when inventory item falls below reorder threshold
 * Notifies lab managers to reorder supplies
 *
 * @param item - Inventory item that is low on stock
 * @param managers - Lab managers/PIs to notify
 * @param weeksRemaining - Estimated weeks until stock runs out
 *
 * @example
 * // In EquipmentStatusPanel after stock check
 * const weeksRemaining = calculateWeeksRemaining(item.currentQuantity, supply.burnPerWeek)
 * if (weeksRemaining < 2) {
 *   await notifyLowStock(item, labManagers, weeksRemaining)
 * }
 */
export async function notifyLowStock(
  item: InventoryItem,
  managers: PersonProfile[],
  weeksRemaining: number
): Promise<void> {
  const priority = weeksRemaining < 1 ? 'high' : 'medium'

  const notifications = managers
    .filter(_m => true) // Note: orderNotifications property removed, send to all managers
    .map(manager =>
      createNotification({
        userId: manager.id,
        type: 'LOW_STOCK',
        title: `Low Stock Alert: ${item.productName}`,
        message: `Only ${weeksRemaining.toFixed(1)} weeks of ${item.productName} remaining (${item.currentQuantity} units). Reorder recommended.`,
        priority,
        relatedEntityType: 'inventory',
        relatedEntityId: item.id,
        actionUrl: '/equipment-management?tab=inventory'
      })
    )

  await Promise.all(notifications)
}

/**
 * CRITICAL STOCK NOTIFICATIONS
 *
 * Triggered when inventory item is completely empty or critically low
 * Higher priority than regular low stock alerts
 *
 * @param item - Inventory item that is critically low
 * @param managers - Lab managers/PIs to notify
 *
 * @example
 * if (item.currentQuantity === 0 || item.inventoryLevel === 'empty') {
 *   await notifyCriticalStock(item, labManagers)
 * }
 */
export async function notifyCriticalStock(
  item: InventoryItem,
  managers: PersonProfile[]
): Promise<void> {
  const notifications = managers
    .filter(_m => true) // Note: orderNotifications property removed
    .map(manager =>
      createNotification({
        userId: manager.id,
        type: 'CRITICAL_STOCK',
        title: `URGENT: ${item.productName} Out of Stock`,
        message: `${item.productName} is ${item.currentQuantity === 0 ? 'completely out of stock' : 'critically low'}. Immediate reorder required.`,
        priority: 'high',
        relatedEntityType: 'inventory',
        relatedEntityId: item.id,
        actionUrl: '/equipment-management?tab=inventory'
      })
    )

  await Promise.all(notifications)
}

/**
 * LOW BUDGET NOTIFICATIONS
 *
 * Triggered when funding allocation drops below warning threshold
 * Helps users plan spending and avoid budget overruns
 *
 * @param allocation - Funding allocation that is low
 * @param user - User to notify (allocation owner)
 * @param percentRemaining - Percentage of budget remaining
 *
 * @example
 * // In OrderFormDialog after order submission
 * const percentRemaining = (allocation.remainingBudget / allocation.allocatedAmount) * 100
 * if (percentRemaining < (allocation.lowBalanceWarningThreshold || 25)) {
 *   await notifyLowBudget(allocation, currentUser, percentRemaining)
 * }
 */
export async function notifyLowBudget(
  allocation: FundingAllocation,
  user: PersonProfile,
  percentRemaining: number
): Promise<void> {
  // Note: fundingAlertNotifications property removed, notifications now sent to all users

  const priority = getBudgetNotificationPriority(percentRemaining)

  await createNotification({
    userId: user.id,
    type: 'LOW_BUDGET',
    title: 'Budget Running Low',
    message: `Your ${allocation.fundingAccountName || 'funding allocation'} budget has ${percentRemaining.toFixed(0)}% remaining (${allocation.remainingBudget?.toFixed(2)} ${allocation.currency || 'EUR'}).`,
    priority,
    relatedEntityType: 'fundingAllocation',
    relatedEntityId: allocation.id,
    actionUrl: '/personal-ledger'
  })
}

/**
 * BUDGET EXHAUSTED NOTIFICATIONS
 *
 * Triggered when funding allocation is completely exhausted
 * Critical alert to prevent unauthorized spending
 *
 * @param allocation - Exhausted funding allocation
 * @param user - User to notify
 *
 * @example
 * if (allocation.remainingBudget <= 0) {
 *   await notifyBudgetExhausted(allocation, currentUser)
 * }
 */
export async function notifyBudgetExhausted(
  allocation: FundingAllocation,
  user: PersonProfile
): Promise<void> {
  // Note: fundingAlertNotifications property removed, notifications now sent to all users

  await createNotification({
    userId: user.id,
    type: 'BUDGET_EXHAUSTED',
    title: 'Budget Exhausted',
    message: `Your ${allocation.fundingAccountName || 'funding allocation'} budget has been fully spent. Contact your PI to request additional funding.`,
    priority: 'high',
    relatedEntityType: 'fundingAllocation',
    relatedEntityId: allocation.id,
    actionUrl: '/personal-ledger'
  })
}

/**
 * TASK ASSIGNMENT NOTIFICATIONS
 *
 * Triggered when a day-to-day task is assigned to a user
 * Ensures users are aware of new responsibilities
 *
 * @param task - Task that was assigned
 * @param assignee - User who was assigned the task
 * @param assigner - User who assigned the task
 *
 * @example
 * // In DayToDayBoard after task creation
 * if (newTask.assignedTo && newTask.assignedTo !== currentUser.id) {
 *   const assignee = allProfiles.find(p => p.id === newTask.assignedTo)
 *   if (assignee) {
 *     await notifyTaskAssigned(newTask, assignee, currentUserProfile)
 *   }
 * }
 */
export async function notifyTaskAssigned(
  task: any, // DayToDayTask type
  assignee: PersonProfile,
  assigner: PersonProfile
): Promise<void> {
  // Note: projectAssignmentNotifications property removed, notifications now sent to all users

  const priority = task.priority === 'high' ? 'high' : 'medium'

  await createNotification({
    userId: assignee.id,
    type: 'TASK_ASSIGNED',
    title: 'New Task Assigned',
    message: `${assigner.firstName} ${assigner.lastName} assigned you: "${task.title}"${task.dueDate ? ` (due ${new Date(task.dueDate).toLocaleDateString()})` : ''}`,
    priority,
    relatedEntityType: 'task',
    relatedEntityId: task.id,
    actionUrl: '/day-to-day'
  })
}

/**
 * TASK REASSIGNMENT NOTIFICATIONS
 *
 * Triggered when a task is reassigned from one user to another
 * Notifies both the old and new assignee
 *
 * @param task - Task that was reassigned
 * @param newAssignee - User who received the task
 * @param oldAssignee - User who previously had the task
 * @param reassigner - User who made the change
 */
export async function notifyTaskReassigned(
  task: any, // DayToDayTask type
  newAssignee: PersonProfile,
  oldAssignee: PersonProfile,
  reassigner: PersonProfile
): Promise<void> {
  // Notify new assignee (projectAssignmentNotifications property removed)
  await createNotification({
    userId: newAssignee.id,
    type: 'TASK_ASSIGNED',
    title: 'Task Reassigned to You',
    message: `${reassigner.firstName} ${reassigner.lastName} reassigned "${task.title}" to you`,
    priority: task.priority === 'high' ? 'high' : 'medium',
    relatedEntityType: 'task',
    relatedEntityId: task.id,
    actionUrl: '/day-to-day'
  })

  // Notify old assignee (projectAssignmentNotifications property removed)
  await createNotification({
    userId: oldAssignee.id,
    type: 'TASK_UNASSIGNED',
    title: 'Task Reassigned',
    message: `"${task.title}" has been reassigned to ${newAssignee.firstName} ${newAssignee.lastName}`,
    priority: 'low',
    relatedEntityType: 'task',
    relatedEntityId: task.id,
    actionUrl: '/day-to-day'
  })
}

/**
 * ORDER PLACED NOTIFICATIONS
 *
 * Triggered when an order is placed
 * Notifies lab managers for approval/tracking
 *
 * @param order - Order that was placed
 * @param managers - Lab managers to notify
 */
export async function notifyOrderPlaced(
  order: any, // Order type
  managers: PersonProfile[]
): Promise<void> {
  const notifications = managers
    .filter(_m => true) // Note: orderNotifications property removed
    .map(manager =>
      createNotification({
        userId: manager.id,
        type: 'ORDER_PLACED',
        title: 'New Order Placed',
        message: `${order.productName} ordered for ${order.priceExVAT} ${order.currency || 'EUR'}`,
        priority: 'low',
        relatedEntityType: 'order',
        relatedEntityId: order.id,
        actionUrl: '/orders-inventory?tab=orders'
      })
    )

  await Promise.all(notifications)
}

/**
 * Helper: Get lab managers from profiles list
 * Filters profiles to find users with manager/PI role
 *
 * @param profiles - All lab member profiles
 * @returns Array of manager profiles
 */
export function getLabManagers(profiles: PersonProfile[]): PersonProfile[] {
  return profiles.filter(p =>
    p.userRole === 'pi' ||
    p.userRole === 'lab_manager' ||
    p.userRole === 'finance_admin' ||
    p.userRole === 'admin' ||
    p.isAdministrator === true ||
    p.isPrincipalInvestigator === true
  )
}

/**
 * Helper: Check if notification should be throttled
 * Prevents spam by checking if similar notification was recently sent
 *
 * @param allocation - Funding allocation to check
 * @param thresholdHours - Hours to wait between notifications (default 24)
 * @returns true if notification should be sent, false if throttled
 */
export function shouldSendLowBudgetNotification(
  allocation: FundingAllocation,
  thresholdHours: number = 24
): boolean {
  if (!allocation.lastLowBalanceWarningAt) {
    return true
  }

  const lastWarning = new Date(allocation.lastLowBalanceWarningAt)
  const now = new Date()
  const hoursSinceLastWarning = (now.getTime() - lastWarning.getTime()) / (1000 * 60 * 60)

  return hoursSinceLastWarning >= thresholdHours
}
