# Project Management Enhancement Plan

## Overview

Comprehensive enhancement of the Gantt chart and work package management system for master projects (grant-funded research). This system is separate from day-to-day lab operations.

---

## Current Architecture

### Hierarchy
```
Master Project (ProfileProject)
  ├── Work Package 1
  │   ├── Task 1
  │   │   ├── Subtask 1.1 (with todos/progress)
  │   │   └── Subtask 1.2
  │   └── Task 2
  └── Work Package 2
      └── Task 3

Regular Project (standalone)
  └── Task 1
      └── Subtask 1.1
```

### Existing Types

**Master Project** (`ProfileProject`)
- Linked to grants/funding accounts
- Contains work packages
- Has principal investigators
- Budget tracking

**Work Package** (`Workpackage`)
- Major work unit within master project
- Contains tasks
- Has owner and progress
- Can have status (planning/active/atRisk/completed/onHold)

**Task** (`Task`)
- Belongs to work package
- Has primary owner + helpers
- Contains subtasks
- Has deliverables
- Progress tracked (0-100%)

**Subtask** (`Subtask`)
- Smallest unit of work
- Has owner + helpers
- Progress tracked (0-100%)
- Status: notStarted/inProgress/blocked/completed/cancelled

---

## Enhancement Goals

### 1. ✅ Project Creation with Grant/People Assignment

**Features:**
- Create master projects linked to grants
- Assign PI and team members
- Set budget and timeline
- Choose funding accounts

**UI:**
```
┌─────────────────────────────────────┐
│  Create Master Project              │
├─────────────────────────────────────┤
│  Project Name: *                    │
│  [_____________________________]    │
│                                     │
│  Grant Information:                 │
│  Grant Name: [___________________]  │
│  Grant Number: [_________________]  │
│  Total Budget: £[_______________]   │
│                                     │
│  Timeline:                          │
│  Start: [DD/MM/YYYY] End: [___]     │
│                                     │
│  Funding Accounts:                  │
│  ☑ Account 1: Equipment (£50k)      │
│  ☑ Account 2: Consumables (£30k)    │
│  ☐ Account 3: Travel (£10k)         │
│                                     │
│  Team Assignment:                   │
│  Principal Investigator:            │
│  [Dr. Smith ▼]                      │
│                                     │
│  Team Members:                      │
│  ┌─────────────────────────┐        │
│  │ [Drag people here]      │        │
│  │ 👤 Dr. Jane Doe (PI)    │        │
│  │ 👤 John Smith (Postdoc) │        │
│  │ 👤 Mary Jones (PhD)     │        │
│  └─────────────────────────┘        │
│                                     │
│  [Cancel]  [Create Project]         │
└─────────────────────────────────────┘
```

### 2. ✅ Work Package Management

**Features:**
- Create work packages within master projects
- Assign work package owner
- Set milestones and deliverables
- Track status and progress

**UI - Work Package Editor:**
```
┌─────────────────────────────────────┐
│  Work Package: WP1 - Data Collection│
├─────────────────────────────────────┤
│  Name: [_________________________]  │
│  Status: [Active ▼]                 │
│  Timeline: [Jan 2025] → [Jun 2025]  │
│                                     │
│  Owner: [Select Person ▼]           │
│  Or drag person here: [___________] │
│                                     │
│  Progress: ████████░░░░  65%       │
│  (Auto-calculated from tasks)       │
│                                     │
│  Tasks in this WP:                  │
│  ┌─────────────────────────┐        │
│  │ ☑ Task 1: Setup         │ 100%  │
│  │ ▶ Task 2: Data collect  │ 45%   │
│  │ ☐ Task 3: Analysis      │ 0%    │
│  └─────────────────────────┘        │
│                                     │
│  [+ Add Task]  [Save]  [Cancel]     │
└─────────────────────────────────────┘
```

### 3. ✅ Task System with Sub-Todos

**Task Structure:**
```
Task (0-100% progress)
  ├── Subtask 1 (0-100% progress)
  │   ├── ☐ Todo 1 (checkbox)
  │   ├── ☑ Todo 2 (checkbox)
  │   └── ☐ Todo 3 (checkbox)
  ├── Subtask 2
  │   ├── ☑ Todo 1
  │   └── ☑ Todo 2
  └── Subtask 3
      └── ☐ Todo 1
```

