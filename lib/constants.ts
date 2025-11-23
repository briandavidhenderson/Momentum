/**
 * Application-wide constants
 * Centralized constants to avoid magic strings and ensure type safety
 */

// ============================================================================
// TASK & PROJECT STATUS
// ============================================================================

export const WORK_STATUS = {
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  AT_RISK: "at-risk",
  BLOCKED: "blocked",
  DONE: "done",
} as const

export type WorkStatusType = typeof WORK_STATUS[keyof typeof WORK_STATUS]

export const PROJECT_STATUS = {
  PLANNING: "planning",
  ACTIVE: "active",
  COMPLETED: "completed",
  ON_HOLD: "on-hold",
} as const

export type ProjectStatusType = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]

export const WORKPACKAGE_STATUS = {
  PLANNING: "planning",
  ACTIVE: "active",
  AT_RISK: "at-risk",
  COMPLETED: "completed",
  ON_HOLD: "on-hold",
} as const

export type WorkpackageStatusType = typeof WORKPACKAGE_STATUS[keyof typeof WORKPACKAGE_STATUS]

// ============================================================================
// IMPORTANCE LEVELS
// ============================================================================

export const IMPORTANCE_LEVEL = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const

export type ImportanceLevelType = typeof IMPORTANCE_LEVEL[keyof typeof IMPORTANCE_LEVEL]

// ============================================================================
// PROJECT TYPES
// ============================================================================

export const PROJECT_KIND = {
  MASTER: "master",
  REGULAR: "regular",
} as const

export type ProjectKindType = typeof PROJECT_KIND[keyof typeof PROJECT_KIND]

// ============================================================================
// VISIBILITY LEVELS
// ============================================================================

export const PROJECT_VISIBILITY = {
  PRIVATE: "private",
  POSTDOCS: "postdocs",
  PI_RESEARCHERS: "pi-researchers",
  LAB: "lab",
  CUSTOM: "custom",
  ORGANISATION: "organisation",
  INSTITUTE: "institute",
} as const

export type ProjectVisibilityType = typeof PROJECT_VISIBILITY[keyof typeof PROJECT_VISIBILITY]

export const EVENT_VISIBILITY = {
  PRIVATE: "private",
  LAB: "lab",
  ORGANISATION: "organisation",
} as const

export type EventVisibilityType = typeof EVENT_VISIBILITY[keyof typeof EVENT_VISIBILITY]

// ============================================================================
// INVENTORY & ORDERS
// ============================================================================

export const ORDER_STATUS = {
  TO_ORDER: "to-order",
  ORDERED: "ordered",
  RECEIVED: "received",
} as const

export type OrderStatusType = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

export const INVENTORY_LEVEL = {
  EMPTY: "empty",
  LOW: "low",
  MEDIUM: "medium",
  FULL: "full",
} as const

export type InventoryLevelType = typeof INVENTORY_LEVEL[keyof typeof INVENTORY_LEVEL]

// ============================================================================
// DAY-TO-DAY TASK STATUS
// ============================================================================

export const DAY_TO_DAY_STATUS = {
  TODO: "todo",
  WORKING: "working",
  DONE: "done",
} as const

export type DayToDayStatusType = typeof DAY_TO_DAY_STATUS[keyof typeof DAY_TO_DAY_STATUS]

// ============================================================================
// TASK TYPES
// ============================================================================

export const TASK_TYPE = {
  EXPERIMENT: "experiment",
  WRITING: "writing",
  MEETING: "meeting",
  ANALYSIS: "analysis",
} as const

export type TaskTypeType = typeof TASK_TYPE[keyof typeof TASK_TYPE]

// ============================================================================
// EVENT TYPES
// ============================================================================

export const EVENT_TYPE = {
  MEETING: "meeting",
  DEADLINE: "deadline",
  MILESTONE: "milestone",
  TRAINING: "training",
  OTHER: "other",
} as const

export type EventTypeType = typeof EVENT_TYPE[keyof typeof EVENT_TYPE]

