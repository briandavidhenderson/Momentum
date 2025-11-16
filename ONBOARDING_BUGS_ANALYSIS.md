# Critical Onboarding Synchronization Bugs - Analysis & Fixes

**Date**: 2025-11-16
**Session**: claude/remove-duplicate-functions-01Ly6Ceb1op4ri2ZBR3LcdkZ
**Severity**: CRITICAL - Blocks core functionality

## User Report

> "I see a giant flaw after onboarding. I create my project and list myself as a PI but then when I navigate I see no projects and even my ledger says that I should contact my PI. There are clearly problems and bugs in these scripts that are hindering functionality. This needs to be synchronized across the entire system."

---

## Root Cause Analysis

After onboarding completes, the following should happen:
1. ✅ Profile created with labId
2. ✅ Project created with user as PI
3. ✅ Funding account created (if specified)
4. ❌ **NO funding allocation created for PI** ← CRITICAL BUG
5. ❌ Projects may not appear due to data inconsistencies
6. ❌ Ledger shows "Contact your PI" message

---

## Bug #1: No Funding Allocation for PIs ✅ FIXED

### Problem
**File**: `components/OnboardingFlow.tsx:616-633`

When a PI creates a project with funding during onboarding:
- ✅ `createFundingAccount()` creates the account
- ❌ No `FundingAllocation` is created for the PI
- ❌ Cloud Function `createDefaultAllocation` only triggers on user creation, NOT on project/account creation

**Result**:
- Personal Ledger shows: "You currently have no funding allocations. Contact your PI or lab manager to request funding allocation."
- PI cannot create orders (no allocation to charge against)
- System doesn't recognize PI as someone who can spend funds

### Root Cause

**File**: `firebase/functions/src/funding.ts:307-348`
```typescript
export const createDefaultAllocation = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snapshot, context) => {
    // Only triggers when USER is created
    // Does NOT trigger when:
    // - Profile is created
    // - Project is created
    // - Funding account is created
```

**Trigger timing**:
- User document created → Cloud Function runs
- BUT: User is created in `AuthPage.tsx:79` BEFORE onboarding
- By the time funding account is created, trigger already fired
- No allocation gets created

### Fix Applied ✅

**Created**: `lib/services/fundingService.ts:328-350`
```typescript
export async function createFundingAllocation(allocationData: Omit<FundingAllocation, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const allocationRef = doc(collection(db, "fundingAllocations"))
  const allocationId = allocationRef.id

  await setDoc(allocationRef, {
    ...allocationData,
    id: allocationId,
  })

  logger.info(`Created funding allocation ${allocationId}`, {
    type: allocationData.type,
    personId: allocationData.personId,
    projectId: allocationData.projectId,
    amount: allocationData.allocatedAmount,
  })

  return allocationId
}
```

**Updated**: `components/OnboardingFlow.tsx:635-663`
```typescript
// Create personal funding allocation for the PI
if (accountId && state.isPrincipalInvestigator) {
  const { createFundingAllocation } = await import("@/lib/services/fundingService")
  // Allocate 50% of total budget to PI by default (can be adjusted later)
  const piAllocationAmount = budgetValue * 0.5

  await createFundingAllocation({
    fundingAccountId: accountId,
    fundingAccountName: state.accountName,
    labId: state.selectedLab.id,
    type: "PERSON",
    personId: profileId,
    personName: `${profileData.firstName} ${profileData.lastName}`,
    allocatedAmount: piAllocationAmount,
    currentSpent: 0,
    currentCommitted: 0,
    remainingBudget: piAllocationAmount,
    currency: state.currency,
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
  })

  logger.info("Created PI funding allocation during onboarding", {
    profileId,
    accountId,
    amount: piAllocationAmount,
  })
}
```

**Changes**:
- ✅ New `createFundingAllocation()` function in fundingService
- ✅ Automatically creates personal allocation for PI after account creation
- ✅ Allocates 50% of total budget to PI by default
- ✅ Properly initializes all budget tracking fields
- ✅ Logs allocation creation for debugging

**Impact**:
- ✅ PIs now have funding allocation immediately after onboarding
- ✅ Personal Ledger shows budget instead of "contact PI" message
- ✅ PIs can create orders with their personal allocation
- ✅ Budget tracking works from day 1

**Status**: ✅ **FIXED** - Committed in c98ef52, ready to deploy

---

## Bug #2: Workpackages Not Appearing ⚠️ NEEDS FIX

### Problem

