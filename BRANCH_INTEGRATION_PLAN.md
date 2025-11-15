# Branch Integration Plan

**Date:** 2025-11-14
**Author:** Claude
**Purpose:** Integrate all improvements from feature branches into main

---

## Executive Summary

This document outlines a comprehensive plan to integrate improvements from 6 active feature branches. The branches contain:
- **Calendar Integration** (Google & Microsoft Calendar OAuth and sync)
- **Code Protection System** (Git hooks, snapshots, CODEOWNERS)
- **Design System Enhancement** (Design tokens, motion layer, enhanced UI components)
- **ORCID Integration** (Profile sync, rich data display)
- **Bug Fixes** (React hooks, performance optimizations)

**Recommended Strategy:** Sequential merge starting with the most comprehensive branch as foundation, then layering additional features.

---

## Branch Overview

| Branch | Commits | Status | Priority |
|--------|---------|--------|----------|
| `claude/fix-calendar-conflict-type-011CV6ERPEbFLApQ9j5qaVgG` | 23 | 🟢 Most Comprehensive | **1 - Foundation** |
| `claude/force-deploy-orcid-fix-01N5PV4tbYzvRrPfL5AsMFXj` | 3 | 🟡 ORCID Display | **2 - Feature** |
| `claude/orcid-profile-integration-01Naa4i43ZSLboyZpgtEod2C` | 2 | 🟡 ORCID Sync | **3 - Feature** |
| `claude/audit-codebase-bugs-011CV6AKX41M38oUQuEpYGjt` | 3 | 🟡 Bug Fixes | **4 - Cherry-pick** |
| `claude/core-code-protection-011CV63ZyW3o4a7ThYr7j7F4` | 16 | 🔵 Subset of Branch 1 | Skip (included) |
| `claude/design-tokens-motion-layer-011CV66A9RJ3WjYf74fvVweJ` | 1 | 🔵 Subset of Branch 1 | Skip (included) |

---

## Detailed Branch Analysis

### 1. 🟢 `claude/fix-calendar-conflict-type` (Foundation)

**Modified/Added:** 37 files
**Key Features:**
- ✅ **Calendar Integration** (Google + Microsoft OAuth, sync)
  - Components: `CalendarConnections.tsx`, `CalendarEventCard.tsx`, `CalendarSettings.tsx`
  - Libraries: `lib/calendar/google.ts`, `lib/calendar/microsoft.ts`, `lib/firestoreCalendarService.ts`
  - Backend: `firebase/functions/src/calendar-sync.ts`
  - Hourly auto-sync + manual sync
  - Read-only external events

- ✅ **Code Protection System**
  - Git hooks: `scripts/pre-commit-protection.sh`
  - Snapshot system: `scripts/create-snapshot.sh`, `scripts/list-snapshots.sh`
  - Documentation: `CODE_PROTECTION.md`, `CODEOWNERS`

- ✅ **Design System**
  - Design tokens in `app/globals.css` (borders, shadows, spacing, motion, easing)
  - Enhanced UI components (Alert, Badge, Button, Card, Dialog, Input, Label, Tabs)
  - Framer Motion integration

- ✅ **Dependencies**
  - Added: `framer-motion`, `googleapis`, `@microsoft/microsoft-graph-client`

**Recommendation:** Use as foundation - most complete feature set.

---

### 2. 🟡 `claude/force-deploy-orcid-fix` (ORCID Display)

**Modified:** 3 files
**Key Features:**
- ✅ **Rich ORCID Data Display**
  - Fetches full ORCID record: person, works, employments, educations, funding
  - Types: `OrcidEmployment`, `OrcidEducation`, `OrcidWork`, `OrcidFunding`, `OrcidProfileData`
  - UI displays:
    - Biography
    - Employment history with dates
    - Education with degrees and institutions
    - Publications with DOI links (20 most recent)
    - Funding information

