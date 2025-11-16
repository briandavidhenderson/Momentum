# Refactoring Roadmap

## Status: Planning Complete ✅ | Implementation: Pending

---

## Overview

This document outlines the planned refactoring of the two largest files in the codebase:
- **lib/firestoreService.ts** (2,489 lines) → 15 domain-specific modules
- **lib/types.ts** (1,953 lines) → 12 type modules

**Total Migration**: 4,442 lines to reorganize

---

## Why This Refactoring?

### Current Issues
1. **Maintainability**: Single files with 2,000+ lines are hard to navigate
2. **Developer Experience**: Finding specific functions/types requires scrolling
3. **Code Organization**: Related functionality scattered across large files
4. **Import Clarity**: Unclear which domain a function belongs to

### Benefits
1. **Modularity**: Each domain in its own focused module (100-400 lines each)
2. **Discoverability**: Clear file names indicate purpose
3. **Maintainability**: Easier to locate and modify related code
4. **Testing**: Can test domain modules in isolation
5. **Backward Compatibility**: Existing imports continue to work via barrel exports

---

## Planned Structure

### Type Modules (lib/types/)

1. **common.types.ts** - Shared utility types and enums
2. **orcid.types.ts** - ORCID integration types (~70 lines)
3. **organization.types.ts** - Organisation, Institute, Lab, Funder (~150 lines)
4. **profile.types.ts** - PersonProfile, PositionLevel, User (~200 lines)
5. **project.types.ts** - MasterProject, ProfileProject, Project (~150 lines)
6. **workpackage.types.ts** - Workpackage, Task, Deliverable (~200 lines)
7. **task.types.ts** - DayToDayTask types (~50 lines)
8. **order.types.ts** - Order, OrderStatus, Categories (~200 lines)
9. **inventory.types.ts** - InventoryItem types (~100 lines)
10. **equipment.types.ts** - Equipment, Supplies, SOPs (~200 lines)
11. **eln.types.ts** - ELN Experiment types (~150 lines)
12. **calendar.types.ts** - Events, Recurrence, Connections (~200 lines)
13. **poll.types.ts** - Lab poll types (~50 lines)
14. **audit.types.ts** - Audit trail types (~50 lines)
15. **privacy.types.ts** - GDPR, consent, data export (~150 lines)
16. **funding.types.ts** - Funding allocations and transactions (~150 lines)
17. **index.ts** - Barrel export (re-exports all)

### Service Modules (lib/services/)

1. **userService.ts** - User CRUD operations (~100 lines)
2. **profileService.ts** - Profile management (~400 lines)
3. **organizationService.ts** - Org/Institute/Lab operations (~300 lines)
4. **fundingService.ts** - Funding accounts/allocations (~250 lines)
5. **projectService.ts** - Master & profile projects (~350 lines)
6. **workpackageService.ts** - Workpackage operations (~200 lines)
7. **taskService.ts** - Day-to-day task operations (~150 lines)
8. **orderService.ts** - Purchase order operations (~150 lines)
9. **inventoryService.ts** - Inventory management (~150 lines)
10. **equipmentService.ts** - Equipment operations (~150 lines)
11. **calendarService.ts** - Calendar & event operations (~300 lines)
12. **elnService.ts** - ELN experiment operations (~150 lines)
13. **pollService.ts** - Lab poll operations (~100 lines)
14. **auditService.ts** - Audit trail operations (~100 lines)
15. **index.ts** - Barrel export (re-exports all)

---

## Migration Strategy

### Phase 1: Type Modules (Estimated: 1-1.5 hours)

#### Step 1: Extract Type Definitions
```bash
# For each domain:
1. Identify related types from types.ts
2. Copy to new lib/types/{domain}.types.ts
3. Ensure all dependencies are imported
4. Export all types
```

#### Step 2: Create Type Barrel Export
```typescript
// lib/types/index.ts
export * from './common.types'
export * from './orcid.types'
export * from './organization.types'
export * from './profile.types'
// ... etc
```

#### Step 3: Update lib/types.ts
```typescript
// lib/types.ts becomes a re-export
export * from './types'
```

### Phase 2: Service Modules (Estimated: 1-1.5 hours)

#### Step 1: Extract Service Functions
```bash
# For each domain:
1. Identify related functions from firestoreService.ts
2. Copy to new lib/services/{domain}Service.ts
3. Import necessary types from lib/types
4. Import Firebase functions
5. Export all functions
```

#### Step 2: Create Service Barrel Export
```typescript
// lib/services/index.ts
export * from './userService'
export * from './profileService'
export * from './organizationService'
// ... etc
```

#### Step 3: Update lib/firestoreService.ts
```typescript
// lib/firestoreService.ts becomes a re-export
export * from './services'
```

### Phase 3: Validation (Estimated: 30 minutes)

1. **Type Check**: Run `npx tsc --noEmit`
2. **Build Test**: Run `npm run build`
3. **Import Verification**: Ensure no broken imports
4. **Backward Compatibility**: Verify existing imports still work