**File**: `lib/hooks/useProjects.ts:41`
```typescript
const wps = await getWorkpackages(project.id); // Calls with MasterProject.id
```

**File**: `lib/services/workpackageService.ts:81`
```typescript
const q = query(collection(db, "workpackages"), where("profileProjectId", "==", profileProjectId))
```

**Mismatch**:
- `useProjects` passes `MasterProject.id`
- `getWorkpackages` queries for `profileProjectId`
- These are different things!

**File**: `lib/types/workpackage.types.ts:16`
```typescript
profileProjectId: string // Links to ProfileProject (master project)
```

**Comment says**: "Links to ProfileProject (master project)"
**Reality**: ProfileProject is DEPRECATED (see project.types.ts:10)

### Root Cause

The system is in transition:
- **Old system**: `ProfileProject` type + `profileProjectId` references
- **New system**: `MasterProject` type
- **Onboarding**: Creates `MasterProject` entities
- **Workpackages**: Still use `profileProjectId` field

When you create a project during onboarding:
- ✅ Creates `MasterProject` with ID `abc123`
- ❌ Creates workpackages with `profileProjectId: undefined` (not created during onboarding)
- ❌ Query `getWorkpackages('abc123')` looks for `profileProjectId == 'abc123'`
- ❌ Nothing matches because field name is wrong

### Fix Needed ⚠️

**Option A: Rename field in Workpackage type**
```typescript
// lib/types/workpackage.types.ts
export interface Workpackage {
  id: string
  name: string
  masterProjectId: string  // Changed from profileProjectId
  // ... rest of fields
}
```

Then update all queries to use `masterProjectId`.

**Option B: Add both fields for backward compatibility**
```typescript
export interface Workpackage {
  id: string
  name: string
  profileProjectId?: string  // DEPRECATED - for old data
  masterProjectId: string    // NEW - use this
  // ... rest of fields
}
```

Then migrate existing data and update queries.

**Recommended**: Option B for safer migration

**Status**: ⚠️ **PENDING** - Needs schema migration

---

## Bug #3: Projects Not Appearing ⚠️ NEEDS INVESTIGATION

### Problem

User reports: "when I navigate I see no projects"

### Current Query

**File**: `lib/hooks/useProjects.ts:29-56`
```typescript
useEffect(() => {
  if (profile?.labId) {
    const unsubscribe = subscribeToMasterProjects(
      { labId: profile.labId },  // Only filters by labId
      async (newProjects) => {
        setProjects(newProjects);
        // ...
      }
    );
    return () => unsubscribe();
  }
}, [profile]);
```

**File**: `lib/services/projectService.ts:142-163`
```typescript
export function subscribeToMasterProjects(
  filters: { labId?: string; funderId?: string; personId?: string } | null,
  callback: (projects: MasterProject[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "masterProjects")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }
  // ...
}
```

### Analysis

The query should work IF:
- ✅ Profile has correct `labId`
- ✅ Project created with same `labId`
- ✅ Profile loaded before projects query runs

**Possible causes**:
1. **Timing issue**: Profile not loaded when projects query runs
2. **Lab ID mismatch**: Project created with different labId than profile
3. **Firestore rules**: Permission denied for reading projects
4. **Query error**: Silent failure in subscription

### Debug Steps Needed

1. **Check profile labId**:
   ```typescript
   console.log('Profile labId:', profile?.labId)
   ```

2. **Check projects in Firestore Console**:
   - Go to Firestore → `masterProjects`
   - Verify projects exist with correct `labId`

3. **Check browser console for errors**:
   - Look for permission denied errors
   - Look for query errors

4. **Add logging to subscription**:
   ```typescript
   return onSnapshot(q, (snapshot) => {
     console.log('Projects loaded:', snapshot.docs.length)
     const projects = snapshot.docs.map(doc => doc.data() as MasterProject)
     console.log('Projects:', projects)
     callback(projects)
   })
   ```

**Status**: ⚠️ **NEEDS INVESTIGATION** - Requires user testing

---

## System-Wide Synchronization Issues

### Data Model Inconsistencies

| Entity | Old Field | New Field | Status |
|--------|-----------|-----------|--------|
| Workpackage | `profileProjectId` | `masterProjectId` | ❌ Not migrated |
| Project | `ProfileProject` type | `MasterProject` type | ⚠️ Mixed usage |
| Lab | `principalInvestigators[]` | ??? | ⚠️ Unknown |
| Person | ??? | `PersonProfile` type | ✅ Using new type |

### Query Mismatches

