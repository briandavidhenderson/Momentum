// ============================================================================
// PROFILE TYPES
// ============================================================================

import type { ProjectRole } from './common.types'
import type { UserRole } from './user.types'
import type { OrcidProfileData } from './orcid.types'
import type { ProfileProject } from './project.types'

/**
 * Position levels in academic/research hierarchy
 * Ordered from entry-level to senior positions
 */
export enum PositionLevel {
  // Research Staff
  RESEARCH_INTERN = "research_intern",
  RESEARCH_ASSISTANT = "research_assistant",
  RESEARCH_ASSOCIATE = "research_associate",
  LAB_TECHNICIAN = "lab_technician",
  SENIOR_LAB_TECHNICIAN = "senior_lab_technician",

  // Students
  UNDERGRADUATE_STUDENT = "undergraduate_student",
  MASTERS_STUDENT = "masters_student",
  PHD_STUDENT = "phd_student",
  PHD_CANDIDATE = "phd_candidate",

  // Postdoctoral
  POSTDOC_RESEARCH_ASSOCIATE = "postdoc_research_associate",
  POSTDOC_RESEARCH_FELLOW = "postdoc_research_fellow",
  SENIOR_POSTDOC_RESEARCHER = "senior_postdoc_researcher",

  // Academic Faculty
  RESEARCH_FELLOW = "research_fellow",
  SENIOR_RESEARCH_FELLOW = "senior_research_fellow",
  ASSISTANT_PROFESSOR = "assistant_professor",  // or Lecturer
  ASSOCIATE_PROFESSOR = "associate_professor",  // or Senior Lecturer
  PROFESSOR = "professor",                      // or Reader
  HEAD_OF_DEPARTMENT = "head_of_department",    // or Chair

  // Other
  VISITING_RESEARCHER = "visiting_researcher",
  EXTERNAL_COLLABORATOR = "external_collaborator",
  LAB_MANAGER = "lab_manager",
  ADMINISTRATIVE_STAFF = "administrative_staff"
}

/**
 * Display names for position levels
 */
export const POSITION_DISPLAY_NAMES: Record<PositionLevel, string> = {
  [PositionLevel.RESEARCH_INTERN]: "Research Intern",
  [PositionLevel.RESEARCH_ASSISTANT]: "Research Assistant",
  [PositionLevel.RESEARCH_ASSOCIATE]: "Research Associate",
  [PositionLevel.LAB_TECHNICIAN]: "Lab Technician",
  [PositionLevel.SENIOR_LAB_TECHNICIAN]: "Senior Lab Technician",

  [PositionLevel.UNDERGRADUATE_STUDENT]: "Undergraduate Student",
  [PositionLevel.MASTERS_STUDENT]: "Master's Student",
  [PositionLevel.PHD_STUDENT]: "PhD Student",
  [PositionLevel.PHD_CANDIDATE]: "PhD Candidate",

  [PositionLevel.POSTDOC_RESEARCH_ASSOCIATE]: "Postdoctoral Research Associate",
  [PositionLevel.POSTDOC_RESEARCH_FELLOW]: "Postdoctoral Research Fellow",
  [PositionLevel.SENIOR_POSTDOC_RESEARCHER]: "Senior Postdoctoral Researcher",

  [PositionLevel.RESEARCH_FELLOW]: "Research Fellow",
  [PositionLevel.SENIOR_RESEARCH_FELLOW]: "Senior Research Fellow",
  [PositionLevel.ASSISTANT_PROFESSOR]: "Assistant Professor / Lecturer",
  [PositionLevel.ASSOCIATE_PROFESSOR]: "Associate Professor / Senior Lecturer",
  [PositionLevel.PROFESSOR]: "Professor / Reader",
  [PositionLevel.HEAD_OF_DEPARTMENT]: "Head of Department / Chair",

  [PositionLevel.VISITING_RESEARCHER]: "Visiting Researcher",
  [PositionLevel.EXTERNAL_COLLABORATOR]: "Collaborator (External)",
  [PositionLevel.LAB_MANAGER]: "Lab Manager",
  [PositionLevel.ADMINISTRATIVE_STAFF]: "Administrative Staff"
}

/**
 * Position hierarchy in order (for dropdowns and sorting)
 */
