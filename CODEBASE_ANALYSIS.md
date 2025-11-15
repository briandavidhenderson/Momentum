# Momentum Lab Management App - Comprehensive Codebase Analysis

## Executive Summary

**Momentum** is a Next.js 14 + React 18 + TypeScript + Firebase Firestore lab management platform with sophisticated project management, team collaboration, equipment tracking, and electronic lab notebook capabilities. It's designed for research organizations with organizational hierarchy (Organisation > Institute > Lab > Person).

### Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **State**: Zustand + Custom Hooks
- **Data Validation**: Zod
- **Visualization**: D3.js, Gantt Task React, Recharts
- **Version**: 0.1.0

---

## 1. PROJECT STRUCTURE - TECHNOLOGY STACK

### Framework & Language
- **Next.js 14.2.0** - Full-stack React framework with App Router
- **React 18.3.0** - UI library
- **TypeScript 5.4.0** - Type safety
- **Tailwind CSS 3.4.0** - Styling system

### Key Dependencies
```json
{
  "firebase": "^10.11.0",
  "firebase-admin": "^12.4.0",
  "@dataconnect/generated": "local",
  "zustand": "^5.0.8",
  "zod": "^3.22.0",
  "d3": "^7.9.0",
  "recharts": "^2.12.0",
  "gantt-task-react": "^0.3.9",
  "date-fns": "^3.6.0",
  "@radix-ui/*": "multiple",
  "uuid": "^9.0.1"
}
```

### Directory Structure
```
/home/user/Momentum/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main app shell
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── gantt-custom.css          # Gantt styles
│   └── auth/orcid/callback/      # ORCID OAuth callback
├── components/
│   ├── views/                    # Main view components
│   │   ├── ProjectDashboard.tsx
│   │   ├── PeopleView.tsx
│   │   ├── OrdersInventory.tsx
│   │   ├── EquipmentManagement.tsx
│   │   ├── ElectronicLabNotebook.tsx
│   │   ├── DayToDayBoard.tsx
│   │   ├── CalendarEvents.tsx
│   │   ├── ProfileManagement.tsx
│   │   └── PersonalProfilePage.tsx
│   ├── ui/                       # Reusable UI components (Radix + shadcn)
│   ├── NetworkView.tsx           # D3 network visualization
│   ├── OnboardingFlow.tsx        # New user setup
│   └── DataClearDialog.tsx       # Debug utility
├── lib/
│   ├── types.ts                  # Main TypeScript definitions
│   ├── firestoreService.ts       # Firestore operations (1300+ lines)
│   ├── validatedFirestoreService.ts
│   ├── validationSchemas.ts      # Zod schemas
│   ├── firebase.ts               # Firebase initialization
│   ├── AppContext.tsx            # Global context provider
│   ├── store.ts                  # Zustand state management
│   ├── constants.ts              # App constants
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useProjects.ts
│   │   ├── useOrders.ts
│   │   ├── useEquipment.ts
│   │   ├── useELN.ts
│   │   ├── useDayToDayTasks.ts
│   │   ├── useCalendar.ts
│   │   ├── usePolls.ts
│   │   ├── useEvents.ts
│   │   └── useFirestoreSubscriptions.ts
│   ├── ai/                       # AI integration
│   │   ├── providers/
│   │   ├── prompts.ts
│   │   ├── router.ts
│   │   └── types.ts
│   └── [utilities]
├── firebase/
│   ├── functions/                # Cloud Functions
│   │   └── src/index.ts          # ORCID OAuth functions
│   ├── firestore.rules           # Firestore security rules
│   ├── firestore.indexes.json    # Firestore indexes
│   └── storage.rules             # Firebase Storage rules
├── src/dataconnect-generated/    # Firebase Dataconnect (auto-generated)
├── public/                       # Static assets
└── [config files]
```

---

## 2. TYPE DEFINITIONS & INTERFACES

**Location**: `/home/user/Momentum/lib/types.ts` (1,268 lines)

### Organizational Hierarchy
```typescript
Organisation          // Top-level (University, Research Institute)
  └── Institute       // Mid-level (Department, School, Faculty)
      └── Lab         // Research group/laboratory
          └── Person (PersonProfile)
```

### Core Types

#### 1. **Organisational Model**
```typescript
interface Organisation {
  id, name, abbreviation, country
  type: "university" | "research-institute" | "hospital" | "company" | "government" | "other"
  website, logoUrl, createdAt, createdBy
  memberCount?, instituteCount?
}

interface Institute {
  id, name, organisationId, organisationName
  department, building, address, website
  headOfInstituteId?, memberCount?, labCount?
  createdAt, createdBy
}

interface Lab {
  id, name, description
  instituteId, instituteName, organisationId, organisationName
  principalInvestigators: string[]    // PersonProfile IDs
  labManagerIds: string[]             // PersonProfile IDs
  researchAreas, website, location, contactEmail
  memberCount?, activeProjectCount?
  createdAt, createdBy, updatedAt
}
```

#### 2. **User & Profile Model**
```typescript
interface User {
  id, email, fullName, passwordHash
  profileId: string | null           // Links to PersonProfile
  createdAt, isAdministrator
  lastLoginAt, oauthProviders
}

enum PositionLevel {
  RESEARCH_INTERN, RESEARCH_ASSISTANT, LAB_TECHNICIAN,
  UNDERGRADUATE_STUDENT, MASTERS_STUDENT, PHD_STUDENT, PHD_CANDIDATE,
  POSTDOC_RESEARCH_ASSOCIATE, POSTDOC_RESEARCH_FELLOW,
  ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, PROFESSOR,
  LAB_MANAGER, ADMINISTRATIVE_STAFF, // + many more
}

interface PersonProfile {
  id, firstName, lastName, email, phone, officeLocation
  organisationId, organisationName              // NEW
  instituteId, instituteName                    // NEW
  labId, labName                                // NEW
  positionLevel: PositionLevel                  // NEW
  positionDisplayName: string
  position: string                              // Deprecated
  reportsToId: string | null
  isPrincipalInvestigator: boolean              // NEW
  masterProjectIds: string[]                    // NEW
  masterProjectRoles: { [projectId]: ProjectRole }  // NEW
  startDate, researchInterests, qualifications, notes
  orcidId, orcidUrl, orcidVerified             // OAuth
  userId, profileComplete, onboardingComplete
  isAdministrator, createdAt, updatedAt
}

type ProjectRole = "PI" | "Co-PI" | "Postdoc" | "PhD" | "RA" | "Collaborator" | "Support"
```

