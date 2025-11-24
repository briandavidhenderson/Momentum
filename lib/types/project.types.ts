// ============================================================================
// PROJECT TYPES
// ============================================================================

import type { ProjectVisibility, ProjectRole } from './common.types'

/**
 * Project - Top-level research initiative
 *
 * UNIFIED TYPE - Consolidates MasterProject, ProfileProject, and legacy Project
 *
 * A Project is the highest level organizational unit for research work.
 * It represents a major research grant, program, or initiative.
 *
 * Hierarchy:
 * Project → Workpackage → Deliverable → (optional) ProjectTask
 *
 * Projects contain only workpackages (not tasks directly).
 * This enforces proper hierarchical organization.
 */
export interface Project {
  id: string
  name: string
  description?: string

  // Organizational Links
  labId: string
  labName: string               // Cached for display
  instituteId: string
  instituteName: string         // Cached for display
  organisationId: string
  organisationName: string      // Cached for display

  // Grant & Funding Information
  type: "funded" | "unfunded"      // Unified funding classification
  legacyTypeLabel?: string           // Preserves legacy labels during migration
  grantName?: string
  grantNumber?: string
  grantReference?: string      // Funder's reference number

  // Financial (calculated/cached from orders & allocations)
  totalBudget?: number
  spentAmount?: number         // Sum of received orders
  committedAmount?: number     // Sum of ordered but not received
  remainingBudget?: number     // Calculated: total - spent - committed
  currency: string             // "GBP", "USD", "EUR", etc.

  // Dates
  startDate: string
  endDate: string

  // Funding Accounts
  funderId: string             // Primary funder ID
  funderName: string           // Cached funder name
  accountIds: string[]         // Multiple funding accounts for this project

  // Team Structure
  principalInvestigatorIds: string[]  // PI PersonProfile IDs
  coPIIds: string[]                   // Co-PI PersonProfile IDs
  teamMemberIds: string[]             // All team member PersonProfile IDs
  teamRoles: {                        // Role assignment for each member
    [personProfileId: string]: ProjectRole
  }

  // Hierarchy - Projects contain ONLY workpackages
  workpackageIds: string[]      // Array of workpackage IDs in this project

  // Matrix Structure
  groupIds?: string[]           // Research Groups this project belongs to

  // Status & Health Tracking
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"  // Calculated from overdue deliverables, budget, etc.
  progress: number              // 0-100, calculated from workpackage/deliverable progress

  updatedBy?: string            // User ID

  // UI State
  isExpanded?: boolean          // For accordion/tree views in dashboard
}

/**
 * ProjectHealth - Calculated health indicators
 *
 * Helper type for computing project health status
 */
export interface ProjectHealth {
  overall: "good" | "warning" | "at-risk"
  indicators: {
    overdueDeliverables: number
    budgetStatus: "healthy" | "warning" | "overbudget"
    timeRemaining: number  // Days
    progressVsTime: "on-track" | "behind" | "ahead"
  }
  issues: string[]  // Human-readable issues
}

/**
 * ProjectStats - Aggregated statistics
 *
 * Helper type for dashboard summaries
 */
export interface ProjectStats {
  totalWorkpackages: number
  activeWorkpackages: number
  completedWorkpackages: number

  totalDeliverables: number
  completedDeliverables: number
  inProgressDeliverables: number
  notStartedDeliverables: number
  overdueDeliverables: number

  totalOrders: number
  ordersReceived: number
  ordersOrdered: number
  ordersToOrder: number

  linkedDayToDayTasks: number
  linkedELNExperiments: number

  budgetUtilization: number  // Percentage
}

// ============================================================================
// DEPRECATED TYPES - Kept for backward compatibility during migration
// ============================================================================

/**
 * @deprecated Use Project instead
 *
 * ProfileProject is being phased out. All profile-level projects
 * should use the unified Project type.
 */
export interface ProfileProject {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  grantName?: string
  grantNumber?: string
  fundedBy: string[]
  budget?: number
  status: "planning" | "active" | "completed" | "on-hold"
  notes?: string
  visibility: ProjectVisibility
  visibleTo?: string[]
  principalInvestigatorId?: string
  tags?: string[]
}

/**
 * @deprecated Use Project instead
 *
 * MasterProject is being consolidated into the unified Project type.
 */
export interface MasterProject {
  isExpanded?: boolean
  id: string
  name: string
  description?: string
  labId: string
  labName: string
  instituteId: string
  instituteName: string
  organisationId: string
  organisationName: string
  type: "funded" | "unfunded"
  legacyTypeLabel?: string
  grantName?: string
  grantNumber?: string
  grantReference?: string
  totalBudget?: number
  spentAmount?: number
  committedAmount?: number
  remainingBudget?: number
  currency: string
  startDate: string
  endDate: string
  funderId: string
  funderName: string
  accountIds: string[]
  principalInvestigatorIds: string[]
  coPIIds: string[]
  teamMemberIds: string[]
  teamRoles: {
    [personProfileId: string]: ProjectRole
  }
  workpackageIds: string[]
  groupIds?: string[]            // Research Groups this project belongs to
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"
  progress: number
  visibility: "private" | "lab" | "institute" | "organisation"
  visibleTo?: string[]
  researchArea?: string
  tags?: string[]
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}
