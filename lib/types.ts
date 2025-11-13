// ============================================================================
// ORGANIZATIONAL HIERARCHY TYPES (NEW)
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

/**
 * FundingAccount - Specific account/grant from a funder
 * Linked to a specific master project
 * Multiple accounts can exist per project (e.g., equipment, consumables, travel)
 */
export interface FundingAccount {
  id: string
  accountNumber: string
  accountName: string

  // Linking
  funderId: string              // Link to funder
  funderName: string            // Cached
  masterProjectId: string       // Link to master project
  masterProjectName: string     // Cached

  // Account Type (NEW)
  accountType?: "main" | "equipment" | "consumables" | "travel" | "personnel" | "other"

  // Financial
  totalBudget?: number
  spentAmount?: number  // Cached from orders
  committedAmount?: number  // From pending orders
  remainingBudget?: number  // Calculated: total - spent - committed
  currency: string  // e.g., "GBP", "USD", "EUR"

  // Dates
  startDate: string
  endDate: string

  // Status
  status: "active" | "closed" | "suspended" | "pending"

  // Metadata
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
}

// ============================================================================
// POSITION HIERARCHY (NEW)
// ============================================================================

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
 * Project role - role within a specific master project
 */
export type ProjectRole = "PI" | "Co-PI" | "Postdoc" | "PhD" | "RA" | "Collaborator" | "Support"

// ============================================================================
// EXISTING TYPES (PRESERVED)
// ============================================================================

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
}

export interface LabRole {
  id: string
  name: string
  shortName?: string
  description?: string
  defaultColor?: string
  defaultPermissions?: string[]
}

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
}

export type ProjectVisibility =
  | "private" // Only you
  | "postdocs" // You and your postdocs
  | "pi-researchers" // PIs and researchers
  | "lab" // All in your lab
  | "custom" // Specific people (stored in visibleTo array)
  | "organisation"
  | "institute"

/**
 * ProfileProject - DEPRECATED
 * Legacy type kept for backward compatibility
 * Use MasterProject instead for new code
 */
export interface ProfileProject {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  grantName?: string
  grantNumber?: string
  fundedBy: string[] // Funding account IDs
  budget?: number
  status: "planning" | "active" | "completed" | "on-hold"
  notes?: string
  visibility: ProjectVisibility
  visibleTo?: string[] // Array of PersonProfile IDs (for "custom" visibility)
  principalInvestigatorId?: string
  tags?: string[]
}

/**
 * MasterProject - Major research grant/program
 * Replaces ProfileProject with proper organizational structure
 * Contains work packages, which contain tasks
 */
export interface MasterProject {
  isExpanded?: boolean;
  id: string
  name: string
  description?: string

  // Organizational Links
  labId: string
  labName: string               // Cached
  instituteId: string
  instituteName: string         // Cached
  organisationId: string
  organisationName: string      // Cached

  // Grant Information
  grantName?: string
  grantNumber?: string
  grantReference?: string  // Funder's reference number

  // Financial
  totalBudget?: number
  spentAmount?: number  // Cached from orders
  committedAmount?: number  // From pending orders
  remainingBudget?: number  // Calculated
  currency: string  // e.g., "GBP", "USD", "EUR"

  // Dates
  startDate: string
  endDate: string

  // Funding (UPDATED: Support multiple accounts)
  funderId: string              // Primary funder
  funderName: string            // Cached
  accountIds: string[]          // Multiple accounts per project

  // Team
  principalInvestigatorIds: string[]  // Array of PI PersonProfile IDs
  coPIIds: string[]                   // Array of Co-PI PersonProfile IDs
  teamMemberIds: string[]             // Array of all team member PersonProfile IDs
  teamRoles: {                        // Role for each team member
    [personProfileId: string]: ProjectRole
  }

  // Structure
  workpackageIds: string[]      // Work packages in this project

  // Status & Progress
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"
  progress: number              // 0-100

  // Visibility & Access
  visibility: "private" | "lab" | "institute" | "organisation"
  visibleTo?: string[]  // Additional PersonProfile IDs for custom access

  // Categorization
  researchArea?: string
  tags?: string[]

  // Metadata
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

/**
 * PersonProfile - Complete profile for a lab member
 * UPDATED: Now uses organizational hierarchy with IDs
 */
export interface PersonProfile {
  id: string

