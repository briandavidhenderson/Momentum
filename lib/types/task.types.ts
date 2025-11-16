// ============================================================================
// TASK TYPES
// ============================================================================

import type { ImportanceLevel, WorkStatus } from './common.types'

/**
 * DeliverableLink - Link to external deliverable resources
 */
export interface DeliverableLink {
  id: string
  provider: "google-drive" | "onedrive" | "url"
  title: string
  targetUrl: string
  lastChecked?: string
  iconOverride?: string
}

/**
 * DeliverableReview - Review record for a deliverable
 */
export interface DeliverableReview {
  id: string
  reviewerId: string
  reviewedAt: string
  summary?: string
  notes?: string
}

/**
 * DeliverableMetric - Quantifiable metric for a deliverable
 */
export interface DeliverableMetric {
  id: string
  label: string
  value: string
  unit?: string
}

/**
 * Deliverable - Concrete output from a task
 */
export interface Deliverable {
  id: string
  name: string
  progress: number
  status?: WorkStatus
  dueDate?: string
  ownerId?: string // PersonProfile ID (not Person ID)
  description?: string
  metrics?: DeliverableMetric[]
  reviewHistory?: DeliverableReview[]
  documentLinks?: DeliverableLink[]
  blockers?: string[]
  notes?: string
  lastUpdatedAt?: string
}

/**
 * Todo - Individual todo item for subtasks
 */
export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  completedBy?: string  // PersonProfile ID who completed it
  order: number  // For sorting
}

/**
 * Subtask - Smaller unit of work within a task
 */
export interface Subtask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number  // Auto-calculated from todos if present
  status: WorkStatus
  ownerId?: string // PersonProfile ID (not Person ID)
  helpers?: string[] // Array of PersonProfile IDs (not Person IDs)
  notes?: string
  tags?: string[]
  todos?: Todo[]  // NEW: List of todos for this subtask
  deliverables?: Deliverable[]
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
  isExpanded?: boolean
  dependencies?: string[]
}

/**
 * Task - Main unit of work within a workpackage
 */
export interface Task {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  primaryOwner?: string // PersonProfile ID (not Person ID)
  helpers?: string[] // Array of PersonProfile IDs (not Person IDs)
  workpackageId: string // Changed from projectId - tasks belong to workpackages
  importance: ImportanceLevel
  notes?: string
  deliverables: Deliverable[]
  isExpanded?: boolean
  // extended fields
  type?: "experiment" | "writing" | "meeting" | "analysis"
  dependencies?: string[] // task IDs this task depends on
  tags?: string[]
  status?: WorkStatus
  subtasks?: Subtask[]
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
}