export const POSITION_HIERARCHY_ORDER: PositionLevel[] = [
  PositionLevel.RESEARCH_INTERN,
  PositionLevel.RESEARCH_ASSISTANT,
  PositionLevel.RESEARCH_ASSOCIATE,
  PositionLevel.LAB_TECHNICIAN,
  PositionLevel.SENIOR_LAB_TECHNICIAN,
  PositionLevel.UNDERGRADUATE_STUDENT,
  PositionLevel.MASTERS_STUDENT,
  PositionLevel.PHD_STUDENT,
  PositionLevel.PHD_CANDIDATE,
  PositionLevel.POSTDOC_RESEARCH_ASSOCIATE,
  PositionLevel.POSTDOC_RESEARCH_FELLOW,
  PositionLevel.SENIOR_POSTDOC_RESEARCHER,
  PositionLevel.RESEARCH_FELLOW,
  PositionLevel.SENIOR_RESEARCH_FELLOW,
  PositionLevel.ASSISTANT_PROFESSOR,
  PositionLevel.ASSOCIATE_PROFESSOR,
  PositionLevel.PROFESSOR,
  PositionLevel.HEAD_OF_DEPARTMENT,
  PositionLevel.VISITING_RESEARCHER,
  PositionLevel.EXTERNAL_COLLABORATOR,
  PositionLevel.LAB_MANAGER,
  PositionLevel.ADMINISTRATIVE_STAFF
]

/**
 * Position categories for grouped display
 */
export const POSITION_CATEGORIES = {
  "Research Staff": [
    PositionLevel.RESEARCH_INTERN,
    PositionLevel.RESEARCH_ASSISTANT,
    PositionLevel.RESEARCH_ASSOCIATE,
    PositionLevel.LAB_TECHNICIAN,
    PositionLevel.SENIOR_LAB_TECHNICIAN,
  ],
  "Students": [
    PositionLevel.UNDERGRADUATE_STUDENT,
    PositionLevel.MASTERS_STUDENT,
    PositionLevel.PHD_STUDENT,
    PositionLevel.PHD_CANDIDATE,
  ],
  "Postdoctoral": [
    PositionLevel.POSTDOC_RESEARCH_ASSOCIATE,
    PositionLevel.POSTDOC_RESEARCH_FELLOW,
    PositionLevel.SENIOR_POSTDOC_RESEARCHER,
  ],
  "Academic Faculty": [
    PositionLevel.RESEARCH_FELLOW,
    PositionLevel.SENIOR_RESEARCH_FELLOW,
    PositionLevel.ASSISTANT_PROFESSOR,
    PositionLevel.ASSOCIATE_PROFESSOR,
    PositionLevel.PROFESSOR,
    PositionLevel.HEAD_OF_DEPARTMENT,
  ],
  "Other": [
    PositionLevel.VISITING_RESEARCHER,
    PositionLevel.EXTERNAL_COLLABORATOR,
    PositionLevel.LAB_MANAGER,
    PositionLevel.ADMINISTRATIVE_STAFF,
  ]
}

/**
 * Person - UI-only display format
 *
 * This is a simplified representation of PersonProfile used for UI components.
 * All ID fields in Task, Project, Event, etc. that reference "Person ID" actually
 * store PersonProfile IDs. Use personProfileToPerson() helper to convert.
 *
 * @see PersonProfile - The actual data model stored in Firestore
 * @see lib/personHelpers.ts - Helper functions for conversion
 */
export interface Person {
  id: string // PersonProfile ID (references PersonProfile.id)
  name: string
  color: string
  avatarUrl?: string
  roleId?: string
  role?: string // Display role/position name
}

/**
 * PersonProfile - Complete profile for a research team member
 *
 * ORGANIZATIONAL HIERARCHY (5 levels):
 * - Fixed (set at onboarding): Organisation → School/Faculty → Department
 * - Dynamic (can join multiple): Research Groups → Working Labs
 *
 * UPDATED: Now uses organizational hierarchy with IDs + dynamic group memberships
 */
export interface PersonProfile {
  id: string

  // Basic Information
  firstName: string
  lastName: string
  displayName: string // ✅ NEW: Full name for display
  email: string
  phone: string
  officeLocation: string
  avatarUrl?: string              // Profile photo URL from Firebase Storage