- ✅ **Backend Implementation**
  - `fetchOrcidRecord()` function in Cloud Functions
  - `parseOrcidDate()` helper for date formatting
  - Stores data in `orcidData` field
  - Proper disconnect using `deleteField()`

**Files Changed:**
- `components/views/PersonalProfilePage.tsx`
- `firebase/functions/src/index.ts`
- `lib/types.ts`

**Conflicts:** Will conflict with Branch 3 & 4 in PersonalProfilePage.tsx (ORCID UI section)

---

### 3. 🟡 `claude/orcid-profile-integration` (ORCID Sync)

**Modified:** 3 files
**Key Features:**
- ✅ **Profile Auto-Population**
  - Syncs ORCID data to user profile fields
  - Maps: name, bio, email, organization, position, qualifications, research interests
  - Two sync modes:
    - "Resync (Empty Fields)" - only fills empty fields
    - "Force Resync (All Fields)" - overwrites all fields

- ✅ **Implementation**
  - `orcidResyncProfile()` Cloud Function
  - `extractOrcidProfileData()` helper
  - Public API access (no token needed for re-sync)
  - Shows ORCID claims in UI

**Files Changed:**
- `components/views/PersonalProfilePage.tsx`
- `firebase/functions/src/index.ts`
- `lib/auth/orcid.ts`

**Conflicts:** Will conflict with Branch 2 in PersonalProfilePage.tsx and index.ts

**Note:** Different approach than Branch 2. Can be merged together to provide both display and sync features.

---

### 4. 🟡 `claude/audit-codebase-bugs` (Bug Fixes)

**Modified:** 10 files
**Key Features:**
- ✅ **React Hooks Fixes**
  - Fixed dependency arrays in `useMemo`, `useCallback`
  - Added missing dependencies in ProjectDashboard hooks
  - Removed unused imports

- ✅ **Performance Optimizations**
  - Wrapped filters in `useMemo` (PeopleView, NetworkView)
  - Prevents unnecessary re-renders

- ✅ **Calendar UI Fixes**
  - Disabled unimplemented view modes (day/week/month)
  - Only keeps timeline view enabled

- ✅ **ORCID Integration** (less complete than Branch 2)
  - Similar to Branch 2 but not as comprehensive

**Files Changed:**
- `components/GanttChart.tsx`
- `components/NetworkView.tsx`
- `components/views/CalendarEvents.tsx`
- `components/views/PeopleView.tsx`
- `components/views/PersonalProfilePage.tsx`
- `components/views/ProjectDashboard.tsx`
- `firebase/functions/src/index.ts`
- `firestore.rules`
- `lib/auth/orcid.ts`
- `lib/types.ts`

**Warning:** Removed `canViewProject()` function from firestore.rules - may need review

**Conflicts:** Will conflict with Branches 2 & 3 in PersonalProfilePage.tsx and index.ts

**Recommendation:** Cherry-pick specific bug fixes after merging Branches 2 & 3

---

### 5. 🔵 `claude/core-code-protection` (Subset)

**Status:** ⚠️ Skip - Fully contained in Branch 1

This branch is a subset of `claude/fix-calendar-conflict-type`. All changes are already included.

---

### 6. 🔵 `claude/design-tokens-motion-layer` (Subset)

**Status:** ⚠️ Skip - Fully contained in Branch 1

This branch is a subset of `claude/fix-calendar-conflict-type`. All changes are already included.

---

## Conflict Analysis

### Major Conflicts

#### Conflict 1: PersonalProfilePage.tsx (ORCID UI)
**Branches:** 2, 3, 4
**Issue:** Each branch has different ORCID UI implementations

- **Branch 2 (force-deploy-orcid-fix):** Rich data display with bio, publications, employment, education, funding
- **Branch 3 (orcid-profile-integration):** Sync buttons, auto-populate profile fields
- **Branch 4 (audit-codebase-bugs):** Similar to Branch 2 but less complete