  // Basic Information
  firstName: string
  lastName: string
  email: string
  phone: string
  officeLocation: string

  // Organizational Hierarchy (NEW: Use IDs instead of names)
  organisationId: string      // ✅ NEW: Link to organisation
  organisationName: string    // Cached for display
  instituteId: string         // ✅ NEW: Link to institute
  instituteName: string       // Cached for display
  labId: string               // ✅ NEW: Link to lab
  labName: string             // Cached for display

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
  orcidLastSynced?: string            // ISO date of last sync with ORCID record
  orcidClaims?: {                     // Snapshot from OIDC/userinfo (non-sensitive)
    name?: string
    email?: string | null             // May be null if user hides email
  }

  // Calendar Integration (NEW)
  calendarConnections?: {
    google?: string                   // CalendarConnection document ID
    microsoft?: string                // CalendarConnection document ID
  }
  calendarPreferences?: {
    defaultView?: 'day' | 'week' | 'month'
    workingHours?: {
      start: string                   // e.g., "09:00"
      end: string                     // e.g., "17:00"
    }
    showWeekends?: boolean
    defaultCalendar?: string          // Which calendar to create events in
  }

  // Account
  userId?: string // Links to User account
  profileComplete?: boolean // Whether user has completed profile setup
  onboardingComplete?: boolean // ✅ NEW: Whether user completed new onboarding flow
  isAdministrator?: boolean // Administrator can edit all profiles

  // Metadata
  createdAt?: string
  updatedAt?: string
}

export type WorkStatus = "not-started" | "in-progress" | "at-risk" | "blocked" | "done"

export interface DeliverableLink {
  id: string
  provider: "google-drive" | "onedrive" | "url"
  title: string
  targetUrl: string
  lastChecked?: string
  iconOverride?: string
}

export interface DeliverableReview {
  id: string
  reviewerId: string
  reviewedAt: string
  summary?: string
  notes?: string
}

export interface DeliverableMetric {
  id: string
  label: string
  value: string
  unit?: string
}

export interface Deliverable {
  id: string
  name: string
  progress: number
  status?: WorkStatus
  dueDate?: string
  ownerId?: string // PersonProfile ID (not Person ID)
  description?: string
  metrics?: DeliverableMetric[]
  reviewHistory?: DeliverableReview[]
  documentLinks?: DeliverableLink[]
  blockers?: string[]
  notes?: string
  lastUpdatedAt?: string
}

// Todo item for subtasks
export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  completedBy?: string  // PersonProfile ID who completed it
  order: number  // For sorting
}

export interface Subtask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number  // Auto-calculated from todos if present
  status: WorkStatus
  ownerId?: string // PersonProfile ID (not Person ID)
  helpers?: string[] // Array of PersonProfile IDs (not Person IDs)
  notes?: string
  tags?: string[]
  todos?: Todo[]  // NEW: List of todos for this subtask
  deliverables?: Deliverable[]
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
  isExpanded?: boolean
  dependencies?: string[]
}

export interface Task {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  primaryOwner?: string // PersonProfile ID (not Person ID)
  helpers?: string[] // Array of PersonProfile IDs (not Person IDs)
  workpackageId: string // Changed from projectId - tasks belong to workpackages
  importance: ImportanceLevel
  notes?: string
  deliverables: Deliverable[]
  isExpanded?: boolean
  // extended fields
  type?: "experiment" | "writing" | "meeting" | "analysis"
  dependencies?: string[] // task IDs this task depends on
  tags?: string[]
  status?: WorkStatus
  subtasks?: Subtask[]
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
}

export type ImportanceLevel = "low" | "medium" | "high" | "critical"

// A workpackage is a major work unit within a master project
export interface Workpackage {
  id: string
  name: string
  profileProjectId: string // Links to ProfileProject (master project)
  start: Date
  end: Date
  progress: number
  importance: ImportanceLevel
  notes?: string
  tasks: Task[] // Tasks within this workpackage
  isExpanded?: boolean
  // extended fields
  status?: "planning" | "active" | "atRisk" | "completed" | "onHold"
  colorHex?: string
  ownerId?: string // PersonProfile ID (not Person ID) // PersonProfile ID responsible for the WP (not Person ID)
  regularProjects?: Project[] // Nested regular projects within a master project hierarchy
}

