# System Redesign Plan - Multi-Tenant Research Lab Management

**Date:** 2025-11-04
**Status:** 🎯 **DESIGN PHASE**
**Scope:** Complete redesign of onboarding, project management, and multi-view system

---

## Executive Summary

This document outlines a comprehensive redesign of the Momentum lab management platform to support:

1. **Proper organizational hierarchy** (Organisation → Institute → Lab → Person)
2. **Position-based roles** (Research Intern → Head of Department)
3. **Project-centric management** with master projects, work packages, and tasks
4. **Multi-PI lab support** with separate and shared workstreams
5. **Funder-based accounting** with accounts linked to master projects
6. **Multi-view perspectives** (Lab view, Project view, Funder view)

---

## Current State Analysis

### ✅ What Works Well

1. **Real-time collaboration** - Firestore subscriptions work excellently
2. **Network visualization** - Shows organizational structure effectively
3. **Type safety** - Strong TypeScript typing throughout
4. **Equipment management** - Good structure for tracking devices and supplies
5. **ELN** - Electronic lab notebook works well
6. **Gantt chart** - Basic project visualization exists

### ❌ Critical Gaps

1. **Onboarding flow** - Lacks proper organizational hierarchy creation
2. **Position hierarchy** - Limited position options, not a proper hierarchy
3. **PI designation** - Not separate from position (should be project-specific)
4. **Master projects** - Not properly implemented (exists in types but not UI)
5. **Work packages** - Not properly linked to master projects
6. **Funder-account linking** - Accounts exist but not properly linked to projects
7. **Multi-view filtering** - No way to switch between Lab/Project/Funder views
8. **Multi-PI support** - Can't handle 2+ PIs in same physical lab
9. **Project-based permissions** - People don't join projects explicitly

---

## New System Architecture

### Hierarchy Structure

```
Organisation (e.g., "University of Cambridge")
    ├─ Institute (e.g., "Department of Biochemistry")
    │   ├─ Lab (e.g., "Smith Lab - Protein Engineering")
    │   │   ├─ Person (e.g., "Dr. John Smith" - PI)
    │   │   │   ├─ Master Project 1 ("CRUK Grant - Cancer Research")
    │   │   │   │   ├─ Funder: Cancer Research UK
    │   │   │   │   ├─ Account: CRUK-2024-001
    │   │   │   │   ├─ Team Members: [PostDoc 1, PhD 1, PhD 2]
    │   │   │   │   ├─ Work Package 1 ("Target Identification")
    │   │   │   │   │   ├─ Task 1.1 ("Protein expression")
    │   │   │   │   │   ├─ Task 1.2 ("Binding assays")
    │   │   │   │   ├─ Work Package 2 ("Validation")
    │   │   │   ├─ Master Project 2 ("Wellcome Grant - Drug Discovery")
    │   │   │   │   ├─ Funder: Wellcome Trust
    │   │   │   │   ├─ Account: WT-2023-042
    │   │   │   │   ├─ Team Members: [PostDoc 2, PhD 3]
    │   │   ├─ Person (e.g., "Dr. Jane Doe" - PI)
    │   │   │   ├─ Master Project 3 ("ERC Grant - Biosensors")
    │   │   │   │   ├─ Funder: European Research Council
    │   │   │   │   ├─ Account: ERC-2025-789
    │   │   ├─ Shared Lab Resources
    │   │   │   ├─ Equipment (shared by all lab members)
    │   │   │   ├─ Lab Polls (visible to all lab members)
    │   │   │   ├─ Lab Calendar Events
```

---

## Detailed Design

### 1. Onboarding Flow (New User Journey)

#### Step 1: Authentication
**Current:** Firebase Auth (email/password or Google)
**Status:** ✅ Keep as-is

#### Step 2: Organisation Selection/Creation
**Screen:** "Select Your Organisation"

```
Welcome to Momentum!

Let's get you set up. First, which organization are you part of?

┌──────────────────────────────────────────────┐
│ 🏛️  Select Organisation                      │
│                                              │
│ [Dropdown]                                   │
│ • University of Cambridge                    │
│ • University of Oxford                       │
│ • Imperial College London                    │
│ • ETH Zurich                                 │
│ • + Create New Organisation                  │
└──────────────────────────────────────────────┘

If your organisation isn't listed, click "Create New Organisation"
```