// ============================================================================
// RECURRENCE FREQUENCY
// ============================================================================

export const RECURRENCE_FREQUENCY = {
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
  CUSTOM: "custom",
} as const

export type RecurrenceFrequencyType = typeof RECURRENCE_FREQUENCY[keyof typeof RECURRENCE_FREQUENCY]

// ============================================================================
// REMINDER METHODS
// ============================================================================

export const REMINDER_METHOD = {
  EMAIL: "email",
  PUSH: "push",
  SMS: "sms",
} as const

export type ReminderMethodType = typeof REMINDER_METHOD[keyof typeof REMINDER_METHOD]

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export const AUDIT_ENTITY_TYPE = {
  PROJECT: "project",
  WORKPACKAGE: "workpackage",
  TASK: "task",
  DELIVERABLE: "deliverable",
  EVENT: "event",
} as const

export type AuditEntityTypeType = typeof AUDIT_ENTITY_TYPE[keyof typeof AUDIT_ENTITY_TYPE]

export const AUDIT_CHANGE_TYPE = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const

export type AuditChangeTypeType = typeof AUDIT_CHANGE_TYPE[keyof typeof AUDIT_CHANGE_TYPE]

// ============================================================================
// OAUTH PROVIDERS
// ============================================================================

export const OAUTH_PROVIDER = {
  GOOGLE: "google",
  MICROSOFT: "microsoft",
} as const

export type OAuthProviderType = typeof OAUTH_PROVIDER[keyof typeof OAUTH_PROVIDER]

// ============================================================================
// DELIVERABLE LINK PROVIDERS
// ============================================================================

export const DELIVERABLE_LINK_PROVIDER = {
  GOOGLE_DRIVE: "google-drive",
  ONEDRIVE: "onedrive",
  URL: "url",
} as const

export type DeliverableLinkProviderType = typeof DELIVERABLE_LINK_PROVIDER[keyof typeof DELIVERABLE_LINK_PROVIDER]

// ============================================================================
// ATTENDEE RESPONSE STATUS
// ============================================================================

export const ATTENDEE_RESPONSE = {
  ACCEPTED: "accepted",
  DECLINED: "declined",
  TENTATIVE: "tentative",
  NONE: "none",
} as const

export type AttendeeResponseType = typeof ATTENDEE_RESPONSE[keyof typeof ATTENDEE_RESPONSE]

// ============================================================================
// PROJECT HEALTH
// ============================================================================

export const PROJECT_HEALTH = {
  GOOD: "good",
  WARNING: "warning",
  RISK: "risk",
} as const

export type ProjectHealthType = typeof PROJECT_HEALTH[keyof typeof PROJECT_HEALTH]

// ============================================================================
// FIRESTORE COLLECTIONS
// ============================================================================

export const COLLECTIONS = {
  USERS: "users",
  PERSON_PROFILES: "personProfiles",
  PROJECTS: "projects",
  MASTER_PROJECTS: "masterProjects",
  WORKPACKAGES: "workpackages",
  TASKS: "tasks",
  SUBTASKS: "subtasks",
  DELIVERABLES: "deliverables",
  EVENTS: "events",
  AUDIT_TRAILS: "auditTrails",
  ORGANISATIONS: "organisations",
  INSTITUTES: "institutes",
  LABS: "labs",
  FUNDERS: "funders",
  ACCOUNTS: "accounts",
  ORDERS: "orders",
  INVENTORY: "inventory",
  EQUIPMENT: "equipment",
  LAB_POLLS: "labPolls",
  ELN_EXPERIMENTS: "elnExperiments",
  DAY_TO_DAY_TASKS: "dayToDayTasks",

  // GDPR Compliance Collections
  USER_CONSENTS: "userConsents",
  PRIVACY_SETTINGS: "privacySettings",
  DATA_EXPORT_REQUESTS: "dataExportRequests",
  ACCOUNT_DELETION_REQUESTS: "accountDeletionRequests",
  SPECIAL_CATEGORY_DATA_MARKERS: "specialCategoryDataMarkers",
  AI_GENERATED_CONTENT: "aiGeneratedContent",
  DATA_RETENTION_POLICIES: "dataRetentionPolicies",

  // Enhanced Funding System Collections
  FUNDING_ALLOCATIONS: "fundingAllocations",
  FUNDING_TRANSACTIONS: "fundingTransactions",
} as const