**Progress Calculation:**
```typescript
// Subtask progress = (completed todos / total todos) * 100
subtaskProgress = (2 / 3) * 100 = 66.67%

// Task progress = average of all subtask progress
taskProgress = (subtask1 + subtask2 + subtask3) / 3

// Work package progress = average of all task progress
workpackageProgress = (task1 + task2 + task3) / 3

// Project progress = average of all work package progress
projectProgress = (wp1 + wp2 + wp3) / 3
```

**UI - Task with Todos:**
```
┌─────────────────────────────────────┐
│  Task: Prepare Equipment            │
├─────────────────────────────────────┤
│  Owner: 👤 John Smith               │
│  Helpers: 👤 Mary + 👤 Bob           │
│  Progress: ████████░░░░  65%       │
│                                     │
│  📋 Subtask 1: Order supplies       │
│      ☑ Research suppliers           │
│      ☑ Get quotes                   │
│      ☐ Place order                  │
│      Progress: 66% (2/3 complete)   │
│                                     │
│  📋 Subtask 2: Setup lab space      │
│      ☑ Clear bench                  │
│      ☑ Install equipment            │
│      Progress: 100% (2/2 complete)  │
│                                     │
│  📋 Subtask 3: Test protocols       │
│      ☐ Run test 1                   │
│      Progress: 0% (0/1 complete)    │
│                                     │
│  [+ Add Subtask]                    │
└─────────────────────────────────────┘
```

### 4. ✅ Person Drag-and-Drop Assignment

**Features:**
- Drag person from sidebar to Gantt bar
- Drop on project → assign as team member
- Drop on work package → assign as owner
- Drop on task → assign as primary owner
- Drop on subtask → assign as owner
- Visual feedback during drag
- Multiple people can be assigned as helpers

**Visual Feedback:**
```
Dragging:
┌──────────┐
│ 👤 John  │ ← Being dragged
└──────────┘
       ↓
    Drop here
       ↓
┌────────────────────────────────┐
│ ████████████░░░░░░░░░░  65%    │ ← Gantt bar
│ Task: Data Collection          │ ← Highlights when hovering
│ 👤 → Drop to assign            │ ← Visual indicator
└────────────────────────────────┘
```

**After Drop:**
```
┌────────────────────────────────┐
│ ████████████░░░░░░░░░░  65%    │
│ Task: Data Collection          │
│ 👤 John (Owner)                │ ← Assigned
└────────────────────────────────┘
```

### 5. ✅ Color-Coding for Multi-Person Ownership

**Single Owner:**
```
████████████  → Solid color (owner's color)
```

**Multiple People (Owner + Helpers):**
```
▓▓▓▓▒▒▒▒░░░░  → Gradient/stripes of colors
```

**Color System:**
```typescript
// Each person has an assigned color
const personColors = {
  "person-1": "#3b82f6",  // Blue
  "person-2": "#10b981",  // Green
  "person-3": "#f59e0b",  // Amber
  "person-4": "#ef4444",  // Red
  "person-5": "#8b5cf6",  // Purple
}

// For multi-person tasks: gradient or stripes
const multiPersonColor = `linear-gradient(90deg,
  ${ownerColor} 0%,
  ${ownerColor} 50%,
  ${helper1Color} 50%,
  ${helper1Color} 75%,
  ${helper2Color} 75%,
  ${helper2Color} 100%
)`
```

**Visual Examples:**
```
Project Bar (Multiple PIs):
┌────────────────────────────────┐
│ Project Alpha                  │
│ ▓▓▓▓▒▒▒▒░░░░  (Blue/Green/Red) │ ← PI1, PI2, PI3
└────────────────────────────────┘

Work Package (Single Owner):
┌────────────────────────────────┐
│ WP1: Data Collection           │
│ ████████████  (Solid Blue)     │ ← John's color
└────────────────────────────────┘

Task (Owner + 2 Helpers):
┌────────────────────────────────┐
│ Task: Analysis                 │
│ ▓▓▓▓▓▒▒▒▒▒░░░░  (B/G/R)        │ ← John, Mary, Bob
└────────────────────────────────┘
```

### 6. ✅ Responsive & Visually Appealing UI

