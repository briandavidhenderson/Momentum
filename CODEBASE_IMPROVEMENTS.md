# Momentum Codebase Improvements & Cleanup Plan

**Date:** January 2025  
**Status:** Comprehensive consolidation of analysis, audit, and cleanup reports  
**Scope:** Critical bugs, code quality, dead code removal, documentation, security, and type safety

---

## Executive Summary

This document consolidates findings from three comprehensive codebase analyses:
- **CODEBASE_ANALYSIS.md** - Full architecture and feature analysis
- **CODEBASE_AUDIT_RECOMMENDATIONS.md** - Code quality and security audit
- **CODEBASE_CLEANUP_REPORT.md** - Unused files and dead code investigation

### Key Findings

| Category | Count | Priority |
|----------|-------|----------|
| **Critical Breaking Issues** | 5 | P0 - Fix Immediately |
| **High Priority Issues** | 12 | P1 - Fix This Week |
| **Medium Priority Issues** | 15 | P2 - Fix This Month |
| **Low Priority / Technical Debt** | 20+ | P3 - Ongoing |
| **Quick Wins** | 8 | < 1 hour each |

### Overall Health Score

- **Type Safety:** 60% → Target: 95%
- **Dead Code:** 557+ lines → Target: 0 lines
- **Documentation Quality:** 7/10 → Target: 9/10
- **Test Coverage:** Unknown → Target: 70%
- **Component Size:** Avg 450 lines → Target: <300 lines
- **Console Statements:** 187 → Target: 0 in production

---

## 🔴 CRITICAL ISSUES (P0 - Fix Immediately)

### Issue 1: Breaking Change - Deprecated Field Usage

**Impact:** BREAKING - Will cause runtime errors  
**Effort:** 2-3 hours  
**Files Affected:** 8 files

#### Problem
Multiple components use deprecated `.lab` field instead of new `.labId`. Per `lib/types.ts:493`, `.lab` is marked "Deprecated: use labId".

#### Files to Fix:

1. **components/LabPollPanel.tsx** (lines 38-40, 77)
   ```typescript
   // BEFORE
   const userLab = currentUserProfile?.lab
   
   // AFTER
   const userLab = currentUserProfile?.labId
   ```

2. **components/NetworkView.tsx** (lines 316, 323, 401, 543)
   ```typescript
   // BEFORE
   .filter(e => e.lab === profile.lab)
   
   // AFTER
   .filter(e => e.labId === profile.labId)
   ```

3. **components/views/ProfileManagement.tsx** (lines 46, 104)
   ```typescript
   // BEFORE
   const userLab = currentUserProfile?.lab
   
   // AFTER
   const userLab = currentUserProfile?.labId
   ```

4. **lib/personHelpers.ts** (lines 23-24)
   ```typescript
   // BEFORE
   institute: profile.institute,
   organisation: profile.organisation
   
   // AFTER
   instituteId: profile.instituteId,
   organisationId: profile.organisationId
   ```

5. **lib/firestoreService.ts** (line 111)
   ```typescript
   // BEFORE
   .where('lab', '==', currentUserLab)
   
   // AFTER
   .where('labId', '==', currentUserLab)
   ```

6. **lib/searchUtils.ts** (lines 287-288)
   ```typescript
   // BEFORE
   lab: profile.lab,
   
   // AFTER
   labId: profile.labId,
   ```

**Action:** Create migration script or manual find-replace across codebase.  
**Verification:** Run `grep -r "\.lab\b" --exclude-dir=node_modules` to find all instances.

---

### Issue 2: Type Safety Defeated - AppContext Uses `any`

**Impact:** HIGH - Zero IntelliSense, runtime errors not caught  
**Effort:** 3-4 hours  
**Files Affected:** 16 files using `useAppContext()`

#### Problem
```typescript
// lib/AppContext.tsx:18
export const AppContext = createContext<any>(null) // ❌ NO TYPE SAFETY
```

This defeats TypeScript's purpose. **16 files** use `useAppContext()` with zero type checking.