**Data stored:** Creates/links to `Organisation` document in Firestore

**New Firestore Collection:** `organisations`
```typescript
{
  id: "org_cambridge",
  name: "University of Cambridge",
  country: "UK",
  createdAt: "2025-01-04T10:00:00Z",
  createdBy: "user_123"
}
```

#### Step 3: Institute Selection/Creation
**Screen:** "Select Your Institute"

```
Which institute or department are you in?

Organisation: University of Cambridge

┌──────────────────────────────────────────────┐
│ 🏫  Select Institute                         │
│                                              │
│ [Dropdown - filtered by organisation]        │
│ • Department of Biochemistry                 │
│ • Department of Chemistry                    │
│ • Department of Engineering                  │
│ • + Create New Institute                     │
└──────────────────────────────────────────────┘
```

**Data stored:** Creates/links to `Institute` document

**New Firestore Collection:** `institutes`
```typescript
{
  id: "inst_biochem_cam",
  name: "Department of Biochemistry",
  organisationId: "org_cambridge",
  createdAt: "2025-01-04T10:00:00Z",
  createdBy: "user_123"
}
```

#### Step 4: Lab Selection/Creation
**Screen:** "Select Your Lab"

```
Which research lab or group are you in?

Organisation: University of Cambridge
Institute: Department of Biochemistry

┌──────────────────────────────────────────────┐
│ 🧪  Select Lab                               │
│                                              │
│ [Dropdown - filtered by institute]           │
│ • Smith Lab - Protein Engineering            │
│ • Jones Lab - Structural Biology             │
│ • Brown Lab - Enzymology                     │
│ • + Create New Lab                           │
└──────────────────────────────────────────────┘
```

**Data stored:** Creates/links to `Lab` document

**New Firestore Collection:** `labs`
```typescript
{
  id: "lab_smith_biochem",
  name: "Smith Lab - Protein Engineering",
  instituteId: "inst_biochem_cam",
  organisationId: "org_cambridge",
  principalInvestigators: ["profile_john_smith"], // Array of PI profile IDs
  createdAt: "2025-01-04T10:00:00Z",
  createdBy: "user_123"
}
```

#### Step 5: Personal Information
**Screen:** "About You"

```
Tell us about yourself

┌──────────────────────────────────────────────┐
│ First Name:  [___________________________]   │
│ Last Name:   [___________________________]   │
│ Email:       john.doe@cam.ac.uk (verified)   │
│ Phone:       [___________________________]   │
│ Office:      [___________________________]   │
└──────────────────────────────────────────────┘
```

#### Step 6: Position in Hierarchy
**Screen:** "Your Position"

```
What is your position in the lab?

┌──────────────────────────────────────────────┐
│ 👔  Select Position                          │
│                                              │
│ [Dropdown with full hierarchy]               │
│                                              │
│ Research Staff:                              │
│ • Research Intern                            │
│ • Research Assistant                         │
│ • Research Associate                         │
│ • Lab Technician                             │
│ • Senior Lab Technician                      │
│                                              │
│ Students:                                    │
│ • Undergraduate Student                      │
│ • Master's Student                           │
│ • PhD Student                                │
│ • PhD Candidate                              │
│                                              │
│ Postdoctoral:                                │
│ • Postdoctoral Research Associate            │
│ • Postdoctoral Research Fellow               │
│ • Senior Postdoctoral Researcher             │
│                                              │
│ Academic Faculty:                            │
│ • Research Fellow                            │
│ • Senior Research Fellow                     │
│ • Assistant Professor / Lecturer             │
│ • Associate Professor / Senior Lecturer      │
│ • Professor / Reader                         │
│ • Head of Department / Chair                 │
│                                              │
│ Other:                                       │
│ • Visiting Researcher                        │
│ • Collaborator (External)                    │
│ • Lab Manager                                │
│ • Administrative Staff                       │
└──────────────────────────────────────────────┘
```