#### 3. **Funding Model** (P0-1 Implementation)
```typescript
interface Funder {
  id, name, type: "public" | "private" | "charity" | "internal" | "government" | "industry" | "eu" | "other"
  programme, reference                          // Grant/Call name + reference
  currency, startDate, endDate
  abbreviation, country, website, logoUrl, contactInfo, notes
  createdAt, createdBy, updatedAt
  organisationId?: string
}

interface FundingAccount {
  id, accountNumber, accountName
  funderId, funderName                          // Link to funder
  masterProjectId, masterProjectName            // Link to master project
  accountType?: "main" | "equipment" | "consumables" | "travel" | "personnel" | "other"
  totalBudget, spentAmount, committedAmount, remainingBudget
  currency, startDate, endDate
  status: "active" | "closed" | "suspended" | "pending"
  notes, createdAt, createdBy, updatedAt
}
```

#### 4. **Project Model** (Master + Regular)
```typescript
interface MasterProject {
  id, name, description
  labId, labName, instituteId, instituteName, organisationId, organisationName
  grantName, grantNumber, grantReference
  totalBudget, spentAmount, committedAmount, remainingBudget, currency
  startDate, endDate
  funderId, funderName                          // Primary funder
  accountIds: string[]                          // Multiple accounts per project
  principalInvestigatorIds: string[]            // PersonProfile IDs
  coPIIds: string[]                             // PersonProfile IDs
  teamMemberIds: string[]                       // PersonProfile IDs
  teamRoles: { [personProfileId]: ProjectRole }
  workpackageIds: string[]
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"
  progress: number                              // 0-100
  visibility: "private" | "lab" | "institute" | "organisation"
  visibleTo?: string[]
  researchArea, tags, notes, createdAt, createdBy, updatedAt
}

interface Project {                             // Legacy/Regular projects
  id, name
  kind?: "master" | "regular"
  projectType?: "MASTER" | "REGULAR"
  funderId?, fundedBy?: string[]
  start, end, progress, color, importance
  notes, isExpanded
  principalInvestigatorId
  profileProjectId
  tasks?: Task[]                                // Backward compat
  totalBudget, health?, status?, tags, workpackages, defaultTemplates
}
```

#### 5. **Work Breakdown Structure**
```typescript
interface Workpackage {
  id, name, profileProjectId               // Links to master project
  start, end, progress, importance
  notes, status, colorHex
  ownerId: string                          // PersonProfile ID
  tasks: Task[]
  isExpanded
}

interface Task {
  id, name, start, end, progress
  primaryOwner?: string                   // PersonProfile ID
  helpers?: string[]                      // PersonProfile IDs
  workpackageId
  importance, notes, deliverables, type
  status, subtasks, linkedOrderIds, linkedInventoryItemIds
}

interface Subtask {
  id, name, start, end, progress, status
  ownerId?: string                        // PersonProfile ID
  helpers?: string[]                      // PersonProfile IDs
  todos?: Todo[]
  deliverables?: Deliverable[]
  notes, tags, isExpanded, dependencies
}

interface Todo {
  id, text, completed, createdAt, completedAt
  completedBy?: string                    // PersonProfile ID
  order
}

interface Deliverable {
  id, name, progress, status, dueDate
  ownerId?: string                        // PersonProfile ID
  description, metrics, reviewHistory, documentLinks, blockers
}
```

#### 6. **Orders & Inventory**
```typescript
interface Order {
  id, productName, catNum, supplier
  accountId, accountName                  // REQUIRED: Funding account
  funderId, funderName                    // Cached from account
  masterProjectId, masterProjectName      // Cached from account
  taskId?, workpackageId?                 // Optional linking
  sourceDeviceId?, sourceSupplyId?, sourceInventoryItemId?  // Provenance
  status: "to-order" | "ordered" | "received"
  orderedBy, orderedDate, receivedDate, expectedDeliveryDate
  priceExVAT, vatAmount, totalPrice, currency
  invoiceNumber, poNumber
  category, subcategory
  notes, createdBy, createdDate, updatedAt
}

interface InventoryItem {
  id, productName, catNum
  inventoryLevel: "empty" | "low" | "medium" | "full"
  receivedDate, lastOrderedDate
  chargeToAccount, notes
  category, subcategory, priceExVAT
  equipmentDeviceIds, burnRatePerWeek, currentQuantity, minQuantity
}
```

#### 7. **Equipment Management**
```typescript
interface EquipmentDevice {
  id, name, make, model, serialNumber, imageUrl
  type, maintenanceDays, lastMaintained, threshold
  supplies: EquipmentSupply[]
  sops?: EquipmentSOP[]
  labId, createdAt, updatedAt
}

interface EquipmentSupply {
  id, name, price, qty, minQty, burnPerWeek
  inventoryItemId?, chargeToAccountId?, chargeToProjectId?
}

interface EquipmentSOP {
  id, title, content, version, authorId, createdAt, updatedAt
  history?: EquipmentSOPVersion[]
}
```

#### 8. **Electronic Lab Notebook (ELN)**
```typescript
interface ELNItem {
  id, type: "image" | "photo" | "voice" | "note" | "document" | "data" | "video"
  title, description
  fileUrl, storagePath, fileName, fileType, fileSize
  position, order
  aiExtraction?: { status, extractedText, structuredData, entities, summary, errorMessage }
  duration?, transcript?, stickyNotes?: ELNStickyNote[]
  createdAt, updatedAt, createdBy
}

interface ELNExperiment {
  id, title, description
  masterProjectId, masterProjectName          // REQUIRED: Links to project
  workpackageId?, taskId?
  labId, labName, funderId?, funderName
  items: ELNItem[]                            // Unified multimodal items
  pages: ELNPage[]                            // Legacy support
  reports?: ELNReport[]
  createdBy, collaborators, experimentNumber, tags, status
  createdAt, updatedAt
}

interface ELNReport {
  id, experimentId
  background, protocols, results, conclusion
  generatedAt, generatedBy, version, sourceItemIds
}
```

#### 9. **Calendar & Events**
```typescript
interface CalendarEvent {
  id, title, description, location, linkUrl
  start, end, recurrence?: RecurrenceRule
  attendees: EventAttendee[]
  reminders?: EventReminder[]
  tags, visibility: "private" | "lab" | "organisation"
  ownerId?: string                        // PersonProfile ID
  relatedIds?: {
    masterProjectId, workpackageId, projectId, taskId, subtaskId, deliverableId
  }
  type?: "meeting" | "deadline" | "milestone" | "training" | "other"
  notes, createdBy, createdAt, updatedAt
}

interface EventAttendee {
  personId: string                        // PersonProfile ID
  role?, response?, workloadImpactHours?
}

interface RecurrenceRule {
  frequency: "none" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom"
  interval?, byWeekday?, byMonthDay?, endDate, occurrenceCount, customRRule
}
```