| Location | Query Field | Actual Field | Status |
|----------|-------------|--------------|--------|
| `useProjects:41` | Passes `MasterProject.id` | Expects `profileProjectId` | ❌ Mismatch |
| `useFunding:51` | Filters by `labId` | ✅ Correct | ✅ Working |
| `subscribeToMasterProjects` | Filters by `labId` | ✅ Correct | ✅ Working |

---

## Recommended Action Plan

### Immediate (Deploy Now) ✅
1. **Deploy funding allocation fix**
   - Commit: c98ef52
   - Files: `fundingService.ts`, `OnboardingFlow.tsx`
   - Impact: PIs can use funding after onboarding

### High Priority (This Week) ⚠️
2. **Fix workpackage query mismatch**
   - Add `masterProjectId` field to Workpackage type
   - Update `getWorkpackages()` to use correct field
   - Migrate existing workpackages data

3. **Investigate missing projects**
   - Add debug logging to `useProjects` hook
   - Check Firestore rules for masterProjects
   - Verify labId consistency

### Medium Priority (Next Sprint)
4. **Schema migration**
   - Migrate all `profileProjectId` → `masterProjectId`
   - Update all queries to use new field names
   - Add TypeScript strict checks

5. **Data validation script**
   - Check all profiles have labId
   - Check all projects have correct labId
   - Check all allocations link to valid accounts
   - Fix orphaned/broken references

---

## Testing Checklist

After deploying fixes, test complete onboarding flow:

### Test 1: PI with Project and Funding
- [ ] Create new account
- [ ] Complete onboarding as PI
- [ ] Create project with funding account
- [ ] Check Personal Ledger shows budget (not "contact PI")
- [ ] Check Projects page shows created project
- [ ] Create test order with personal allocation
- [ ] Verify order appears in Orders page

### Test 2: Non-PI User
- [ ] Create new account
- [ ] Complete onboarding as non-PI (e.g., Postdoc)
- [ ] Do NOT create project
- [ ] Check Personal Ledger (should show "contact PI" - expected)
- [ ] Projects page should be empty (expected)

### Test 3: Data Consistency
- [ ] Check Firestore Console → `masterProjects`
  - Verify project exists with correct labId
  - Verify user is in `principalInvestigatorIds`
  - Verify user is in `teamMemberIds`
- [ ] Check Firestore Console → `fundingAllocations`
  - Verify allocation exists
  - Verify `personId` matches profileId
  - Verify `fundingAccountId` matches account
  - Verify `allocatedAmount` is 50% of total budget

---

## Deployment Instructions

### Windows PowerShell

```powershell
# Pull latest fixes
git fetch origin
git checkout claude/remove-duplicate-functions-01Ly6Ceb1op4ri2ZBR3LcdkZ
git pull origin claude/remove-duplicate-functions-01Ly6Ceb1op4ri2ZBR3LcdkZ

# Build and deploy
npm run build
firebase deploy --only hosting
firebase deploy --only functions

# Verify deployment
# - Check hosting URL: https://momentum-a60c5.web.app
# - Test onboarding with new account
# - Verify Personal Ledger shows budget
```

### Expected Result

After deployment:
- ✅ New PIs get funding allocation automatically
- ✅ Personal Ledger shows budget instead of "contact PI"
- ✅ Orders can be created with personal allocation
- ⚠️ Projects may still not appear (needs investigation)
- ⚠️ Workpackages query still broken (needs schema fix)

---

## Summary

### Fixed ✅
- **Funding allocation for PIs**: Auto-created during onboarding with 50% of budget

### Pending ⚠️
- **Workpackage query**: Field name mismatch between MasterProject and Workpackage
- **Missing projects**: Needs investigation (likely timing or permissions)
- **Schema migration**: profileProjectId → masterProjectId

### Impact
- **Before**: PIs couldn't use funding, saw "contact PI" message
- **After**: PIs can immediately create orders and spend funds
- **Remaining**: Projects and workpackages need additional fixes

---

## Files Changed

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `lib/services/fundingService.ts` | +32 | Add createFundingAllocation function |
| `components/OnboardingFlow.tsx` | +28 | Auto-create PI allocation after account |
| **Total** | **+60** | Critical onboarding fix |

---

## Commit

```
Commit: c98ef52
Branch: claude/remove-duplicate-functions-01Ly6Ceb1op4ri2ZBR3LcdkZ
Message: CRITICAL FIX: Create funding allocation for PIs during onboarding
Status: Pushed, ready to deploy
```