**Resolution Strategy:**
1. Use Branch 2's rich display as base
2. Add Branch 3's sync functionality
3. Combine both approaches for comprehensive ORCID integration

#### Conflict 2: firebase/functions/src/index.ts (Backend)
**Branches:** 2, 3, 4
**Issue:** Different Cloud Functions for ORCID

- **Branch 2:** `fetchOrcidRecord()` for comprehensive data fetching
- **Branch 3:** `orcidResyncProfile()` for profile field population
- **Branch 4:** Similar to Branch 2

**Resolution Strategy:**
1. Keep both functions - they serve different purposes
2. Use Branch 2's `fetchOrcidRecord()` for UI display
3. Add Branch 3's `orcidResyncProfile()` for profile sync

#### Conflict 3: lib/types.ts (Type Definitions)
**Branches:** 2, 4
**Issue:** Different ORCID type definitions

- **Branch 2:** Comprehensive types (OrcidWork, OrcidFunding, OrcidProfileData, etc.)
- **Branch 4:** Similar but less complete

**Resolution Strategy:**
1. Use Branch 2's complete type definitions

---

## Merge Strategy

### Phase 1: Foundation (Branch 1)
**Target:** Merge `claude/fix-calendar-conflict-type` to main

**Includes:**
- Calendar integration (Google + Microsoft)
- Code protection system
- Design system enhancements
- Enhanced UI components

**Actions:**
```bash
git checkout main
git merge claude/fix-calendar-conflict-type-011CV6ERPEbFLApQ9j5qaVgG
# Resolve any conflicts with current main
# Test thoroughly
```

---

### Phase 2: ORCID Rich Display (Branch 2)
**Target:** Merge `claude/force-deploy-orcid-fix` to main

**Includes:**
- Rich ORCID data display
- Biography, publications, employment, education, funding
- Comprehensive backend functions

**Actions:**
```bash
git checkout main
git merge claude/force-deploy-orcid-fix-01N5PV4tbYzvRrPfL5AsMFXj
# Expected conflicts:
# - components/views/PersonalProfilePage.tsx
# - firebase/functions/src/index.ts
# - lib/types.ts
```

**Conflict Resolution:**
- Keep Branch 2's implementation (more complete)
- Ensure no regression from Phase 1

---

### Phase 3: ORCID Profile Sync (Branch 3)
**Target:** Merge `claude/orcid-profile-integration` to main

**Includes:**
- Profile auto-population from ORCID
- Resync buttons (empty fields vs all fields)

**Actions:**
```bash
git checkout main
git merge claude/orcid-profile-integration-01Naa4i43ZSLboyZpgtEod2C
# Expected conflicts:
# - components/views/PersonalProfilePage.tsx (major)
# - firebase/functions/src/index.ts (moderate)
# - lib/auth/orcid.ts (minor)
```

**Conflict Resolution for PersonalProfilePage.tsx:**
1. Keep existing ORCID display from Phase 2
2. Add sync buttons from Branch 3 above the display section
3. Structure:
   ```
   [Connect/Disconnect ORCID Button]
   [Resync Buttons] ← Add from Branch 3
   [Rich ORCID Data Display] ← Keep from Branch 2
   ```

**Conflict Resolution for index.ts:**
1. Keep `fetchOrcidRecord()` from Phase 2
2. Add `orcidResyncProfile()` from Branch 3
3. Both functions coexist independently

---

### Phase 4: Bug Fixes (Branch 4 - Cherry-pick)
**Target:** Cherry-pick specific bug fixes from `claude/audit-codebase-bugs`

**Include:**
- ✅ React hooks dependency fixes (GanttChart, NetworkView, ProjectDashboard)
- ✅ Performance optimizations (useMemo in PeopleView, NetworkView)
- ✅ Calendar view mode disabling (CalendarEvents)
- ❌ Skip ORCID changes (already handled in Phases 2 & 3)

