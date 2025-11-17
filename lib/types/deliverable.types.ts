// ============================================================================
// DELIVERABLE TYPES
// ============================================================================

import type { WorkStatus, ImportanceLevel } from './common.types'

/**
 * Deliverable - Concrete outcome within a workpackage
 *
 * This is the primary unit of "what we're producing" in project management.
 *
 * Examples:
 * - Paper draft submitted to journal
 * - Dataset collected and validated
 * - Experiment protocol developed
 * - Grant application submitted
 * - Software module completed
 *
 * Deliverables sit between Workpackages and ProjectTasks:
 * Project → Workpackage → Deliverable → (optional) ProjectTasks
 *
 * They are the main anchor point for:
 * - Orders (equipment/supplies needed)
 * - Day-to-day tasks (daily work on this deliverable)
 * - ELN experiments (research work)
 * - Document links (Google Docs, etc.)
 */
export interface Deliverable {
  id: string
  name: string
  description?: string
  workpackageId: string  // Parent workpackage

  // Dates & Progress
  dueDate?: string
  startDate?: string
  progress: number  // 0-100, calculated from project tasks or set manually
  status: WorkStatus

  // Ownership
  ownerId?: string  // PersonProfile ID responsible for this deliverable
  contributorIds?: string[]  // Other team members working on this

  // Structure - Optional granular steps
  projectTaskIds?: string[]  // Optional: fine-grained tasks to complete this deliverable

  // Linked Entities - The key to cross-module integration
  linkedOrderIds?: string[]  // Orders required for this deliverable
  linkedDayToDayTaskIds?: string[]  // Personal tasks working on this
  linkedELNExperimentIds?: string[]  // ELN experiments related to this
  linkedDocumentUrls?: DeliverableLink[]  // Google Docs, OneDrive, etc.

  // Quality & Review
  reviewHistory?: DeliverableReview[]
  metrics?: DeliverableMetric[]
  blockers?: string[]  // Issues preventing completion

  // Metadata
  notes?: string
  tags?: string[]
  importance: ImportanceLevel

  // Timestamps
  createdAt: string
  createdBy: string
  updatedAt?: string
  lastUpdatedBy?: string

  // UI State
  isExpanded?: boolean  // For accordion/tree view
}

/**
 * DeliverableLink - External resource link
 *
 * Links to documents, repos, or other resources related to the deliverable
 */
export interface DeliverableLink {
  id: string
  provider: "google-drive" | "onedrive" | "url" | "github" | "dropbox"
  title: string
  url: string
  lastChecked?: string
  iconOverride?: string
}

/**
 * DeliverableReview - Review record for quality control
 *
 * Tracks when deliverables are reviewed by PIs, collaborators, etc.
 */
export interface DeliverableReview {
  id: string
  reviewerId: string  // PersonProfile ID of reviewer
  reviewerName?: string  // Cached for display
  reviewedAt: string
  summary?: string
  notes?: string
  approved: boolean
  changes?: string  // Suggested changes or feedback
}

/**
 * DeliverableMetric - Quantifiable metric for tracking
 *
 * Examples:
 * - "Samples collected": "150/200"
 * - "Pages written": "12/25"
 * - "Code coverage": "87%"
 */
export interface DeliverableMetric {
  id: string
  label: string
  value: string
  unit?: string
  target?: string  // Target value for completion
}

/**
 * DeliverableTemplate - Reusable deliverable blueprint
 *
 * For common deliverable types that labs create repeatedly
 * (e.g., "Quarterly Report", "Ethics Application", "Paper Draft")
 */
export interface DeliverableTemplate {
  id: string
  name: string
  description?: string
  defaultDuration: number  // Days
  defaultImportance: ImportanceLevel

  // Pre-defined checklists
  suggestedProjectTasks?: string[]  // Task names
  suggestedMetrics?: Omit<DeliverableMetric, 'id' | 'value'>[]
  suggestedTags?: string[]

  // Metadata
  category?: string  // "Publication", "Grant", "Experiment", etc.
  labId?: string  // Lab-specific template
  createdBy: string
  createdAt: string
}