#### Solution:
```typescript
// lib/AppContext.tsx
interface AppContextType {
  currentUser: User | null
  currentUserProfile: PersonProfile | null
  allProfiles: PersonProfile[]
  fundingAccounts: FundingAccount[]
  fundingAllocations: FundingAllocation[]
  fundingAccountsLoading: boolean
  fundingAllocationsLoading: boolean
  // ... add all context properties with proper types
}

export const AppContext = createContext<AppContextType | null>(null)

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
```

**Files to Update:** All 16 files importing `useAppContext` will now have proper type safety.  
**Verification:** TypeScript compiler will catch type errors after fix.

---

### Issue 3: Duplicate Component (Dead Code)

**Impact:** HIGH - Confusing for developers, potential for using wrong version  
**Effort:** 5 minutes  
**Action:** DELETE FILE

#### File to Delete:
```bash
rm components/PeopleView.tsx
```

**Why:**
- **Old version:** `/components/PeopleView.tsx` (557 lines) - Uses deprecated `.lab` field, never imported
- **Active version:** `/components/views/PeopleView.tsx` (520 lines) - Correctly uses `.labId`, imported in app/page.tsx

**Verification:**
```bash
# Confirm it's never imported
grep -r "from.*components/PeopleView" --exclude-dir=node_modules .
# Should return NO results (only views/PeopleView should be imported)
```

---

### Issue 4: Missing Type File Exports (Build Errors)

**Impact:** MEDIUM - May cause build errors  
**Effort:** 5 minutes  
**Files Affected:** `lib/types/index.ts`

#### Problem
Two type files are exported but don't exist:
- `lib/types/researchgroup.types.ts` - Referenced in `lib/types/index.ts:17`
- `lib/types/network.types.ts` - Referenced in `lib/types/index.ts:18`

#### Solution:
```typescript
// lib/types/index.ts
// REMOVE these lines:
export * from './researchgroup.types'  // ❌ File doesn't exist
export * from './network.types'        // ❌ File doesn't exist
```

**Note:** These types may have been consolidated into `organization.types.ts` which contains `Organisation`, `Institute`, and `Lab` types.

**Action:** Remove exports from `lib/types/index.ts:17-18`  
**Verification:** Build should complete without errors.

---

### Issue 5: Unsafe Null Handling

**Impact:** MEDIUM - Potential runtime crashes  
**Effort:** 1 hour  
**Files:** Multiple instances in `lib/firestoreService.ts`

#### Example:
```typescript
// lib/firestoreService.ts:233
const data = querySnapshot.docs[0].data() // ❌ No check if docs[0] exists
```

#### Fix:
```typescript
const doc = querySnapshot.docs[0]
if (!doc) {
  throw new Error('Document not found')
}
const data = doc.data()
```

**Action:** Audit all `querySnapshot.docs[0]` accesses and add safety checks.  
**Verification:** Run tests to ensure no crashes.

---

## 🟠 HIGH PRIORITY (P1 - Fix This Week)

### Issue 6: Oversized Components (>700 lines)

**9 components exceed recommended 300-line limit:**

| File | Lines | Recommendation |
|------|-------|----------------|
| OnboardingFlow.tsx | 1,698 | Split into 5-6 step components |
| ProfileManagement.tsx | 1,380 | Extract edit forms to separate components |
| PersonalProfilePage.tsx | 994 | Extract sections (header, stats, projects) |
| ProjectDashboard.tsx | 984 | Split into dashboard + detail components |
| PrivacyDashboard.tsx | 917 | Extract consent forms to dialogs |
| EquipmentNetworkPanel.tsx | 871 | ✅ Already improved in recent refactor |
| NetworkView.tsx | 850 | Extract node/edge components |
| ProjectDetailPage.tsx | 792 | Split into tabs/sections |
| DayToDayBoard.tsx | 774 | Extract kanban column component |

**Recommended:** Tackle top 3 (OnboardingFlow, ProfileManagement, PersonalProfilePage) first.  
**Effort:** 2-3 hours per component

---

### Issue 7: Large Library Files

**Files exceeding 500-line recommendation:**