**Actions:**
```bash
git checkout main

# Cherry-pick specific file changes
# Option 1: Cherry-pick specific commits (if cleanly separated)
git cherry-pick <commit-hash> --no-commit
git reset HEAD components/views/PersonalProfilePage.tsx firebase/functions/src/index.ts lib/auth/orcid.ts lib/types.ts
git commit -m "fix: React hooks and performance optimizations from audit"

# Option 2: Manual application of specific fixes
# Read the diff and manually apply:
# - GanttChart.tsx: Remove unused imports, fix hooks
# - NetworkView.tsx: Add useMemo for filters
# - PeopleView.tsx: Add useMemo for filters
# - ProjectDashboard.tsx: Fix hook dependencies
# - CalendarEvents.tsx: Disable unimplemented views
```

**Exclude:**
- PersonalProfilePage.tsx changes (conflicts with Phases 2 & 3)
- index.ts changes (conflicts with Phases 2 & 3)
- orcid.ts changes (conflicts with Phase 3)
- types.ts changes (conflicts with Phase 2)
- firestore.rules changes (removed canViewProject - needs review)

---

## Detailed Merge Execution Plan

### Pre-Merge Checklist
- [ ] Backup current main branch: `git tag backup-main-$(date +%Y%m%d-%H%M%S)`
- [ ] Ensure all branches are fetched: `git fetch origin`
- [ ] Clean working directory: `git status` (should be clean)
- [ ] Run tests on current main: `npm run build && npm test`
- [ ] Document current deployment state

---

### Phase 1 Execution: Foundation

**Step 1.1: Merge Branch 1**
```bash
git checkout main
git merge origin/claude/fix-calendar-conflict-type-011CV6ERPEbFLApQ9j5qaVgG --no-ff -m "feat: Integrate calendar, code protection, and design system"
```

**Step 1.2: Resolve Conflicts (if any)**
- Review any conflicts with current main
- Priority: Keep Branch 1 changes unless there's a compelling reason not to

**Step 1.3: Install Dependencies**
```bash
npm install
```

**Step 1.4: Test**
```bash
npm run build
npm run lint
# Test calendar functionality
# Test design system components
# Test code protection scripts
```

**Step 1.5: Commit & Tag**
```bash
git commit (if conflicts were resolved)
git tag integration-phase1-calendar-design-protection
git push origin main
git push --tags
```

**Rollback Plan:**
```bash
git reset --hard backup-main-<timestamp>
git push origin main --force-with-lease
```

---

### Phase 2 Execution: ORCID Display

**Step 2.1: Merge Branch 2**
```bash
git checkout main
git merge origin/claude/force-deploy-orcid-fix-01N5PV4tbYzvRrPfL5AsMFXj --no-ff -m "feat: Add rich ORCID data display"
```

**Step 2.2: Resolve Conflicts**

**Expected Conflicts:**

**A. PersonalProfilePage.tsx**
- Current: Phase 1 version (basic or no ORCID integration)
- Incoming: Rich ORCID display with bio, publications, employment, education, funding
- **Resolution:** Accept incoming changes entirely

**B. firebase/functions/src/index.ts**
- Current: Phase 1 version (existing functions)
- Incoming: `fetchOrcidRecord()`, `parseOrcidDate()`
- **Resolution:** Accept incoming changes, add new functions

**C. lib/types.ts**
- Current: Phase 1 version
- Incoming: ORCID types (OrcidEmployment, OrcidEducation, OrcidWork, OrcidFunding, OrcidProfileData)
- **Resolution:** Accept incoming changes, add new types

**Step 2.3: Deploy Cloud Functions**
```bash
cd firebase/functions
npm install
npm run build
firebase deploy --only functions
cd ../..
```

**Step 2.4: Update Firestore Indexes (if needed)**
```bash
firebase deploy --only firestore:indexes
```