export interface Project {
  id: string
  name: string

  // P0-2: Unified Project Model - explicit type distinction
  kind?: "master" | "regular"  // Legacy field, keep for backward compatibility
  projectType?: "MASTER" | "REGULAR"  // New explicit field for P0-2 implementation

  // P0-1: Funder link (required for Master projects)
  funderId?: string  // Funder ID - required if projectType === "MASTER"
  fundedBy?: string[] // Legacy: Funding account IDs (deprecated in favor of funderId)

  start: Date
  end: Date
  progress: number
  color: string
  importance: ImportanceLevel
  notes?: string
  isExpanded?: boolean
  principalInvestigatorId?: string // PersonProfile ID of the PI (not Person ID)
  profileProjectId?: string // Link to ProfileProject if created from profile

  // Note: tasks removed - they now belong to workpackages for master projects
  tasks?: Task[] // Only for backward compatibility with non-master projects

  // extended fields
  totalBudget?: number
  health?: "good" | "warning" | "risk"
  status?: WorkStatus
  tags?: string[]
  workpackages?: Workpackage[]
  defaultTemplates?: {
    workPackages?: string[]
    tasks?: string[]
    subtasks?: string[]
  }
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
}

export type OrderStatus = "to-order" | "ordered" | "received"

export type InventoryLevel = "empty" | "low" | "medium" | "full"

/**
 * Legacy funding account reference (DEPRECATED)
 * For backward compatibility with old code that expects simple structure
 * New code should use FundingAccount interface defined at top of file
 */
export interface LegacyFundingAccountReference {
  id: string
  name: string
  accountNumber: string
}

/**
 * DEPRECATED: Legacy funding accounts list
 * This is kept for backward compatibility only
 * New code should query FundingAccount collection from Firestore
 */
export const FUNDING_ACCOUNTS: LegacyFundingAccountReference[] = [
  { id: "club", name: "CLuB", accountNumber: "1735578" },
  { id: "bcr", name: "BCR", accountNumber: "4627784" },
  { id: "deans", name: "Deans", accountNumber: "74738383" },
  { id: "account4", name: "Account_4", accountNumber: "4838949" },
]

