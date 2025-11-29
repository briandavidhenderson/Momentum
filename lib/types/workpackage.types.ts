// ============================================================================
// WORKPACKAGE TYPES
// ============================================================================

import type { ImportanceLevel } from './common.types'
import type { Task } from './task.types'

/**
 * Workpackage - Structured unit of work within a project
 *
 * A workpackage is a major work unit that groups related deliverables.
 * It represents a coherent package of work with specific objectives.
 *
 * Examples:
 * - "WP1: Data Collection"
 * - "WP2: Model Development"
 * - "WP3: Validation & Testing"
 * - "WP4: Dissemination & Publication"
 *
 * Hierarchy:
 * Project → Workpackage → Deliverable → (optional) ProjectTask
 *
 * Workpackages contain deliverables (NOT tasks directly).
 * This enforces the hierarchical structure and makes it clear that
 * deliverables are the primary organizational unit for work.
 */
export interface Workpackage {
  id: string
  name: string
  projectId: string           // Parent project (changed from profileProjectId)

  // Dates
  start: Date
  end: Date

  // Progress & Status
  progress: number            // 0-100, calculated from deliverable progress
  status: "planning" | "active" | "at-risk" | "completed" | "on-hold"

  // Ownership
  ownerId?: string           // PersonProfile ID responsible for this workpackage

  // Structure - Workpackages contain deliverables
  deliverableIds: string[]   // CRITICAL CHANGE: Contains deliverables, not tasks

  // Metadata
  importance: ImportanceLevel
  notes?: string
  colorHex?: string         // For visual distinction in Gantt charts, etc.
  tags?: string[]

  // UI State
  isExpanded?: boolean      // For accordion/tree views

  // Backward compatibility - DEPRECATED
  tasks?: Task[]             // @deprecated Use deliverableIds instead
}

/**
 * WorkpackageTemplate - Reusable workpackage blueprint
 *
 * For common workpackage structures that labs use repeatedly
 */
export interface WorkpackageTemplate {
  id: string
  name: string
  description?: string
  defaultDuration: number  // Days
  defaultImportance: ImportanceLevel

  // Pre-defined deliverable templates
  suggestedDeliverables?: string[]  // Deliverable names
  suggestedTags?: string[]

  // Metadata
  category?: string        // "Experimental", "Administrative", "Publication", etc.
  labId?: string          // Lab-specific template
  createdBy: string
  createdAt: string
}