**Step 2.5: Test**
```bash
npm run build
# Test ORCID connection flow
# Test ORCID data display
# Verify backend function works
```

**Step 2.6: Commit & Tag**
```bash
git commit (if conflicts were resolved)
git tag integration-phase2-orcid-display
git push origin main
git push --tags
```

---

### Phase 3 Execution: ORCID Sync

**Step 3.1: Merge Branch 3**
```bash
git checkout main
git merge origin/claude/orcid-profile-integration-01Naa4i43ZSLboyZpgtEod2C --no-ff -m "feat: Add ORCID profile auto-population and sync"
```

**Step 3.2: Resolve Conflicts**

**Expected Conflicts:**

**A. PersonalProfilePage.tsx (MAJOR)**
- Current: Rich ORCID display from Phase 2
- Incoming: Sync buttons and profile auto-population UI
- **Resolution Strategy:**

```tsx
// Combined structure:
<Card>
  <CardHeader>ORCID Integration</CardHeader>
  <CardContent>
    {/* Connection Button from Phase 2 */}
    {!user.orcid ? (
      <Button onClick={connectOrcid}>Connect ORCID</Button>
    ) : (
      <>
        <p>Connected: {user.orcid}</p>
        <Button onClick={disconnectOrcid}>Disconnect</Button>

        {/* ADD: Sync Buttons from Branch 3 */}
        <div className="flex gap-2 mt-4">
          <Button onClick={() => handleResync(false)}>
            Resync (Empty Fields)
          </Button>
          <Button onClick={() => handleResync(true)}>
            Force Resync (All Fields)
          </Button>
        </div>

        {/* KEEP: Rich Display from Phase 2 */}
        {user.orcidData && (
          <>
            {/* Biography */}
            {user.orcidData.bio && <div>{user.orcidData.bio}</div>}

            {/* Employment */}
            {user.orcidData.employment?.length > 0 && (
              <div>...</div>
            )}

            {/* Education */}
            {/* Publications */}
            {/* Funding */}
          </>
        )}
      </>
    )}
  </CardContent>
</Card>
```

**B. firebase/functions/src/index.ts (MODERATE)**
- Current: `fetchOrcidRecord()` from Phase 2
- Incoming: `orcidResyncProfile()`, `extractOrcidProfileData()`
- **Resolution:** Keep both! They serve different purposes
  - `fetchOrcidRecord()` - fetches rich data for display
  - `orcidResyncProfile()` - populates profile fields

**C. lib/auth/orcid.ts (MINOR)**
- Current: Phase 1/2 version
- Incoming: Additional helper functions
- **Resolution:** Accept incoming changes

**Step 3.3: Manual Integration**

Since the merge conflict in PersonalProfilePage.tsx will be complex, consider manual integration:

1. Save Branch 3 version to temp file:
   ```bash
   git show origin/claude/orcid-profile-integration-01Naa4i43ZSLboyZpgtEod2C:components/views/PersonalProfilePage.tsx > /tmp/branch3-profile.tsx
   ```

2. Keep current version (Phase 2):
   ```bash
   git checkout --ours components/views/PersonalProfilePage.tsx
   ```

3. Manually add from /tmp/branch3-profile.tsx:
   - `handleResync()` function
   - Resync button UI
   - ORCID claims display (if not already present)

4. For index.ts:
   ```bash
   # Keep both functions - they don't conflict
   git checkout --ours firebase/functions/src/index.ts
   git show origin/claude/orcid-profile-integration-01Naa4i43ZSLboyZpgtEod2C:firebase/functions/src/index.ts > /tmp/branch3-functions.ts
   # Manually add orcidResyncProfile and extractOrcidProfileData
   ```

**Step 3.4: Deploy Cloud Functions**
```bash
cd firebase/functions
npm run build
firebase deploy --only functions:orcidResyncProfile
cd ../..
```