**Desktop View:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Projects (Master & Regular)                                     │
│  [+ New Project]  [+ New Work Package]  [View: Month ▼]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Task List          │         Gantt Timeline                    │
│  (Left Panel)       │         (Right Panel)                     │
│                     │                                            │
│  ▼ 📊 Project Alpha│         Jan  Feb  Mar  Apr  May  Jun      │
│    ▼ 📦 WP1        │         ├────┼────┼────┼────┼────┼────    │
│      → Task 1      │         ████████████                       │
│      → Task 2      │              ██████████████                │
│    ▶ 📦 WP2        │                       ████████████         │
│                    │                                             │
│  ▼ 📄 Regular Proj │         ████████                           │
│    → Task 1        │         ████████████                       │
│                    │                                             │
│  [Drag people →]   │                                             │
│  👤 John Smith     │                                             │
│  👤 Mary Jones     │                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile/Tablet View:**
```
┌──────────────────────┐
│  Projects            │
│  [+ New] [View ▼]    │
├──────────────────────┤
│                      │
│  ▼ 📊 Project Alpha │
│     Progress: 65%    │
│     ████████░░░░     │
│                      │
│     ▼ 📦 WP1        │
│        → Task 1      │
│        → Task 2      │
│                      │
│     [View Timeline]  │
│                      │
│  ▼ 📄 Regular Proj  │
│     Progress: 45%    │
│     ██████░░░░░░     │
│                      │
│  People:             │
│  👤 John (3 tasks)   │
│  👤 Mary (2 tasks)   │
└──────────────────────┘
```

---

## Implementation Plan

### Phase 1: Enhanced Project Creation ✅
1. Update ProfileProject type with all required fields
2. Create comprehensive ProjectCreationDialog
3. Add grant/funding account selection
4. Add team member drag-and-drop assignment
5. Integrate with Firestore

### Phase 2: Work Package Management ✅
1. Create WorkPackageDialog component
2. Add work package owner assignment
3. Implement progress calculation from tasks
4. Add status tracking
5. Visual editor for work packages in Gantt

### Phase 3: Task & Todo System ✅
1. Extend Subtask type with todos array
2. Create TodoList component within tasks
3. Implement progress calculation:
   - Todo → Subtask → Task → Work Package → Project
4. Add checkbox UI for todos
5. Real-time progress updates

### Phase 4: Drag-and-Drop Enhancement ✅
1. Enhance existing drag-and-drop
2. Add visual feedback (highlight, tooltip)
3. Support dropping on different levels:
   - Project level → team member
   - Work package level → owner
   - Task level → primary owner
   - Add helper button for additional assignees
4. Persist assignments to Firestore

### Phase 5: Color-Coding System ✅
1. Assign colors to each person
2. Implement single-owner solid color
3. Implement multi-owner gradient/stripes
4. Add color legend
5. Update Gantt bar rendering

### Phase 6: Responsive UI Polish ✅
1. Mobile-optimized layouts
2. Touch-friendly interactions
3. Collapsible panels
4. Smooth animations
5. Loading states

---

## Data Model Updates

### Todo Interface (NEW)
```typescript
interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: Date
  completedAt?: Date
  completedBy?: string  // PersonProfile ID
}
```

### Updated Subtask
```typescript
interface Subtask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number  // Auto-calculated from todos
  status: WorkStatus
  ownerId?: string
  helpers?: string[]
  notes?: string
  tags?: string[]
  todos: Todo[]  // NEW: Array of todos
  deliverables?: Deliverable[]
  linkedOrderIds?: string[]
  linkedInventoryItemIds?: string[]
  isExpanded?: boolean
  dependencies?: string[]
}
```

### Person Color Mapping
```typescript
interface PersonColorMapping {
  [personProfileId: string]: string  // hex color
}

// Store in localStorage or user preferences
const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"
]
```

---

## Progress Calculation Algorithm