| File | Lines | Exports | Recommendation |
|------|-------|---------|----------------|
| firestoreService.ts | 2,088 | 18 | Split into domain-specific services |
| types.ts | 1,766 | 50+ | Split into domain files |

**Action Plan:**
```
lib/
  services/
    userService.ts       (user CRUD)
    projectService.ts    (project CRUD)
    equipmentService.ts  (equipment CRUD)
    fundingService.ts    (funding CRUD)
  types/
    user.ts
    project.ts
    equipment.ts
    funding.ts
```

**Effort:** 4-6 hours per file

---

### Issue 8: Console Statements (187 found)

**Production builds should remove console logs.**

#### Solution: Add ESLint rule + console wrapper

```javascript
// .eslintrc.js
rules: {
  'no-console': ['warn', { allow: ['warn', 'error'] }]
}

// lib/logger.ts
export const logger = {
  log: process.env.NODE_ENV === 'development' ? console.log : () => {},
  warn: console.warn,
  error: console.error,
  debug: process.env.NODE_ENV === 'development' ? console.debug : () => {}
}
```

**Action:** Replace all `console.log` with `logger.log` or remove debugging statements.  
**Effort:** 2-3 hours

---

### Issue 9: Missing Index Files (Barrel Exports)

**Current Problem:**
```typescript
// Verbose imports everywhere
import { EquipmentStatusPanel } from "@/components/views/EquipmentStatusPanel"
import { CheckStockDialog } from "@/components/dialogs/CheckStockDialog"
import { PersonProfile } from "@/lib/types"
```

**Recommendation:** Add barrel exports

```typescript
// components/index.ts
export * from './views'
export * from './dialogs'

// components/views/index.ts
export { EquipmentStatusPanel } from './EquipmentStatusPanel'
export { PeopleView } from './PeopleView'
// ... etc

// components/dialogs/index.ts
export { CheckStockDialog } from './CheckStockDialog'
export { AddSupplyDialog } from './AddSupplyDialog'
// ... etc

// lib/types/index.ts
export * from './user'
export * from './project'
export * from './equipment'
```

**Result:**
```typescript
// Clean imports
import { EquipmentStatusPanel, PeopleView } from "@/components"
import { CheckStockDialog } from "@/components/dialogs"
import { PersonProfile, Project } from "@/lib/types"
```

**Effort:** 2 hours

---

### Issue 10: Firestore Security - Client-Side Lab Filtering

**Current:** `/firestore.rules:94` notes "lab filtering done client-side to avoid circular dependency"

**Problem:** Users could bypass client filtering and access other labs' data

**Recommendation:**
```javascript
// firestore.rules
match /personProfiles/{profileId} {
  allow read: if isAuthenticated() && (
    isAdmin() ||
    get(/databases/$(database)/documents/personProfiles/$(profileId)).data.labId == getUserLab()
  );
}
```

This enforces lab filtering server-side.  
**Effort:** 1-2 hours

---

### Issue 11: Permissive Creation Rules

**Current:** Any authenticated user can create:
- Labs
- Organizations
- Institutes
- Funders

**Recommendation:** Restrict to admins or approved roles

```javascript
match /labs/{labId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin() || isPIOrLabManager();  // ← Change this
  allow update: if isAuthenticated() && (
    resource.data.createdBy == request.auth.uid || isAdmin()
  );
  allow delete: if isAdmin();
}
```

**Effort:** 1 hour

---

### Issue 12: Unused Functions (Dead Code)

**Impact:** LOW - Code bloat  
**Effort:** 10 minutes  
**Action:** DELETE

#### Files to Clean:
```typescript
// lib/useProfiles.ts:36-42
const handleUpdateProfile = async () => {
  console.log("Updating profile...") // ❌ Never called, just logs
  // TODO: implement
}
// DELETE THIS FUNCTION

// lib/useProfiles.ts:51-57
const getAllProfiles = (): PersonProfile[] => {
  return [] // ❌ Always returns empty array, never used
}
// DELETE THIS FUNCTION
```

---

## 🟡 MEDIUM PRIORITY (P2 - Fix This Month)