**Data stored:** Position stored in PersonProfile

**New constant:** `POSITION_HIERARCHY` in types.ts

#### Step 7: Reporting Structure
**Screen:** "Who do you report to?"

```
Who is your direct supervisor?

┌──────────────────────────────────────────────┐
│ 👤  Select Supervisor                        │
│                                              │
│ [Dropdown - filtered by lab]                 │
│ • Dr. John Smith (Professor)                 │
│ • Dr. Sarah Johnson (Senior Postdoc)         │
│ • I don't have a supervisor (I'm a PI)       │
└──────────────────────────────────────────────┘

This helps create the lab hierarchy and supervision network.
```

#### Step 8: PI Status
**Screen:** "Are you a Principal Investigator?"

```
Principal Investigator Status

┌──────────────────────────────────────────────┐
│ Are you a PI on any research projects?       │
│                                              │
│ ⭕ Yes, I am a PI                            │
│ ⭕ No, I am not a PI                         │
│ ⭕ I am a Co-PI on some projects             │
└──────────────────────────────────────────────┘

Note: You can be a PI on some projects but not others.
This status can be changed later for each project.
```

**Data stored:** New field `isPrincipalInvestigator: boolean` in PersonProfile

#### Step 9: Join or Create Master Project
**Screen:** "Your Projects"

```
Master Projects

Master projects represent major research grants or programs.
Each project has its own team, budget, and funding source.

┌──────────────────────────────────────────────┐
│ 🎯  Join Existing Project                    │
│                                              │
│ Available projects in your lab:              │
│                                              │
│ ☐ CRUK Grant - Cancer Research              │
│   PI: Dr. John Smith                         │
│   Funder: Cancer Research UK                 │
│   Team: 5 members                            │
│                                              │
│ ☐ Wellcome Grant - Drug Discovery            │
│   PI: Dr. John Smith                         │
│   Funder: Wellcome Trust                     │
│   Team: 3 members                            │
│                                              │
│ [Select]                                     │
└──────────────────────────────────────────────┘

OR

┌──────────────────────────────────────────────┐
│ ➕  Create New Master Project                │
│                                              │
│ [Create Project]                             │
└──────────────────────────────────────────────┘

You can be added to projects later, or create your own.
```

#### Step 10: Create Master Project (if selected)
**Screen:** "Create Master Project"

```
New Master Project

┌──────────────────────────────────────────────┐
│ Project Name:                                │
│ [_________________________________________]  │
│                                              │
│ Description:                                 │
│ [_________________________________________]  │
│ [_________________________________________]  │
│                                              │
│ Grant Name:                                  │
│ [_________________________________________]  │
│                                              │
│ Grant Number:                                │
│ [_________________________________________]  │
│                                              │
│ Start Date:  [___________]                   │
│ End Date:    [___________]                   │
│                                              │
│ Total Budget:  £ [___________]               │
└──────────────────────────────────────────────┘

[Next: Select Funder]
```

#### Step 11: Link Funder and Account
**Screen:** "Project Funding"

```
Select Funder and Account

Project: CRUK Grant - Cancer Research

┌──────────────────────────────────────────────┐
│ 💰  Select Funder                            │
│                                              │
│ [Dropdown]                                   │
│ • Cancer Research UK (CRUK)                  │
│ • Wellcome Trust                             │
│ • European Research Council (ERC)            │
│ • Medical Research Council (MRC)             │
│ • + Add New Funder                           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🏦  Select Account                           │
│                                              │
│ [Dropdown - filtered by funder]              │
│ • CRUK-2024-001 (Account #1735578)           │
│ • CRUK-2024-042 (Account #1735722)           │
│ • + Add New Account                          │
└──────────────────────────────────────────────┘

Accounts are tied to master projects. All orders and
expenses for this project will be charged to this account.
```

**New Firestore Collections:**

`funders`
```typescript
{
  id: "funder_cruk",
  name: "Cancer Research UK",
  abbreviation: "CRUK",
  country: "UK",
  website: "https://www.cancerresearchuk.org"
}
```