  // Organizational Hierarchy - FIXED (set during onboarding, immutable)
  // NOTE: Field names remain the same but semantic meaning has changed:
  // - instituteId now represents School/Faculty
  // - labId now represents Department
  organisationId: string      // ✅ Link to organisation (unchanged)
  organisationName: string    // Cached for display
  instituteId: string         // ✅ Link to School/Faculty (formerly institute)
  instituteName: string       // Cached for display (now shows School/Faculty name)
  labId: string               // ✅ Link to Department (formerly lab)
  labName: string             // Cached for display (now shows Department name)

  // Dynamic Organizational Memberships (NEW: Users can join/leave multiple groups)
  researchGroupIds: string[]  // ✅ NEW: Array of ResearchGroup IDs user belongs to
  workingLabIds: string[]     // ✅ NEW: Array of WorkingLab IDs (physical labs) user works in

  // Position & Hierarchy (UPDATED)
  positionLevel: PositionLevel  // ✅ NEW: Enum-based position
  positionDisplayName: string   // Cached display name
  position: string              // DEPRECATED: Keep for backward compatibility

  // Reporting Structure
  reportsToId: string | null  // PersonProfile ID of supervisor

  // PI Status (NEW)
  isPrincipalInvestigator: boolean  // ✅ NEW: Can be PI on projects

  // Project Membership (NEW)
  masterProjectIds: string[]        // ✅ NEW: Projects this person is on
  masterProjectRoles: {             // ✅ NEW: Role on each project
    [projectId: string]: ProjectRole
  }

  // Legacy fields (DEPRECATED - keep for backward compatibility)
  organisation: string  // Deprecated: use organisationName
  institute: string     // Deprecated: use instituteName
  lab: string           // Deprecated: use labName
  fundedBy: string[]    // Deprecated: funding now at project level
  reportsTo: string | null // Deprecated: use reportsToId
  projects: ProfileProject[] // Deprecated: use masterProjectIds
  principalInvestigatorProjects: string[] // Deprecated: use masterProjectRoles

  // Dates
  startDate: string

  // Research Profile
  researchInterests: string[]
  qualifications: string[]
  notes: string

  // ORCID Integration (NEW)
  orcidId?: string                    // ORCID iD in format "0000-0000-0000-0000"
  orcidUrl?: string                   // Full URL "https://orcid.org/0000-0000-0000-0000"
  orcidVerified?: boolean             // True once ORCID is linked via OAuth
  orcidSyncEnabled?: boolean          // Whether to keep profile in sync with ORCID
  orcidLastSynced?: string            // ISO date of last sync with ORCID record
  orcidData?: OrcidProfileData        // Full ORCID record data
  orcidClaims?: {
    name?: string | null              // Name from ORCID
    email?: string | null             // Email from ORCID
    bio?: string | null               // Biography from ORCID (if available in claims)
  }
  orcidBio?: string                   // Biography from ORCID Profile
  orcidWorks?: any[]                  // Array of works/publications from ORCID

  // Calendar Integration
  calendarConnections?: {
    google?: string                   // Google CalendarConnection document ID
    microsoft?: string                // Microsoft CalendarConnection document ID
  }
  calendarPreferences?: {
    defaultView?: "week" | "month" | "day"
    workingHours?: {
      start: string                   // e.g., "09:00"
      end: string                     // e.g., "17:00"
    }
    showExternalEvents?: boolean      // Show events from connected calendars
  }

  // Account
  userId?: string // Links to User account
  profileComplete?: boolean // Whether user has completed profile setup
  onboardingComplete?: boolean // ✅ NEW: Whether user completed new onboarding flow
  isAdministrator?: boolean // Administrator can edit all profiles

  // GDPR & Privacy (NEW)
  userRole?: UserRole                  // Role for RBAC and funding access
  consentGiven?: boolean               // GDPR consent status
  privacySettingsId?: string           // Link to PrivacySettings
  dataExportRequestIds?: string[]      // Historical data export requests
  lastConsentUpdate?: string           // When user last updated consent

  // Safety & Training (NEW)
  trainingRecordIds?: string[]         // IDs of TrainingRecords

  // Health & Wellbeing (NEW)
  healthProfileId?: string             // Link to HealthProfile


  // Metadata
  createdAt?: string
  updatedAt?: string
}