### Issue 13: Unused Components

**Files to Delete:**

1. **components/ProjectFinancials.tsx**
   - Status: Defined but NOT imported anywhere
   - Evidence: Only found in `UI_ANALYSIS_REPORT.md` (documentation)
   - Action: Delete file

2. **components/projects/ProjectDetailPanel.tsx**
   - Status: File exists but NOT imported anywhere
   - Export Location: `components/projects/index.ts:1`
   - Action: Remove export from `components/projects/index.ts:1` and delete file

3. **components/orders/LinkedOrdersList.tsx**
   - Status: File exists but NOT imported anywhere
   - Export Location: `components/orders/index.ts:4`
   - Action: Remove export from `components/orders/index.ts:4` and delete file

**Effort:** 15 minutes

---

### Issue 14: Unused Hooks

**Files to Delete:**

1. **lib/hooks/useDeliverables.ts**
   - Status: Defined but NOT exported in index.ts and NOT imported anywhere
   - Action: Delete file

2. **lib/hooks/useFirestoreSubscriptions.ts**
   - Status: Defined but NOT exported in index.ts and NOT imported anywhere
   - Action: Delete file

3. **lib/hooks/useOptimisticProjects.ts**
   - Status: Defined but NOT imported anywhere
   - Action: Delete file

4. **lib/hooks/useOptimisticState.ts**
   - Status: Defined but NOT imported anywhere
   - Action: Delete file

**Effort:** 10 minutes

---

### Issue 15: Temporary/Backup Files

**Files to Remove:**

1. **`.gitignore.bak`**
   - Type: Backup file
   - Action: Delete file

2. **`tsc_output.txt`**
   - Type: TypeScript compilation error output
   - Status: Contains 238 lines of TypeScript errors (test file issues)
   - Action: Delete file (errors should be fixed, not stored)

3. **`WhiteBoard`**
   - Type: Unknown
   - Status: Not referenced anywhere in codebase
   - Action: Check contents, then delete if not needed

4. **`generate_index_ts.py`**
   - Type: Python script to auto-generate `lib/types/index.ts`
   - Status: May be useful for maintenance
   - Action: Document usage or remove if obsolete

**Effort:** 10 minutes

---

### Issue 16: One-Time Migration Scripts

**Scripts to Archive/Remove:**

1. **`scripts/call-enable-booking.ts`**
   - Purpose: Calls Firebase function to enable booking on all equipment
   - Action: Remove if migration already completed

2. **`scripts/enable-equipment-booking.ts`**
   - Purpose: Enables booking settings on all equipment
   - Action: Remove if migration already completed

3. **`scripts/fix-funding-sync.ts`**
   - Purpose: Migration script to fix funding synchronization
   - Action: Remove if migration already completed

4. **`scripts/migrate-equipment-inventory.ts`**
   - Purpose: Equipment & Inventory System migration script
   - Status: Task 28/28 complete
   - Action: Remove if migration already completed

**Effort:** 10 minutes (verify completion first)

---

### Issue 17: Documentation - Broken Links in README.md

**Lines 184-188 reference non-existent files:**

```diff
- For more information, refer to:
- - [SESSION_FINAL_SUMMARY.md](SESSION_FINAL_SUMMARY.md)
- - [NEXT_SESSION_TODO.md](NEXT_SESSION_TODO.md)
- - [QUICK_START_NEXT_SESSION.md](QUICK_START_NEXT_SESSION.md)
- - [PROJECT_CLEANUP_PLAN.md](PROJECT_CLEANUP_PLAN.md)

+ For more information, refer to:
+ - [Project Status](PROJECT_STATUS.md) - Current feature implementation status
+ - [Progress Summary](PROGRESS_SUMMARY.md) - Completed work summary
+ - [Testing Guide](TESTING_GUIDE.md) - How to run and write tests
+ - [API Documentation](API_DOCUMENTATION.md) - Function reference
```

**Effort:** 5 minutes

---

### Issue 18: Missing Documentation

**Documents to Create:**