#### 10. **Lab Operations**
```typescript
interface LabPoll {
  id, question, options: LabPollOption[]
  labId, createdBy, createdAt
  responses?: LabPollResponse[]
}

interface LabPollOption {
  id, text
}

interface LabPollResponse {
  userId, selectedOptionIds: string[]
  respondedAt: string
}
```

#### 11. **Audit Trail**
```typescript
interface AuditTrail {
  id
  entityType: "project" | "workpackage" | "task" | "deliverable" | "event"
  entityId
  change: "create" | "update" | "delete"
  before?, after?, authorId, createdAt
}
```

### Special Enums & Constants
- **POSITION_HIERARCHY_ORDER**: 21 position levels with display names
- **POSITION_CATEGORIES**: 5 role categories (Research Staff, Students, Postdoctoral, Academic, Other)
- **CATEGORIES**: 10+ order categories with subcategories (Consumables, Reagents, Equipment, etc.)
- **FUNDING_ACCOUNTS**: Legacy array of hardcoded funding accounts (deprecated in favor of Funder/FundingAccount models)

---

## 3. FIRESTORE COLLECTIONS & DATA MODELS

**Location**: `/home/user/Momentum/firestore.rules` | `/home/user/Momentum/lib/firestoreService.ts`

### Collection Schema

```
firestore/
├── users/                       # Firebase Auth linked user accounts
│   └── {uid}                    # User ID from Firebase Auth
│       ├── id (uid)
│       ├── email
│       ├── fullName
│       ├── profileId (references PersonProfile)
│       ├── createdAt
│       ├── isAdministrator
│       └── lastLoginAt
├── personProfiles/              # Complete user profiles with organizational context
│   └── {profileId}
│       ├── All fields from PersonProfile interface
│       ├── userId (FK to users)
│       ├── organisationId (FK to organisations)
│       ├── instituteId (FK to institutes)
│       └── labId (FK to labs)
├── organisations/               # Top-level organizational units
│   └── {orgId}
├── institutes/                  # Department/school level
│   └── {instituteId}
│       └── organisationId (FK)
├── labs/                        # Research groups
│   └── {labId}
│       ├── instituteId (FK)
│       ├── organisationId (FK)
│       ├── principalInvestigators: string[] (PersonProfile IDs)
│       └── labManagerIds: string[]
├── funders/                     # Funding bodies and organizations
│   └── {funderId}
│       ├── type
│       ├── programme
│       ├── reference
│       ├── currency, startDate, endDate
│       ├── createdBy (User ID)
│       └── organisationId? (FK)
├── accounts/                    # Funding accounts (budget tracking)
│   └── {accountId}
│       ├── accountNumber
│       ├── accountName
│       ├── funderId (FK)
│       ├── masterProjectId (FK)
│       ├── accountType: "main" | "equipment" | "consumables" | "travel" | "personnel" | "other"
│       ├── totalBudget, spentAmount, committedAmount, remainingBudget
│       ├── currency, startDate, endDate
│       └── status: "active" | "closed" | "suspended" | "pending"
├── masterProjects/              # Grant-funded research projects
│   └── {projectId}
│       ├── labId (FK)
│       ├── instituteId (FK)
│       ├── organisationId (FK)
│       ├── funderId (FK)
│       ├── accountIds: string[] (FK to accounts)
│       ├── principalInvestigatorIds: string[] (PersonProfile IDs)
│       ├── coPIIds: string[]
│       ├── teamMemberIds: string[]
│       ├── teamRoles: { [personId]: ProjectRole }
│       ├── workpackageIds: string[] (FK)
│       ├── progress, status, health
│       ├── spentAmount, committedAmount (cached)
│       ├── createdBy, createdAt, updatedAt
│       └── updatedBy
├── projects/                    # Legacy/simple projects
│   └── {projectId}
│       ├── createdBy (User ID)
│       ├── labId?
│       ├── projectType?: "MASTER" | "REGULAR"
│       └── fundedBy?: string[] (Account IDs)
├── workpackages/                # Major work units within master projects
│   └── {wpId}
│       ├── profileProjectId (FK to masterProject)
│       ├── ownerId (PersonProfile ID)
│       ├── tasks: Task[]
│       ├── progress, importance, status
│       └── createdBy
├── orders/                      # Supply orders
│   └── {orderId}
│       ├── accountId (FK to accounts) - REQUIRED
│       ├── funderId, masterProjectId (cached)
│       ├── taskId?, workpackageId? (optional linking)
│       ├── status: "to-order" | "ordered" | "received"
│       ├── orderedBy (PersonProfile ID)
│       ├── priceExVAT, totalPrice, currency
│       ├── createdBy, createdDate
│       └── sourceDeviceId?, sourceSupplyId?, sourceInventoryItemId? (provenance)
├── inventory/                   # Stock inventory items
│   └── {itemId}
│       ├── productName, catNum
│       ├── inventoryLevel: "empty" | "low" | "medium" | "full"
│       ├── chargeToAccount (FK)
│       ├── burnRatePerWeek, currentQuantity, minQuantity
│       ├── equipmentDeviceIds: string[]
│       └── createdBy
├── equipment/                   # Lab equipment devices
│   └── {equipmentId}
│       ├── name, make, model, serialNumber, type
│       ├── maintenanceDays, lastMaintained, threshold
│       ├── supplies: EquipmentSupply[]
│       ├── sops: EquipmentSOP[]
│       ├── labId
│       └── createdAt, updatedAt
├── elnExperiments/              # Electronic lab notebook experiments
│   └── {experimentId}
│       ├── masterProjectId (FK) - REQUIRED
│       ├── workpackageId?, taskId? (optional)
│       ├── labId (FK)
│       ├── funderId? (cached)
│       ├── items: ELNItem[] (multimodal content)
│       ├── pages: ELNPage[] (legacy)
│       ├── reports?: ELNReport[]
│       ├── createdBy (PersonProfile ID)
│       ├── collaborators: string[] (PersonProfile IDs)
│       └── createdAt, updatedAt
├── events/                      # Calendar events
│   └── {eventId}
│       ├── title, description, location
│       ├── start, end, recurrence
│       ├── attendees: EventAttendee[] (PersonProfile IDs)
│       ├── visibility: "private" | "lab" | "organisation"
│       ├── relatedIds: { masterProjectId, workpackageId, taskId, ... }
│       ├── type: "meeting" | "deadline" | "milestone" | "training" | "other"
│       ├── createdBy (User ID)
│       └── createdAt, updatedAt
├── auditTrails/                 # Change audit logs (compliance)
│   └── {auditId}
│       ├── entityType, entityId
│       ├── change: "create" | "update" | "delete"
│       ├── before, after (document snapshots)
│       ├── authorId (User ID)
│       └── createdAt
├── dayToDayTasks/               # Personal daily task list
│   └── {taskId}
│       ├── createdBy (User ID) - read restricted
│       ├── status, title, dueDate
│       └── createdAt, updatedAt
└── labPolls/                    # Lab decision polls
    └── {pollId}
        ├── question, options
        ├── labId
        ├── createdBy (User ID)
        ├── responses: LabPollResponse[]
        └── createdAt
```

