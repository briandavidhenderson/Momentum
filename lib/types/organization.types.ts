// ============================================================================
// ORGANIZATIONAL HIERARCHY TYPES - FIXED STRUCTURE
// ============================================================================
// These represent the fixed 3-level organizational hierarchy set during onboarding.
// Field names remain unchanged for backward compatibility, but semantic meaning has evolved:
//
// HIERARCHY (Fixed at onboarding):
//   1. Organisation - University/Institution (unchanged)
//   2. Institute - Now represents School/Faculty (e.g., "School of Medicine")
//   3. Lab - Now represents Department (e.g., "Department of Histopathology")
//
// DYNAMIC GROUPS (can join/leave multiple):
//   4. ResearchGroup - Research collaboration groups (see researchgroup.types.ts)
//   5. WorkingLab - Physical laboratory spaces (see researchgroup.types.ts)
// ============================================================================

/**
 * Organisation - Top-level entity (e.g., University, Research Institute)
 * Represents the highest level in the organizational hierarchy
 * Examples: "Trinity College Dublin", "University of Cambridge", "Max Planck Institute"
 */
export interface Organisation {
  id: string
  name: string
  abbreviation?: string
  country: string
  type?: "university" | "research-institute" | "hospital" | "company" | "government" | "other"
  website?: string
  logoUrl?: string
  createdAt: string
  createdBy: string
  memberCount?: number  // Cached count of all members
  instituteCount?: number  // Cached count of institutes
}

/**
 * Institute - Mid-level entity representing School or Faculty
 *
 * SEMANTIC CHANGE: This now represents "School/Faculty" in the UI
 * (e.g., "School of Medicine", "Faculty of Engineering", "School of Biological Sciences")
 *
 * Belongs to an Organisation, contains Labs (which now represent Departments)
 * Field names remain "institute*" for backward compatibility
 */
export interface Institute {
  id: string
  name: string
  organisationId: string
  organisationName: string  // Cached for display
  department?: string
  building?: string
  address?: string
  website?: string
  headOfInstituteId?: string  // PersonProfile ID of department head
  createdAt: string
  createdBy: string
  memberCount?: number  // Cached count of all members
  labCount?: number  // Cached count of labs
}

/**
 * Lab - Represents an academic Department
 *
 * SEMANTIC CHANGE: This now represents "Department" in the UI
 * (e.g., "Department of Histopathology", "Department of Physics", "Department of Computer Science")
 *
 * Belongs to an Institute (School/Faculty), contains People and Projects
 * Field names remain "lab*" for backward compatibility
 *
 * NOTE: For physical laboratory spaces, see WorkingLab in researchgroup.types.ts
 */
export interface Lab {
  id: string
  name: string
  description?: string

  // Hierarchy
  instituteId: string
  instituteName: string       // Cached
  organisationId: string
  organisationName: string    // Cached

  // Leadership
  principalInvestigators: string[]  // Array of PersonProfile IDs who are PIs in this Department
  labManagerIds: string[]           // Array of PersonProfile IDs who manage this Department (e.g., Department Manager, Administrator)

  // Details
  researchAreas?: string[]
  website?: string
  location?: string  // Building/room number
  contactEmail?: string

  // Statistics
  memberCount?: number  // Cached count
  activeProjectCount?: number  // Cached count

  // Metadata
  createdAt: string
  createdBy: string
  updatedAt?: string

  // Custom Fields
  customFieldDefinitions?: {
    sample?: import('./customFields.types').CustomFieldDefinition[]
    protocol?: import('./customFields.types').CustomFieldDefinition[]
    experiment?: import('./customFields.types').CustomFieldDefinition[]
  }
}

/**
 * Funder - Funding body/organization
 * Can fund multiple master projects across different labs
 * Updated to support P0-1: Funder Creation Flow requirements
 */
export interface Funder {
  id: string
  name: string // Required
  type: "public" | "private" | "charity" | "internal" | "government" | "industry" | "eu" | "other"

  // Grant/Programme details
  programme?: string          // Programme or Call name
  reference?: string          // Reference or Grant Number

  // Financial details
  currency?: string           // ISO currency code (e.g., "GBP", "USD", "EUR")


  // Additional metadata
  abbreviation?: string
  country?: string
  website?: string
  logoUrl?: string
  contactInfo?: string
  notes?: string

  // Audit fields
  createdAt: string
  createdBy: string          // User ID who created this funder
  updatedAt?: string
  organisationId?: string    // Optional: link to organisation if internal
}
