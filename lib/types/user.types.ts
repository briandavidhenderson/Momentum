// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

/**
 * UserRole - Enhanced RBAC for data protection and funding control
 * Roles determine access to sensitive data and funding information
 */
export enum UserRole {
  PI = "pi",                              // Principal Investigator - full lab oversight
  RESEARCHER = "researcher",               // Standard researcher - standard access
  ASSISTANT = "assistant",                 // Lab Assistant - limited orders/inventory
  EXTERNAL_COLLABORATOR = "external_collaborator", // External - restricted read-only
  FINANCE_ADMIN = "finance_admin",         // Finance Admin - funding oversight (PI/Lab Owner)
  LAB_MANAGER = "lab_manager",             // Lab Manager - operational management
  ADMIN = "admin"                          // System Administrator - full system access
}

/**
 * Display names for user roles
 */
export const USER_ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.PI]: "Principal Investigator",
  [UserRole.RESEARCHER]: "Researcher",
  [UserRole.ASSISTANT]: "Lab Assistant",
  [UserRole.EXTERNAL_COLLABORATOR]: "External Collaborator",
  [UserRole.FINANCE_ADMIN]: "Finance Administrator",
  [UserRole.LAB_MANAGER]: "Lab Manager",
  [UserRole.ADMIN]: "System Administrator"
}

/**
 * User account interface
 */
export interface User {
  id: string
  email: string
  fullName: string
  passwordHash: string // In production, this should be hashed server-side
  profileId: string | null // Links to PersonProfile
  createdAt: string
  isAdministrator?: boolean // Administrator can edit all profiles
  lastLoginAt?: string
  oauthProviders?: Array<"google" | "microsoft"> // For calendar integrations

  // GDPR & RBAC (NEW)
  userRole?: UserRole                  // Enhanced role-based access control
  consentId?: string                   // Link to UserConsent record
  privacySettingsId?: string           // Link to PrivacySettings record
  dataRegion?: "eu" | "us" | "other"   // Data residency for Schrems II compliance
  gdprCompliant?: boolean              // Whether user has completed GDPR consent flow
}

/**
 * Lab role definition
 */
export interface LabRole {
  id: string
  name: string
  shortName?: string
  description?: string
  defaultColor?: string
  defaultPermissions?: string[]
}
