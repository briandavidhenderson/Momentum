// ============================================================================
// WORKPACKAGE TYPES
// ============================================================================

import type { ImportanceLevel } from './common.types'
import type { Task } from './task.types'
import type { Project } from './project.types'

/**
 * Workpackage - A major work unit within a master project
 * Contains tasks and tracks progress towards specific objectives
 */
export interface Workpackage {
  id: string
  name: string
  profileProjectId: string // Links to ProfileProject (master project)
  start: Date
  end: Date
  progress: number
  importance: ImportanceLevel
  notes?: string
  tasks: Task[] // Tasks within this workpackage
  isExpanded?: boolean
  // extended fields
  status?: "planning" | "active" | "atRisk" | "completed" | "onHold"
  colorHex?: string
  ownerId?: string // PersonProfile ID (not Person ID) // PersonProfile ID responsible for the WP (not Person ID)
  regularProjects?: Project[] // Nested regular projects within a master project hierarchy
}