`accounts`
```typescript
{
  id: "account_cruk_001",
  accountNumber: "1735578",
  accountName: "CRUK-2024-001",
  funderId: "funder_cruk",
  masterProjectId: "project_cancer_research",
  balance: 250000,
  currency: "GBP",
  startDate: "2024-01-01",
  endDate: "2026-12-31"
}
```

#### Step 12: Completion
**Screen:** "Setup Complete!"

```
✅  Profile Complete!

Welcome to Momentum, Dr. John Doe!

Your profile:
• Organisation: University of Cambridge
• Institute: Department of Biochemistry
• Lab: Smith Lab - Protein Engineering
• Position: Postdoctoral Research Associate
• Supervisor: Dr. John Smith
• Master Project: CRUK Grant - Cancer Research

[Go to Dashboard]
```

---

### 2. Updated Data Model

#### Modified: PersonProfile
```typescript
export interface PersonProfile {
  id: string
  // Basic Info
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

  // Position & Hierarchy
  position: PositionLevel     // ✅ MODIFIED: Use enum instead of string
  positionDisplayName: string // Cached display name
  reportsToId: string | null  // PersonProfile ID of supervisor

  // PI Status (NEW)
  isPrincipalInvestigator: boolean  // ✅ NEW: Can be PI on projects

  // Project Membership (MODIFIED)
  masterProjectIds: string[]        // ✅ NEW: Projects this person is on
  masterProjectRoles: {             // ✅ NEW: Role on each project
    [projectId: string]: "PI" | "Co-PI" | "Postdoc" | "PhD" | "RA" | "Collaborator"
  }

  // Legacy fields (keep for backward compatibility)
  organisation: string  // Deprecated: use organisationName
  institute: string     // Deprecated: use instituteName
  lab: string           // Deprecated: use labName
  fundedBy: string[]    // Deprecated: funding now at project level

  // Metadata
  userId?: string
  profileComplete?: boolean
  createdAt: string
  updatedAt?: string

  // Research Profile
  researchInterests: string[]
  qualifications: string[]
  notes: string
}
```

#### New: Organisation
```typescript
export interface Organisation {
  id: string
  name: string
  abbreviation?: string
  country: string
  website?: string
  logoUrl?: string
  createdAt: string
  createdBy: string
  memberCount?: number  // Cached count
}
```

#### New: Institute
```typescript
export interface Institute {
  id: string
  name: string
  organisationId: string
  organisationName: string  // Cached
  department?: string
  building?: string
  website?: string
  createdAt: string
  createdBy: string
  memberCount?: number  // Cached count
}
```

#### New: Lab
```typescript
export interface Lab {
  id: string
  name: string
  description?: string
  instituteId: string
  instituteName: string       // Cached
  organisationId: string
  organisationName: string    // Cached
  principalInvestigators: string[]  // Array of PersonProfile IDs who are PIs
  labManagerIds: string[]           // Array of PersonProfile IDs who are lab managers
  memberCount?: number              // Cached count
  website?: string
  location?: string
  createdAt: string
  createdBy: string
}
```

#### New: Funder
```typescript
export interface Funder {
  id: string
  name: string
  abbreviation?: string
  country: string
  type: "government" | "charity" | "industry" | "eu" | "other"
  website?: string
  logoUrl?: string
  createdAt: string
}
```

#### Modified: FundingAccount
```typescript
export interface FundingAccount {
  id: string
  accountNumber: string
  accountName: string
  funderId: string              // ✅ NEW: Link to funder
  funderName: string            // Cached
  masterProjectId: string       // ✅ NEW: Link to master project
  masterProjectName: string     // Cached
  balance?: number
  currency: string
  startDate: string
  endDate: string
  status: "active" | "closed" | "suspended"
  notes?: string
}
```