export interface Category {
  id: string
  name: string
  emoji: string
  subcategories: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: "general-consumables",
    name: "General Consumables",
    emoji: "🧪",
    subcategories: [
      "Tubes (microcentrifuge, Falcon, PCR, cryovials)",
      "Pipette tips & filter tips",
      "Serological pipettes",
      "Petri dishes & plates (6-, 12-, 24-, 96-well, etc.)",
      "Reservoirs & troughs",
      "Gloves, masks, lab coats",
      "Parafilm, foil, sealing films",
      "Weigh boats, spatulas, funnels",
      "Labels, markers, tape",
    ],
  },
  {
    id: "reagents-chemicals",
    name: "Reagents & Chemicals",
    emoji: "⚗️",
    subcategories: [
      "Buffers & salts",
      "Detergents & surfactants",
      "Enzymes & substrates",
      "Reducing agents & inhibitors",
      "Stains & dyes",
      "Antibodies & aptamers",
      "Standards & calibrants",
      "Solvents (ethanol, methanol, acetone, DMSO, etc.)",
      "Media supplements (FBS, antibiotics, amino acids)",
      "Cryoprotectants & preservatives",
    ],
  },
  {
    id: "cell-culture",
    name: "Cell Culture",
    emoji: "🧫",
    subcategories: [
      "Culture media (DMEM, RPMI, etc.)",
      "Serum & supplements (FBS, glutamine, insulin, etc.)",
      "Trypsin, EDTA, PBS",
      "Culture flasks, dishes, plates",
      "Filter units, bottle tops",
      "Cell scrapers, spreaders",
      "Cryogenic storage boxes & vials",
      "CO₂ incubator accessories (trays, sensors, gaskets)",
    ],
  },
  {
    id: "molecular-biology",
    name: "Molecular Biology",
    emoji: "🔬",
    subcategories: [
      "Nucleic acid extraction kits",
      "PCR reagents & master mixes",
      "Primers, oligos, aptamer libraries",
      "Restriction enzymes & ligases",
      "Plasmid prep kits",
      "Electrophoresis reagents (agarose, loading dye, ladders)",
      "DNA/RNA ladders",
      "cDNA synthesis & RT kits",
      "Gel imaging consumables",
    ],
  },
  {
    id: "protein-biochemistry",
    name: "Protein Biochemistry",
    emoji: "💧",
    subcategories: [
      "Protein purification columns & resins (Ni-NTA, ion exchange, SEC)",
      "Chromatography buffers",
      "SDS-PAGE gels & reagents",
      "Western blot membranes & antibodies",
      "Blocking buffers, detection reagents",
      "Protease/phosphatase inhibitors",
      "BCA/Bradford assay kits",
      "Dialysis tubing",
      "Concentrators & spin filters",
    ],
  },
  {
    id: "microfluidics-analytical",
    name: "Microfluidics & Analytical Systems",
    emoji: "🧲",
    subcategories: [
      "Microfluidic chips & cartridges",
      "Syringe pumps & tubing",
      "Connectors, fittings, ferrules",
      "Microvalves & manifolds",
      "PDMS, SU-8, photoresist materials",
      "Cleanroom consumables (wafers, masks, gloves)",
      "Optical components (filters, mirrors, lenses)",
      "Calibration fluids & standards",
    ],
  },
  {
    id: "cell-analysis-flow",
    name: "Cell Analysis & Flow Cytometry",
    emoji: "🧍‍♂️",
    subcategories: [
      "Flow cytometry tubes & filters",
      "Antibody panels & fluorochromes",
      "Fixation & permeabilization buffers",
      "Compensation beads",
      "Cytometer cleaning fluids",
      "Microscope slides & coverslips",
      "Fluorescent dyes (DAPI, FITC, etc.)",
    ],
  },
  {
    id: "equipment-instruments",
    name: "Equipment & Instruments",
    emoji: "🔧",
    subcategories: [
      "Micropipettes & dispensers",
      "Centrifuges & rotors",
      "pH meters, balances",
      "Vortexers, mixers, shakers",
      "Thermal cyclers, electrophoresis units",
      "Water baths, heating blocks",
      "Spectrophotometers, plate readers",
      "Microscopes (brightfield, fluorescence)",
      "Pumps, valves, regulators",
    ],
  },
  {
    id: "storage-safety",
    name: "Storage & Safety",
    emoji: "🌡️",
    subcategories: [
      "Cryogenic storage (LN₂, -80 °C, -20 °C freezers)",
      "Refrigerator consumables (racks, boxes)",
      "Spill kits, absorbents",
      "Chemical storage cabinets",
      "Waste containers (biohazard, chemical, sharps)",
      "Fire extinguishers, first aid kits",
    ],
  },
  {
    id: "administrative-misc",
    name: "Administrative / Miscellaneous",
    emoji: "🧾",
    subcategories: [
      "Inventory barcodes & tracking labels",
      "Calibration & maintenance logs",
      "Cleaning agents (ethanol, Virkon, etc.)",
      "Disposable wipes & swabs",
      "Shipping containers (dry ice boxes, specimen mailers)",
      "Training & safety documentation",
    ],
  },
]

/**
 * Order - Supply order for lab consumables/equipment
 * UPDATED: Account linking is now REQUIRED and includes project/funder info
 */
export interface Order {
  id: string
  productName: string
  catNum: string
  supplier: string

  // Linking (UPDATED: Account is now REQUIRED)
  accountId: string               // ✅ REQUIRED: Link to funding account
  accountName: string             // Cached
  funderId: string                // ✅ Cached from account
  funderName: string              // Cached
  masterProjectId: string         // ✅ Cached from account
  masterProjectName: string       // Cached

  // Optional linking to specific work
  taskId?: string                 // If ordered for specific task
  workpackageId?: string          // If ordered for specific work package

  // Provenance fields (for traceability)
  sourceDeviceId?: string         // Device this order originated from
  sourceSupplyId?: string         // Supply this order originated from
  sourceInventoryItemId?: string  // Inventory item this order originated from

  // Status
  status: OrderStatus
  orderedBy: string               // PersonProfile ID
  orderedDate?: Date
  receivedDate?: Date
  expectedDeliveryDate?: Date

