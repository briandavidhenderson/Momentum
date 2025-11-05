import { ImportanceLevel, EquipmentTaskType } from "./types"

export type TaskStatus = "todo" | "working" | "done"

export interface DayToDayTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  importance: ImportanceLevel
  assigneeId?: string // PersonProfile ID
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string // User ID
  tags?: string[]
  linkedProjectId?: string
  linkedTaskId?: string
  order: number // For manual ordering within a column

  // Equipment-related fields
  equipmentId?: string
  equipmentSupplyId?: string
  inventoryItemId?: string
  taskType?: EquipmentTaskType
  metadata?: {
    maintenanceHealth?: number
    weeksRemaining?: number
    suggestedQty?: number
    estimatedCost?: number
  }
}

export interface DayToDayColumn {
  id: TaskStatus
  title: string
  tasks: DayToDayTask[]
}



