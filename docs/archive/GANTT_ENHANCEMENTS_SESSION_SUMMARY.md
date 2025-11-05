# Gantt Chart & Project Management Enhancements - Session Summary

## What We've Accomplished

### 1. ✅ Comprehensive Planning Document
Created [PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md](PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md) with:
- Complete architecture overview
- Detailed UI mockups for all features
- Data model specifications
- Implementation phases
- Testing checklists
- Success criteria

### 2. ✅ Todo System Data Model
Added `Todo` interface to [lib/types.ts:536-545](lib/types.ts#L536-L545):
```typescript
interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  completedBy?: string  // PersonProfile ID
  order: number  // For sorting
}
```

### 3. ✅ Updated Subtask Interface
Modified `Subtask` in [lib/types.ts:547-564](lib/types.ts#L547-L564) to include:
- `todos?: Todo[]` - Array of todo items
- Documentation that progress is auto-calculated from todos

### 4. ✅ Progress Calculation Engine
Created [lib/progressCalculation.ts](lib/progressCalculation.ts) with comprehensive utilities:

**Core Functions:**
- `calculateSubtaskProgress()` - From todos
- `calculateTaskProgress()` - From subtasks
- `calculateWorkpackageProgress()` - From tasks
- `calculateProjectProgress()` - From work packages

**Cascade Update Functions:**
- `updateSubtaskWithTodoProgress()`
- `updateTaskWithSubtaskProgress()`
- `updateWorkpackageWithTaskProgress()`
- `updateProjectProgress()` - Full cascade

**Interactive Functions:**
- `toggleTodoAndRecalculate()` - Toggle todo & update all progress
- `addTodoAndRecalculate()` - Add new todo & update progress
- `getProjectStats()` - Get completion statistics

**Progress Flow:**
```
Todo (checked/unchecked)
  ↓ updates
Subtask Progress (% complete)
  ↓ updates
Task Progress (average of subtasks)
  ↓ updates
Work Package Progress (average of tasks)
  ↓ updates
Project Progress (average of work packages)
```

---

## Next Steps to Complete Implementation

### Phase 1: UI Components (Priority: HIGH)

#### A. TodoList Component
**File:** `components/TodoList.tsx`
**Purpose:** Display and manage todos within subtasks

**Features:**
- Checkbox list of todos
- Add new todo input
- Strike-through completed todos
- Delete todo button
- Progress indicator
- Drag to reorder (optional)

**Props:**
```typescript
interface TodoListProps {
  subtask: Subtask
  onToggleTodo: (todoId: string) => void
  onAddTodo: (text: string) => void
  onDeleteTodo: (todoId: string) => void
  readOnly?: boolean
}
```

**UI:**
```tsx
<div className="todo-list">
  <div className="progress-bar">
    <span>Progress: 66% (2/3 complete)</span>
    <div className="bar" style={{ width: '66%' }} />
  </div>

  <ul className="todos">
    <li className="completed">
      <input type="checkbox" checked onChange={...} />
      <span className="strike-through">Order supplies</span>
      <button onClick={delete}>×</button>
    </li>
    <li>
      <input type="checkbox" onChange={...} />
      <span>Install equipment</span>
      <button>×</button>
    </li>
  </ul>

  <div className="add-todo">
    <input placeholder="Add new todo..." />
    <button>Add</button>
  </div>
</div>
```

#### B. Enhanced Task Detail Panel
**File:** `components/TaskDetailPanel.tsx`
**Purpose:** Show task with expandable subtasks and todos

**Features:**
- Task header with owner/helpers
- Expandable subtasks
- TodoList for each subtask
- Overall progress visualization
- Person assignment (drag-drop area)

**Structure:**
```tsx
<div className="task-detail">
  <header>
    <h2>Task: {task.name}</h2>
    <div className="owners">
      <Avatar user={primaryOwner} />
      {helpers.map(h => <Avatar user={h} />)}
    </div>
    <ProgressBar value={task.progress} />
  </header>

  <div className="subtasks">
    {task.subtasks.map(subtask => (
      <div className="subtask" key={subtask.id}>
        <button onClick={toggleExpand}>
          {expanded ? <ChevronDown /> : <ChevronRight />}
          {subtask.name} - {subtask.progress}%
        </button>

        {expanded && (
          <TodoList
            subtask={subtask}
            onToggleTodo={handleToggle}
            onAddTodo={handleAdd}
          />
        )}
      </div>
    ))}
  </div>

  <button onClick={addSubtask}>+ Add Subtask</button>
</div>
```

#### C. Work Package Editor
**File:** `components/WorkPackageEditor.tsx`
**Purpose:** Create and edit work packages

**Features:**
- Name, dates, status fields
- Owner assignment (dropdown + drag-drop)
- Task list with progress
- Add task button
- Save/cancel actions

#### D. Enhanced Project Creation Dialog
**File:** `components/EnhancedProjectDialog.tsx`
**Purpose:** Comprehensive project creation with grants/team

**Features:**
- Project type selection (Master/Regular)
- Grant information fields
- Funding account checkboxes
- PI selection dropdown
- Team members drag-drop area
- Timeline picker
- Budget input

### Phase 2: Integration (Priority: HIGH)

#### A. Update app/page.tsx Handlers
Add handlers for todo operations:
```typescript
const handleToggleTodo = (projectId: string, workpackageId: string,
                          taskId: string, subtaskId: string, todoId: string) => {
  setProjects(prev => prev.map(p => {
    if (p.id !== projectId) return p
    return toggleTodoAndRecalculate(p, workpackageId, taskId, subtaskId, todoId)
  }))
}

const handleAddTodo = (projectId: string, workpackageId: string,
                       taskId: string, subtaskId: string, text: string) => {
  setProjects(prev => prev.map(p => {
    if (p.id !== projectId) return p
    return addTodoAndRecalculate(p, workpackageId, taskId, subtaskId, text)
  }))
}
```

#### B. Firestore Service Functions
Add to [lib/firestoreService.ts](lib/firestoreService.ts):
```typescript
// Update project with recalculated progress
async function updateProjectWithProgress(projectId: string, project: Project) {
  const projectRef = doc(db, "projects", projectId)
  await updateDoc(projectRef, project)
}

// Update work package with progress
async function updateWorkpackageWithProgress(wpId: string, wp: Workpackage) {
  const wpRef = doc(db, "workpackages", wpId)
  await updateDoc(wpRef, wp)
}
```

### Phase 3: Color Coding (Priority: MEDIUM)

#### A. Person Color System
**File:** `lib/personColors.ts`

```typescript
// Default color palette
const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6",
  "#f97316", "#6366f1"
]

// Get or assign color to person
export function getPersonColor(personId: string): string {
  // Load from localStorage or assign new
  const stored = localStorage.getItem(`person-color-${personId}`)
  if (stored) return stored

  // Assign next available color
  const nextColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
  localStorage.setItem(`person-color-${personId}`, nextColor)
  return nextColor
}

// Generate gradient for multiple people
export function getMultiPersonGradient(personIds: string[]): string {
  const colors = personIds.map(getPersonColor)

  if (colors.length === 1) return colors[0]

  // Create gradient
  const step = 100 / colors.length
  const stops = colors.map((color, i) =>
    `${color} ${i * step}%, ${color} ${(i + 1) * step}%`
  ).join(', ')

  return `linear-gradient(90deg, ${stops})`
}
```

#### B. Custom Gantt Bar Component
**File:** `components/MultiPersonGanttBar.tsx`

Render Gantt bars with gradient colors for multiple owners.

### Phase 4: Drag & Drop Enhancement (Priority: MEDIUM)

#### Enhance Existing Drag-Drop
In [components/GanttChart.tsx](components/GanttChart.tsx):
- Add visual feedback during drag
- Show tooltip "Drop to assign as owner"
- Highlight droppable areas
- Support dropping at different levels (project/wp/task/subtask)

### Phase 5: Responsive Design (Priority: MEDIUM)

#### Mobile/Tablet Optimizations
- Collapsible Gantt panels
- Touch-friendly drag-drop
- Swipe gestures
- Compact task cards
- Bottom sheet for task details

---

## Testing Plan

### Unit Tests
```typescript
// Test progress calculation
describe('progressCalculation', () => {
  it('calculates subtask progress from todos', () => {
    const subtask = {
      todos: [
        { completed: true },
        { completed: true },
        { completed: false }
      ]
    }
    expect(calculateSubtaskProgress(subtask)).toBe(67)
  })

  it('cascades progress updates correctly', () => {
    const project = createTestProject()
    const updated = toggleTodoAndRecalculate(...)
    expect(updated.workpackages[0].progress).toBeGreaterThan(0)
  })
})
```

### Integration Tests
- [ ] Create project with work packages
- [ ] Add tasks to work packages
- [ ] Add subtasks with todos
- [ ] Toggle todos and verify progress updates
- [ ] Check Firestore persistence
- [ ] Verify real-time updates across sessions

### Manual Testing
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)
- [ ] Tablet landscape/portrait

---

## File Structure

```
lib/
  ├── types.ts (✅ Updated with Todo interface)
  ├── progressCalculation.ts (✅ Created - full cascade logic)
  └── personColors.ts (⏳ To create)

components/
  ├── TodoList.tsx (⏳ To create)
  ├── TaskDetailPanel.tsx (⏳ To create/update)
  ├── WorkPackageEditor.tsx (⏳ To create)
  ├── EnhancedProjectDialog.tsx (⏳ To create)
  ├── MultiPersonGanttBar.tsx (⏳ To create)
  └── GanttChart.tsx (✅ Exists, needs enhancement)

app/
  └── page.tsx (⏳ Needs todo handlers)
```

---

## Build Status

✅ **Current build passing** (246 kB)

New additions:
- Todo interface added to types
- Progress calculation utilities created
- No breaking changes
- Backward compatible (todos are optional)

---

## Key Features Summary

### ✅ Completed
1. Data model for todos
2. Complete progress calculation engine
3. Comprehensive enhancement plan
4. Backward compatible changes

### 🔄 In Progress
1. UI components for todo management
2. Integration with existing Gantt
3. Firestore persistence

### ⏳ Planned
1. Multi-person color coding
2. Enhanced drag-drop
3. Responsive mobile UI
4. Work package editor
5. Enhanced project dialog

---

## Usage Example (Future)

```typescript
// After implementation, usage will be:

// 1. Create master project
const project = await createMasterProject({
  name: "Research Project Alpha",
  grantName: "ERC Grant",
  grantNumber: "ERC-2025-12345",
  budget: 500000,
  fundingAccounts: ["account1", "account2"],
  principalInvestigatorId: "prof-smith",
  teamMemberIds: ["dr-jones", "phd-student-1"]
})

// 2. Add work package
const wp = await createWorkPackage({
  name: "WP1: Data Collection",
  projectId: project.id,
  ownerId: "dr-jones",
  start: new Date("2025-01-01"),
  end: new Date("2025-06-30")
})

// 3. Add task with subtasks
const task = await createTask({
  name: "Setup Equipment",
  workpackageId: wp.id,
  primaryOwner: "dr-jones",
  helpers: ["phd-student-1"],
  subtasks: [
    {
      name: "Order supplies",
      todos: [
        { text: "Research suppliers" },
        { text: "Get quotes" },
        { text: "Place order" }
      ]
    }
  ]
})

// 4. Check todo (progress cascades automatically)
await toggleTodo(project.id, wp.id, task.id, subtask.id, todo.id)
// → Subtask progress: 33%
// → Task progress: 33%
// → WP progress: 33%
// → Project progress: 33%
```

---

## Documentation Links

- [Full Enhancement Plan](PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md)
- [Progress Calculation Code](lib/progressCalculation.ts)
- [Type Definitions](lib/types.ts#L536-L564)

---

## Next Session Goals

1. Create TodoList component
2. Create TaskDetailPanel
3. Add handlers to app/page.tsx
4. Test todo toggling with progress cascade
5. Verify Firestore persistence

---

*Session completed with foundation in place*
*Ready for UI component implementation*