  // Financial
  priceExVAT: number
  vatAmount?: number
  totalPrice?: number
  currency: string
  invoiceNumber?: string
  poNumber?: string  // Purchase order number

  // Categorization
  category?: string               // Category ID
  subcategory?: string            // Subcategory name

  // Metadata
  notes?: string
  createdBy: string               // PersonProfile ID
  createdDate: Date
  updatedAt?: Date

  // Legacy field (DEPRECATED)
  chargeToAccount?: string // Deprecated: use accountId
  labId?: string // Added labId to fix build error
}

export interface InventoryItem {
  id: string
  productName: string
  catNum: string
  inventoryLevel: InventoryLevel
  receivedDate: Date
  lastOrderedDate?: Date
  chargeToAccount?: string // FundingAccount ID
  notes?: string
  category?: string // Category ID
  subcategory?: string // Subcategory name
  priceExVAT?: number
  equipmentDeviceIds?: string[] // Array of equipment device IDs this item is assigned to
  burnRatePerWeek?: number // Consumption rate per week
  currentQuantity?: number // Current stock quantity
  minQuantity?: number // Minimum quantity threshold for reordering
}

// Equipment Management Types
export interface EquipmentSupply {
  id: string
  name: string
  price: number
  qty: number // Current quantity
  minQty: number // Minimum quantity for reordering
  burnPerWeek: number // Consumption rate per week
  inventoryItemId?: string // Link to inventory item if it exists
  chargeToAccountId?: string // Which account pays for this device's consumption
  chargeToProjectId?: string // Which master project this belongs to
}

export interface EquipmentSOP {
  id: string
  title: string
  content: string
  version: string // e.g., "1.0", "1.1", "2.0"
  authorId: string // User ID who created/updated this version
  createdAt: string // ISO date string
  updatedAt?: string // ISO date string
  history?: EquipmentSOPVersion[] // Previous versions
}

export interface EquipmentSOPVersion {
  version: string
  content: string
  authorId: string
  updatedAt: string // ISO date string
  changeNotes?: string
}

export interface EquipmentDevice {
  id: string
  name: string
  make: string
  model: string
  serialNumber?: string // Optional serial number
  imageUrl?: string // Optional image URL (uploaded file)
  type: string
  maintenanceDays: number // Days between maintenance
  lastMaintained: string // ISO date string
  threshold: number // Maintenance threshold percentage (0-100)
  supplies: EquipmentSupply[]
  sops?: EquipmentSOP[] // Standard Operating Procedures
  labId?: string // Associated lab ID
  createdAt: string
  updatedAt?: string
}

// Equipment Reordering Types
export interface ReorderSuggestion {
  inventoryItemId: string
  itemName: string
  catNum: string
  currentQty: number
  minQty: number
  totalBurnRate: number
  weeksTillEmpty: number
  suggestedOrderQty: number // 4 weeks supply
  priority: 'urgent' | 'high' | 'medium' | 'low'
  affectedEquipment: Array<{ id: string; name: string }>
  affectedProjects: Array<{ id: string; name: string }>
  estimatedCost: number
  chargeToAccounts: Array<{
    accountId: string
    accountName: string
    projectId: string
    projectName: string
    percentage: number
    amount: number
  }>
}

export enum EquipmentTaskType {
  MAINTENANCE = "equipment_maintenance",
  REORDER = "equipment_reorder",
  SUPPLY_CHECK = "equipment_supply_check",
  CALIBRATION = "equipment_calibration",
}

// Lab Poll Types
export interface LabPollOption {
  id: string
  text: string
}

export interface LabPollResponse {
  userId: string
  selectedOptionIds: string[] // Multiple options can be selected (for availability)
  respondedAt: string // ISO date string
}

export interface LabPoll {
  id: string
  question: string
  options: LabPollOption[]
  labId: string // Lab this poll is visible to
  createdBy: string // User ID who created the poll
  createdAt: string // ISO date string
  responses?: LabPollResponse[] // User responses to the poll
}

// Electronic Lab Notebook (ELN) Types
// ELN Item Types - unified multimodal input system
export type ELNItemType =
  | "image"
  | "photo"
  | "voice"
  | "note"
  | "document"
  | "data"
  | "video"

