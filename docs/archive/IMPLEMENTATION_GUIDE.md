# Momentum - Implementation Guide

## Overview

This guide documents all the improvements and new features added to the Momentum lab management platform.

---

## New Features & Improvements

### 1. **Constants & Type Safety** (`lib/constants.ts`)

All magic strings have been replaced with typed constants:

```typescript
import { WORK_STATUS, PROJECT_STATUS, IMPORTANCE_LEVEL } from "@/lib/constants"

// Before:
if (task.status === "in-progress") { ... }

// After:
if (task.status === WORK_STATUS.IN_PROGRESS) { ... }
```

**Benefits:**
- Prevents typos
- IDE autocomplete
- Type-safe refactoring
- Centralized configuration

---

### 2. **Zod Validation Schemas** (`lib/validationSchemas.ts`)

Runtime validation for all data types:

```typescript
import { projectSchema, createProjectInputSchema } from "@/lib/validationSchemas"

// Validate user input
const validated = createProjectInputSchema.parse(formData)

// Validate API responses
const project = projectSchema.parse(firestoreData)
```

**Available Schemas:**
- `projectSchema`, `createProjectInputSchema`, `updateProjectInputSchema`
- `taskSchema`, `createTaskInputSchema`, `updateTaskInputSchema`
- `personProfileSchema`, `createPersonProfileInputSchema`
- `calendarEventSchema`, `orderSchema`, `inventoryItemSchema`
- And many more...

---

### 3. **Zustand Global State Management** (`lib/store.ts`)

Centralized state management replacing useState props drilling:

```typescript
import { useStore, useProjects, useCurrentUser } from "@/lib/store"

function MyComponent() {
  // Use selector hooks for optimal re-renders
  const projects = useProjects()
  const currentUser = useCurrentUser()
  const addProject = useStore((state) => state.addProject)

  // Update state
  addProject(newProject)
}
```

**Features:**
- Optimized re-renders with selectors
- DevTools integration
- TypeScript support
- No prop drilling

---

### 4. **Toast Notifications** (`components/ui/toast.tsx`, `lib/toast.ts`)

User-friendly notifications for all operations:

```typescript
import { useToast } from "@/lib/toast"

function MyComponent() {
  const toast = useToast()

  toast.success("Project created successfully!")
  toast.error("Failed to save changes")
  toast.warning("Low inventory alert")
  toast.info("New update available")
}
```

**Usage with async operations:**

```typescript
import { withToast } from "@/lib/toast"

await withToast(
  () => createProject(data),
  {
    toast,
    successMessage: "Project created!",
    errorMessage: "Failed to create project"
  }
)
```

---

### 5. **Error Boundaries** (`components/ErrorBoundary.tsx`)

Graceful error handling with user-friendly fallbacks:

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

**Features:**
- Prevents white screen crashes
- Shows error details in development
- Reset/reload buttons
- Custom fallback UI support

---

### 6. **Firestore Subscription Hooks** (`lib/hooks/useFirestoreSubscriptions.ts`)

Simplified real-time data subscriptions:

```typescript
import {
  useAllSubscriptions,
  useProjectsSubscription,
  useEventsSubscription
} from "@/lib/hooks/useFirestoreSubscriptions"

function App() {
  const currentUser = useCurrentUser()
  const currentUserProfile = useCurrentUserProfile()

  // Subscribe to all data
  useAllSubscriptions(currentUser?.uid, currentUserProfile?.lab)

  // Data is now available in the store
  const projects = useProjects()
  const events = useEvents()
}
```

**Benefits:**
- Automatic cleanup on unmount
- Prevents memory leaks
- Integrates with Zustand store
- Type-safe

---

### 7. **Validated Firestore Service** (`lib/validatedFirestoreService.ts`)

Enhanced Firestore operations with automatic validation:

```typescript
import {
  createProject,
  updateProject,
  createEvent,
  ValidationError,
  FirestoreServiceError
} from "@/lib/validatedFirestoreService"

try {
  const projectId = await createProject(projectData)
  toast.success("Project created!")
} catch (error) {
  if (isValidationError(error)) {
    // Show validation errors
    const errors = formatValidationErrors(error.errors)
    toast.error(errors.join(", "))
  } else {
    toast.error("Failed to create project")
  }
}
```

**Features:**
- Automatic Zod validation
- Custom error types
- Better error messages
- Type-safe

---

### 8. **Search & Filtering** (`lib/searchUtils.ts`)

