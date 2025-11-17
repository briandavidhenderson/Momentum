# Project Management Redesign: Comprehensive Analysis & Implementation Plan

**Date:** 2025-01-17
**Status:** Design Proposal
**Priority:** Critical - Core Feature Redesign

---

## Executive Summary

This document provides a comprehensive analysis and redesign plan for Momentum's project management system. The goal is to create a hierarchical, interactive, and visually brilliant system that feels intuitive for research labs managing complex work across projects, workpackages, deliverables, and daily tasks.

### Key Problems Identified

1. **Naming Confusion:** "Task" is overloaded - used for both project-level work items and personal daily Kanban items
2. **Weak Hierarchy:** Current structure doesn't clearly represent Project → Workpackage → Deliverable → Task relationships
3. **Limited Interactivity:** Small click targets, minimal expand/collapse, lacks drag-and-drop
4. **Poor Cross-Linking:** Orders, Day-to-Day tasks, and project entities are disconnected
5. **Unclear Domain Model:** Multiple overlapping types (Project, MasterProject, ProfileProject) create confusion

### Proposed Solution

A clear 5-level hierarchy with explicit terminology, rich interactions, and strong cross-linking:
- **Project** (top-level research initiative)
- **Workpackage** (structured unit of work)
- **Deliverable** (concrete outcome)
- **ProjectTask** (optional granular steps)
- **DayToDayTask** (personal Kanban items)

---

## Part 1: Current State Analysis

### 1.1 Current Type Structure

#### Project Types (`lib/types/project.types.ts`)

**Issues Found:**
- Three overlapping types: `Project`, `MasterProject`, `ProfileProject`
- `ProfileProject` is marked DEPRECATED but still in use
- `Project` has a `kind` field ("master" | "regular") creating confusion
- Tasks live in `Project.tasks` and `Workpackage.tasks` - ambiguous ownership

**Current Structure:**
```typescript
// Three different project types (confusing!)
interface ProfileProject { ... }  // DEPRECATED
interface MasterProject { ... }   // Preferred
interface Project { ... }         // Legacy
```

#### Task Types (`lib/types/task.types.ts`)

**Issues Found:**
- `Task` interface used for project-level tasks only
- Has `workpackageId` field, suggesting tasks belong to workpackages
- Contains `Deliverable` interface (good!) but deliverables aren't prominently used in UI
- `Subtask` and `Todo` exist but rarely used

**Current Structure:**
```typescript
interface Task {
  workpackageId: string  // ✅ Correct - tasks belong to workpackages
  deliverables: Deliverable[]  // ✅ Good structure
  subtasks?: Subtask[]  // ❌ Rarely used, confusing
}

interface Deliverable {
  name: string
  progress: number
  status?: WorkStatus
  ownerId?: string
}
```

#### Day-to-Day Task Types (`lib/dayToDayTypes.ts`)

**Issues Found:**
- Well-defined but called "DayToDayTask" in code, just "Tasks" in UI
- Has linking fields (`linkedProjectId`, `linkedTaskId`) but not prominently displayed
- No reverse mapping from projects to day-to-day tasks

**Current Structure:**
```typescript
interface DayToDayTask {
  // ✅ Good separation
  linkedProjectId?: string
  linkedTaskId?: string
  // ❌ But links are buried and not visually prominent
}
```

#### Workpackage Types (`lib/types/workpackage.types.ts`)

**Issues Found:**
- Links to `profileProjectId` (deprecated ProfileProject)
- Contains `tasks: Task[]` - this is correct!
- Has `regularProjects?: Project[]` - confusing nested structure

#### Order Types (`lib/types/order.types.ts`)

**Issues Found:**
- Orders have no explicit link to Project/Workpackage/Deliverable
- `linkedOrderIds` exist on Task/Subtask but no reverse mapping
- No UI for viewing orders from project context

---

### 1.2 Current Component Analysis

#### `components/views/ProjectDashboard.tsx`

**Current Behavior:**
- Lists projects in a table/grid
- Basic expand/collapse for workpackages
- Minimal interactivity

**Issues:**
- Small click targets (icons only)
- No drill-down to deliverable level
- No linked orders view
- No connection to day-to-day tasks
- Limited visual hierarchy

#### `components/views/ProjectDetailPage.tsx`

**Current Behavior:**
- Dedicated page for single project
- Shows workpackages and tasks
- Gantt chart integration

**Issues:**
- Full page navigation (heavy)
- Deliverables not prominently shown
- No order integration
- Missing project health indicators

#### `components/WorkpackageDialog.tsx`

**Current Behavior:**
- Modal for creating/editing workpackages
- Recently improved with error handling

**Issues:**
- Doesn't show deliverables clearly
- No order linking
- Limited task management within

#### `components/views/DayToDayBoard.tsx`

**Current Behavior:**
- Kanban board (To Do / Working / Done)
- Drag-and-drop working well
- Recently added Lab Polls tab

**Issues:**
- Links to projects are minimal
- Can't easily create day-to-day task from a deliverable
- No reverse visibility (project → day-to-day tasks)

---

## Part 2: Proposed Domain Model

### 2.1 New Type Structure

#### Core Principle
**One entity type per level of hierarchy, with clear names**

```
Project
  ↓ contains
Workpackage
  ↓ contains
Deliverable
  ↓ optionally contains
ProjectTask (granular steps)

Separate:
DayToDayTask (personal Kanban, can link to any level above)
```

### 2.2 Revised TypeScript Interfaces

#### `lib/types/project.types.ts` (REVISED)