### Cross-Collection Relationships
```
User (Firebase Auth) 
  ↓ profileId
PersonProfile
  ├─→ Lab → Institute → Organisation (hierarchy)
  ├─→ reports to: PersonProfile (supervisory chain)
  ├─→ masterProjectIds: MasterProject[] (team membership)
  └─→ masterProjectRoles: { projectId: role }

Funder
  ├─→ FundingAccount[] (1:many)
  └─→ Organisation? (1:0..1)

FundingAccount
  ├─→ Funder (FK)
  ├─→ MasterProject (FK)
  └─→ Order[] (implicit via orders.accountId)

MasterProject
  ├─→ Lab, Institute, Organisation (hierarchy)
  ├─→ Funder (FK)
  ├─→ FundingAccount[] (1:many, via accountIds)
  ├─→ PersonProfile[] (team via principalInvestigatorIds, coPIIds, teamMemberIds)
  └─→ Workpackage[] (1:many)

Order
  ├─→ FundingAccount (FK, required)
  ├─→ MasterProject (cached)
  ├─→ Task?, Workpackage? (optional)
  └─→ EquipmentDevice? (via sourceDeviceId)

ELNExperiment
  ├─→ MasterProject (FK, required)
  ├─→ Workpackage?, Task? (optional)
  ├─→ PersonProfile[] (createdBy, collaborators)
  └─→ ELNItem[] (nested)

CalendarEvent
  └─→ PersonProfile[] (via attendees[].personId)
```

---

## 4. AUTHENTICATION & USER MANAGEMENT

**Locations**: 
- `/home/user/Momentum/lib/hooks/useAuth.ts`
- `/home/user/Momentum/lib/firebase.ts`
- `/home/user/Momentum/firebase/functions/src/index.ts`
- `/home/user/Momentum/lib/auth/orcid.ts`
- `/home/user/Momentum/app/auth/orcid/callback/page.tsx`

### Firebase Authentication Flow

```
Firebase Auth ← → Cloud Functions (ORCID OAuth) ← → ORCID.org

onAuthStateChanged
  ↓
User account created (via Firebase Auth UI)
  ↓
getUser() from Firestore users/{uid}
  ↓
findUserProfile() from Firestore personProfiles
  ↓
AuthState transitions: 'auth' → 'setup' → 'app'
```

### Authentication States
```typescript
type AuthState = 'auth' | 'setup' | 'app'

'auth'  - No authentication, show login/signup
'setup' - Authenticated but no PersonProfile, show onboarding
'app'   - Full access with PersonProfile
```

### Key Auth Functions

**useAuth() Hook** (`lib/hooks/useAuth.ts`)
```typescript
function useAuth() {
  // State
  const [currentUser, setCurrentUser]: [User | null, ...]     // Firebase user record
  const [currentUserProfile, setCurrentUserProfile]: [PersonProfile | null, ...]
  const [currentUserProfileId, setCurrentUserProfileId]: [string | null, ...]
  const [authState, setAuthState]: [AuthState, ...]
  const [isLoadingProfile, setIsLoadingProfile]: [boolean, ...]

  // Lifecycle: onAuthStateChanged → getUser → findUserProfile → setAuthState
  useEffect(() => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUser(firebaseUser.uid)
        const profile = await findUserProfile(userData.uid, userData.profileId)
        setAuthState(profile ? 'app' : 'setup')
      }
    })
  })

  // Handlers
  handleLogin(uid: string): Promise<void>
  handleSignup(uid: string, email: string, fullName: string): void
  handleSignOut(): Promise<void>
  handleProfileSetupComplete(profile: PersonProfile): void
  
  return {
    currentUser, currentUserProfile, currentUserProfileId, authState,
    isLoadingProfile, mounted, handleLogin, handleSignup, handleSignOut,
    handleProfileSetupComplete
  }
}
```

### Firebase Admin Functions

**User Operations** (`lib/firestoreService.ts`)
```typescript
createUser(uid: string, email: string, fullName: string): Promise<void>
getUser(uid: string): Promise<FirestoreUser | null>
updateUser(uid: string, updates: Partial<FirestoreUser>): Promise<void>
```

### ORCID OAuth Integration
**Cloud Functions** (`firebase/functions/src/index.ts`)
```typescript
orcidAuthStart(data)         // Returns auth URL + state for CSRF
orcidAuthCallback(data)      // Exchanges code for token, creates custom Firebase token
orcidLinkAccount(data)       // Links ORCID to existing Firebase user
```

**PersonProfile ORCID Fields**
```typescript
orcidId?: string              // "0000-0000-0000-0000"
orcidUrl?: string             // "https://orcid.org/0000-0000-0000-0000"
orcidVerified?: boolean       // Verified via OAuth
orcidLastSynced?: string      // ISO timestamp
orcidClaims?: {
  name?: string
  email?: string | null
}
```

### Session Management
- **No explicit session storage** - Firebase Auth handles tokens
- **Cross-tab sync** - `window.dispatchEvent(new CustomEvent('profiles-updated'))`
- **Profile refresh** - Manual reload via event listeners

---

## 5. FIREBASE & FIRESTORE SECURITY RULES

**Location**: `/home/user/Momentum/firestore.rules` (460 lines)

### Security Architecture

```
Rule Helpers:
├── isAuthenticated()           // request.auth != null
├── isAdmin()                   // User document has isAdministrator=true
├── getUserProfileId()          // From User.profileId
├── getUserProfile()            // From personProfiles/{profileId}
├── getUserLab()                // From UserProfile.labId
├── canViewProject()            // User in project's lab
├── isProjectMember()           // User in project's teamMemberIds
└── isLabMember()               // User's labId == resource.labId
```

### Collection-Level Permissions