Powerful search and filtering across all data types:

```typescript
import {
  searchProjects,
  filterProjects,
  searchPeople,
  filterInventory
} from "@/lib/searchUtils"

// Simple search
const results = searchProjects(projects, "cancer research")

// Advanced filtering
const filtered = filterProjects(projects, {
  query: "cancer",
  status: [WORK_STATUS.IN_PROGRESS],
  importance: [IMPORTANCE_LEVEL.HIGH],
  startDateFrom: new Date("2024-01-01"),
  minProgress: 50
})

// Sort results
const sorted = sortProjects(filtered, "name", "asc")
```

**Available Functions:**
- `searchProjects`, `filterProjects`, `sortProjects`
- `searchTasks`, `filterTasks`, `sortTasks`
- `searchPeople`, `filterPeople`
- `searchInventory`, `filterInventory`
- `searchEvents`, `filterEvents`
- `searchOrders`, `filterOrders`

---

### 9. **Data Export** (`lib/exportUtils.ts`)

Export data to CSV, JSON, or full backups:

```typescript
import {
  exportProjectsToCSV,
  exportProjectsToJSON,
  exportInventoryToCSV,
  exportFullBackup
} from "@/lib/exportUtils"

// Export to CSV
exportProjectsToCSV(projects)
exportInventoryToCSV(inventory)
exportEventsToCSV(events)

// Export to JSON
exportProjectsToJSON(projects)

// Full backup
exportFullBackup({
  projects,
  profiles,
  events,
  orders,
  inventory
})
```

**Import data:**

```typescript
import { parseCSV, readFileAsText } from "@/lib/exportUtils"

const handleFileUpload = async (file: File) => {
  const text = await readFileAsText(file)
  const data = parseCSV(text)
  // Process imported data
}
```

---

### 10. **Bulk Operations** (`lib/bulkOperations.ts`)

Perform batch operations on multiple items:

```typescript
import {
  bulkUpdateProjects,
  bulkDeleteProjects,
  bulkUpdateInventory,
  formatBulkOperationResult
} from "@/lib/bulkOperations"

// Bulk update with progress tracking
const result = await bulkUpdateProjects(
  selectedProjectIds,
  { status: WORK_STATUS.DONE },
  {
    onProgress: (current, total) => {
      console.log(`${current}/${total}`)
    },
    onError: (id, error) => {
      console.error(`Failed for ${id}:`, error)
    },
    continueOnError: true
  }
)

toast.info(formatBulkOperationResult(result))
// "Completed: 48/50 successful, 2 failed"
```

**Available Operations:**
- `bulkUpdateProjects`, `bulkDeleteProjects`
- `bulkUpdateEvents`, `bulkDeleteEvents`
- `bulkUpdateInventory`, `bulkDeleteInventory`
- `bulkUpdateOrders`, `bulkDeleteOrders`
- `bulkUpdateProfiles`, `bulkDeleteProfiles`

---

## Migration Guide

### Step 1: Wrap App with Providers

Update your `app/layout.tsx`:

```typescript
import { ToastProvider } from "@/components/ui/toast"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

### Step 2: Replace useState with Zustand

**Before:**
```typescript
const [projects, setProjects] = useState<Project[]>([])
const [events, setEvents] = useState<CalendarEvent[]>([])
```

**After:**
```typescript
import { useProjects, useEvents, useStore } from "@/lib/store"

const projects = useProjects()
const events = useEvents()
const addProject = useStore((state) => state.addProject)
```

### Step 3: Use Subscription Hooks

**Before:**
```typescript
useEffect(() => {
  const unsubscribe = subscribeToProjects(userId, setProjects)
  return unsubscribe
}, [userId])
```

**After:**
```typescript
import { useProjectsSubscription } from "@/lib/hooks/useFirestoreSubscriptions"

useProjectsSubscription(userId)
```

### Step 4: Add Validation to Forms

**Before:**
```typescript
await createProject(formData)
```

**After:**
```typescript
import { createProject } from "@/lib/validatedFirestoreService"
import { useToast } from "@/lib/toast"

const toast = useToast()

try {
  await createProject(formData)
  toast.success("Project created!")
} catch (error) {
  toast.error(formatFirebaseError(error))
}
```

### Step 5: Replace Magic Strings

**Before:**
```typescript
if (project.status === "in-progress") { ... }
```

**After:**
```typescript
import { WORK_STATUS } from "@/lib/constants"