---

## Backward Compatibility Strategy

### Existing Code Continues to Work

```typescript
// These imports will still work after refactoring:
import { PersonProfile, MasterProject } from '@/lib/types'
import { createProfile, getProfile } from '@/lib/firestoreService'
```

### New Code Can Use Domain Imports

```typescript
// New recommended imports (more explicit):
import { PersonProfile } from '@/lib/types/profile.types'
import { MasterProject } from '@/lib/types/project.types'
import { createProfile, getProfile } from '@/lib/services/profileService'
```

Both styles work - developers can choose based on preference.

---

## Example: profileService.ts

```typescript
/**
 * Profile Service
 * Manages PersonProfile CRUD operations and subscriptions
 */
import { collection, doc, getDoc, setDoc, updateDoc, ... } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { PersonProfile } from '@/lib/types/profile.types'

export async function createProfile(
  userId: string,
  profileData: Omit<PersonProfile, 'id'>
): Promise<string> {
  // Implementation
}

export async function getProfile(profileId: string): Promise<PersonProfile | null> {
  // Implementation
}

export async function getProfileByUserId(userId: string): Promise<PersonProfile | null> {
  // Implementation
}

export function subscribeToProfiles(
  filters: { labId?: string } | null,
  callback: (profiles: PersonProfile[]) => void
): Unsubscribe {
  // Implementation
}

// ... etc
```

---

## Implementation Checklist

### Prerequisites
- [ ] Review and approve this roadmap
- [ ] Choose migration window (low traffic time)
- [ ] Create backup branch

### Type Module Migration
- [ ] Create lib/types/ directory structure
- [ ] Create common.types.ts (shared types)
- [ ] Create orcid.types.ts
- [ ] Create organization.types.ts
- [ ] Create profile.types.ts
- [ ] Create project.types.ts
- [ ] Create workpackage.types.ts
- [ ] Create task.types.ts
- [ ] Create order.types.ts
- [ ] Create inventory.types.ts
- [ ] Create equipment.types.ts
- [ ] Create eln.types.ts
- [ ] Create calendar.types.ts
- [ ] Create poll.types.ts
- [ ] Create audit.types.ts
- [ ] Create privacy.types.ts
- [ ] Create funding.types.ts
- [ ] Create lib/types/index.ts barrel export
- [ ] Update lib/types.ts to re-export from lib/types/

### Service Module Migration
- [ ] Create lib/services/ directory structure
- [ ] Create userService.ts
- [ ] Create profileService.ts
- [ ] Create organizationService.ts
- [ ] Create fundingService.ts
- [ ] Create projectService.ts
- [ ] Create workpackageService.ts
- [ ] Create taskService.ts
- [ ] Create orderService.ts
- [ ] Create inventoryService.ts
- [ ] Create equipmentService.ts
- [ ] Create calendarService.ts
- [ ] Create elnService.ts
- [ ] Create pollService.ts
- [ ] Create auditService.ts
- [ ] Create lib/services/index.ts barrel export
- [ ] Update lib/firestoreService.ts to re-export from lib/services/

### Validation
- [ ] Run `npx tsc --noEmit` - should pass
- [ ] Run `npm run build` - should succeed
- [ ] Test application locally
- [ ] Verify no broken imports
- [ ] Run existing tests (if any)

### Documentation
- [ ] Update README with new import patterns
- [ ] Document domain organization
- [ ] Add migration guide for contributors

---

## Timeline Estimate

- **Type Modules**: 1-1.5 hours
- **Service Modules**: 1-1.5 hours
- **Testing & Validation**: 30 minutes
- **Buffer for Issues**: 30 minutes

**Total**: 3-4 hours of focused work

---

## Risks & Mitigation

### Risk: Breaking Changes
**Mitigation**: Barrel exports ensure all existing imports continue working

### Risk: Circular Dependencies
**Mitigation**: Careful import organization, shared types in common.types.ts

### Risk: Lost Functionality
**Mitigation**: Systematic extraction, checklist verification, testing

### Risk: Merge Conflicts
**Mitigation**: Complete in single session, communicate with team

---

## Success Criteria

1. ✅ All type definitions organized into focused modules
2. ✅ All service functions organized by domain
3. ✅ Backward compatibility maintained (no breaking changes)
4. ✅ TypeScript compilation succeeds
5. ✅ Application builds successfully
6. ✅ No broken imports in codebase
7. ✅ Clear documentation of new structure

---

## Next Steps

1. **Review this roadmap** - Approve the approach
2. **Schedule migration** - Choose low-traffic time window
3. **Execute migration** - Follow checklist systematically
4. **Validate thoroughly** - Run all checks
5. **Document** - Update guides for new structure

---

## Questions?

Contact the developer who created this roadmap for clarification or to discuss alternative approaches.

**Created**: 2025-11-16
**Status**: Awaiting approval for implementation