export interface ELNStickyNote {
  id: string
  text: string
  color: string // Hex color for the sticky note
  position: { x: number; y: number } // Position on image (percentage or pixels)
  createdAt: string // ISO date string
}

export interface ELNVoiceNote {
  id: string
  audioUrl: string // Data URL or blob URL
  duration: number // Duration in seconds
  createdAt: string // ISO date string
  transcript?: string // AI-generated transcript
}

// New unified multimodal item interface
export interface ELNItem {
  id: string
  type: ELNItemType
  title?: string
  description?: string

  // File data
  fileUrl?: string // Download URL from Firebase Storage
  storagePath?: string // Firebase Storage path for deletion
  fileName?: string
  fileType?: string // MIME type
  fileSize?: number

  // Metadata
  position?: { x: number; y: number } // For canvas positioning
  order: number // Display order

  // AI Extraction
  aiExtraction?: {
    status: "pending" | "processing" | "completed" | "failed"
    extractedText?: string
    structuredData?: Record<string, any>
    entities?: Array<{ type: string; value: string; confidence?: number }>
    summary?: string
    errorMessage?: string
  }

  // Voice-specific
  duration?: number
  transcript?: string

  // Image/Photo-specific
  stickyNotes?: ELNStickyNote[]

  // Timestamps
  createdAt: string
  updatedAt?: string
  createdBy?: string
}

export interface ELNPage {
  id: string
  title: string
  imageUrl: string // Data URL or blob URL of the image
  voiceNotes: ELNVoiceNote[]
  stickyNotes: ELNStickyNote[]
  createdAt: string // ISO date string
  updatedAt?: string // ISO date string
}

// New: Experiment Report
export interface ELNReport {
  id: string
  experimentId: string

  // Report content
  background?: string // AI-generated or user-written
  protocols?: string // Extracted protocols
  results?: string // Extracted results/findings
  conclusion?: string

  // Metadata
  generatedAt: string
  generatedBy?: string // "ai" or PersonProfile ID
  version: number

  // Source tracking
  sourceItemIds: string[] // Which items were used to generate this
}

/**
 * ELNExperiment - Electronic Lab Notebook experiment
 * UPDATED: Now supports multimodal canvas with items and AI report generation
 */
export interface ELNExperiment {
  id: string
  title: string
  description?: string

  // Project Linking (NEW)
  masterProjectId: string         // ✅ REQUIRED: Which project this experiment belongs to
  masterProjectName: string       // Cached
  workpackageId?: string          // Optional: specific work package
  taskId?: string                 // Optional: specific task

  // Organizational Context (for filtering)
  labId: string                   // Lab this experiment belongs to
  labName: string                 // Cached
  funderId?: string               // Cached from project
  funderName?: string             // Cached

  // Content - New multimodal system
  items: ELNItem[]                // Unified multimodal items (images, voice, docs, data, etc.)

  // Legacy support (for backward compatibility)
  pages: ELNPage[]

  // Reports
  reports?: ELNReport[]           // Generated experiment reports

  // Authorship
  createdBy: string // PersonProfile ID who created the experiment
  collaborators?: string[]  // Additional PersonProfile IDs

  // Metadata
  experimentNumber?: string  // e.g., "EXP-2025-001"
  tags?: string[]
  status?: "draft" | "in-progress" | "completed" | "archived"
  createdAt: string // ISO date string
  updatedAt?: string // ISO date string
}

// New: Calendar events for meetings, submissions, custom milestones
export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom"

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval?: number
  byWeekday?: string[]
  byMonthDay?: number[]
  endDate?: string
  occurrenceCount?: number
  customRRule?: string
}

export interface EventReminder {
  id: string
  offsetMinutes: number
  method: "email" | "push" | "sms"
}

export interface EventAttendee {
  personId: string // PersonProfile ID (not Person ID)
  role?: string
  response?: "accepted" | "declined" | "tentative" | "none"
  workloadImpactHours?: number
}