```typescript
/**
 * Project - Top-level research initiative
 * Replaces: MasterProject, ProfileProject, Project
 * Consolidates all project-related functionality
 */
export interface Project {
  id: string
  name: string
  description?: string

  // Organizational Links
  labId: string
  labName: string
  instituteId: string
  instituteName: string
  organisationId: string
  organisationName: string

  // Grant & Funding
  grantName?: string
  grantNumber?: string
  grantReference?: string

  // Financial (calculated from orders & allocations)
  totalBudget?: number
  spentAmount?: number
  committedAmount?: number
  remainingBudget?: number
  currency: string

  // Dates
  startDate: string
  endDate: string

  // Funding Accounts
  funderId: string              // Primary funder
  funderName: string
  accountIds: string[]          // Multiple funding accounts

  // Team
  principalInvestigatorIds: string[]  // PI PersonProfile IDs
  coPIIds: string[]
  teamMemberIds: string[]
  teamRoles: {
    [personProfileId: string]: ProjectRole
  }

  // Structure
  workpackageIds: string[]      // ONLY workpackages (no direct tasks)

  // Status & Health
  status: "planning" | "active" | "completed" | "on-hold" | "cancelled"
  health?: "good" | "warning" | "at-risk"
  progress: number  // 0-100, calculated from workpackages

  // Visibility
  visibility: "private" | "lab" | "institute" | "organisation"
  visibleTo?: string[]

  // Metadata
  researchArea?: string
  tags?: string[]
  notes?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string

  // UI State
  isExpanded?: boolean  // For dashboard
}

// Remove: ProfileProject (deprecated)
// Remove: Project.kind field (no longer needed)
// Remove: Project.tasks (tasks belong to workpackages only)
```

#### `lib/types/workpackage.types.ts` (REVISED)

```typescript
/**
 * Workpackage - Structured unit of work within a project
 * Contains deliverables (not tasks directly)
 */
export interface Workpackage {
  id: string
  name: string
  projectId: string  // Changed from profileProjectId

  // Dates
  start: Date
  end: Date

  // Progress & Status
  progress: number  // 0-100, calculated from deliverables
  status: "planning" | "active" | "at-risk" | "completed" | "on-hold"

  // Ownership
  ownerId?: string  // PersonProfile ID responsible

  // Structure
  deliverableIds: string[]  // CRITICAL: Workpackages contain deliverables, not tasks

  // Metadata
  importance: ImportanceLevel
  notes?: string
  colorHex?: string
  tags?: string[]

  // UI State
  isExpanded?: boolean
}

// Remove: Workpackage.tasks (deliverables own tasks now)
// Remove: Workpackage.regularProjects (confusing nesting)
```

#### `lib/types/deliverable.types.ts` (NEW FILE)

```typescript
/**
 * Deliverable - Concrete outcome within a workpackage
 * This is the primary unit of "what we're producing"
 * Examples: Paper draft, Dataset, Experiment protocol, Grant application
 */
export interface Deliverable {
  id: string
  name: string
  description?: string
  workpackageId: string  // Parent workpackage

  // Dates & Progress
  dueDate?: string
  startDate?: string
  progress: number  // 0-100, calculated from project tasks or manual
  status: WorkStatus

  // Ownership
  ownerId?: string  // PersonProfile ID responsible
  contributorIds?: string[]  // Other team members

  // Structure
  projectTaskIds?: string[]  // Optional: granular steps to complete this deliverable

  // Linked Entities
  linkedOrderIds?: string[]  // Orders required for this deliverable
  linkedDayToDayTaskIds?: string[]  // Personal tasks working on this
  linkedELNExperimentIds?: string[]  // ELN experiments related
  linkedDocumentUrls?: DeliverableLink[]  // Google Docs, etc.

  // Quality & Review
  reviewHistory?: DeliverableReview[]
  metrics?: DeliverableMetric[]
  blockers?: string[]

  // Metadata
  notes?: string
  tags?: string[]
  importance: ImportanceLevel
  createdAt: string
  createdBy: string
  updatedAt?: string
  lastUpdatedBy?: string

  // UI State
  isExpanded?: boolean
}

/**
 * DeliverableLink - External resource link
 */
export interface DeliverableLink {
  id: string
  provider: "google-drive" | "onedrive" | "url" | "github"
  title: string
  url: string
  lastChecked?: string
}

/**
 * DeliverableReview - Review record
 */
export interface DeliverableReview {
  id: string
  reviewerId: string  // PersonProfile ID
  reviewedAt: string
  summary?: string
  notes?: string
  approved: boolean
}

/**
 * DeliverableMetric - Quantifiable metric
 */
export interface DeliverableMetric {
  id: string
  label: string
  value: string
  unit?: string
}
```

#### `lib/types/task.types.ts` (REVISED - RENAMED TO PROJECT TASK)

```typescript
/**
 * ProjectTask - Optional granular step within a deliverable
 * Use sparingly - most deliverables don't need sub-tasks
 *
 * RENAMED FROM: Task (to avoid confusion with DayToDayTask)
 *
 * Examples:
 * - "Write introduction section" (for deliverable "Draft paper")
 * - "Prepare samples" (for deliverable "Run Western blot")
 * - "Review literature" (for deliverable "Background research")
 */
export interface ProjectTask {
  id: string
  name: string
  deliverableId: string  // Changed from workpackageId - tasks belong to deliverables

  // Dates & Progress
  start: Date
  end: Date
  progress: number  // 0-100
  status: WorkStatus

  // Ownership
  primaryOwner?: string  // PersonProfile ID
  helpers?: string[]  // PersonProfile IDs

  // Structure
  todos?: ProjectTaskTodo[]  // Simple checklist items

  // Linked Entities
  linkedOrderIds?: string[]
  linkedDayToDayTaskIds?: string[]  // Day-to-day tasks working on this

  // Metadata
  importance: ImportanceLevel
  notes?: string
  tags?: string[]
  type?: "experiment" | "writing" | "meeting" | "analysis" | "admin"
  dependencies?: string[]  // Other ProjectTask IDs

  // UI State
  isExpanded?: boolean
}

/**
 * ProjectTaskTodo - Simple checklist item within a project task
 * RENAMED FROM: Todo (for clarity)
 */
export interface ProjectTaskTodo {
  id: string
  text: string
  completed: boolean
  completedBy?: string  // PersonProfile ID
  completedAt?: string
  order: number
}

// REMOVED: Subtask (confusing extra level)
// REMOVED: Deliverable from this file (now in deliverable.types.ts)
```

