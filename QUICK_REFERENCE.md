# Momentum - Quick Reference

## Common Patterns

### State Management

```typescript
// Get data from store
import { useProjects, useEvents, usePeople } from "@/lib/store"

const projects = useProjects()
const events = useEvents()
const people = usePeople()

// Update state
import { useStore } from "@/lib/store"

const addProject = useStore((state) => state.addProject)
const updateProject = useStore((state) => state.updateProject)
const deleteProject = useStore((state) => state.deleteProject)
```

### Toast Notifications

```typescript
import { useToast } from "@/lib/toast"

const toast = useToast()

toast.success("Operation completed!")
toast.error("Something went wrong")
toast.warning("Low inventory alert")
toast.info("New update available")
```

### Firestore Operations

```typescript
import {
  createProject,
  updateProject,
  deleteProject
} from "@/lib/validatedFirestoreService"
import { useToast } from "@/lib/toast"

const toast = useToast()

// Create
try {
  const id = await createProject(projectData)
  toast.success("Project created!")
} catch (error) {
  toast.error("Failed to create project")
}

// Update
try {
  await updateProject(projectId, updates)
  toast.success("Changes saved!")
} catch (error) {
  toast.error("Failed to save changes")
}

// Delete
try {
  await deleteProject(projectId)
  toast.success("Project deleted!")
} catch (error) {
  toast.error("Failed to delete project")
}
```

### Constants

```typescript
import {
  WORK_STATUS,
  PROJECT_STATUS,
  IMPORTANCE_LEVEL,
  ORDER_STATUS,
  INVENTORY_LEVEL
} from "@/lib/constants"

// Use in conditions
if (task.status === WORK_STATUS.IN_PROGRESS) { ... }

// Use in updates
await updateTask(id, { status: WORK_STATUS.DONE })

// Use in filters
const activeProjects = projects.filter(
  p => p.status === PROJECT_STATUS.ACTIVE
)
```

### Search & Filter

```typescript
import {
  searchProjects,
  filterProjects,
  sortProjects
} from "@/lib/searchUtils"

// Simple search
const results = searchProjects(projects, query)

// Advanced filter
const filtered = filterProjects(projects, {
  query: "cancer",
  status: [WORK_STATUS.IN_PROGRESS],
  importance: [IMPORTANCE_LEVEL.HIGH],
  startDateFrom: new Date("2024-01-01")
})

// Sort
const sorted = sortProjects(filtered, "name", "asc")
```

### Data Export

```typescript
import {
  exportProjectsToCSV,
  exportInventoryToCSV,
  exportFullBackup
} from "@/lib/exportUtils"

// Export to CSV
<button onClick={() => exportProjectsToCSV(projects)}>
  Export to CSV
</button>

// Full backup
<button onClick={() => exportFullBackup({ projects, people, events })}>
  Download Backup
</button>
```

### Bulk Operations

```typescript
import {
  bulkUpdateProjects,
  bulkDeleteProjects,
  formatBulkOperationResult
} from "@/lib/bulkOperations"
import { useToast } from "@/lib/toast"

const toast = useToast()
const selectedIds = ["id1", "id2", "id3"]

// Bulk update
const result = await bulkUpdateProjects(
  selectedIds,
  { status: WORK_STATUS.DONE },
  {
    onProgress: (current, total) => {
      console.log(`Progress: ${current}/${total}`)
    }
  }
)

toast.info(formatBulkOperationResult(result))
```

### Error Boundaries

```typescript
import { ErrorBoundary, FeatureErrorBoundary } from "@/components/ErrorBoundary"

// Wrap entire app
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Wrap specific features
<FeatureErrorBoundary featureName="Gantt Chart">
  <GanttChart />
</FeatureErrorBoundary>
```

### Subscriptions

```typescript
import {
  useAllSubscriptions,
  useProjectsSubscription,
  useEventsSubscription
} from "@/lib/hooks/useFirestoreSubscriptions"

// In main app component
function App() {
  const currentUser = useCurrentUser()
  const currentUserProfile = useCurrentUserProfile()

  // Subscribe to all data
  useAllSubscriptions(currentUser?.uid, currentUserProfile?.lab)
}

// In specific components
function ProjectList() {
  useProjectsSubscription(userId) // Auto-updates store
  const projects = useProjects() // Get from store
}
```

## Error Messages

```typescript
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from "@/lib/constants"

// Use predefined messages
toast.error(ERROR_MESSAGES.NETWORK_ERROR)
toast.success(SUCCESS_MESSAGES.PROJECT_CREATED)

// Or custom messages
toast.error("Failed to load data")
```

## Validation

```typescript
import {
  projectSchema,
  createProjectInputSchema
} from "@/lib/validationSchemas"

// Validate form data
try {
  const validated = createProjectInputSchema.parse(formData)
  // Data is valid, proceed
} catch (error) {
  // Show validation errors
  const errors = formatValidationErrors(error)
  toast.error(errors.join(", "))
}
```

## Collections

```typescript
import { COLLECTIONS } from "@/lib/constants"

// Use in Firestore queries
const projectsRef = collection(db, COLLECTIONS.PROJECTS)
const eventsRef = collection(db, COLLECTIONS.EVENTS)
```

## Pagination

```typescript
import { PAGINATION } from "@/lib/constants"

// Limit query results
const q = query(
  collection(db, "projects"),
  limit(PAGINATION.PROJECTS_PAGE_SIZE)
)
```

## UI Constants

```typescript
import { UI_CONSTANTS } from "@/lib/constants"

// Toast duration
toast.success("Saved!", UI_CONSTANTS.TOAST_DURATION)

// Debounce delay
const debouncedSearch = useMemo(
  () => debounce(handleSearch, UI_CONSTANTS.DEBOUNCE_DELAY),
  []
)
```

## Validation Limits

```typescript
import { VALIDATION_LIMITS } from "@/lib/constants"

// Use in form validation
<input
  maxLength={VALIDATION_LIMITS.PROJECT_NAME_MAX}
  placeholder="Project name"
/>

// Use in validation
if (name.length < VALIDATION_LIMITS.PROJECT_NAME_MIN) {
  toast.error("Name too short")
}
```

## Quick Troubleshooting

### Toast not working?
```typescript
// Make sure ToastProvider is in layout.tsx
import { ToastProvider } from "@/components/ui/toast"

<ToastProvider>
  {children}
</ToastProvider>
```

### Store not updating?
```typescript
// Make sure subscription hooks are running
useAllSubscriptions(userId, labId)
```

### Validation errors?
```typescript
// Check schema matches data structure
// Use formatValidationErrors to see details
import { formatValidationErrors } from "@/lib/validatedFirestoreService"
```

### TypeScript errors?
```typescript
// Import types from lib/types.ts
import type { Project, Task, Person } from "@/lib/types"

// Use constants for literal types
import { WORK_STATUS } from "@/lib/constants"
task.status = WORK_STATUS.IN_PROGRESS // ✅
task.status = "in-progress" // ❌ Type error
```

---

**Print this page for quick reference while coding!**