#### Modified: MasterProject (replaces ProfileProject)
```typescript
export interface MasterProject {
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

  // Grant Info
  grantName?: string
  grantNumber?: string
  totalBudget?: number
  currency: string

  // Dates
  startDate: string
  endDate: string

  // Funding
  funderId: string              // ✅ NEW: Link to funder
  funderName: string            // Cached
  accountIds: string[]          // ✅ NEW: Can have multiple accounts

  // Team
  principalInvestigatorIds: string[]  // Array of PersonProfile IDs
  coPIIds: string[]                   // Array of Co-PI PersonProfile IDs
  teamMemberIds: string[]             // Array of all team member PersonProfile IDs
  teamRoles: {                        // Role for each team member
    [personProfileId: string]: "PI" | "Co-PI" | "Postdoc" | "PhD" | "RA" | "Collaborator"
  }

  // Structure
  workpackageIds: string[]      // Work packages in this project

  // Status
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"
  progress: number              // 0-100

  // Visibility
  visibility: "private" | "lab" | "institute" | "organisation"

  // Metadata
  tags?: string[]
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
}
```

#### Modified: Workpackage
```typescript
export interface Workpackage {
  id: string
  name: string
  description?: string
  masterProjectId: string         // ✅ Link to master project
  masterProjectName: string       // Cached

  // Dates
  start: Date
  end: Date

  // Team
  leadId: string                  // PersonProfile ID responsible
  teamMemberIds: string[]         // PersonProfile IDs working on this WP

  // Progress
  progress: number                // 0-100
  status: "planning" | "active" | "at-risk" | "completed" | "on-hold"
  health?: "good" | "warning" | "at-risk"
  importance: ImportanceLevel

  // Tasks
  taskIds: string[]               // Tasks in this work package

  // Budget (optional)
  allocatedBudget?: number
  spentBudget?: number

  // Deliverables
  keyDeliverables?: string[]
  milestones?: {
    name: string
    date: string
    completed: boolean
  }[]

  // Metadata
  colorHex?: string
  notes?: string
  tags?: string[]
  createdAt: string
  createdBy: string
  updatedAt?: string
}
```

#### Modified: Task
```typescript
export interface Task {
  id: string
  name: string
  description?: string
  workpackageId: string           // ✅ Link to work package
  workpackageName: string         // Cached
  masterProjectId: string         // ✅ Cached for filtering

  // Dates
  start: Date
  end: Date

  // Team
  primaryOwnerId: string          // PersonProfile ID
  helperIds: string[]             // PersonProfile IDs

  // Progress
  progress: number                // 0-100
  status: WorkStatus
  importance: ImportanceLevel

  // Type
  type: "experiment" | "writing" | "meeting" | "analysis" | "other"

  // Dependencies
  dependencyIds: string[]         // Task IDs this depends on

  // Resources
  linkedOrderIds: string[]
  linkedInventoryItemIds: string[]
  linkedEquipmentIds: string[]

  // Deliverables
  deliverables: Deliverable[]

  // Subtasks
  subtaskIds: string[]

  // Metadata
  tags?: string[]
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
}
```

#### Modified: Order
```typescript
export interface Order {
  id: string
  productName: string
  catNum: string
  supplier: string

  // Linking (MODIFIED)
  accountId: string               // ✅ REQUIRED: Link to funding account
  accountName: string             // Cached
  funderId: string                // ✅ Cached from account
  funderName: string              // Cached
  masterProjectId: string         // ✅ Cached from account
  masterProjectName: string       // Cached

  // Optional linking
  taskId?: string                 // If ordered for specific task
  workpackageId?: string          // If ordered for specific work package

  // Status
  status: OrderStatus
  orderedBy: string               // PersonProfile ID
  orderedDate?: Date
  receivedDate?: Date

  // Financial
  priceExVAT: number
  currency: string
  invoiceNumber?: string

  // Categorization
  category?: string
  subcategory?: string

  // Metadata
  notes?: string
  createdBy: string
  createdDate: Date
  updatedAt?: Date
}
```

---

### 3. Position Hierarchy

**New constant in types.ts:**

```typescript
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
```

---

### 4. Multi-View System

Users can switch between three views:

#### Lab View (Default)
**Shows:** Everything in the user's lab
- **People:** All lab members
- **Projects:** All master projects in the lab
- **Work Packages:** All work packages across all projects
- **Tasks:** All tasks in the lab
- **Equipment:** All lab equipment
- **Orders:** All orders from all accounts in the lab
- **Inventory:** Shared lab inventory