#### `lib/types/daytoday.types.ts` (RENAMED & REVISED)

```typescript
/**
 * DayToDayTask - Personal daily Kanban task
 * Lives on the Day-to-Day board (To Do / Working / Done)
 * Can link to project entities but is primarily for personal work tracking
 *
 * RENAMED FROM: lib/dayToDayTypes.ts → lib/types/daytoday.types.ts
 */
export interface DayToDayTask {
  id: string
  title: string
  description?: string

  // Status (Kanban columns)
  status: "todo" | "working" | "done"

  // Ownership
  assigneeId?: string  // PersonProfile ID (for team tasks)
  createdBy: string  // User ID (creator)
  watcherIds?: string[]  // PersonProfile IDs watching

  // Dates & Priority
  dueDate?: Date
  importance: ImportanceLevel

  // Linking to Project Hierarchy (ENHANCED)
  linkedProjectId?: string  // Top-level project
  linkedWorkpackageId?: string  // Specific workpackage
  linkedDeliverableId?: string  // Specific deliverable (PREFERRED)
  linkedProjectTaskId?: string  // Specific project task

  // Other Links
  relatedELNExperimentId?: string
  relatedOrderId?: string
  equipmentId?: string  // For equipment maintenance tasks

  // Task Type
  taskType?: EquipmentTaskType | "ORDER_REQUEST" | "EXPERIMENT" | "GENERAL"

  // Metadata
  tags?: string[]
  order: number  // For manual ordering within column
  labId?: string
  createdAt: Date
  updatedAt: Date

  // Equipment metadata (if taskType is equipment-related)
  metadata?: {
    maintenanceHealth?: number
    weeksRemaining?: number
    suggestedQty?: number
    estimatedCost?: number
  }
}

export type TaskStatus = "todo" | "working" | "done"

export interface DayToDayColumn {
  id: TaskStatus
  title: string
  tasks: DayToDayTask[]
}
```

#### `lib/types/order.types.ts` (REVISED)

```typescript
/**
 * Order - Purchase request for lab supplies/equipment
 * Can be linked to project entities for tracking and budgeting
 */
export interface Order {
  id: string

  // Product Info
  productName: string
  catNum: string
  supplier?: string
  priceExVAT: number
  currency: string
  qty?: number

  // Status
  status: OrderStatus  // "to-order" | "ordered" | "received"

  // Dates
  orderedDate?: Date
  expectedDeliveryDate?: Date
  receivedDate?: Date

  // Ownership
  orderedBy: string  // User ID
  orderedByName?: string  // Cached

  // Funding
  accountId?: string
  accountName?: string
  funderId?: string
  funderName?: string
  fundingAllocationId?: string
  allocationName?: string

  // Project Linking (NEW - CRITICAL)
  linkedProjectId?: string
  linkedWorkpackageId?: string
  linkedDeliverableId?: string  // PREFERRED: link to specific deliverable
  linkedProjectTaskId?: string

  // Metadata
  notes?: string
  createdAt: Date
  updatedAt?: Date

  // Drag-and-drop
  order?: number
}
```

---

### 2.3 Firestore Collections (Revised)

```
/projects/{projectId}
  - Contains: Project data
  - Denormalized: team names, funder names, calculated budgets

/workpackages/{workpackageId}
  - Contains: Workpackage data
  - Foreign key: projectId
  - Denormalized: progress calculated from deliverables

/deliverables/{deliverableId}  ← NEW COLLECTION
  - Contains: Deliverable data
  - Foreign key: workpackageId
  - Denormalized: progress, status

/projectTasks/{projectTaskId}  ← RENAMED FROM /tasks
  - Contains: ProjectTask data (optional granular steps)
  - Foreign key: deliverableId
  - Sparse collection (many deliverables won't have project tasks)

/dayToDayTasks/{taskId}
  - Contains: DayToDayTask data
  - Foreign keys: linkedProjectId, linkedWorkpackageId, linkedDeliverableId

/orders/{orderId}
  - Contains: Order data
  - NEW Foreign keys: linkedProjectId, linkedWorkpackageId, linkedDeliverableId
```

---

## Part 3: UI/UX Redesign

### 3.1 Project Management Dashboard

#### Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ Project Management Dashboard                      [+ New]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─ Project: Neural Network Training Platform ──────────┐    │
│ │  Status: Active | Progress: 67% | Health: ⚠️ Warning  │    │
│ │  PI: Dr. Smith | Budget: £45k / £60k | 3 months left │    │
│ │                                                        │    │
│ │  [Workpackages ▼]                                     │    │
│ │                                                        │    │
│ │  ┌─ WP1: Data Collection ──────────────────────┐     │    │
│ │  │  Progress: 85% | Owner: Alice | Due: Mar 15  │     │    │
│ │  │                                               │     │    │
│ │  │  [Deliverables ▼]                            │     │    │
│ │  │                                               │     │    │
│ │  │  • D1.1: Training Dataset                    │     │    │
│ │  │    Status: ✅ Complete | Owner: Alice        │     │    │
│ │  │    [Linked: 2 orders, 3 day-to-day tasks]   │     │    │
│ │  │                                               │     │    │
│ │  │  • D1.2: Validation Dataset                  │     │    │
│ │  │    Status: 🟡 In Progress (60%) | Owner: Bob │     │    │
│ │  │    [Expand for details ▼]                    │     │    │
│ │  │                                               │     │    │
│ │  │    ┌─ Details Panel ────────────────┐        │     │    │
│ │  │    │ Description: ...                │        │     │    │
│ │  │    │                                 │        │     │    │
│ │  │    │ Linked Orders (2):             │        │     │    │
│ │  │    │   - GPU Server (£5k) [Ordered] │        │     │    │
│ │  │    │   - Storage Array [To Order]   │        │     │    │
│ │  │    │                                 │        │     │    │
│ │  │    │ Day-to-Day Tasks (3):          │        │     │    │
│ │  │    │   - Clean datasets [Done]      │        │     │    │
│ │  │    │   - Run validation [Working]   │        │     │    │
│ │  │    │   - Write report [To Do]       │        │     │    │
│ │  │    │                                 │        │     │    │
│ │  │    │ Project Tasks (optional):      │        │     │    │
│ │  │    │   - [ ] Load raw data          │        │     │    │
│ │  │    │   - [x] Apply filters          │        │     │    │
│ │  │    │   - [ ] Split train/test       │        │     │    │
│ │  │    │                                 │        │     │    │
│ │  │    │ [Create Order] [Link Task]     │        │     │    │
│ │  │    └─────────────────────────────────┘        │     │    │
│ │  │                                               │     │    │
│ │  └───────────────────────────────────────────────┘     │    │
│ │                                                        │    │
│ │  ┌─ WP2: Model Development ───────────────────┐       │    │
│ │  │  [Click to expand workpackage]             │       │    │
│ │  └────────────────────────────────────────────┘       │    │
│ │                                                        │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                               │
│ ┌─ Project: Lab Safety Audit ─────────────────────────┐      │
│ │  [Click anywhere to expand]                         │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### Interaction Model