| Collection | Create | Read | Update | Delete | Notes |
|---|---|---|---|---|---|
| **users** | Auth triggers | Authenticated | Self + admin | Admin only | Firebase handles user creation |
| **personProfiles** | Self-create | Authenticated | Self + admin | Admin | Profile must link to user |
| **organisations** | Authenticated | Authenticated | Creator + admin | Admin | Shared reference data |
| **institutes** | Authenticated | Authenticated | Creator + admin | Admin | Shared reference data |
| **labs** | Authenticated | Authenticated | Creator + admin | Admin | Shared reference data |
| **funders** | Authenticated | Authenticated | Creator + admin | Admin | Shared reference data |
| **accounts** | Project PI | Project member | Project PI | Project PI | Budget accounts |
| **masterProjects** | Lab members | Lab members + team | Project PIs | Project PIs | Requires lab context |
| **projects** | Authenticated | Authenticated | Creator + admin | Creator + admin | Legacy projects |
| **workpackages** | Authenticated | Authenticated | Creator + admin | Creator + admin | No workpackage-level restrictions |
| **orders** | Authenticated | Authenticated | Creator + admin | Creator + admin | No order-level restrictions |
| **inventory** | Authenticated | Authenticated | Creator + admin | Creator + admin | No item-level restrictions |
| **dayToDayTasks** | Owner | Owner | Owner | Owner | Strictly personal |
| **labPolls** | Authenticated | Authenticated | Creator + admin | Creator + admin | Lab filtering client-side |
| **equipment** | Authenticated | Authenticated | Authenticated | Authenticated | No restrictions (lab filter client-side) |
| **elnExperiments** | Self-create | Lab members + owner | Owner + admin | Owner + admin | Lab-scoped with creator check |
| **events** | Self-create | Authenticated | Creator + admin | Creator + admin | No complex logic |
| **auditTrails** | Authenticated | Authenticated | Admin | Admin | Create-only, immutable audit log |

### Storage Rules

**Location**: `/home/user/Momentum/storage.rules` (52 lines)

```
gs://bucket/
├── /projects/{projectId}/**     - Project members (via Firestore membership check)
├── /safety/**                   - Admin only
├── /templates/**                - Read: authenticated, Write: admin
├── /avatars/{userId}/**         - Read: authenticated, Write: self
└── /documents/**                - Read: authenticated, Write: admin
```

### Access Control Patterns

**Lab-Scoped Access** (for Master Projects)
```typescript
// User can read projects in their lab
allow read: if isAuthenticated() && 
  (isAdmin() || 
   isLabMember(resource.data.labId) ||
   getUserProfileId() in resource.data.teamMemberIds)
```

**Project-Team Access** (for Funding Accounts)
```typescript
// Only project PIs and team members can manage accounts
allow update: if isAuthenticated() && 
  (isAdmin() || 
   isProjectPI(resource.data.masterProjectId))
```

**Personal Access** (Day-to-Day Tasks)
```typescript
// Users can only access their own tasks
allow read, write: if isAuthenticated() && 
  resource.data.createdBy == request.auth.uid
```

### Notable Gaps for GDPR Compliance
- No data retention policies
- No audit trail for user deletions
- No anonymous data export support
- No automated purging of old audit logs
- No consent tracking
- No data residency controls

---

## 6. CURRENT UI STRUCTURE & MAIN PAGES

**Location**: `/home/user/Momentum/app/page.tsx` | `/home/user/Momentum/components/views/`

### Main Navigation (8 Primary Views)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Momentum Lab Management          [User Profile]  [Sign Out]        │
├─────────────────────────────────────────────────────────────────────┤
│ [Project Timeline] [People] [Day to Day] [Lab Notebook] [Orders]    │
│ [Equipment] [Calendar] [My Profile] [All Profiles*] (*admin only)   │
├─────────────────────────────────────────────────────────────────────┤
│ {Selected View Component}                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### View Components

#### 1. **Project Timeline / Project Dashboard**
- **Component**: `ProjectDashboard.tsx`
- **Features**:
  - Gantt chart visualization (gantt-task-react)
  - Master projects + workpackages + tasks
  - Drag-and-drop task manipulation
  - Right-click context menu for task details
  - Progress cascade calculation
  - Color-coding by project/owner
  - Timeline with dependencies
  - Budget tracking (spend vs. budget)
- **Data Source**: `useProjects()` hook → Firestore masterProjects/workpackages

#### 2. **People View / Network Visualization**
- **Component**: `PeopleView.tsx`
- **Features**:
  - 3 sub-views:
    1. **Grid View** - Searchable table of lab members
    2. **Org Chart** - Hierarchical organization (reports-to relationships)
    3. **Network View** - D3.js force-directed graph showing collaborations
  - Filter by Lab/Institute/Organisation
  - PersonProfile editing (admin + self)
- **Data Source**: PersonProfiles from Firestore

#### 3. **Day-to-Day Board**
- **Component**: `DayToDayBoard.tsx`
- **Features**:
  - Kanban-style board (TODO → WORKING → DONE)
  - Personal task list (stored in dayToDayTasks collection)
  - Quick-add task input
  - Drag-and-drop between columns
  - One-off tasks separate from project tasks
- **Data Source**: `useDayToDayTasks()` → Firestore dayToDayTasks

#### 4. **Electronic Lab Notebook**
- **Component**: `ElectronicLabNotebook.tsx`
- **Features**:
  - Multimodal item capture: images, voice notes, documents, data
  - Canvas-based layout for visual experiments
  - AI extraction of text/data from images
  - Voice note transcription (AI-powered)
  - Sticky note annotations on images
  - Experiment reports (AI-generated summaries)
  - Link experiments to master projects/work packages/tasks
  - Version history + timestamps
- **Data Source**: `useELN()` → Firestore elnExperiments

#### 5. **Orders & Inventory**
- **Component**: `OrdersInventory.tsx`
- **Features**:
  - **Orders Section**:
    - Kanban board (To-Order → Ordered → Received)
    - Drag-drop status changes
    - Auto-create inventory when order received
    - Track pricing (ex-VAT, VAT, total)
    - Link to funding accounts + master projects
    - Supplier + catalog management
  - **Inventory Section**:
    - Stock level tracking (empty, low, medium, full)
    - Auto-reorder suggestions
    - Burn rate calculations
    - Link to equipment
    - Category/subcategory organization (10+ categories)
  - Auto-delete received orders older than 7 days
- **Data Source**: `useOrders()` → Firestore orders/inventory

#### 6. **Equipment Management**
- **Component**: `EquipmentManagement.tsx`
- **Features**:
  - Equipment device registry (make/model/serial)
  - Maintenance scheduling
  - Supplies per device (with burn rates)
  - Standard Operating Procedures (SOPs) versioning
  - Reorder suggestions based on supply burn
  - Image/documentation support
  - Maintenance threshold alerts
- **Data Source**: `useEquipment()` → Firestore equipment

#### 7. **Calendar / Events**
- **Component**: `CalendarEvents.tsx`
- **Features**:
  - Event creation with recurrence rules
  - Attendee management with response tracking
  - Event reminders (email, push, SMS)
  - Link events to projects/work packages/tasks
  - Visibility control (private, lab, organisation)
  - Calendar export (ICS)
  - Integration references (Google Calendar, Outlook)
  - Workload impact tracking
- **Data Source**: `useCalendar()` + `useEvents()` → Firestore events

#### 8. **My Profile**
- **Component**: `PersonalProfilePage.tsx`
- **Features**:
  - Edit personal profile
  - ORCID linking (OAuth integration)
  - Research interests & qualifications
  - Position level & reporting structure
  - Project team membership display
  - Onboarding status tracking
