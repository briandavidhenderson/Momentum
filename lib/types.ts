export interface Person {
  id: string
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

export interface PersonProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  position: string
  organisation: string
  institute: string
  lab: string
  reportsTo: string | null
  fundedBy: string[]
  startDate: string
  phone: string
  officeLocation: string
  researchInterests: string[]
  qualifications: string[]
  notes: string
  projects: ProfileProject[] // Projects this person is involved in (as PI or team member)
  principalInvestigatorProjects: string[] // Project IDs where this person is the PI
  userId?: string // Links to User account
  profileComplete?: boolean // Whether user has completed their profile setup (defaults to true for static profiles)
  isAdministrator?: boolean // Administrator can edit all profiles
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
  ownerId?: string
  description?: string
  metrics?: DeliverableMetric[]
  reviewHistory?: DeliverableReview[]
  documentLinks?: DeliverableLink[]
  blockers?: string[]
  notes?: string
  lastUpdatedAt?: string
}

export interface Subtask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  status: WorkStatus
  ownerId?: string
  helpers?: string[]
  notes?: string
  tags?: string[]
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
  primaryOwner?: string // Person ID
  helpers?: string[] // Array of Person IDs
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
  ownerId?: string // Person ID responsible for the WP
  regularProjects?: Project[] // Nested regular projects within a master project hierarchy
}

export interface Project {
  id: string
  name: string
  kind?: "master" | "regular"
  start: Date
  end: Date
  progress: number
  color: string
  importance: ImportanceLevel
  notes?: string
  isExpanded?: boolean
  principalInvestigatorId?: string // PersonProfile ID of the PI
  profileProjectId?: string // Link to ProfileProject if created from profile
  fundedBy?: string[] // Funding account IDs
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

export interface FundingAccount {
  id: string
  name: string
  accountNumber: string
}

export const FUNDING_ACCOUNTS: FundingAccount[] = [
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

export interface Order {
  id: string
  productName: string
  catNum: string
  status: OrderStatus
  orderedBy?: string // Person ID
  orderedDate?: Date
  receivedDate?: Date
  createdBy: string // Person ID
  createdDate: Date
  chargeToAccount?: string // FundingAccount ID
  category?: string // Category ID
  subcategory?: string // Subcategory name
  priceExVAT?: number
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
  personId: string
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
  ownerId?: string // Person ID
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