**Project Level:**
- **Click anywhere on project card** → Expand workpackages accordion
- **Click project name** → Open side panel with full details
- **Hover** → Show quick stats tooltip
- **Drag handle** → Reorder projects

**Workpackage Level:**
- **Click workpackage bar** → Expand deliverables
- **Click WP name** → Open side panel
- **Drag handle** → Reorder within project

**Deliverable Level:**
- **Click deliverable** → Expand details panel (in-place)
- **"Create Order" button** → Opens OrderFormDialog pre-linked to this deliverable
- **"Link Task" button** → Opens selector to link existing day-to-day task
- **"Create Day-to-Day Task" button** → Creates new task pre-linked

**Linked Items (Orders & Tasks):**
- **Click order badge** → Open order edit dialog
- **Click day-to-day task badge** → Navigate to Day-to-Day board with task highlighted
- **Click project task checkbox** → Toggle completion

---

### 3.2 Side Panel Design

When user clicks a project/workpackage/deliverable name, open a slide-out panel (not a new page):

```
┌──────────────────────────────────────────────┐
│ [X] Close                                    │
│                                              │
│ Neural Network Training Platform             │
│ Project Details                              │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                              │
│ [Overview] [Team] [Budget] [Timeline]       │
│                                              │
│ Overview                                     │
│ ┌────────────────────────────────────────┐  │
│ │ Status: Active                         │  │
│ │ Progress: 67%                          │  │
│ │ Health: ⚠️ Warning - 2 overdue items   │  │
│ │                                        │  │
│ │ Start: Jan 1, 2025                     │  │
│ │ End: Jun 30, 2025                      │  │
│ │ Time Remaining: 3 months               │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Description                                  │
│ ┌────────────────────────────────────────┐  │
│ │ Developing a neural network training   │  │
│ │ platform for large-scale ML models...  │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Quick Stats                                  │
│ ┌────────────────────────────────────────┐  │
│ │ Workpackages: 3 (2 active, 1 complete) │  │
│ │ Deliverables: 8 (5 done, 2 in progress,│  │
│ │               1 not started)           │  │
│ │ Orders: 12 (5 received, 4 ordered,     │  │
│ │            3 to order)                 │  │
│ │ Day-to-Day Tasks: 15 linked            │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Recent Activity                              │
│ • Bob completed "Validation Dataset"         │
│ • Alice ordered "GPU Server" (£5k)           │
│ • Charlie started work on D2.1               │
│                                              │
│ [Edit Project] [View Gantt] [Export]         │
│                                              │
└──────────────────────────────────────────────┘
```

**Panel Tabs:**
- **Overview:** Status, progress, stats
- **Team:** Members, roles, workload
- **Budget:** Funding accounts, spending, projections
- **Timeline:** Gantt chart, milestones

---

### 3.3 Day-to-Day Board Integration

#### Enhanced Task Card

Current day-to-day task cards should show project links prominently:

```
┌─────────────────────────────────────────────┐
│ [Drag Handle]  Clean validation datasets    │
│                                             │
│ 📁 Neural Network Platform                  │
│    WP1: Data Collection                     │
│    → D1.2: Validation Dataset              │
│                                             │
│ Due: Tomorrow | Importance: High            │
│ Assigned: Alice                             │
│                                             │
│ [Comments] [Edit] [More ...]                │
└─────────────────────────────────────────────┘
```

**Click on project link** → Opens side panel with deliverable details

#### Create Day-to-Day Task from Deliverable

In deliverable expanded view, add button:

```
[+ Create Day-to-Day Task]
```

This opens the task creation dialog with:
- Pre-filled title suggestion
- Pre-linked to project/workpackage/deliverable
- Suggested due date based on deliverable deadline

---

### 3.4 Orders Integration

#### From Deliverable View

Show linked orders inline:

```
Deliverable: Validation Dataset
Progress: 60%

Linked Orders (2)
┌─────────────────────────────────────────────┐
│ GPU Server | £5k | Status: Ordered          │
│ Expected: Mar 10 | Supplier: TechCorp       │
│ [Edit Order] [Unlink]                       │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Storage Array | £2k | Status: To Order      │
│ [Create Order Now] [Unlink]                 │
└─────────────────────────────────────────────┘

[+ Create New Order for this Deliverable]
```

**Click "Create Order":**
- Opens `OrderFormDialog`
- Auto-fills `linkedDeliverableId`
- Pre-selects funding account from project
- Pre-fills `linkedProjectId`, `linkedWorkpackageId`

#### From Orders View

Add reverse mapping column:

```
Orders & Inventory
┌─────────────────────────────────────────────────────────┐
│ Product      | Price | Status   | Project Link          │
├─────────────────────────────────────────────────────────┤
│ GPU Server   | £5k   | Ordered  | 📁 Neural Network /   │
│              |       |          |    WP1 / D1.2         │
│              |       |          |    [View Deliverable] │
└─────────────────────────────────────────────────────────┘
```

**Click "View Deliverable":**
- Opens project dashboard
- Auto-expands to deliverable
- Highlights the deliverable

---

## Part 4: Implementation Plan

### 4.1 Phase 1: Type Refactoring & Database Migration (Week 1-2)

**Priority: CRITICAL - Foundation**

#### Step 1.1: Create New Type Files

**Files to create:**
- `lib/types/deliverable.types.ts` (new)
- `lib/types/daytoday.types.ts` (renamed from `lib/dayToDayTypes.ts`)

**Files to modify:**
- `lib/types/project.types.ts` - Consolidate into single `Project` interface
- `lib/types/workpackage.types.ts` - Change to contain `deliverableIds`
- `lib/types/task.types.ts` - Rename `Task` → `ProjectTask`, move to deliverable ownership
- `lib/types/order.types.ts` - Add project linking fields

#### Step 1.2: Update Firestore Service

**Files to modify:**
- `lib/firestoreService.ts` or create `lib/services/deliverableService.ts`

**New functions needed:**
```typescript
// Deliverable CRUD
export async function createDeliverable(data: Omit<Deliverable, 'id'>): Promise<string>
export async function updateDeliverable(id: string, updates: Partial<Deliverable>): Promise<void>
export async function deleteDeliverable(id: string): Promise<void>
export async function getDeliverablesByWorkpackage(workpackageId: string): Promise<Deliverable[]>

// Cross-linking
export async function linkOrderToDeliverable(orderId: string, deliverableId: string): Promise<void>
export async function linkDayToDayTaskToDeliverable(taskId: string, deliverableId: string): Promise<void>
export async function getLinkedOrders(deliverableId: string): Promise<Order[]>
export async function getLinkedDayToDayTasks(deliverableId: string): Promise<DayToDayTask[]>
```

#### Step 1.3: Database Migration Script

**Create:** `scripts/migrate-to-deliverable-model.ts`

This script should:
1. Create `/deliverables` collection
2. For each workpackage with tasks:
   - Create a deliverable for each task (or group related tasks)
   - Migrate task data to deliverables
   - Update workpackage to reference deliverable IDs
3. Migrate `Task` → `ProjectTask` where granular steps exist
4. Add project linking fields to existing orders

**Run with safeguards:**
```bash
# Dry run first
npm run migrate:deliverables -- --dry-run

# Actual migration
npm run migrate:deliverables
```

### 4.2 Phase 2: Core Components (Week 3-4)

**Priority: HIGH - UI Foundation**

#### Step 2.1: Create Deliverable Components

**New components:**
```
components/
  deliverables/
    DeliverableCard.tsx         - Compact view for lists
    DeliverableDetailsPanel.tsx - Expanded in-place view
    DeliverableDialog.tsx       - Create/edit modal
    LinkedOrdersList.tsx        - Shows orders for a deliverable
    LinkedTasksList.tsx         - Shows day-to-day tasks
    CreateOrderButton.tsx       - Quick order creation
```

**DeliverableCard.tsx:**
```typescript
interface DeliverableCardProps {
  deliverable: Deliverable
  onExpand: () => void
  onEdit: () => void
  onDelete: () => void
  isExpanded: boolean
}

export function DeliverableCard({ deliverable, onExpand, ...props }: DeliverableCardProps) {
  return (
    <div className="deliverable-card" onClick={onExpand}>
      <div className="deliverable-header">
        <h4>{deliverable.name}</h4>
        <StatusBadge status={deliverable.status} />
        <ProgressBar value={deliverable.progress} />
      </div>

      {isExpanded && (
        <DeliverableDetailsPanel deliverable={deliverable} />
      )}
    </div>
  )
}
```

#### Step 2.2: Refactor Workpackage Components

**Modify:**
- `components/WorkpackageDialog.tsx` - Remove tasks, add deliverables
- Create `components/workpackages/WorkpackageCard.tsx` - Expandable view

**WorkpackageCard.tsx:**
```typescript
export function WorkpackageCard({ workpackage, deliverables }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="workpackage-card">
      <div className="workpackage-header" onClick={() => setIsExpanded(!isExpanded)}>
        <GripVertical /> {/* Drag handle */}
        <h3>{workpackage.name}</h3>
        <ChevronDown className={isExpanded ? 'rotate-180' : ''} />
      </div>

      {isExpanded && (
        <div className="deliverables-list">
          {deliverables.map(d => (
            <DeliverableCard key={d.id} deliverable={d} />
          ))}
          <Button onClick={() => createDeliverable()}>
            + Add Deliverable
          </Button>
        </div>
      )}
    </div>
  )
}
```

#### Step 2.3: Enhance Project Dashboard

**Modify:**
- `components/views/ProjectDashboard.tsx` - Add expand/collapse for full hierarchy

**New structure:**
```typescript
export function ProjectDashboard() {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedWorkpackages, setExpandedWorkpackages] = useState<Set<string>>(new Set())
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set())

  return (
    <div className="project-dashboard">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          isExpanded={expandedProjects.has(project.id)}
          onToggle={() => toggleExpanded(project.id)}
        >
          {expandedProjects.has(project.id) && (
            <WorkpackagesList
              workpackages={getWorkpackages(project.id)}
              expandedWPs={expandedWorkpackages}
              onToggleWP={toggleWorkpackage}
            >
              {/* Nested deliverables */}
            </WorkpackagesList>
          )}
        </ProjectCard>
      ))}
    </div>
  )
}
```

### 4.3 Phase 3: Cross-Linking & Integration (Week 5)

**Priority: HIGH - Core Functionality**

#### Step 3.1: Order Integration