- **Data Source**: PersonProfile from auth context

#### 9. **All Profiles** (Admin Only)
- **Component**: `ProfileManagement.tsx`
- **Features**:
  - User creation/editing interface
  - Bulk import/export
  - Multi-level filtering (organisation, institute, lab)
  - Organisational structure management
  - Project assignment for users
  - Admin permission grants
- **Data Source**: All PersonProfiles from Firestore

### OnboardingFlow (Setup)
- **Component**: `OnboardingFlow.tsx`
- **Sequence**:
  1. Create PersonProfile (first-time setup)
  2. Link to Lab/Institute/Organisation
  3. Set position level
  4. Complete profile information
  5. Optional: Link ORCID
  6. Transition to 'app' state

### Authentication Pages
- **AuthPage**: Login/signup interface (Firebase UI or custom)
- **ORCID Callback**: `/app/auth/orcid/callback/page.tsx` - OAuth token exchange

---

## 7. ORDERS, PROJECTS & PEOPLE MANAGEMENT

### Orders Management Implementation

**Location**: `/home/user/Momentum/lib/hooks/useOrders.ts` | `/home/user/Momentum/components/views/OrdersInventory.tsx`

```typescript
function useOrders() {
  // State
  const [orders, setOrders]: [Order[], ...]
  const [inventory, setInventory]: [InventoryItem[], ...]

  // Handlers
  handleCreateOrder(orderData): Promise<string>
  handleUpdateOrder(orderId, updates): Promise<void>
  handleDeleteOrder(orderId): Promise<void>
  handleReorder(inventoryItemId): Promise<string>  // Quick-reorder
  handleUpdateInventoryLevel(itemId, level): Promise<void>
  handleDeleteInventoryItem(itemId): Promise<void>

  return { orders, inventory, handleCreateOrder, handleUpdateOrder, ... }
}
```

**Order Workflow**:
```
1. Create Order
   - Require FundingAccount (accountId) ← Link to project + funder
   - Optional: Link to Task/Workpackage/Equipment
   - Track: supplier, catNum, price, currency
   - Provenance: sourceDeviceId, sourceSupplyId, sourceInventoryItemId

2. Update Status
   - to-order → ordered (set orderedDate)
   - ordered → received (set receivedDate, auto-create InventoryItem)
   - Drag-drop in Kanban board

3. Inventory Creation
   - Auto-trigger when status → received
   - Copy: productName, catNum, category, price, account
   - Set default level: "medium"

4. Auto-cleanup
   - Delete received orders > 7 days old (via useEffect interval)
```

**Funding Account Linking**:
```
Order.accountId (REQUIRED) → FundingAccount
  ├─ FundingAccount.funderId → Funder (public/private/charity/etc)
  ├─ FundingAccount.masterProjectId → MasterProject
  ├─ FundingAccount.accountType: "main" | "equipment" | "consumables" | "travel" | "personnel"
  └─ Budget tracking:
      ├─ totalBudget
      ├─ spentAmount (from orders where status="received")
      ├─ committedAmount (from pending orders)
      └─ remainingBudget = total - spent - committed
```

### Projects Management Implementation

**Location**: `/home/user/Momentum/lib/hooks/useProjects.ts`

```typescript
function useProjects() {
  // State
  const [projects, setProjects]: [MasterProject[], ...]
  const [workpackages, setWorkpackages]: [Workpackage[], ...]
  const [workpackagesMap, setWorkpackagesMap]: [Map<string, Workpackage>, ...]

  // Handlers
  handleCreateMasterProject(projectData): Promise<string>
  handleUpdateMasterProject(projectId, updates): Promise<void>
  handleDeleteMasterProject(projectId): Promise<void>
  handleCreateWorkpackage(workpackageData): Promise<string>
  handleUpdateWorkpackage(wpId, updates): Promise<void>
  handleDeleteWorkpackage(wpId): Promise<void>

  return { projects, workpackages, workpackagesMap, ... }
}
```

**Master Project Workflow**:
```
1. Create Master Project
   - Require: labId, funderId, accountId(s)
   - Optional: grantName, grantNumber, grantReference
   - Set: principalInvestigatorIds, coPIIds, teamMemberIds, teamRoles
   - Budget: totalBudget, currency, startDate, endDate
   - Auto-init: progress=0, spentAmount=0, status="planning"
   - Update lab.activeProjectCount ++

2. Create Work Packages
   - Belong to masterProjectId
   - Own: name, startDate, endDate, importance, owner (PersonProfile ID)
   - Track: progress, status, tasks[]

3. Create Tasks
   - Belong to workpackageId
   - Own: name, importance, primaryOwner, helpers, deliverables
   - Support: subtasks[], todos[], dependencies

4. Progress Cascade
   - todos (checked) → subtask.progress
   - subtasks → task.progress
   - tasks → workpackage.progress
   - workpackages → masterProject.progress

5. Team Management
   - principalInvestigatorIds (can modify project)
   - coPIIds (assistant PIs)
   - teamMemberIds (contributors)
   - teamRoles: { personId: "PI" | "Co-PI" | "Postdoc" | "PhD" | "RA" | "Collaborator" | "Support" }
```

**Financial Integration**:
```
MasterProject
  ├─ funderId → Funder (type: public/private/charity/industry/eu/government/internal/other)
  ├─ accountIds: string[] → FundingAccount[] (can have multiple accounts per project)
  │   ├─ Account 1: Main Budget
  │   ├─ Account 2: Equipment Budget
  │   ├─ Account 3: Travel Budget
  │   └─ Account 4: Personnel Budget
  └─ Budget Tracking:
      ├─ totalBudget (sum of all accounts)
      ├─ spentAmount (sum of orders with status="received")
      ├─ committedAmount (sum of orders with status="ordered")
      └─ remainingBudget = totalBudget - spentAmount - committedAmount
```

### People Management Implementation

**Location**: `/home/user/Momentum/components/views/ProfileManagement.tsx`