export type CollectionType = typeof COLLECTIONS[keyof typeof COLLECTIONS]

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  PROJECTS_PAGE_SIZE: 50,
  TASKS_PAGE_SIZE: 100,
  PEOPLE_PAGE_SIZE: 50,
  INVENTORY_PAGE_SIZE: 100,
} as const

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const VALIDATION_LIMITS = {
  PROJECT_NAME_MIN: 1,
  PROJECT_NAME_MAX: 200,
  TASK_NAME_MIN: 1,
  TASK_NAME_MAX: 200,
  PERSON_NAME_MIN: 1,
  PERSON_NAME_MAX: 100,
  EMAIL_MAX: 254,
  DESCRIPTION_MAX: 5000,
  NOTES_MAX: 10000,
  PHONE_MAX: 50,
  URL_MAX: 2048,
  PROGRESS_MIN: 0,
  PROGRESS_MAX: 100,
  PRICE_MIN: 0,
  PRICE_MAX: 999999999,
} as const

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  MAX_RECENT_ITEMS: 10,
} as const

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_DATE: "Please enter a valid date",
  DATE_RANGE_INVALID: "End date must be after start date",
  NETWORK_ERROR: "Network error. Please check your connection.",
  PERMISSION_DENIED: "You don't have permission to perform this action",
  NOT_FOUND: "The requested item was not found",
  ALREADY_EXISTS: "An item with this name already exists",
  GENERIC_ERROR: "An error occurred. Please try again.",
} as const

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  PROJECT_CREATED: "Project created successfully",
  PROJECT_UPDATED: "Project updated successfully",
  PROJECT_DELETED: "Project deleted successfully",
  TASK_CREATED: "Task created successfully",
  TASK_UPDATED: "Task updated successfully",
  TASK_DELETED: "Task deleted successfully",
  PERSON_CREATED: "Person profile created successfully",
  PERSON_UPDATED: "Person profile updated successfully",
  PERSON_DELETED: "Person profile deleted successfully",
  EVENT_CREATED: "Event created successfully",
  EVENT_UPDATED: "Event updated successfully",
  EVENT_DELETED: "Event deleted successfully",
  EQUIPMENT_CREATED: "Equipment created successfully",
  EQUIPMENT_UPDATED: "Equipment updated successfully",
  INVENTORY_UPDATED: "Inventory updated successfully",
  ORDER_CREATED: "Order created successfully",
  CHANGES_SAVED: "Changes saved successfully",
} as const

// ============================================================================
// CURRENCY & FINANCIAL CONSTANTS (GDPR Compliance & Funding System)
// ============================================================================

/**
 * Default currency for the application
 * As per specification: EUR should be default across the whole application
 */
export const DEFAULT_CURRENCY = "EUR" as const

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = ["EUR", "GBP", "USD", "CHF"] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

/**
 * Currency display names
 */
export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EUR: "Euro (€)",
  GBP: "British Pound (£)",
  USD: "US Dollar ($)",
  CHF: "Swiss Franc (CHF)",
}

/**
 * Currency symbols
 */
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  CHF: "CHF",
}

// ============================================================================
// GDPR & DATA PROTECTION CONSTANTS
// ============================================================================

/**
 * Current privacy policy version
 * Increment when privacy policy is updated - users will need to re-consent
 */
export const PRIVACY_POLICY_VERSION = "1.0" as const

/**
 * Data retention periods in days
 * As per GDPR and research standards
 */