export type EventVisibility = "private" | "lab" | "organisation"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  linkUrl?: string
  start: Date
  end: Date
  recurrence?: RecurrenceRule
  attendees: EventAttendee[]
  reminders?: EventReminder[]
  tags?: string[]
  visibility: EventVisibility
  ownerId?: string // PersonProfile ID (not Person ID) // PersonProfile ID (not Person ID)
  relatedIds?: {
    masterProjectId?: string
    workpackageId?: string
    projectId?: string
    taskId?: string
    subtaskId?: string
    deliverableId?: string
  }
  type?: "meeting" | "deadline" | "milestone" | "training" | "other"
  notes?: string
  createdBy: string // User ID
  createdAt: Date
  updatedAt?: Date
  icsUrls?: {
    event?: string
    calendar?: string
  }
  integrationRefs?: {
    googleEventId?: string
    outlookEventId?: string
  }
  labId?: string

  // Calendar Integration Fields (NEW)
  calendarSource?: 'momentum' | 'google' | 'microsoft'  // Source of the event
  calendarId?: string           // Specific calendar within provider
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'error'  // Sync state
  lastSyncedAt?: string         // ISO timestamp of last sync
  syncError?: string            // Error message if sync failed
  isReadOnly?: boolean          // External events may be read-only
  externalUrl?: string          // Link to event in external calendar
}

// ============================================================================
// CALENDAR INTEGRATION TYPES (NEW)
// ============================================================================

/**
 * ConnectedCalendar - Individual calendar within a provider account
 */
export interface ConnectedCalendar {
  id: string                    // Calendar ID from provider
  name: string                  // Calendar name
  description?: string
  isPrimary: boolean            // Provider's primary calendar
  isSelected: boolean           // User chose to sync this calendar
  color?: string                // Calendar color for UI
  timeZone?: string             // Calendar timezone
  accessRole: 'owner' | 'writer' | 'reader'
}

/**
 * CalendarConnection - OAuth connection to external calendar provider
 */
export interface CalendarConnection {
  id: string                    // Firestore document ID
  userId: string                // Momentum user ID
  provider: 'google' | 'microsoft'
  providerAccountId: string     // email or unique ID from provider
  providerAccountName: string   // Display name (e.g., "john@example.com")

  // Connected calendars from this account
  calendars: ConnectedCalendar[]

  // Sync settings
  syncEnabled: boolean
  syncDirection: 'import' | 'export' | 'bidirectional'
  defaultCalendarId?: string    // Primary calendar for exports

  // Status & metadata
  status: 'active' | 'expired' | 'error'
  lastSyncedAt?: string
  syncError?: string

  // OAuth metadata (tokens stored server-side only)
  tokenExpiresAt?: string

  // Webhook/push notification IDs
  webhookChannelId?: string     // Google push channel
  webhookResourceId?: string    // Google resource ID
  webhookExpiration?: string    // Google channel expiration
  subscriptionId?: string       // Microsoft subscription
  subscriptionExpiration?: string // Microsoft subscription expiration
  syncToken?: string            // Google sync token for incremental sync
  deltaLink?: string            // Microsoft delta link for incremental sync

  createdAt: string
  updatedAt?: string
}

/**
 * SyncError - Individual sync error for a specific event
 */
export interface SyncError {
  eventId?: string
  eventTitle?: string
  error: string
  action: 'import' | 'export' | 'update' | 'delete'
}

/**
 * CalendarSyncLog - Audit trail of sync operations
 */
export interface CalendarSyncLog {
  id: string
  userId: string
  connectionId: string
  timestamp: string
  status: 'success' | 'partial' | 'failed'
  eventsImported: number
  eventsExported: number
  eventsUpdated: number
  eventsDeleted: number
  errors?: SyncError[]
  duration?: number             // Sync duration in ms
}

/**
 * CalendarConflict - Conflicting changes requiring user resolution
 */
export interface CalendarConflict {
  id: string
  eventId: string
  userId: string
  localVersion: Partial<CalendarEvent>
  remoteVersion: Partial<CalendarEvent>
  conflictFields: string[]      // Which fields differ
  detectedAt: string
  resolution?: 'local' | 'remote' | 'merge' | 'manual'
  resolvedAt?: string
  resolvedBy?: string           // User ID who resolved
}

// New: Audit trail entries for compliance and change history
export interface AuditTrail {
  id: string
  entityType: "project" | "workpackage" | "task" | "deliverable" | "event"
  entityId: string
  change: "create" | "update" | "delete"
  before?: any
  after?: any
  authorId: string // User ID
  createdAt: Date
}

