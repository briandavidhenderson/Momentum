/**
 * ORCID Type Definitions
 * Types for storing and managing detailed ORCID record data
 */

/**
 * An employment or education affiliation from ORCID
 */
export interface OrcidAffiliation {
  type: "employment" | "education" | "invited-position" | "distinction" | "membership" | "service" | "qualification"
  organisation: string
  roleTitle?: string
  departmentName?: string
  city?: string
  region?: string
  country?: string
  startDate?: {
    year?: number
    month?: number
    day?: number
  }
  endDate?: {
    year?: number
    month?: number
    day?: number
  } | null
  url?: string
  putCode?: string
}

/**
 * A work/publication from ORCID
 */
export interface OrcidWorkSummary {
  putCode: string
  title: string
  subtitle?: string
  journal?: string
  year?: number
  month?: number
  day?: number
  type?: string // e.g., "journal-article", "conference-paper", "book"
  doi?: string
  url?: string
  externalIds?: {
    type: string // "doi", "pmid", "arxiv", etc.
    value: string
    url?: string
  }[]
  contributors?: string[]
}

/**
 * Full ORCID record with all fetched data
 */
export interface OrcidRecord {
  orcidId: string

  // Personal information
  givenNames: string
  familyName: string
  creditName?: string
  biography?: string

  // Research profile
  keywords?: string[]
  researcherUrls?: {
    name: string
    url: string
  }[]

  // Professional information
  employments?: OrcidAffiliation[]
  educations?: OrcidAffiliation[]
  qualifications?: OrcidAffiliation[]

  // Works/Publications
  works?: OrcidWorkSummary[]

  // Fundings (will be imported from orcidService.ts)
  fundings?: any[] // OrcidFundingEntry[] - avoiding circular dependency

  // Metadata
  raw?: any // Full JSON from ORCID API for debugging
  lastSyncedAt: string // ISO string
  syncedBy?: string // User ID who initiated sync
}

/**
 * Subset of ORCID data to display in profile UI
 * DEPRECATED: Use OrcidProfileData from lib/types/orcid.types.ts instead
 * This type is kept for backward compatibility but should not be used in new code.
 */
export interface OrcidProfileSummary {
  orcidId: string
  name: string
  biography?: string
  keywords?: string[]
  latestAffiliation?: string
  publicationCount?: number
  lastSynced?: string
}