```typescript
function ProfileManagement({
  currentUser?: User | null,
  currentUserProfile?: PersonProfile | null
}): JSX.Element {
  // State
  const allProfiles = useProfiles(currentUserProfile?.lab)
  const [selectedProfile, setSelectedProfile]: [PersonProfile | null, ...]
  const [isDialogOpen, setIsDialogOpen]: [boolean, ...]
  const [isEditing, setIsEditing]: [boolean, ...]
  const [searchTerm, setSearchTerm]: [string, ...]

  // Filters
  const [filterLab, setFilterLab]: [string, ...]       // "all" or Lab name
  const [filterInstitute, setFilterInstitute]: [string, ...]
  const [filterOrganisation, setFilterOrganisation]: [string, ...]

  // Form state
  const [formData, setFormData]: [Partial<PersonProfile>, ...]
    // firstName, lastName, email, phone, officeLocation
    // position, organisation, institute, lab
    // reportsTo, fundedBy, startDate
    // researchInterests[], qualifications[]
    // positionLevel (NEW)
    // isPrincipalInvestigator (NEW)
    // masterProjectIds[], masterProjectRoles{}

  // Handlers
  canEditProfile(profile): boolean  // Self or admin
  saveProfiles(profiles): void      // localStorage + event dispatch
  handleCreateNew(): void
  handleAddProject(profile): void   // Assign to master project
  handleDelete(profile): void
  handleSave(formData): void

  return (
    <div>
      {/* Search & Filters */}
      <Input placeholder="Search..." value={searchTerm} />
      <Select value={filterLab} onValueChange={setFilterLab}>
        <option value="all">All Labs</option>
        {labs.map(lab => <option key={lab}>{lab}</option>)}
      </Select>
      {/* Similar for institute, organisation */}

      {/* Profile Cards Grid */}
      {filteredProfiles.map(profile => (
        <ProfileCard
          profile={profile}
          onEdit={() => { setSelectedProfile(profile); setIsEditing(true); }}
          onDelete={() => handleDelete(profile)}
          canEdit={canEditProfile(profile)}
        />
      ))}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <PersonProfileForm
            initialData={selectedProfile || formData}
            onSubmit={handleSave}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**PersonProfile Fields Managed**:
```typescript
// Basic Info
firstName, lastName, email, phone, officeLocation, position

// Organizational Hierarchy (NEW - IDs instead of names)
organisationId, organisationName     // Cached for display
instituteId, instituteName
labId, labName

// Position & Career
positionLevel: PositionLevel (enum with 21 levels)
positionDisplayName: string          // Cached from PositionLevel
reportsToId: string | null           // Supervisory chain

// PI Status & Projects (NEW)
isPrincipalInvestigator: boolean
masterProjectIds: string[]           // Projects person is on
masterProjectRoles: { [projectId]: ProjectRole }

// Profile Completion
startDate, researchInterests[], qualifications[], notes
profileComplete, onboardingComplete, isAdministrator

// OAuth
orcidId, orcidUrl, orcidVerified

// Legacy (Deprecated)
organisation, institute, lab (kept for backward compat)
fundedBy, reportsTo (use IDs instead)
projects, principalInvestigatorProjects (use new fields)
```

**Access Control** in ProfileManagement:
```typescript
const canEditProfile = (profile: PersonProfile): boolean => {
  if (!currentUserProfile) return false

  // Admin can edit anyone
  if (currentUserProfile.isAdministrator || currentUser?.isAdministrator)
    return true

  // Users can only edit their own profile
  return profile.id === currentUserProfile.id || 
         profile.userId === currentUser?.id
}
```

---

## 8. EXISTING FUNDING & FINANCIAL TRACKING FEATURES

### Current Funding Implementation

**Funding Types** (`lib/types.ts`):
```typescript
interface Funder {
  id, name
  type: "public" | "private" | "charity" | "internal" | "government" | "industry" | "eu" | "other"
  programme, reference               // Grant/Call info
  currency, startDate, endDate
  abbreviation, country, website, logoUrl, contactInfo, notes
  createdAt, createdBy, updatedAt
  organisationId?: string            // Link to organisation if internal
}

interface FundingAccount {
  id, accountNumber, accountName
  funderId, masterProjectId         // Links
  accountType?: "main" | "equipment" | "consumables" | "travel" | "personnel" | "other"
  totalBudget, spentAmount, committedAmount, remainingBudget
  currency, startDate, endDate
  status: "active" | "closed" | "suspended" | "pending"
  notes, createdAt, createdBy, updatedAt
}
```

**Firestore Services** (`lib/firestoreService.ts`):
```typescript
// Funder operations
createFunder(funderData): Promise<string>
getFunders(orgId?): Promise<Funder[]>
updateFunder(funderId, updates): Promise<void>
deleteFunder(funderId): Promise<void>

// Funding Account operations
createFundingAccount(accountData): Promise<string>
getFundingAccounts(filters?: { masterProjectId?, funderId? }): Promise<FundingAccount[]>
updateFundingAccount(accountId, updates): Promise<void>
deleteFundingAccount(accountId): Promise<void>
```

**Budget Tracking in Orders**:
```typescript
interface Order {
  // Funding linkage (REQUIRED)
  accountId: string                 // REQUIRED: Which account pays
  accountName: string               // Cached
  funderId: string                  // Cached from account
  funderName: string                // Cached
  masterProjectId: string           // Cached from account
  masterProjectName: string         // Cached

  // Pricing
  priceExVAT: number
  vatAmount?: number
  totalPrice?: number
  currency: string

  // Metadata
  invoiceNumber?: string
  poNumber?: string                 // Purchase order number
  category, subcategory
}
```

**Budget Calculation Flow**:
```
1. Create Order (status="to-order")
   ├─ Link to FundingAccount via accountId
   └─ No budget impact yet (not committed)

2. Update to status="ordered"
   ├─ FundingAccount.committedAmount += order.totalPrice
   └─ remainingBudget = total - spent - committed

3. Update to status="received"
   ├─ FundingAccount.spentAmount += order.totalPrice
   ├─ FundingAccount.committedAmount -= order.totalPrice
   └─ Create InventoryItem (cost tracking)

4. FundingAccount Budget View:
   ├─ Total Budget: $100,000
   ├─ Spent: $45,000 (received orders)
   ├─ Committed: $20,000 (pending orders)
   └─ Remaining: $35,000