**Step 3.5: Test**
```bash
npm run build
# Test ORCID connection (should still work)
# Test rich display (should still work)
# Test resync empty fields
# Test force resync all fields
# Verify profile fields populate correctly
```

**Step 3.6: Commit & Tag**
```bash
git add .
git commit -m "feat: Integrate ORCID profile sync with rich display"
git tag integration-phase3-orcid-sync
git push origin main
git push --tags
```

---

### Phase 4 Execution: Bug Fixes (Cherry-pick)

**Step 4.1: Identify Specific Commits**
```bash
git log origin/claude/audit-codebase-bugs-011CV6AKX41M38oUQuEpYGjt --oneline
# Output:
# 3eceb4e fix: Remove placeholder features and clean up UX
# ec61534 feat: Implement complete ORCID integration with data sync
# 29c9887 fix: Comprehensive bug fixes and ORCID integration improvements
```

**Step 4.2: Review Specific Changes**
```bash
git show 3eceb4e --stat
git show 29c9887 --stat
```

**Step 4.3: Extract Specific Fixes**

Create patch file excluding ORCID-related files:
```bash
git checkout main

# Show diff for non-ORCID files only
git diff origin/main origin/claude/audit-codebase-bugs-011CV6AKX41M38oUQuEpYGjt -- \
  components/GanttChart.tsx \
  components/NetworkView.tsx \
  components/views/CalendarEvents.tsx \
  components/views/PeopleView.tsx \
  components/views/ProjectDashboard.tsx \
  > /tmp/bug-fixes.patch

# Review the patch
cat /tmp/bug-fixes.patch

# Apply the patch
git apply /tmp/bug-fixes.patch

# Or apply manually if patch fails
```

**Step 4.4: Manual Application of Bug Fixes**

**A. GanttChart.tsx:**
```tsx
// Remove unused import
- import { useDroppable } from '@dnd-kit/core';

// Fix any hook dependency issues
```

**B. NetworkView.tsx:**
```tsx
// Add useMemo for filters
const filteredProfiles = useMemo(() => {
  return profiles.filter(/* ... */);
}, [profiles, searchQuery, /* other deps */]);
```

**C. PeopleView.tsx:**
```tsx
// Add useMemo for filters
const filteredProfiles = useMemo(() => {
  return profiles.filter(/* ... */);
}, [profiles, searchQuery, filters]);
```

**D. ProjectDashboard.tsx:**
```tsx
// Fix hook dependencies
useEffect(() => {
  // ...
}, [/* add missing dependencies */]);
```

**E. CalendarEvents.tsx:**
```tsx
// Disable unimplemented views
const viewModes = [
  { value: 'timeline', label: 'Timeline', enabled: true },
  { value: 'day', label: 'Day', enabled: false },
  { value: 'week', label: 'Week', enabled: false },
  { value: 'month', label: 'Month', enabled: false },
];
```

**Step 4.5: Review Firestore Rules Change**

Branch 4 removed `canViewProject()` function. Review if this is safe:
```bash
git diff origin/main origin/claude/audit-codebase-bugs-011CV6AKX41M38oUQuEpYGjt -- firestore.rules
```

**Decision:** Skip this change unless there's a compelling reason. It may be a security regression.

**Step 4.6: Test**
```bash
npm run build
npm run lint
# Test components with bug fixes
# Verify performance improvements
```

**Step 4.7: Commit & Tag**
```bash
git add components/GanttChart.tsx components/NetworkView.tsx components/views/CalendarEvents.tsx components/views/PeopleView.tsx components/views/ProjectDashboard.tsx
git commit -m "fix: React hooks dependencies and performance optimizations"
git tag integration-phase4-bug-fixes
git push origin main
git push --tags
```

---

## Testing Plan

### Automated Testing
```bash
# Run after each phase
npm run build
npm run lint
npm test (if available)
```

### Manual Testing Checklist

