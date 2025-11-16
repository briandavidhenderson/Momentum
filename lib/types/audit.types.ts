// ============================================================================
// AUDIT TRAIL TYPES
// ============================================================================

/**
 * AuditTrail - Audit trail entry for compliance and change history
 * UPDATED: Extended for GDPR compliance with more entity types
 */
export interface AuditTrail {
  id: string
  entityType:
    | "project"
    | "workpackage"
    | "task"
    | "deliverable"
    | "event"
    | "order"
    | "funding_account"
    | "funding_allocation"
    | "funding_transaction"
    | "person_profile"
    | "lab"
    | "user"
    | "eln_experiment"
    | "data_export"
    | "account_deletion"
    | "consent_change"
    | "privacy_settings"
  entityId: string
  change: "create" | "update" | "delete" | "export" | "access" | "login" | "logout"
  before?: any
  after?: any
  authorId: string // User ID
  ipAddress?: string // IP address for security auditing
  userAgent?: string // Browser/device info
  metadata?: Record<string, any> // Additional context-specific data
  createdAt: Date
}