**Use case:** "What is everyone in my lab working on?"

#### Project View
**Shows:** Everything for a specific master project
- **People:** Only team members on this project
- **Work Packages:** Only work packages for this project
- **Tasks:** Only tasks in this project's work packages
- **Equipment:** Equipment used by this project
- **Orders:** Only orders charged to this project's accounts
- **Inventory:** Items assigned to this project
- **Budget:** Project spending and remaining budget

**Use case:** "What's the status of the CRUK grant?"

#### Funder View
**Shows:** Everything funded by a specific funder
- **People:** People funded by this funder (across all projects)
- **Projects:** All master projects funded by this funder
- **Work Packages:** Work packages in funder's projects
- **Tasks:** Tasks in funder's projects
- **Orders:** Orders charged to this funder's accounts
- **Budget:** Total spending across all funder accounts

**Use case:** "How much have we spent from Wellcome Trust funding?"

**Implementation:** Top navigation dropdown

```
┌──────────────────────────────────────────────┐
│ View: [Lab View ▼]                           │
│                                              │
│ Lab View                                     │
│   └─ Smith Lab - Protein Engineering         │
│                                              │
│ Project View                                 │
│   ├─ CRUK Grant - Cancer Research            │
│   ├─ Wellcome Grant - Drug Discovery         │
│   └─ ERC Grant - Biosensors                  │
│                                              │
│ Funder View                                  │
│   ├─ Cancer Research UK                      │
│   ├─ Wellcome Trust                          │
│   └─ European Research Council               │
└──────────────────────────────────────────────┘
```

---

### 5. Multi-PI Lab Support

**Scenario:** Two PIs (Dr. Smith and Dr. Doe) share the same physical lab

**Solution:** Separate master projects with shared resources

```
Smith Lab - Protein Engineering
├─ Shared Lab Resources
│   ├─ Equipment (FPLC, PCR machine, etc.)
│   ├─ Lab Calendar
│   ├─ Lab Polls
│   └─ Common Inventory (buffers, consumables, etc.)
│
├─ Dr. Smith's Projects
│   ├─ Master Project: CRUK Grant
│   │   ├─ Account: CRUK-2024-001
│   │   ├─ Team: PostDoc 1, PhD 1, PhD 2
│   │   ├─ Work Package 1: Target Identification
│   │   └─ Work Package 2: Validation
│   │
│   └─ Master Project: Wellcome Grant
│       ├─ Account: WT-2023-042
│       ├─ Team: PostDoc 2, PhD 3
│       └─ Work Package 1: Drug Screening
│
└─ Dr. Doe's Projects
    └─ Master Project: ERC Grant
        ├─ Account: ERC-2025-789
        ├─ Team: PostDoc 3, PhD 4
        └─ Work Package 1: Biosensor Development
```

**View filtering:**