| Document | Priority | Effort | Why Important |
|----------|----------|--------|---------------|
| **PROJECT_STATUS.md** | HIGH | 30 min | One-page current status of all features |
| **API_DOCUMENTATION.md** | HIGH | 2-3 hrs | Document major functions in lib/ |
| **COMPONENT_GUIDE.md** | HIGH | 2-3 hrs | How to use major components |
| **TESTING_GUIDE.md** | HIGH | 1-2 hrs | We have 70 tests but no guide |
| **DATA_MODEL.md** | MEDIUM | 1-2 hrs | Firestore schema documentation |
| **CONTRIBUTING.md** | MEDIUM | 1 hr | Code standards & PR process |
| **ARCHITECTURE.md** | MEDIUM | 2-3 hrs | Why Next.js/Firebase/etc? |
| **TROUBLESHOOTING.md** | LOW | 1 hr | Common issues & fixes |

**Effort:** 10-15 hours total

---

### Issue 19: Update Plan Status Headers

**Add to top of these files:**

```markdown
// INTEGRATION_PLAN.md
## ⚠️ STATUS: FUTURE ROADMAP - NOT YET IMPLEMENTED
This is a comprehensive plan for future equipment/inventory refactoring.
**Not yet started. Target: TBD**

// CALENDAR_INTEGRATION_PLAN.md
## ⚠️ STATUS: FUTURE ROADMAP - NOT YET IMPLEMENTED
Calendar integration specification.
**Not yet started. Expected: Q2 2025**

// GDPR_FUNDING_IMPLEMENTATION_PLAN.md
## Implementation Status
- ✅ Phase 1: Foundation & Types - COMPLETE
- ⏳ Phase 2: Backend Cloud Functions - NOT STARTED
- ⏳ Phase 3: Funding UI - PARTIALLY COMPLETE
- ⏳ Phase 4: Advanced Features - NOT STARTED
```

**Effort:** 10 minutes

---

### Issue 20: Obsolete Markdown Files

**Completed Project Documentation (Archive/Remove):**

1. **momentum_action_plan.md** - Action plan marked "100% Complete (18/18 items)" ✅
2. **PHASE1_COMPLETION_SUMMARY.md** - Phase 1 completion summary (weeks 1-2 complete)
3. **PROGRESS_SUMMARY.md** - Progress summary (November 14, 2025)
4. **CALENDAR_INTEGRATION_SUMMARY.md** - Calendar integration completed (Phases 1-4)
5. **DEPLOYMENT_READINESS.md** - Deployment checklist marked "READY FOR LOCAL DEPLOYMENT" ✅
6. **DEPLOYMENT_FIX_CHECKLIST.md** - Deployment fixes completed
7. **PHASE1_README.md** - Phase 1 documentation (completed)

**Recommendation:** Archive to `docs/archive/` or remove if no longer needed for reference.

**Outdated Planning Documents (Review):**

8. **PROJECT_STATUS.md** - Status overview (November 15, 2025) - May be outdated
9. **PROJECT_MANAGEMENT_INTEGRATION_STATUS.md** - Integration status (may be complete)
10. **PROJECT_MANAGEMENT_REDESIGN.md** - Redesign documentation (may be implemented)
11. **INTEGRATION_PLAN.md** - Integration plan (may be complete)
12. **MOMENTUM_BUG_BACKLOG.md** - Bug backlog (may be resolved)

**Recommendation:** Review for current relevance, archive if outdated.

**Effort:** 1-2 hours (review and archive)

---

## 🟢 LOW PRIORITY (P3 - Technical Debt)

### Issue 21: TypeScript Strict Mode

**Recommendation:** Enable strict mode progressively

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,  // Enable all strict checks

    // Or enable gradually:
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true
  }
}
```

This will catch many bugs at compile time rather than runtime.  
**Effort:** 4-6 hours (fix resulting type errors)

---

### Issue 22: ESLint Rules

**Recommended ESLint Rules:**

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'max-lines': ['warn', { max: 300, skipBlankLines: true }],
    'complexity': ['warn', 10]
  }
}
```

**Effort:** 30 minutes