```

**Legacy Funding Accounts** (Deprecated):
```typescript
// Constants still in code but not used for new orders
const FUNDING_ACCOUNTS = [
  { id: "club", name: "CLuB", accountNumber: "1735578" },
  { id: "bcr", name: "BCR", accountNumber: "4627784" },
  { id: "deans", name: "Deans", accountNumber: "74738383" },
  { id: "account4", name: "Account_4", accountNumber: "4838949" },
]
```

**Budget Visibility in UI**:
- **ProjectDashboard**: Shows master project budget vs. spent/committed
- **OrdersInventory**: Shows account balance when creating orders
- **PersonalProfilePage**: Shows person's funded projects

### Financial Reporting Capability
- Order status tracking (to-order → ordered → received)
- Supplier cost comparison (price per item)
- Budget forecasting (burn rate = committed + pending)
- Equipment consumption tracking (supplies with burn rates)
- Inventory cost basis (last received price)

### Gaps in Current Implementation
- No invoice reconciliation
- No budget overrun alerts
- No cost allocation across multiple accounts
- No budget carry-over/rollover rules
- No financial reporting dashboard
- No export to accounting systems
- No multi-currency conversion
- No cost centre/project code tracking for GL

---

## TECHNOLOGY & DEPLOYMENT STACK

### Development Stack
```json
{
  "Frontend": "Next.js 14, React 18, TypeScript, Tailwind",
  "UI Library": "Radix UI + shadcn/ui",
  "State": "Zustand + React Hooks",
  "Validation": "Zod",
  "Visualization": "D3.js, Recharts, Gantt Task React",
  "Backend": "Firebase (Auth, Firestore, Storage, Cloud Functions)",
  "Icons": "Lucide React",
  "Dates": "date-fns",
  "Drag-Drop": "@dnd-kit",
  "Build": "webpack (Next.js built-in)",
  "DevTools": "ESLint, Prettier (configured)"
}
```

### Deployment
- **Hosting**: Firebase Hosting (static export)
- **Database**: Firestore
- **Auth**: Firebase Auth
- **Storage**: Firebase Storage
- **Functions**: Cloud Functions (Node.js, TypeScript)
- **Build Script**: `npm run build && firebase deploy --only hosting`

### Environment Variables Required
```env
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
ORCID_CLIENT_ID (for Cloud Functions)
ORCID_CLIENT_SECRET (for Cloud Functions)
```

### Build Output
- ✅ Static build (251 kB gzipped)
- ✅ Next.js 14 SSG/ISR capable
- ✅ PWA-ready (offline support)
- ✅ TypeScript strict mode

---

## KEY IMPLEMENTATION NOTES FOR GDPR & FUNDING OVERHAUL

### Existing Strengths
1. ✅ Audit trail infrastructure (AuditTrail collection exists)
2. ✅ Organizational hierarchy supports multi-tenancy
3. ✅ Funding model is partially built (Funder/FundingAccount types)
4. ✅ Budget tracking in orders
5. ✅ ORCID integration for researcher ID
6. ✅ Firestore rules for access control
7. ✅ Cloud Functions for backend logic

### Gaps to Address for GDPR
1. ❌ No data export/portability endpoint
2. ❌ No user deletion/anonymization workflow
3. ❌ No consent management
4. ❌ No data retention policies
5. ❌ No automated purging of audit logs
6. ❌ No PII encryption at rest
7. ❌ No data classification/tagging
8. ❌ No breach notification system
9. ❌ No DPA/processing agreement tracking
10. ❌ No cookie consent banner
11. ❌ No right-to-be-forgotten implementation
12. ❌ No data residency enforcement

### Gaps to Address for Funding System
1. ❌ No budget forecasting/reporting dashboard
2. ❌ No budget overrun alerts
3. ❌ No invoice reconciliation
4. ❌ No cost allocation across multiple accounts
5. ❌ No financial export (GL, CSV, PDF)
6. ❌ No procurement rules/approval workflows
7. ❌ No multi-currency handling
8. ❌ No cost centre tracking
9. ❌ No supplier/vendor management
10. ❌ No payment method tracking
11. ❌ No tax/VAT compliance rules
12. ❌ No budget line-item forecasting
13. ❌ No funded headcount tracking
14. ❌ No grant-specific compliance reporting

---

## FILE MANIFEST

### Critical Files for Architecture Understanding

```
Core Application
├── /home/user/Momentum/app/page.tsx                    (222 lines) - Main shell
├── /home/user/Momentum/lib/types.ts                    (1,268 lines) - All type definitions
├── /home/user/Momentum/lib/firestoreService.ts         (1,400+ lines) - Database operations
├── /home/user/Momentum/lib/validationSchemas.ts        (600+ lines) - Zod schemas
├── /home/user/Momentum/lib/constants.ts                (300+ lines) - App constants

Security & Authentication
├── /home/user/Momentum/firestore.rules                 (460 lines) - Firestore security
├── /home/user/Momentum/storage.rules                   (52 lines) - Storage security
├── /home/user/Momentum/lib/firebase.ts                 (37 lines) - Firebase init
├── /home/user/Momentum/lib/hooks/useAuth.ts            (162 lines) - Auth logic
├── /home/user/Momentum/firebase/functions/src/index.ts (278 lines) - ORCID OAuth

State Management
├── /home/user/Momentum/lib/AppContext.tsx              (51 lines) - Context provider
├── /home/user/Momentum/lib/store.ts                    (100+ lines) - Zustand store
├── /home/user/Momentum/lib/hooks/useProjects.ts        (110+ lines) - Project state
├── /home/user/Momentum/lib/hooks/useOrders.ts          (100+ lines) - Order state
├── /home/user/Momentum/lib/hooks/useAuth.ts            (162 lines) - Auth state

Views
├── /home/user/Momentum/components/views/ProjectDashboard.tsx         (30k+ lines)
├── /home/user/Momentum/components/views/PeopleView.tsx               (23k lines)
├── /home/user/Momentum/components/views/OrdersInventory.tsx          (19k lines)
├── /home/user/Momentum/components/views/ProfileManagement.tsx        (52k lines)
├── /home/user/Momentum/components/views/ElectronicLabNotebook.tsx    (17k lines)
├── /home/user/Momentum/components/views/EquipmentManagement.tsx      (1.8k lines)
├── /home/user/Momentum/components/views/DayToDayBoard.tsx            (19k lines)
├── /home/user/Momentum/components/views/CalendarEvents.tsx           (10k lines)

Configuration
├── /home/user/Momentum/package.json                    - Dependencies
├── /home/user/Momentum/firestore.indexes.json          - Firestore indexes
├── /home/user/Momentum/firebase.json                   - Firebase config
├── /home/user/Momentum/next.config.js                  - Next.js config
├── /home/user/Momentum/tailwind.config.ts              - Tailwind config

Documentation
├── /home/user/Momentum/README.md                       - Project overview
├── /home/user/Momentum/CALENDAR_INTEGRATION_PLAN.md    - Feature plan
├── /home/user/Momentum/QUICK_REFERENCE.md              - Quick start
└── /home/user/Momentum/SETUP_FIREBASE_ENV.md           - Setup guide
```

---

## Summary

**Momentum** is a sophisticated, well-architected Next.js + Firebase research lab management system with:
- **Strong foundations**: TypeScript, Firestore, Cloud Functions, Firebase Rules
- **Complex domain modeling**: Multi-level organizational hierarchy, funding, projects, ELN, equipment
- **Real-time sync**: Firebase subscriptions across all collections
- **Accessibility**: Radix UI components, keyboard navigation, ORCID integration
- **Ready for expansion**: Clear patterns for adding GDPR compliance and advanced funding features

The codebase demonstrates professional patterns (separation of concerns, custom hooks, Zod validation, Firestore rules, Cloud Functions) making it suitable for implementing the requested GDPR and funding system enhancements.