#### Phase 1: Calendar & Design System
- [ ] Calendar connection UI loads
- [ ] Google Calendar OAuth flow works
- [ ] Microsoft Calendar OAuth flow works
- [ ] Calendar sync runs successfully
- [ ] External events display correctly
- [ ] Design tokens applied correctly
- [ ] Enhanced UI components render properly
- [ ] Animations work (framer-motion)
- [ ] Code protection scripts execute

#### Phase 2: ORCID Display
- [ ] Connect ORCID button works
- [ ] ORCID OAuth flow completes
- [ ] Biography displays correctly
- [ ] Employment history shows with dates
- [ ] Education section renders
- [ ] Publications list with DOI links
- [ ] Funding information displays
- [ ] Disconnect ORCID works (uses deleteField())
- [ ] Data persists in Firestore

#### Phase 3: ORCID Sync
- [ ] "Resync (Empty Fields)" button works
- [ ] Only empty profile fields populate
- [ ] "Force Resync (All Fields)" button works
- [ ] All fields overwrite with ORCID data
- [ ] ORCID claims display (name, email from ORCID)
- [ ] Profile fields map correctly:
  - [ ] firstName, lastName
  - [ ] bio
  - [ ] organisation, institute
  - [ ] position
  - [ ] qualifications
  - [ ] researchInterests
- [ ] Rich display from Phase 2 still works
- [ ] No regression in ORCID connection flow

#### Phase 4: Bug Fixes
- [ ] GanttChart renders without errors
- [ ] NetworkView filters work efficiently (check re-renders)
- [ ] PeopleView filters work efficiently
- [ ] ProjectDashboard hooks no warnings
- [ ] CalendarEvents only shows timeline view
- [ ] No React console warnings about dependencies

#### Integration Testing
- [ ] All features work together
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Firebase Functions deploy successfully
- [ ] Firestore rules valid
- [ ] Authentication flows work
- [ ] Data persists correctly

---

## Rollback Plans

### Per-Phase Rollback

**If Phase 1 Fails:**
```bash
git reset --hard backup-main-<timestamp>
git push origin main --force-with-lease
```

**If Phase 2 Fails:**
```bash
git reset --hard integration-phase1-calendar-design-protection
git push origin main --force-with-lease
```

**If Phase 3 Fails:**
```bash
git reset --hard integration-phase2-orcid-display
git push origin main --force-with-lease
```

**If Phase 4 Fails:**
```bash
git reset --hard integration-phase3-orcid-sync
git push origin main --force-with-lease
```

### Production Rollback

If deployed to production and issues found:
```bash
# Use previous tag
git checkout <previous-working-tag>
git checkout -b hotfix/rollback-integration
firebase deploy --only hosting,functions
```

---

## Post-Integration Tasks

### Cleanup
```bash
# After successful integration and testing
# Delete merged branches (optional, keep for history)
git branch -d claude/fix-calendar-conflict-type-011CV6ERPEbFLApQ9j5qaVgG
git branch -d claude/force-deploy-orcid-fix-01N5PV4tbYzvRrPfL5AsMFXj
git branch -d claude/orcid-profile-integration-01Naa4i43ZSLboyZpgtEod2C

# Remote delete (use with caution)
# git push origin --delete <branch-name>
```

### Documentation Updates
- [ ] Update README.md with new features
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Document ORCID integration setup
- [ ] Document calendar integration setup
- [ ] Update code protection documentation

### Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite in staging
- [ ] Manual QA in staging
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Monitor Firebase Function logs
- [ ] Verify calendar sync runs

### Monitoring
- [ ] Check Firebase Console for errors
- [ ] Monitor Cloud Functions execution
- [ ] Check Firestore reads/writes usage
- [ ] Verify OAuth tokens refresh correctly
- [ ] Monitor calendar sync success rate

---

## Risk Assessment

