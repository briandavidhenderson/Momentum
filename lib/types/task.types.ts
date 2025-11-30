// ============================================================================
// PROJECT TASK TYPES
// ============================================================================

import type { ImportanceLevel, WorkStatus } from './common.types'
import type { Deliverable } from './deliverable.types'

/**
 * ProjectTask - Optional granular step within a deliverable
 *
 * RENAMED FROM: Task (to avoid confusion with DayToDayTask)
 *
 * ProjectTasks are OPTIONAL fine-grained steps for completing a deliverable.
 * Use sparingly - most deliverables don't need sub-tasks.
 *
 * When to use ProjectTasks:
 * - Deliverable has many small, discrete steps
 * - Need to track progress at a finer granularity
 * - Want to assign different owners to different pieces
 *
 * Examples:
 * - Deliverable: "Draft paper" → ProjectTasks: "Write intro", "Write methods", "Create figures"
 * - Deliverable: "Run Western blot" → ProjectTasks: "Prepare samples", "Run gel", "Image blot"
 * - Deliverable: "Submit grant" → ProjectTasks: "Budget", "Aims", "CV", "Submit"
 *
 * Hierarchy:
 * Project → Workpackage → Deliverable → ProjectTask
 *
 * ProjectTasks belong to Deliverables (NOT Workpackages).
 */
export interface ProjectTask {
  id: string
  name: string
  deliverableId: string       // Parent deliverable (CRITICAL: Changed from workpackageId)

  // Dates & Progress
  start: Date
  end: Date
  progress: number            // 0-100
  status: WorkStatus

  // Ownership
  primaryOwner?: string       // PersonProfile ID
  helpers?: string[]          // PersonProfile IDs

  // Simple checklist items (optional)
  todos?: ProjectTaskTodo[]

  // Linked Entities
  linkedOrderIds?: string[]
  linkedDayToDayTaskIds?: string[]  // Day-to-day tasks working on this

  // Metadata
  importance: ImportanceLevel
  notes?: string
  tags?: string[]
  type?: "experiment" | "writing" | "meeting" | "analysis" | "admin" | "other"

  // Dependencies
  dependencies?: string[]     // Other ProjectTask IDs this depends on

  // UI State
  isExpanded?: boolean
}

/**
 * ProjectTaskTodo - Simple checklist item within a project task
 *
 * RENAMED FROM: Todo (for clarity and to avoid confusion)
 *
 * Ultra-simple checklist items for breaking down project tasks even further.
 * Just text + checkbox.
 */
export interface ProjectTaskTodo {
  id: string
  text: string
  completed: boolean
  completedBy?: string        // PersonProfile ID who completed it
  completedAt?: string
  order: number               // For manual sorting
}

// ============================================================================
// DEPRECATED TYPES - Kept for backward compatibility
// ============================================================================

/**
 * @deprecated Use ProjectTask instead
 *
 * The name "Task" is ambiguous (confused with DayToDayTask).
 * Use ProjectTask for project-level tasks.
 */
export interface Task {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  primaryOwner?: string
  helpers?: string[]
  workpackageId: string       // LEGACY: Will be removed
  importance: ImportanceLevel
  notes?: string
  updatedAt?: Date
  deliverableId?: string
  deliverables?: (Deliverable | string)[]  // LEGACY: Deliverables are now in deliverable.types.ts
  isExpanded?: boolean
  type?: "experiment" | "writing" | "meeting" | "analysis"
  dependencies?: string[]
  tags?: string[]
  status?: WorkStatus
  subtasks?: Subtask[]
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
}

/**
 * @deprecated Unnecessary hierarchy level - removed
 *
 * Subtasks added confusing nesting. Use ProjectTasks with ProjectTaskTodos instead.
 */
export interface Subtask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  status: WorkStatus
  ownerId?: string
  helpers?: string[]
  notes?: string
  tags?: string[]
  todos?: Todo[]
  deliverables?: Deliverable[]  // LEGACY: Deliverables are now in deliverable.types.ts
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
  isExpanded?: boolean
  dependencies?: string[]
}

/**
 * @deprecated Use ProjectTaskTodo instead
 */
export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  completedBy?: string
  order: number
}

// ============================================================================
// NOTE: Deliverable types have been moved to lib/types/deliverable.types.ts
// ============================================================================
// The following types are now defined in deliverable.types.ts:
// - Deliverable
// - DeliverableLink
// - DeliverableReview
// - DeliverableMetric
// - DeliverableTemplate
//
// Import them from '@/lib/types' or './deliverable.types' instead.
