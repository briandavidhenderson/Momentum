// ============================================================================
// ORCID DATA TYPES
// ============================================================================

/**
 * ORCID Employment Entry
 * Represents a position held at an organization
 */
export interface OrcidEmployment {
  organization: string
  role?: string
  department?: string
  startDate?: string  // ISO date or partial date
  endDate?: string    // ISO date or partial date (null if current)
  location?: string
}

/**
 * ORCID Education Entry
 * Represents an educational qualification
 */
export interface OrcidEducation {
  organization: string
  degree?: string
  field?: string
  startDate?: string
  endDate?: string
  location?: string
}

/**
 * ORCID Work/Publication Entry
 * Represents a research output
 */
export interface OrcidWork {
  title: string
  type?: string  // e.g., "journal-article", "conference-paper", "book-chapter"
  publicationDate?: string
  journal?: string
  doi?: string
  url?: string
  contributors?: string[]
}

/**
 * ORCID Funding Entry
 * Represents a funding award
 */
export interface OrcidFunding {
  title: string
  organization: string
  type?: string
  startDate?: string
  endDate?: string
  amount?: string
  grantNumber?: string
  url?: string
}

/**
 * Complete ORCID Profile Data
 * Stores rich academic profile information from ORCID
 */
export interface OrcidProfileData {
  name?: string
  email?: string | null
  biography?: string
  employment?: OrcidEmployment[]
  education?: OrcidEducation[]
  works?: OrcidWork[]
  funding?: OrcidFunding[]
}
