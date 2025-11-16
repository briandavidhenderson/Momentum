// ============================================================================
// PROJECT TYPES
// ============================================================================

import type { ProjectVisibility, ProjectRole, ImportanceLevel, WorkStatus } from './common.types'
import type { Workpackage } from './workpackage.types'
import type { Task } from './task.types'

/**
 * ProfileProject - DEPRECATED
 * Legacy type kept for backward compatibility
 * Use MasterProject instead for new code
 */
export interface ProfileProject {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  grantName?: string
  grantNumber?: string
  fundedBy: string[] // Funding account IDs
  budget?: number
  status: "planning" | "active" | "completed" | "on-hold"
  notes?: string
  visibility: ProjectVisibility
  visibleTo?: string[] // Array of PersonProfile IDs (for "custom" visibility)
  principalInvestigatorId?: string
  tags?: string[]
}

/**
 * MasterProject - Major research grant/program
 * Replaces ProfileProject with proper organizational structure
 * Contains work packages, which contain tasks
 */
export interface MasterProject {
  isExpanded?: boolean;
  id: string
  name: string
  description?: string

  // Organizational Links
  labId: string
  labName: string               // Cached
  instituteId: string
  instituteName: string         // Cached
  organisationId: string
  organisationName: string      // Cached

  // Grant Information
  grantName?: string
  grantNumber?: string
  grantReference?: string  // Funder's reference number

  // Financial
  totalBudget?: number
  spentAmount?: number  // Cached from orders
  committedAmount?: number  // From pending orders
  remainingBudget?: number  // Calculated
  currency: string  // e.g., "GBP", "USD", "EUR"

  // Dates
  startDate: string
  endDate: string

  // Funding (UPDATED: Support multiple accounts)
  funderId: string              // Primary funder
  funderName: string            // Cached
  accountIds: string[]          // Multiple accounts per project

  // Team
  principalInvestigatorIds: string[]  // Array of PI PersonProfile IDs
  coPIIds: string[]                   // Array of Co-PI PersonProfile IDs
  teamMemberIds: string[]             // Array of all team member PersonProfile IDs
  teamRoles: {                        // Role for each team member
    [personProfileId: string]: ProjectRole
  }

  // Structure
  workpackageIds: string[]      // Work packages in this project

  // Status & Progress
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"
  progress: number              // 0-100

  // Visibility & Access
  visibility: "private" | "lab" | "institute" | "organisation"
  visibleTo?: string[]  // Additional PersonProfile IDs for custom access

  // Categorization
  researchArea?: string
  tags?: string[]

  // Metadata
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

/**
 * Project - Legacy project type
 * Used for backward compatibility with older project structures
 */
export interface Project {
  id: string
  name: string

  // P0-2: Unified Project Model - explicit type distinction
  kind?: "master" | "regular"  // Legacy field, keep for backward compatibility
  projectType?: "MASTER" | "REGULAR"  // New explicit field for P0-2 implementation

  // P0-1: Funder link (required for Master projects)
  funderId?: string  // Funder ID - required if projectType === "MASTER"
  fundedBy?: string[] // Legacy: Funding account IDs (deprecated in favor of funderId)

  start: Date
  end: Date
  progress: number
  color: string
  importance: ImportanceLevel
  notes?: string
  isExpanded?: boolean
  principalInvestigatorId?: string // PersonProfile ID of the PI (not Person ID)
  profileProjectId?: string // Link to ProfileProject if created from profile

  // Note: tasks removed - they now belong to workpackages for master projects
  tasks?: Task[] // Only for backward compatibility with non-master projects

  // extended fields
  totalBudget?: number
  health?: "good" | "warning" | "risk"
  status?: WorkStatus
  tags?: string[]
  workpackages?: Workpackage[]
  defaultTemplates?: {
    workPackages?: string[]
    tasks?: string[]
    subtasks?: string[]
  }
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
}