if (project.status === WORK_STATUS.IN_PROGRESS) { ... }
```

---

## Best Practices

### 1. Always Use Validated Services

```typescript
// Good ✅
import { createProject } from "@/lib/validatedFirestoreService"

// Avoid ❌
import { createProject } from "@/lib/firestoreService"
```

### 2. Use Toast for User Feedback

```typescript
// Good ✅
try {
  await updateProject(id, updates)
  toast.success("Changes saved!")
} catch (error) {
  toast.error("Failed to save")
}

// Avoid ❌
await updateProject(id, updates) // Silent failure
```

### 3. Use Constants Instead of Strings

```typescript
// Good ✅
import { WORK_STATUS } from "@/lib/constants"
task.status = WORK_STATUS.IN_PROGRESS

// Avoid ❌
task.status = "in-progress"
```

### 4. Use Selector Hooks for Performance

```typescript
// Good ✅ - Only re-renders when projects change
const projects = useProjects()

// Avoid ❌ - Re-renders on any state change
const { projects } = useStore()
```

### 5. Wrap Features in Error Boundaries

```typescript
// Good ✅
<FeatureErrorBoundary featureName="Equipment Panel">
  <EquipmentStatusPanel />
</FeatureErrorBoundary>

// Avoid ❌
<EquipmentStatusPanel /> // Crash affects entire app
```

---

## Performance Optimization

### 1. Use Pagination for Large Lists

```typescript
import { PAGINATION } from "@/lib/constants"

const paginatedProjects = projects.slice(0, PAGINATION.PROJECTS_PAGE_SIZE)
```

### 2. Debounce Search Input

```typescript
import { UI_CONSTANTS } from "@/lib/constants"
import { useMemo } from "react"

const debouncedSearch = useMemo(
  () => debounce(handleSearch, UI_CONSTANTS.DEBOUNCE_DELAY),
  []
)
```

### 3. Lazy Load Components

```typescript
import { lazy, Suspense } from "react"

const GanttChart = lazy(() => import("@/components/GanttChart"))

<Suspense fallback={<div>Loading...</div>}>
  <GanttChart />
</Suspense>
```

---

## Testing

### Unit Testing Utilities

```typescript
import { describe, it, expect } from "vitest"
import { filterProjects, searchProjects } from "@/lib/searchUtils"

describe("searchUtils", () => {
  it("should filter projects by status", () => {
    const result = filterProjects(projects, {
      status: [WORK_STATUS.IN_PROGRESS]
    })
    expect(result).toHaveLength(3)
  })
})
```

### Testing with Toast

```typescript
import { render } from "@testing-library/react"
import { ToastProvider } from "@/components/ui/toast"

function renderWithToast(component: React.ReactElement) {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  )
}
```

---

## Troubleshooting

### Issue: "useToast must be used within ToastProvider"

**Solution:** Wrap your app with `ToastProvider` in `layout.tsx`.

### Issue: Store state not updating

**Solution:** Make sure you're using subscription hooks:
```typescript
useAllSubscriptions(userId, labId)
```

### Issue: Validation errors not showing

**Solution:** Catch and format validation errors:
```typescript
catch (error) {
  if (isValidationError(error)) {
    const errors = formatValidationErrors(error.errors)
    toast.error(errors.join(", "))
  }
}
```

### Issue: Memory leaks from subscriptions

**Solution:** Use the provided hooks which handle cleanup automatically:
```typescript
// Good ✅
useProjectsSubscription(userId)

// Avoid ❌
useEffect(() => {
  subscribeToProjects(userId, setProjects)
  // Missing cleanup!
}, [])
```

---

## Next Steps

1. **Update `app/page.tsx`** to use Zustand and subscription hooks
2. **Add ToastProvider** to root layout
3. **Replace magic strings** with constants throughout codebase
4. **Add validation** to all forms
5. **Implement search/filter** UI components
6. **Add export buttons** to data tables
7. **Implement bulk selection** UI
8. **Write unit tests** for critical utilities
9. **Add loading states** to all async operations
10. **Document component APIs** with JSDoc

---

## Resources

- **Zustand Docs:** https://docs.pmnd.rs/zustand
- **Zod Docs:** https://zod.dev
- **Firebase Docs:** https://firebase.google.com/docs
- **React Error Boundaries:** https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code examples in this guide
3. Check inline JSDoc comments in source files
4. Create an issue on GitHub

---

**Last Updated:** 2025-11-04
**Version:** 2.0.0
