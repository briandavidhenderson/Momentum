import { ImportanceLevel, EquipmentTaskType } from "./types"

export type TaskStatus = "todo" | "working" | "done" | "history"

export interface DayToDayTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  importance: ImportanceLevel
  assigneeId?: string // DEPRECATED: Use assigneeIds instead
  assigneeIds?: string[] // PersonProfile IDs - supports multiple assignees
  watcherIds?: string[] // PersonProfile IDs who are watching this task
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string // User ID
  tags?: string[]

  // Completion tracking
  completedBy?: string // User ID who moved task to "done"
  completedAt?: Date // When task was completed

  // Verification tracking
  verifiedBy?: string // User ID who verified the completed task
  verifiedAt?: Date // When task was verified

  // Linking to other modules
  linkedProjectId?: string // Link to Master Project
  linkedTaskId?: string // Link to Project Task/Subtask
  relatedExperimentId?: string // Link to ELN Experiment
  relatedOrderId?: string // Link to Order

  // Task type for special tasks
  taskType?: EquipmentTaskType | "ORDER_REQUEST" | "EXPERIMENT" | "GENERAL"

  order: number // For manual ordering within a column
  labId?: string // Lab this task belongs to

  // Equipment-related fields (for equipment maintenance tasks)
  equipmentId?: string
  equipmentSupplyId?: string
  inventoryItemId?: string
  metadata?: {
    maintenanceHealth?: number
    weeksRemaining?: number
    suggestedQty?: number
    estimatedCost?: number
  }

  // Phase 2: Priority & Blocking
  priority?: 'critical' | 'high' | 'medium' | 'low'
  blockedBy?: string[] // IDs of tasks blocking this one
}

export interface DayToDayColumn {
  id: TaskStatus
  title: string
  tasks: DayToDayTask[]
}