1. **Lab View** - Shows everyone and everything
2. **Project View (CRUK Grant)** - Shows only Dr. Smith's CRUK team and their work
3. **Project View (ERC Grant)** - Shows only Dr. Doe's ERC team and their work
4. **Funder View (CRUK)** - Shows all CRUK-funded work (only Dr. Smith's CRUK project)

**Shared vs. Separate:**
- **Shared:** Equipment, Lab Polls, Lab Calendar, Common Inventory
- **Separate:** Projects, Accounts, Team Tasks, Project-specific Orders

---

### 6. Ordering System Integration

**Current flow:** Order → Select Account → Create

**New flow:**
```
Order → Select Account (filtered by user's projects) → Link to Task (optional) → Create
```

**Account Selection:**

When creating an order, show accounts grouped by project:

```
┌──────────────────────────────────────────────┐
│ Select Account to Charge                     │
│                                              │
│ CRUK Grant - Cancer Research                 │
│   • CRUK-2024-001 (£125,000 remaining)       │
│                                              │
│ Wellcome Grant - Drug Discovery              │
│   • WT-2023-042 (£87,500 remaining)          │
│                                              │
│ ERC Grant - Biosensors                       │
│   • ERC-2025-789 (£220,000 remaining)        │
└──────────────────────────────────────────────┘

Only accounts from your projects are shown.
```

**Validation:**
- ✅ Account MUST be selected (required field)
- ✅ User must be on the project that owns the account
- ✅ Account must be active
- ✅ Optional: Check if sufficient budget remains

---

### 7. Gantt Chart Updates

**Current:** Shows projects and tasks

**New:** Shows hierarchical structure

```
Gantt Chart - Project View: CRUK Grant - Cancer Research

Timeline (2024-2026):
├─ 📊 Master Project: CRUK Grant - Cancer Research
│   │
│   ├─ 📦 Work Package 1: Target Identification (Jan 2024 - Dec 2024)
│   │   ├─ ✓ Task 1.1: Protein Expression (Jan - Mar)
│   │   ├─ ✓ Task 1.2: Purification Optimization (Feb - Apr)
│   │   ├─ ⚠ Task 1.3: Binding Assays (Apr - Jun) [At Risk]
│   │   └─ → Task 1.4: Hit Validation (Jul - Dec)
│   │
│   ├─ 📦 Work Package 2: Lead Optimization (Jul 2024 - Jun 2025)
│   │   ├─ → Task 2.1: Structure Determination (Jul - Dec)
│   │   └─ → Task 2.2: SAR Studies (Jan - Jun 2025)
│   │
│   └─ 📦 Work Package 3: In Vivo Validation (Jan 2025 - Dec 2026)
│       ├─ → Task 3.1: Animal Model Development
│       └─ → Task 3.2: Efficacy Studies
```

**Features:**
- Expand/collapse work packages
- Color-code by status (good/warning/at-risk)
- Show dependencies between tasks
- Show team members assigned to each task
- Filter by person, status, or importance

---

### 8. Network Visualization Updates

**Current:** Shows org → institute → lab → people

**Enhanced:** Show project-based clustering with PI groupings

```
Visual enhancements:
1. Cluster people by master project (not just lab)
2. Show PI nodes larger with distinct color
3. Color-code edges by relationship:
   - Supervision (orange)
   - Same project (blue)
   - Same lab but different project (gray, dashed)
4. Add filter: "Show only Project X team"
5. Add filter: "Show only Funder Y projects"
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. ✅ Create new Firestore collections (organisations, institutes, labs, funders, accounts)
2. ✅ Add new types (Organisation, Institute, Lab, Funder, updated MasterProject)
3. ✅ Create position hierarchy enum and constants
4. ✅ Update PersonProfile type with new fields

### Phase 2: Onboarding (Week 2-3)
1. ✅ Build new onboarding flow (12 steps)
2. ✅ Create organisation/institute/lab selection components
3. ✅ Create position hierarchy dropdown
4. ✅ Create master project creation flow
5. ✅ Create funder/account linking

### Phase 3: Multi-View System (Week 3-4)
1. ✅ Create view context/state management
2. ✅ Build view switcher component
3. ✅ Implement filtering logic for each view
4. ✅ Update all components to respect current view

### Phase 4: Project Management (Week 4-5)
1. ✅ Update project creation to use master projects
2. ✅ Implement work package CRUD
3. ✅ Link tasks to work packages (not directly to projects)
4. ✅ Update Gantt chart to show hierarchy

### Phase 5: Ordering & Accounting (Week 5-6)
1. ✅ Update order creation to require account
2. ✅ Show account selection grouped by project
3. ✅ Add budget tracking and warnings
4. ✅ Update inventory to link to accounts

### Phase 6: Network & Visualization (Week 6-7)
1. ✅ Update network view to show project clustering
2. ✅ Add view filters to network
3. ✅ Enhance visual encoding

### Phase 7: Testing & Migration (Week 7-8)
1. ✅ Write data migration scripts for existing profiles
2. ✅ Test multi-PI scenarios
3. ✅ Test view switching
4. ✅ User acceptance testing
5. ✅ Deploy to production

---

## Data Migration Plan

### Existing Users

For users who already have profiles:

1. **Keep existing data** in `PersonProfile`
2. **Prompt for additional info** on next login:
   - "We've updated Momentum! Please complete a few more details..."
   - Ask for: organisationId, instituteId, labId (link to existing org/inst/lab)
   - Ask for: position (from hierarchy)
   - Ask for: PI status
   - Ask for: master project linking

3. **Auto-migrate where possible:**
   - organisation (string) → create Organisation document → link
   - institute (string) → create Institute document → link
   - lab (string) → create Lab document → link
   - fundedBy (string[]) → create Funder documents

4. **Backward compatibility:**
   - Keep old fields populated for 6 months
   - Show deprecation warnings to devs
   - Remove old fields in v2.0

---

## UI/UX Mockups Needed

1. ✅ Onboarding flow (12 screens)
2. ✅ View switcher component (top nav)
3. ✅ Master project dashboard
4. ✅ Work package management view
5. ✅ Enhanced Gantt chart
6. ✅ Account selection in ordering
7. ✅ Budget tracking dashboard
8. ✅ Multi-PI lab view

---

## Firestore Security Rules

Need to update rules to support:

1. **Organisation-level access** - Admins can see all in org
2. **Institute-level access** - Department heads can see all in institute
3. **Lab-level access** - Lab members can see lab data
4. **Project-level access** - Project members can see project data
5. **Funder-level access** - PIs can see their funder data

```javascript
// Example rule structure
match /masterProjects/{projectId} {
  // Allow read if user is team member
  allow read: if request.auth.uid in resource.data.teamMemberIds;

  // Allow write if user is PI
  allow write: if request.auth.uid in resource.data.principalInvestigatorIds;
}

match /accounts/{accountId} {
  // Allow read if user is on the linked project
  allow read: if isProjectMember(resource.data.masterProjectId);

  // Allow write only by PIs
  allow write: if isProjectPI(resource.data.masterProjectId);
}
```

---

## Testing Scenarios

### Scenario 1: New User Joins Existing Lab
1. User signs up
2. Selects Organisation → Institute → Lab (all exist)
3. Selects Position: PhD Student
4. Selects Supervisor: Dr. Smith
5. Not a PI
6. Joins existing project: CRUK Grant
7. Lands on dashboard, sees CRUK project tasks

### Scenario 2: New PI Creates Lab
1. User signs up
2. Selects Organisation → Institute (exist)
3. Creates new Lab: "Doe Lab - Biosensors"
4. Selects Position: Professor
5. No supervisor (is PI)
6. Is a PI
7. Creates new master project: "ERC Grant - Biosensors"
8. Selects Funder: ERC
9. Creates new Account: ERC-2025-789
10. Lands on project setup, creates work packages

### Scenario 3: Multi-PI Lab
1. Lab has Dr. Smith (PI) and Dr. Doe (PI)
2. Dr. Smith's team works on CRUK project
3. Dr. Doe's team works on ERC project
4. Both use shared equipment
5. Dr. Smith switches to "Project View: CRUK"
   - Sees only CRUK team and tasks
6. Dr. Doe switches to "Project View: ERC"
   - Sees only ERC team and tasks
7. Either switches to "Lab View"
   - Sees everyone and all projects

### Scenario 4: Ordering with Accounts
1. PostDoc 1 needs to order reagents
2. Goes to ordering page
3. Selects Account: CRUK-2024-001
4. Optionally links to Task: "Protein Expression"
5. Order is created, charged to CRUK account
6. Budget tracker updates for CRUK project

---

## Next Steps

**Immediate:**
1. ✅ Review and approve this design document
2. ✅ Clarify any questions or modifications needed
3. ✅ Begin Phase 1 implementation

**Questions for you:**
1. Does this organizational hierarchy make sense for your use case?
2. Are there additional position levels needed?
3. Should we support multiple accounts per project, or always 1:1?
4. Any additional views needed beyond Lab/Project/Funder?
5. Should Day-to-Day tasks be lab-wide or project-specific?

---

**Status:** 📋 **AWAITING APPROVAL**
**Next:** Begin implementation after user confirmation