### High Risk
🔴 **ORCID UI Conflicts (Phase 3)**
- **Risk:** Complex merge conflict in PersonalProfilePage.tsx could break ORCID functionality
- **Mitigation:** Manual merge with careful testing, keep both display and sync features
- **Fallback:** Use only Phase 2 (display) without Phase 3 (sync)

### Medium Risk
🟡 **Calendar Integration Testing**
- **Risk:** OAuth flows may fail in production environment
- **Mitigation:** Test OAuth in production-like environment before full deployment
- **Fallback:** Disable calendar features via feature flag

🟡 **Cloud Functions Deployment**
- **Risk:** New functions may conflict with existing functions
- **Mitigation:** Deploy incrementally, test each function
- **Fallback:** Rollback functions to previous version

### Low Risk
🟢 **Design System Integration**
- **Risk:** Visual regressions in UI components
- **Mitigation:** Visual regression testing, manual QA
- **Fallback:** Revert CSS changes only

🟢 **Bug Fixes (Phase 4)**
- **Risk:** Cherry-picking may miss context
- **Mitigation:** Careful review of each fix, apply manually if needed
- **Fallback:** Skip Phase 4 entirely (bug fixes are nice-to-have)

---

## Alternative Strategies

### Strategy A: Big Bang Merge (NOT RECOMMENDED)
Merge all branches at once. High risk of conflicts and difficult to debug.

### Strategy B: Squash and Rewrite (NOT RECOMMENDED)
Squash all branches into single commits. Loses history and context.

### Strategy C: Feature Flags (ADVANCED)
Merge all branches but gate features behind flags. Allows gradual rollout.
- Pro: Safe production deployment
- Con: More complex, requires feature flag system

### Strategy D: New Integration Branch (RECOMMENDED ALTERNATIVE)
Instead of merging to main, create a new integration branch:
```bash
git checkout -b integration/all-features
# Merge all branches here
# Test thoroughly
# Then merge to main when stable
```

---

## Timeline Estimate

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Foundation | 1-2 hours | Low (clean merge expected) |
| Phase 2: ORCID Display | 1-2 hours | Medium (some conflicts) |
| Phase 3: ORCID Sync | 2-4 hours | High (major conflicts) |
| Phase 4: Bug Fixes | 1-2 hours | Low (cherry-pick) |
| Testing | 2-4 hours | Medium |
| **Total** | **7-14 hours** | - |

**Recommendation:** Allocate 2 full days for integration and testing.

---

## Success Criteria

### Must Have ✅
- [ ] All branches successfully merged
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in console
- [ ] All existing features still work
- [ ] Calendar integration functional (Google + Microsoft)
- [ ] ORCID integration functional (connect + display + sync)
- [ ] Design system applied consistently
- [ ] Code protection system in place

### Should Have 🎯
- [ ] All automated tests pass
- [ ] No React warnings in console
- [ ] Performance not degraded
- [ ] All bug fixes applied
- [ ] Documentation updated

### Nice to Have 🌟
- [ ] Feature flags for gradual rollout
- [ ] Monitoring dashboard for new features
- [ ] User feedback collected
- [ ] Analytics for feature adoption

---

## Conclusion

This integration plan provides a structured approach to merging 6 feature branches containing significant improvements. The sequential merge strategy minimizes risk while ensuring all valuable features are integrated.

**Key Recommendations:**
1. ✅ Use Branch 1 (fix-calendar-conflict-type) as foundation
2. ✅ Layer ORCID features from Branches 2 & 3
3. ✅ Cherry-pick bug fixes from Branch 4
4. ✅ Skip Branches 5 & 6 (duplicates)
5. ✅ Test thoroughly after each phase
6. ✅ Use tags for easy rollback

**Next Steps:**
1. Review and approve this plan
2. Schedule integration window (2 days)
3. Execute Phase 1
4. Deploy and test each phase incrementally
5. Monitor production after final merge

---

**Questions or Concerns?** Review this plan carefully and adjust based on your specific needs and risk tolerance.
