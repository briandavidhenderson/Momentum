// ============================================================================
// ORGANIZATIONAL HIERARCHY TYPES
// ============================================================================

/**
 * Organisation - Top-level entity (e.g., University, Research Institute)
 * Represents the highest level in the organizational hierarchy
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
 * Institute - Mid-level entity (e.g., Department, School, Faculty)
 * Belongs to an Organisation, contains Labs
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
 * Lab - Research group/laboratory
 * Belongs to an Institute, contains People and Projects
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
  principalInvestigators: string[]  // Array of PersonProfile IDs who are PIs
  labManagerIds: string[]           // Array of PersonProfile IDs who are lab managers

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
  startDate?: Date           // Funding start date
  endDate?: Date             // Funding end date

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