```typescript
/**
 * Calculate subtask progress from todos
 */
function calculateSubtaskProgress(subtask: Subtask): number {
  if (!subtask.todos || subtask.todos.length === 0) {
    return subtask.progress || 0  // Use manual progress if no todos
  }

  const completedTodos = subtask.todos.filter(t => t.completed).length
  return (completedTodos / subtask.todos.length) * 100
}

/**
 * Calculate task progress from subtasks
 */
function calculateTaskProgress(task: Task): number {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.progress || 0
  }

  const totalProgress = task.subtasks.reduce(
    (sum, subtask) => sum + calculateSubtaskProgress(subtask),
    0
  )

  return totalProgress / task.subtasks.length
}

/**
 * Calculate work package progress from tasks
 */
function calculateWorkpackageProgress(workpackage: Workpackage): number {
  if (!workpackage.tasks || workpackage.tasks.length === 0) {
    return workpackage.progress || 0
  }

  const totalProgress = workpackage.tasks.reduce(
    (sum, task) => sum + calculateTaskProgress(task),
    0
  )

  return totalProgress / workpackage.tasks.length
}

/**
 * Calculate project progress from work packages
 */
function calculateProjectProgress(project: Project): number {
  if (!project.workpackages || project.workpackages.length === 0) {
    // Legacy: calculate from tasks directly
    if (project.tasks && project.tasks.length > 0) {
      const totalProgress = project.tasks.reduce(
        (sum, task) => sum + calculateTaskProgress(task),
        0
      )
      return totalProgress / project.tasks.length
    }
    return project.progress || 0
  }

  const totalProgress = project.workpackages.reduce(
    (sum, wp) => sum + calculateWorkpackageProgress(wp),
    0
  )

  return totalProgress / project.workpackages.length
}

/**
 * Update all progress values recursively
 */
function updateAllProgress(project: Project): Project {
  const updatedWorkpackages = project.workpackages?.map(wp => {
    const updatedTasks = wp.tasks.map(task => {
      const updatedSubtasks = task.subtasks?.map(subtask => ({
        ...subtask,
        progress: calculateSubtaskProgress(subtask)
      }))

      return {
        ...task,
        subtasks: updatedSubtasks,
        progress: calculateTaskProgress({ ...task, subtasks: updatedSubtasks })
      }
    })

    return {
      ...wp,
      tasks: updatedTasks,
      progress: calculateWorkpackageProgress({ ...wp, tasks: updatedTasks })
    }
  })

  return {
    ...project,
    workpackages: updatedWorkpackages,
    progress: calculateProjectProgress({ ...project, workpackages: updatedWorkpackages })
  }
}
```

---

## UI Components to Create

1. **EnhancedProjectDialog** - Master project creation
2. **WorkPackageEditor** - Work package management
3. **TaskDetailPanel** - Task with subtasks and todos
4. **TodoList** - Checkbox list of todos
5. **PersonColorPicker** - Assign colors to people
6. **MultiPersonGanttBar** - Gradient colored bar
7. **ResponsiveGanttWrapper** - Mobile-optimized layout

---

## Testing Checklist

### Project Creation
- [ ] Create master project with grant
- [ ] Assign PI and team members
- [ ] Set funding accounts
- [ ] Verify Firestore save
- [ ] Check team member display

### Work Package
- [ ] Create work package in master project
- [ ] Assign owner via drag-drop
- [ ] Add tasks to work package
- [ ] Verify progress auto-updates
- [ ] Check status changes

### Task & Todos
- [ ] Create task with subtasks
- [ ] Add todos to subtask
- [ ] Check/uncheck todos
- [ ] Verify progress updates cascade:
  - Todo → Subtask ✅
  - Subtask → Task ✅
  - Task → Work Package ✅
  - Work Package → Project ✅
- [ ] Verify Firestore saves todos

### Drag & Drop
- [ ] Drag person to project bar
- [ ] Drag person to work package bar
- [ ] Drag person to task bar
- [ ] Visual feedback shows during drag
- [ ] Assignment persists after refresh

### Color Coding
- [ ] Single owner shows solid color
- [ ] Multiple people show gradient
- [ ] Colors are consistent across views
- [ ] Color legend displays correctly

### Responsive
- [ ] Desktop view works
- [ ] Tablet view works
- [ ] Mobile view works
- [ ] Touch drag-drop works on mobile

---

## Success Criteria

✅ Projects can be created and linked to grants
✅ Work packages can be created and assigned
✅ Tasks have subtasks with todo lists
✅ Progress cascades automatically upward
✅ People can be drag-dropped to assign
✅ Multi-person tasks show gradient colors
✅ Everything is responsive and mobile-friendly
✅ All data persists to Firestore
✅ Real-time updates work correctly

---

*This is separate from the day-to-day lab task manager*