---

### Issue 23: Testing Improvements

**Current State:**
- ✅ 70 integration tests (EXCELLENT)
- ✅ 4 test suites
- ✅ 100% test passing rate
- ✅ Jest + React Testing Library configured

**Gaps:**
- ❌ No component tests for UI elements
- ❌ No E2E tests
- ❌ No test coverage reports generated
- ❌ No CI/CD test automation

**Recommended Additions:**

```json
// package.json
{
  "scripts": {
    "test:unit": "jest __tests__",
    "test:components": "jest --testPathPattern=components",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

**Add:**
1. **Component Tests:** Test major UI components (10-15 hours to add 20 tests)
2. **E2E Tests:** Add Playwright for critical user flows (8-10 hours for 5 flows)
3. **Coverage Goals:** Aim for 70% code coverage minimum

**Effort:** 18-25 hours

---

## ⚡ QUICK WINS (< 1 Hour Each)

These can be done immediately for fast improvements:

1. ✅ **Delete `/components/PeopleView.tsx`** (2 min)
2. ✅ **Delete unused functions in `useProfiles.ts`** (2 min)
3. ✅ **Fix README.md broken links** (5 min)
4. ✅ **Add status headers to CALENDAR_INTEGRATION_PLAN.md** (3 min)
5. ✅ **Add status headers to INTEGRATION_PLAN.md** (3 min)
6. ✅ **Update GDPR_FUNDING_IMPLEMENTATION_PLAN.md status** (5 min)
7. ✅ **Remove missing type exports from `lib/types/index.ts`** (2 min)
8. ✅ **Delete unused components** (ProjectFinancials, ProjectDetailPanel, LinkedOrdersList) (5 min)
9. ✅ **Delete unused hooks** (useDeliverables, useFirestoreSubscriptions, etc.) (5 min)
10. ✅ **Remove temporary files** (.gitignore.bak, tsc_output.txt) (2 min)
11. ✅ **Add ESLint no-console rule** (10 min)

**Total Quick Wins Time: ~45 minutes → High impact on code cleanliness**

---

## 📋 IMPLEMENTATION ROADMAP

### Week 1: Critical Fixes (8 hours)

- [ ] **Day 1 (2 hrs):** Fix deprecated `.lab` → `.labId` in all 8 files
- [ ] **Day 2 (2 hrs):** Type AppContext properly, update 16 consuming files
- [ ] **Day 3 (1 hr):** Delete duplicate PeopleView.tsx, unused functions
- [ ] **Day 4 (2 hrs):** Add null safety checks in firestoreService.ts
- [ ] **Day 5 (1 hr):** Fix README broken links, add status headers

### Week 2: Code Quality (12 hours)

- [ ] **Mon (3 hrs):** Split OnboardingFlow into step components
- [ ] **Tue (3 hrs):** Split ProfileManagement into sections
- [ ] **Wed (2 hrs):** Create barrel exports (index.ts files)
- [ ] **Thu (2 hrs):** Replace console.log with logger utility
- [ ] **Fri (2 hrs):** Fix Firestore security rules (server-side lab filtering)

### Week 3: Documentation (10 hours)

- [ ] **Mon (2 hrs):** Create PROJECT_STATUS.md
- [ ] **Tue (3 hrs):** Create API_DOCUMENTATION.md
- [ ] **Wed (3 hrs):** Create COMPONENT_GUIDE.md
- [ ] **Thu (1 hr):** Create TESTING_GUIDE.md
- [ ] **Fri (1 hr):** Create CONTRIBUTING.md

### Week 4: Advanced Improvements (Optional, 16 hours)

- [ ] Split firestoreService.ts into domain services
- [ ] Split types.ts into domain type files
- [ ] Refactor remaining oversized components
- [ ] Create DATA_MODEL.md with schema diagrams
- [ ] Create ARCHITECTURE.md with ADRs

---

## 📊 METRICS & SUCCESS CRITERIA

### Before Improvements

| Metric | Current |
|--------|---------|
| Type Safety | 60% (lots of `any`) |
| Dead Code | 557+ lines (1 duplicate file) |
| Documentation Quality | 7/10 |
| Test Coverage | Unknown (no report) |
| Avg Component Size | 450 lines |
| Console Statements | 187 |
| Critical Bugs | 5 |

### After Implementation (Target)

| Metric | Target | Status |
|--------|--------|--------|
| Type Safety | 95% | ⏳ Pending |
| Dead Code | 0 lines | ⏳ Pending |
| Documentation Quality | 9/10 | ⏳ Pending |
| Test Coverage | 70% | ⏳ Pending |
| Avg Component Size | <300 lines | ⏳ Pending |
| Console Statements | 0 in production | ⏳ Pending |
| Critical Bugs | 0 | ⏳ Pending |

---

## 📝 APPENDIX: Complete File List

### Files with Critical Issues

1. `/components/LabPollPanel.tsx` - Uses `.lab`
2. `/components/NetworkView.tsx` - Uses `.lab`, has `as any` casts
3. `/components/views/ProfileManagement.tsx` - Uses `.lab`
4. `/lib/personHelpers.ts` - Uses deprecated fields
5. `/lib/firestoreService.ts` - Uses `.lab`, unsafe null access
6. `/lib/searchUtils.ts` - Uses `.lab`
7. `/lib/AppContext.tsx` - `createContext<any>`
8. `/components/PeopleView.tsx` - Duplicate (DELETE)

### Files to Delete

**Components:**
- `/components/PeopleView.tsx` (duplicate)
- `/components/ProjectFinancials.tsx` (unused)
- `/components/projects/ProjectDetailPanel.tsx` (unused)
- `/components/orders/LinkedOrdersList.tsx` (unused)

**Hooks:**
- `/lib/hooks/useDeliverables.ts` (unused)
- `/lib/hooks/useFirestoreSubscriptions.ts` (unused)
- `/lib/hooks/useOptimisticProjects.ts` (unused)
- `/lib/hooks/useOptimisticState.ts` (unused)

**Temporary Files:**
- `/.gitignore.bak` (backup)
- `/tsc_output.txt` (build artifact)
- `/WhiteBoard` (unknown, investigate first)

**Scripts (verify completion first):**
- `/scripts/call-enable-booking.ts` (one-time migration)
- `/scripts/enable-equipment-booking.ts` (one-time migration)
- `/scripts/fix-funding-sync.ts` (one-time migration)
- `/scripts/migrate-equipment-inventory.ts` (one-time migration)

### Files to Archive

**Completed Documentation:**
- `momentum_action_plan.md`
- `PHASE1_COMPLETION_SUMMARY.md`
- `PROGRESS_SUMMARY.md`
- `CALENDAR_INTEGRATION_SUMMARY.md`
- `DEPLOYMENT_READINESS.md`
- `DEPLOYMENT_FIX_CHECKLIST.md`
- `PHASE1_README.md`

---

## 🎯 PRIORITY SUMMARY

### Must Fix Now (P0)
1. Deprecated `.lab` field usage (8 files)
2. AppContext type safety (16 files)
3. Duplicate PeopleView.tsx
4. Missing type file exports
5. Unsafe null handling

### Should Fix This Week (P1)
6. Oversized components (9 files)
7. Large library files (2 files)
8. Console statements (187 instances)
9. Missing barrel exports
10. Firestore security rules
11. Permissive creation rules
12. Unused functions

### Can Fix This Month (P2)
13. Unused components (3 files)
14. Unused hooks (4 files)
15. Temporary files (4 files)
16. Migration scripts (4 files)
17. Documentation broken links
18. Missing documentation (8 files)
19. Plan status headers
20. Obsolete markdown files

### Technical Debt (P3)
21. TypeScript strict mode
22. ESLint rules
23. Testing improvements

---

**Report Generated:** January 2025  
**Sources:** CODEBASE_ANALYSIS.md, CODEBASE_AUDIT_RECOMMENDATIONS.md, CODEBASE_CLEANUP_REPORT.md  
**Next Review:** Recommended in 3 months after implementing critical + high priority items.

