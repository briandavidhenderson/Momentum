/**
 * Project Snapshot Types
 *
 * Type definitions for importing and exporting complete project structures
 * including workpackages, deliverables, tasks, orders, ledger, and inventory.
 */

import {
  Project,
  Workpackage,
  Deliverable,
  ProjectTask,
  ProjectTaskTodo,
  Order,
  FundingAccount,
  FundingTransaction,
} from './index'
import type { DayToDayTask } from '../dayToDayTypes'

/**
 * Complete project snapshot for export/import
 */
export interface ProjectSnapshot {
  version: string // Schema version for future compatibility
  exportedAt: string // ISO timestamp
  exportedBy: string // User ID who exported
  project: ProjectWithDetails
}

/**
 * Extended project with full hierarchical data
 */
export interface ProjectWithDetails extends Omit<Project, 'id'> {
  id: string
  workpackages: WorkpackageWithDeliverables[]
  progressDetail: ProgressDetail
  ledger: ProjectLedger
}

/**
 * Work package with nested deliverables
 */
export interface WorkpackageWithDeliverables extends Omit<Workpackage, 'id'> {
  id: string
  deliverables: DeliverableWithDetails[]
}

/**
 * Deliverable with linked orders, tasks, and actions
 */
export interface DeliverableWithDetails extends Omit<Deliverable, 'id'> {
  id: string
  linkedOrders: OrderWithInventory[]
  dayToDayTasks: DayToDayTaskSnapshot[]
  projectTasks: ProjectTaskSnapshot[]
  actions: string[] // UI action hints like 'createOrder', 'createTask'
}

/**
 * Order with inventory update information
 */
export interface OrderWithInventory extends Omit<Order, 'id'> {
  id: string
  inventoryUpdate?: InventoryUpdate
}

/**
 * Inventory update record from order receipt
 */
export interface InventoryUpdate {
  inventoryItemId: string
  previousQuantity: number
  newQuantity: number
  location: string
  receivedDate: string // ISO timestamp
}

/**
 * Day-to-day task snapshot
 */
export interface DayToDayTaskSnapshot extends Omit<DayToDayTask, 'id'> {
  id: string
}

/**
 * Project task snapshot with nested todos
 */
export interface ProjectTaskSnapshot extends Omit<ProjectTask, 'id'> {
  id: string
  todos?: ProjectTaskTodo[]
}

/**
 * Progress breakdown for transparency
 */
export interface ProgressDetail {
  deliverablesCompleted: number
  deliverablesTotal: number
  tasksCompleted: number
  tasksTotal: number
  calculatedProgress: number // Auto-calculated percentage
  manualOverride?: number // Optional manual override
}

/**
 * Project ledger with accounts and transactions
 */
export interface ProjectLedger {
  totalBudget: number
  spentAmount: number
  remainingBudget: number
  currency: string
  accounts: FundingAccountBalance[]
  transactions: FundingTransactionSnapshot[]
}

/**
 * Funding account with balance information
 */
export interface FundingAccountBalance extends Omit<FundingAccount, 'id'> {
  id: string
  startingAllocation: number
  spent: number
  remaining: number
}

/**
 * Funding transaction snapshot
 */
export interface FundingTransactionSnapshot extends Omit<FundingTransaction, 'id'> {
  id: string
  orderId?: string // Link to order if applicable
}

/**
 * Import options for controlling import behavior
 */
export interface ImportOptions {
  generateNewIds?: boolean // Generate new IDs vs preserve existing
  overwriteExisting?: boolean // Overwrite if project ID exists
  importOrders?: boolean // Include orders in import
  importTasks?: boolean // Include tasks in import
  importLedger?: boolean // Include ledger/budget data
  labId?: string // Target lab for import
  userId?: string // User performing import
}

/**
 * Import result with statistics and errors
 */
export interface ImportResult {
  success: boolean
  projectId?: string
  statistics: ImportStatistics
  errors: ImportError[]
  warnings: string[]
}

/**
 * Statistics from import operation
 */
export interface ImportStatistics {
  workpackagesCreated: number
  deliverablesCreated: number
  ordersCreated: number
  tasksCreated: number
  transactionsCreated: number
  itemsSkipped: number
}

/**
 * Import error details
 */
export interface ImportError {
  type: 'validation' | 'permission' | 'duplicate' | 'reference' | 'unknown'
  field?: string
  message: string
  context?: any
}

/**
 * Validation result for snapshot
 */
export interface ValidationResult {
  valid: boolean
  errors: ImportError[]
  warnings: string[]
}
