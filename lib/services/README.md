# Firestore Services

This directory contains domain-specific Firestore service modules, refactored from the monolithic `firestoreService.ts`.

## Structure

Each service module focuses on a specific domain and provides CRUD operations for that domain's Firestore collections.

### Core Services

- **userService.ts** - User authentication and management (`users` collection)
- **profileService.ts** - Person profiles and lab membership (`personProfiles` collection)
- **organizationService.ts** - Organizational hierarchy (`organisations`, `institutes`, `labs` collections)
- **fundingService.ts** - Funding accounts and allocations (`fundingAccounts`, `fundingAllocations` collections)

### Project & Task Management

- **projectService.ts** - Master projects and legacy projects (`masterProjects`, `projects` collections)
- **workpackageService.ts** - Workpackages and deliverables (`workpackages` collection)
- **taskService.ts** - Day-to-day tasks (`dayToDayTasks` collection)

### Lab Operations

- **orderService.ts** - Purchase orders (`orders` collection)
- **inventoryService.ts** - Inventory management (`inventory` collection)
- **equipmentService.ts** - Equipment and supplies (`equipment` collection)
- **elnService.ts** - Electronic lab notebook (`elnExperiments` collection)
- **pollService.ts** - Lab polls and voting (`labPolls` collection)

### Calendar & Events

- **calendarService.ts** - Calendar events and integrations (`events`, `calendarConnections` collections)

### Audit & Compliance

- **auditService.ts** - Audit trails and logging (`auditTrails` collection)

## Usage

Import services individually:
```typescript
import { createProfile, getProfile } from '@/lib/services/profileService'
import { createProject, subscribeToProjects } from '@/lib/services/projectService'
```

Or use the barrel export:
```typescript
import { profileService, projectService } from '@/lib/services'
```

## Common Patterns

All services follow these patterns:

### CRUD Operations
- `create{Entity}()` - Create new document
- `get{Entity}()` - Fetch single document
- `get{Entities}()` - Fetch multiple documents
- `update{Entity}()` - Update existing document
- `delete{Entity}()` - Delete document

### Subscriptions
- `subscribeTo{Entities}()` - Real-time listener that returns `Unsubscribe` function

### Helper Functions
- Services may include domain-specific helpers and utilities

## Migration from firestoreService.ts

All functions from the original `firestoreService.ts` have been migrated to appropriate domain services. The original file now serves as a barrel export for backward compatibility.

To update your code:
```typescript
// Old (still works via barrel export)
import { createProfile } from '@/lib/firestoreService'

// New (recommended)
import { createProfile } from '@/lib/services/profileService'
```
