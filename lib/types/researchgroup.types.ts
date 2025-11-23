// ============================================================================
// RESEARCH GROUP AND WORKING LAB TYPES
// ============================================================================
// These represent the dynamic, optional organizational memberships that users
// can join and leave. Unlike Department (fixed), these are flexible groupings.
// ============================================================================

/**
 * ResearchGroup - Dynamic research collaboration group
 * Sub-entity of Department, can contain multiple WorkingLabs
 * Users can belong to multiple research groups simultaneously
 *
 * Hierarchy:
 * Organisation → School/Faculty (Institute) → Department (Lab) → ResearchGroup → WorkingLab
 */
export interface ResearchGroup {
  id: string
  name: string
  description?: string

  // Hierarchy (links to fixed organizational structure)
  departmentId: string          // Links to Lab collection (which now represents Department)
  departmentName: string        // Cached for display
  schoolFacultyId: string       // Links to Institute collection (which now represents School/Faculty)
  schoolFacultyName: string     // Cached for display
  organisationId: string
  organisationName: string      // Cached for display

  // Leadership
  principalInvestigators: string[]  // Array of PersonProfile IDs who lead this group
  coordinatorIds: string[]          // Array of PersonProfile IDs who coordinate the group

  // Members (cached for quick access)
  memberIds: string[]               // Array of PersonProfile IDs in this group
  memberCount: number               // Cached count
  adminIds: string[]                // Users who can approve join requests
  pendingMemberIds: string[]        // Users who have requested to join

  // Research details
  researchAreas?: string[]
  keywords?: string[]
  activeProjects?: string[]         // Array of MasterProject IDs

  // Contact & Web presence
  website?: string
  contactEmail?: string

  // Physical locations (this group may span multiple labs)
  workingLabIds?: string[]          // Array of WorkingLab IDs associated with this group

  // Settings
  isPublic?: boolean                // Whether group is visible to all in organization
  allowSelfJoin?: boolean           // Whether users can join without approval

  // Statistics
  activeProjectCount?: number       // Cached count
  publicationCount?: number         // Optional: track publications

  // Metadata
  createdAt: string
  createdBy: string                 // PersonProfile ID
  updatedAt?: string
  updatedBy?: string
}

export interface ResearchGroupMembershipStatus {
  isAdmin: boolean
  isMember: boolean
  isPending: boolean
}

/**
 * WorkingLab - Physical laboratory space
 * Sub-entity of ResearchGroup, represents actual physical locations
 * Users can be members of multiple working labs
 *
 * Example: "Lab 2.20", "Lab 3.15"
 */
export interface WorkingLab {
  id: string
  name: string                      // e.g., "Lab 2.20", "Main Lab", "Wet Lab A"
  description?: string

  // Hierarchy
  researchGroupId: string           // Primary research group that owns/uses this lab
  researchGroupName: string         // Cached for display
  departmentId: string              // Links to Department (Lab collection)
  departmentName: string            // Cached

  // Physical location
  building?: string                 // Building name/number
  floor?: string                    // Floor number
  roomNumber?: string               // Room/suite number
  address?: string                  // Full address if needed

  // Access & Management
  labManagerIds: string[]           // Array of PersonProfile IDs who manage this space
  accessControlled?: boolean        // Whether access is restricted

  // Members (cached)
  memberIds?: string[]              // Array of PersonProfile IDs who work in this lab
  memberCount?: number              // Cached count

  // Facilities & Equipment
  facilities?: string[]             // e.g., ["Fume Hood", "Cold Room", "Microscopy"]
  safetyLevel?: "BSL-1" | "BSL-2" | "BSL-3" | "BSL-4" | "other"  // Biosafety level
  capacity?: number                 // Max number of people

  // Availability
  isActive?: boolean                // Whether lab is currently operational
  bookingRequired?: boolean         // Whether space requires booking

  // Contact
  contactEmail?: string
  emergencyContact?: string

  // Metadata
  createdAt: string
  createdBy: string                 // PersonProfile ID
  updatedAt?: string
  updatedBy?: string
}

/**
 * ResearchGroupMembership - Junction table for tracking membership details
 * Optional: Use this if you need to track role, join date, etc.
 * Otherwise, simply store memberIds array in ResearchGroup
 */
export interface ResearchGroupMembership {
  id: string
  researchGroupId: string
  personProfileId: string

  // Membership details
  role?: "member" | "coordinator" | "pi" | "collaborator"
  joinedAt: string
  leftAt?: string                   // If they've left the group
  isActive: boolean

  // Contributions (optional tracking)
  contributionLevel?: "high" | "medium" | "low"
  projectsContributed?: string[]    // Array of MasterProject IDs

  // Metadata
  addedBy: string                   // PersonProfile ID who added them
  notes?: string
}

/**
 * WorkingLabMembership - Junction table for tracking lab access
 * Optional: Use this if you need to track access dates, permissions, etc.
 */
export interface WorkingLabMembership {
  id: string
  workingLabId: string
  personProfileId: string

  // Access details
  hasKeyAccess?: boolean
  accessLevel?: "full" | "supervised" | "visitor"
  grantedAt: string
  expiresAt?: string
  revokedAt?: string
  isActive: boolean

  // Safety & Training
  safetyTrainingCompleted?: boolean
  safetyTrainingDate?: string
  inductionCompleted?: boolean
  inductionBy?: string              // PersonProfile ID who did induction

  // Metadata
  grantedBy: string                 // PersonProfile ID who granted access
  notes?: string
}