export const DATA_RETENTION_PERIODS = {
  AUDIT_LOGS: 365,              // 12 months for GDPR compliance
  DELETED_USER_AUDIT: 365,       // 12 months minimal audit trail after deletion
  EXPERIMENT_LOGS: 2555,         // 7 years for research standards
  PROJECT_METADATA: 730,         // 24 months
  CONSENT_RECORDS: 2555,         // 7 years to demonstrate compliance
  DATA_EXPORT_DOWNLOADS: 7,      // Download links expire after 7 days
  ACCOUNT_DELETION_REQUESTS: 2555, // 7 years for legal compliance
} as const

/**
 * GDPR Article references for documentation
 */
export const GDPR_ARTICLES = {
  LAWFUL_BASIS: "Article 6",
  SPECIAL_CATEGORY_DATA: "Article 9",
  RIGHT_OF_ACCESS: "Article 15",
  RIGHT_TO_RECTIFICATION: "Article 16",
  RIGHT_TO_ERASURE: "Article 17",
  RIGHT_TO_RESTRICTION: "Article 18",
  RIGHT_TO_DATA_PORTABILITY: "Article 20",
  RIGHT_TO_OBJECT: "Article 21",
  SECURITY_OF_PROCESSING: "Article 32",
} as const

/**
 * Data residency regions
 * All data must be stored in EU regions for Schrems II compliance
 */
export const DATA_REGIONS = {
  EU_IRELAND: "europe-west1",
  EU_BELGIUM: "europe-west1",
  EU_FINLAND: "europe-north1",
} as const

/**
 * Default data region
 */
export const DEFAULT_DATA_REGION = DATA_REGIONS.EU_IRELAND

// ============================================================================
// FUNDING SYSTEM CONSTANTS
// ============================================================================

/**
 * Low balance warning thresholds (percentages)
 */
export const FUNDING_WARNING_THRESHOLDS = {
  CRITICAL: 90, // 90% spent
  HIGH: 80,     // 80% spent
  MEDIUM: 70,   // 70% spent
  LOW: 50,      // 50% spent
} as const

/**
 * Budget forecast periods (days)
 */
export const BUDGET_FORECAST_PERIODS = {
  SHORT_TERM: 30,   // 1 month
  MEDIUM_TERM: 90,  // 3 months
  LONG_TERM: 180,   // 6 months
} as const

/**
 * Minimum allocation amount (in base currency)
 */
export const MIN_ALLOCATION_AMOUNT = 0.01

/**
 * Maximum transaction description length
 */
export const MAX_TRANSACTION_DESCRIPTION_LENGTH = 500

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as SupportedCurrency] || currency
}

/**
 * Get currency display name
 */
export function getCurrencyName(currency: string): string {
  return CURRENCY_NAMES[currency as SupportedCurrency] || currency
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount.toFixed(2)}`
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
}

/**
 * Get retention period for a data type
 */
export function getRetentionPeriod(dataType: keyof typeof DATA_RETENTION_PERIODS): number {
  return DATA_RETENTION_PERIODS[dataType]
}

/**
 * Calculate expiry date based on retention period
 */
export function calculateExpiryDate(
  createdAt: Date | string,
  retentionPeriodDays: number
): Date {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  const expiry = new Date(created)
  expiry.setDate(expiry.getDate() + retentionPeriodDays)
  return expiry
}

/**
 * Check if data should be deleted based on retention policy
 */
export function shouldDeleteData(
  createdAt: Date | string,
  retentionPeriodDays: number
): boolean {
  const expiryDate = calculateExpiryDate(createdAt, retentionPeriodDays)
  return new Date() > expiryDate
}

/**
 * Get low balance warning level
 */
export function getLowBalanceWarningLevel(
  percentageSpent: number
): "critical" | "high" | "medium" | "low" | "normal" {
  if (percentageSpent >= FUNDING_WARNING_THRESHOLDS.CRITICAL) return "critical"
  if (percentageSpent >= FUNDING_WARNING_THRESHOLDS.HIGH) return "high"
  if (percentageSpent >= FUNDING_WARNING_THRESHOLDS.MEDIUM) return "medium"
  if (percentageSpent >= FUNDING_WARNING_THRESHOLDS.LOW) return "low"
  return "normal"
}
