// ============================================================================
// GDPR COMPLIANCE & DATA PROTECTION TYPES
// ============================================================================

/**
 * LawfulBasis - GDPR Article 6 lawful basis for processing
 */
export type LawfulBasis =
  | "consent"           // Article 6.1.a - User gave explicit consent
  | "contract"          // Article 6.1.b - Processing necessary for contract
  | "legal_obligation"  // Article 6.1.c - Required by law
  | "vital_interests"   // Article 6.1.d - Protect vital interests
  | "public_task"       // Article 6.1.e - Public interest task
  | "legitimate_interest" // Article 6.1.f - Legitimate interest

/**
 * UserConsent - GDPR consent tracking for cookies and data processing
 * Implements ePrivacy Directive requirements
 */
export interface UserConsent {
  id: string
  userId: string
  labId?: string

  // Consent types
  functionalCookies: boolean    // Required for app to function
  analyticsCookies: boolean     // Firebase Analytics, performance monitoring

  // GDPR lawful basis documentation
  dataProcessingConsent: boolean // General data processing consent
  specialCategoryDataAcknowledged: boolean // User acknowledged special category data usage in ELN

  // Metadata
  consentGivenAt: string        // ISO date when consent was given
  consentUpdatedAt?: string     // ISO date of last update
  ipAddress?: string            // IP where consent was given (for audit)
  userAgent?: string            // Browser/device info
  consentVersion: string        // Version of privacy policy accepted (e.g., "1.0", "2.0")
}

/**
 * PrivacySettings - User privacy preferences and data control
 * Implements GDPR Article 18 (Right to Restrict Processing)
 */
export interface PrivacySettings {
  id: string
  userId: string

  // Analytics & Tracking
  analyticsEnabled: boolean            // Firebase Analytics opt-in
  performanceMonitoringEnabled: boolean // Performance tracking opt-in

  // Profile Visibility
  profileVisibleInDirectory: boolean   // Show in lab directory
  emailVisibleToLabMembers: boolean    // Show email to lab members
  phoneVisibleToLabMembers: boolean    // Show phone to lab members
  officeLocationVisible: boolean       // Show office location

  // Notifications
  emailNotificationsEnabled: boolean   // Email notifications opt-in
  projectAssignmentNotifications: boolean
  orderNotifications: boolean
  fundingAlertNotifications: boolean

  // Auto-assignment
  autoAssignToProjects: boolean        // Auto-assign to new projects

  // Metadata
  createdAt: string
  updatedAt?: string
}

/**
 * DataExportRequest - GDPR Article 15 (Right of Access) & Article 20 (Data Portability)
 * Tracks user requests to export their personal data
 */
export interface DataExportRequest {
  id: string
  userId: string
  userEmail: string

  // Request details
  requestedAt: string            // ISO date
  status: "pending" | "processing" | "completed" | "failed"

  // Export data
  exportFormat: "json" | "csv" | "zip" // ZIP includes JSON + uploaded files
  downloadUrl?: string           // Temporary signed URL for download
  downloadExpiresAt?: string     // When download link expires

  // Data included
  includesProfile: boolean
  includesProjects: boolean
  includesTasks: boolean
  includesOrders: boolean
  includesELNData: boolean
  includesUploadedFiles: boolean
  includesAuditLogs: boolean

  // Processing info
  processedAt?: string
  errorMessage?: string
  fileSizeBytes?: number

  // Audit
  ipAddress?: string
  userAgent?: string
}

/**
 * AccountDeletionRequest - GDPR Article 17 (Right to Erasure)
 * Tracks user requests to delete their account and personal data
 * NOTE: Deletion is complete and non-reversible per specification
 */
export interface AccountDeletionRequest {
  id: string
  userId: string
  userEmail: string
  userName: string

  // Request details
  requestedAt: string
  status: "pending" | "processing" | "completed" | "failed"

  // Deletion options
  deleteAllData: boolean              // Complete deletion vs anonymization
  reason?: string                      // Optional reason for deletion

  // Processing info
  processedAt?: string
  deletedBy?: string                   // Admin who approved deletion
  errorMessage?: string

  // Retention for legal compliance
  retainForCompliance: boolean         // Keep minimal audit trail for legal requirements
  retentionExpiresAt?: string          // When audit trail should be deleted

  // Audit
  ipAddress?: string
  userAgent?: string
}

/**
 * DataRetentionPolicy - Defines how long different data types are retained
 */
export interface DataRetentionPolicy {
  id: string
  dataType: string                  // e.g., "audit_logs", "deleted_users", "experiments"
  retentionPeriodDays: number       // How many days to retain
  autoDeleteEnabled: boolean        // Whether auto-deletion is enabled
  lawfulBasis: LawfulBasis          // Legal basis for retention period
  notes?: string                    // Explanation for retention period
  createdAt: string
  updatedAt?: string
}