**Modify:**
- `components/OrderFormDialog.tsx` - Add project linking selectors
- `components/OrderCard.tsx` - Show project breadcrumb
- `components/deliverables/LinkedOrdersList.tsx` - Display orders for deliverable

**OrderFormDialog enhancement:**
```typescript
export function OrderFormDialog({ preLinkedDeliverableId }: Props) {
  // If pre-linked, fetch project/workpackage/deliverable context
  // Show breadcrumb: "Creating order for: Project > WP > Deliverable"
  // Auto-fill funding account from project

  return (
    <Dialog>
      {preLinkedDeliverableId && (
        <Alert>
          Creating order for: {projectBreadcrumb}
        </Alert>
      )}
      {/* Rest of form */}
    </Dialog>
  )
}
```

#### Step 3.2: Day-to-Day Task Linking

**Modify:**
- `components/views/DayToDayBoard.tsx` - Enhance task cards with project links
- `components/deliverables/DeliverableDetailsPanel.tsx` - Add "Create Day-to-Day Task" button

**Enhanced DayToDayTask Card:**
```typescript
export function DayToDayTaskCard({ task }: Props) {
  const projectLink = useProjectLink(task) // Fetches project/WP/deliverable names

  return (
    <div className="day-to-day-task-card">
      <h4>{task.title}</h4>

      {projectLink && (
        <div className="project-link">
          <Folder className="h-4 w-4" />
          <span>{projectLink.projectName}</span>
          {projectLink.deliverableName && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span>{projectLink.deliverableName}</span>
            </>
          )}
          <Button size="sm" onClick={() => navigateToDeliverable(projectLink)}>
            View
          </Button>
        </div>
      )}

      {/* Rest of card */}
    </div>
  )
}
```

**"Create Day-to-Day Task" from Deliverable:**
```typescript
// In DeliverableDetailsPanel
<Button
  onClick={() => createDayToDayTask({
    title: `Work on: ${deliverable.name}`,
    linkedProjectId: project.id,
    linkedWorkpackageId: workpackage.id,
    linkedDeliverableId: deliverable.id,
    dueDate: deliverable.dueDate,
    importance: deliverable.importance
  })}
>
  + Create Day-to-Day Task
</Button>
```

### 4.4 Phase 4: Drag-and-Drop & Polish (Week 6)

**Priority: MEDIUM - UX Enhancement**

#### Step 4.1: Add Drag-and-Drop

Use existing `@dnd-kit` integration from DayToDayBoard:

**Enable reordering:**
- Projects within dashboard
- Workpackages within project
- Deliverables within workpackage
- (Optional) Project tasks within deliverable

**Implementation:**
```typescript
// Similar to DayToDayBoard pattern
import { DndContext, closestCorners, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'

export function WorkpackagesList({ workpackages }: Props) {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    // Reorder workpackages
    // Update order field in Firestore
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={workpackageIds} strategy={verticalListSortingStrategy}>
        {workpackages.map(wp => (
          <SortableWorkpackageCard key={wp.id} workpackage={wp} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

#### Step 4.2: Click-Anywhere Interactions

**Ensure large click targets:**
```css
.project-card {
  cursor: pointer;
  padding: 1rem;
  /* Entire card clickable, not just icon */
}

.project-card:hover {
  background: var(--surface-2);
  box-shadow: var(--shadow-md);
}

/* Buttons/actions stop propagation */
.project-card button {
  z-index: 10;
  position: relative;
}
```

**JavaScript:**
```typescript
<div
  className="project-card"
  onClick={(e) => {
    // Only expand if not clicking a button/link
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      toggleExpand(project.id)
    }
  }}
>
  {/* Content */}
</div>
```

#### Step 4.3: Visual Polish

**Add animations:**
```css
.deliverable-card {
  transition: all 150ms ease;
}

.deliverable-details {
  animation: slideDown 200ms ease;
  overflow: hidden;
}

@keyframes slideDown {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}
```

**Health indicators:**
```typescript
function getProjectHealth(project: Project): ProjectHealth {
  const overdueDels = deliverables.filter(d =>
    d.dueDate && isPast(d.dueDate) && d.status !== 'completed'
  )

  if (overdueDels.length > 2) return 'at-risk'
  if (overdueDels.length > 0) return 'warning'
  return 'good'
}

// Display
<Badge variant={health === 'at-risk' ? 'destructive' : 'warning'}>
  {health === 'at-risk' ? '🚨' : '⚠️'} {overdueDels.length} overdue
</Badge>
```

### 4.5 Phase 5: Side Panels & Advanced Features (Week 7-8)

**Priority: MEDIUM - Enhanced UX**

#### Step 5.1: Side Panel Component

**Create:** `components/panels/SidePanel.tsx`

```typescript
export function SidePanel({ isOpen, onClose, children }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="side-panel-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="side-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="side-panel-header">
              <button onClick={onClose}>
                <X />
              </button>
            </div>
            <div className="side-panel-content">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

#### Step 5.2: Project Detail Panel

**Create:** `components/panels/ProjectDetailPanel.tsx`

```typescript
export function ProjectDetailPanel({ projectId }: Props) {
  const project = useProject(projectId)
  const stats = useProjectStats(projectId)

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ProjectOverview project={project} stats={stats} />
      </TabsContent>

      <TabsContent value="team">
        <ProjectTeam project={project} />
      </TabsContent>

      <TabsContent value="budget">
        <ProjectBudget project={project} />
      </TabsContent>

      <TabsContent value="timeline">
        <GanttChart projectId={project.id} />
      </TabsContent>
    </Tabs>
  )
}
```

#### Step 5.3: Quick Actions

**Add to deliverable expanded view:**
```typescript
<div className="deliverable-actions">
  <Button onClick={() => createOrder(deliverable.id)}>
    + Create Order
  </Button>
  <Button onClick={() => createDayToDayTask(deliverable.id)}>
    + Create Task
  </Button>
  <Button onClick={() => linkExistingOrder()}>
    Link Existing Order
  </Button>
  <Button onClick={() => openELN(deliverable.id)}>
    Open in ELN
  </Button>
</div>
```

---

## Part 5: Terminology & Code References

### 5.1 Complete Rename Map

| OLD NAME | NEW NAME | REASONING |
|----------|----------|-----------|
| `ProfileProject` | Remove (deprecated) | Consolidate into `Project` |
| `MasterProject` | `Project` | Single unified type |
| `Project.kind` | Remove | No longer needed |
| `Task` | `ProjectTask` | Distinguish from DayToDayTask |
| `Subtask` | Remove | Unnecessary level |
| `Todo` | `ProjectTaskTodo` | Clarity |
| `lib/dayToDayTypes.ts` | `lib/types/daytoday.types.ts` | Consistent location |

### 5.2 Updated File Structure

```
lib/
  types/
    project.types.ts        - Project (consolidated)
    workpackage.types.ts    - Workpackage
    deliverable.types.ts    - Deliverable (NEW)
    task.types.ts           - ProjectTask (renamed from Task)
    daytoday.types.ts       - DayToDayTask (moved)
    order.types.ts          - Order (with project links)
    common.types.ts         - Shared enums

  services/
    projectService.ts
    workpackageService.ts
    deliverableService.ts   - NEW
    projectTaskService.ts   - Renamed
    daytodayService.ts      - NEW
    orderService.ts

components/
  projects/
    ProjectCard.tsx
    ProjectDashboard.tsx    - Main view (updated)
    ProjectDetailPanel.tsx  - Side panel

  workpackages/
    WorkpackageCard.tsx     - Expandable component
    WorkpackageDialog.tsx   - Create/edit modal
    WorkpackagesList.tsx    - List container

  deliverables/
    DeliverableCard.tsx     - Compact view
    DeliverableDetailsPanel.tsx - Expanded in-place
    DeliverableDialog.tsx   - Create/edit modal
    LinkedOrdersList.tsx    - Shows linked orders
    LinkedTasksList.tsx     - Shows linked day-to-day tasks
    CreateOrderButton.tsx   - Quick action

  projectTasks/
    ProjectTaskChecklist.tsx - Simple todo list
    ProjectTaskDialog.tsx    - Create/edit (if needed)

  daytoday/
    DayToDayBoard.tsx       - Main Kanban (updated)
    DayToDayTaskCard.tsx    - Enhanced with project links

  panels/
    SidePanel.tsx           - Reusable slide-out
    ProjectDetailPanel.tsx
    WorkpackageDetailPanel.tsx
    DeliverableDetailPanel.tsx
```

### 5.3 Component Props Updates

**Before:**
```typescript
interface WorkpackageDialogProps {
  workpackage?: Workpackage
  // ...
}

interface Workpackage {
  tasks: Task[]  // ❌ Confusing
}
```

**After:**
```typescript
interface WorkpackageDialogProps {
  workpackage?: Workpackage
  deliverables: Deliverable[]  // ✅ Clear
  // ...
}

interface Workpackage {
  deliverableIds: string[]  // ✅ Reference to deliverables
}
```

---

## Part 6: Success Metrics

### 6.1 Usability Metrics

After implementation, success will be measured by:

1. **Click Reduction:** Users should accomplish tasks in fewer clicks
   - Before: 5+ clicks to see deliverable details
   - After: 2 clicks (expand project → expand deliverable)

2. **Time to Create Linked Items:**
   - Before: Create order, manually note project link
   - After: 1 click from deliverable → pre-filled order form

3. **Clarity Score:** User testing question: "How clear is the project structure?"
   - Target: 8/10 or higher

### 6.2 Technical Metrics

1. **Type Safety:** Zero `any` types in project management code
2. **Performance:** Dashboard loads <1s with 50 projects, 200 workpackages, 500 deliverables
3. **Consistency:** All project-related components use identical interaction patterns

### 6.3 User Feedback Questions

Post-implementation survey:
- "Can you easily find deliverables within a project?" (Yes/No)
- "Is it clear how orders relate to projects?" (Yes/No)
- "How intuitive is creating a day-to-day task from a deliverable?" (1-10 scale)
- "How satisfied are you with the visual hierarchy?" (1-10 scale)

---

## Part 7: Risks & Mitigation

### 7.1 Migration Risks

**Risk:** Existing project data corruption during type migration
**Mitigation:**
- Dry-run migration script with validation
- Firebase backup before migration
- Gradual rollout (migrate 10% of projects first)

**Risk:** Breaking changes to existing components
**Mitigation:**
- Feature flag for new UI
- Run both old and new code paths in parallel during transition
- Comprehensive E2E tests

### 7.2 Performance Risks

**Risk:** Dashboard slow with large datasets
**Mitigation:**
- Implement virtualized lists (`react-window`)
- Lazy-load deliverables (only fetch when workpackage expanded)
- Use React.memo for expensive components
- Add pagination for projects list (50 per page)

**Risk:** Too many Firestore reads
**Mitigation:**
- Denormalize progress/status fields
- Use snapshot listeners efficiently (unsubscribe on collapse)
- Cache deliverable/order counts in workpackage document

### 7.3 UX Risks

**Risk:** Users confused by terminology change
**Mitigation:**
- In-app tooltips explaining new terms
- Migration guide for existing users
- Gradual renaming in UI (e.g., show "Deliverable (formerly Task)")

**Risk:** Too many nested levels overwhelming
**Mitigation:**
- Default to collapsed state
- Breadcrumb navigation at top
- Quick filter/search to find specific deliverables

---

## Part 8: Next Steps & Immediate Actions

### Immediate Actions (This Week)

1. **Review & Approve This Design:**
   - Stakeholder review of domain model
   - Confirm terminology (Project → Workpackage → Deliverable → ProjectTask)
   - Approve UI mockups

2. **Set Up Feature Branch:**
   ```bash
   git checkout -b feature/project-management-redesign
   ```

3. **Create Type Files:**
   - Start with `lib/types/deliverable.types.ts`
   - Update `lib/types/project.types.ts` to consolidate Project

4. **Build Migration Script (Dry Run):**
   - Create `scripts/migrate-to-deliverable-model.ts`
   - Test on staging/development Firestore

### Week 1 Deliverables

- ✅ New type definitions committed
- ✅ Migration script (dry-run tested)
- ✅ Updated Firestore rules for `/deliverables` collection
- ✅ Basic `DeliverableCard` component (no interactivity yet)

### Week 2-3 Deliverables

- ✅ Full hierarchy rendering (Project → WP → Deliverable)
- ✅ Expand/collapse interactions
- ✅ Order linking to deliverables
- ✅ Day-to-day task linking

### Week 4+ Deliverables

- ✅ Drag-and-drop reordering
- ✅ Side panels
- ✅ Advanced filtering/search
- ✅ Performance optimization
- ✅ User testing & iteration

---

## Appendix A: Example Data Flow

### Creating an Order from a Deliverable

**User Flow:**
1. User expands Project → Workpackage → Deliverable
2. Clicks "Create Order" in deliverable details panel
3. Order form opens with:
   - `linkedProjectId`: Auto-filled
   - `linkedWorkpackageId`: Auto-filled
   - `linkedDeliverableId`: Auto-filled
   - `accountId`: Pre-selected from project's funding accounts
4. User fills product details, clicks "Create"
5. Order appears in:
   - Orders view (with project breadcrumb)
   - Deliverable's "Linked Orders" section
   - Project budget calculations

**Code:**
```typescript
// In DeliverableDetailsPanel
const handleCreateOrder = () => {
  openOrderDialog({
    preFilledData: {
      linkedProjectId: project.id,
      linkedWorkpackageId: workpackage.id,
      linkedDeliverableId: deliverable.id,
      accountId: project.accountIds[0], // Default to first account
    }
  })
}

// In OrderFormDialog
export function OrderFormDialog({ preFilledData }: Props) {
  const [formData, setFormData] = useState({
    ...defaultOrderData,
    ...preFilledData  // Pre-fill linked fields
  })

  return (
    <Dialog>
      {preFilledData.linkedDeliverableId && (
        <Alert>
          📁 Creating order for:
          <ProjectBreadcrumb
            projectId={preFilledData.linkedProjectId}
            workpackageId={preFilledData.linkedWorkpackageId}
            deliverableId={preFilledData.linkedDeliverableId}
          />
        </Alert>
      )}
      {/* Form fields */}
    </Dialog>
  )
}
```

### Viewing Orders from a Deliverable

**User Flow:**
1. User expands deliverable details
2. Sees "Linked Orders (2)" section
3. Clicks order to edit/view details
4. Clicks "Unlink" to remove association

**Code:**
```typescript
// In DeliverableDetailsPanel
const linkedOrders = useLinkedOrders(deliverable.id)

return (
  <div className="linked-orders">
    <h4>Linked Orders ({linkedOrders.length})</h4>
    {linkedOrders.map(order => (
      <OrderCard
        key={order.id}
        order={order}
        onEdit={() => editOrder(order.id)}
        onUnlink={() => unlinkOrder(order.id, deliverable.id)}
        compact
      />
    ))}
    <Button onClick={handleCreateOrder}>
      + Create New Order
    </Button>
  </div>
)
```

---

## Appendix B: Firestore Rules Updates

```javascript
// firestore.rules

// Deliverables (NEW)
match /deliverables/{deliverableId} {
  allow read: if isAuthenticated() &&
    hasAccessToProject(resource.data.projectId);

  allow create: if isAuthenticated() &&
    hasAccessToProject(request.resource.data.projectId) &&
    isTeamMember(request.resource.data.projectId);

  allow update, delete: if isAuthenticated() &&
    hasAccessToProject(resource.data.projectId) &&
    (isOwner(resource.data.ownerId) || isProjectAdmin(resource.data.projectId));
}

// ProjectTasks (updated from /tasks)
match /projectTasks/{taskId} {
  allow read: if isAuthenticated() &&
    hasAccessToDeliverable(resource.data.deliverableId);

  allow write: if isAuthenticated() &&
    hasAccessToDeliverable(request.resource.data.deliverableId);
}

// Orders (updated with project linking)
match /orders/{orderId} {
  allow read: if isAuthenticated() &&
    (resource.data.linkedProjectId == null ||
     hasAccessToProject(resource.data.linkedProjectId));

  allow write: if isAuthenticated() &&
    isLabMember(getUserLab());
}

// Helper functions
function hasAccessToProject(projectId) {
  return projectId != null &&
    get(/databases/$(database)/documents/projects/$(projectId)).data.visibility == 'lab' &&
    get(/databases/$(database)/documents/projects/$(projectId)).data.labId == getUserLab();
}

function hasAccessToDeliverable(deliverableId) {
  let deliverable = get(/databases/$(database)/documents/deliverables/$(deliverableId)).data;
  let workpackage = get(/databases/$(database)/documents/workpackages/$(deliverable.workpackageId)).data;
  return hasAccessToProject(workpackage.projectId);
}
```

---

## Conclusion

This redesign transforms Momentum's project management from a flat, confusing structure into a clear, hierarchical system that mirrors how research labs actually think about their work:

**Projects** contain **Workpackages** contain **Deliverables** (optionally contain **ProjectTasks**)

Separate but linked: **DayToDayTasks** for daily work execution

**Orders** tie into any level of the hierarchy for budget tracking

The implementation plan is phased, risk-mitigated, and focuses on user experience first. Success will be measured not just by code quality, but by how intuitive and delightful the system feels for researchers managing complex, multi-year projects.

**Status:** Ready for implementation approval
**Estimated Timeline:** 6-8 weeks to MVP
**Risk Level:** Medium (significant refactor, but well-planned)

---

*End of Document*
