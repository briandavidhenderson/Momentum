# P0 Implementation Progress

**Date Started**: 2025-11-05
**Status**: 🔨 In Progress

---

## Overview

Implementing P0 blockers from [FINAL_FIX_PLAN.md](FINAL_FIX_PLAN.md):
1. **P0-1**: Funder Creation Flow (In Progress)
2. **P0-2**: Unified Project Model (In Progress)

---

## ✅ Completed Tasks

### 1. Updated Funder Interface (lib/types.ts)

**Changes Made**:
- Added new fields to match Final Fix Plan requirements:
  - `programme` (Programme or Call name)
  - `reference` (Reference or Grant Number)
  - `currency` (ISO currency code)
  - `startDate` and `endDate` (Date fields)
  - `organisationId` (optional link to organisation)
- Updated `type` enum to include "public", "private", "charity", "internal"
- Made `createdBy` required (was optional)
- Added JSDoc comment explaining P0-1 support

**File**: [lib/types.ts:78-110](lib/types.ts#L78-L110)

### 2. Updated Project Interface (lib/types.ts)

**Changes Made**:
- Added `projectType?: "MASTER" | "REGULAR"` for explicit type distinction (P0-2)
- Added `funderId?: string` for linking to Funder (P0-1)
  - Required when `projectType === "MASTER"`
- Kept `kind?: "master" | "regular"` for backward compatibility
- Added JSDoc comments explaining the changes

**File**: [lib/types.ts:626-664](lib/types.ts#L626-L664)

### 3. Updated Firestore Service Functions (lib/firestoreService.ts)

**Enhanced `createFunder()`**:
- Added Date → Timestamp conversion for `startDate` and `endDate`
- Proper handling of optional fields

**Enhanced `getFunders()`**:
- Added optional `orgId` parameter for filtering by organisation
- Added Timestamp → Date conversion when retrieving
- Returns properly typed Funder objects

**Enhanced `subscribeToFunders()`**:
- Added optional `orgId` parameter for filtering
- Real-time updates with proper Date conversion
- Uses `query()` and `where()` for filtering

**Files**: [lib/firestoreService.ts:515-587](lib/firestoreService.ts#L515-L587)

### 4. Created FunderCreationDialog Component

**New Component**: [components/FunderCreationDialog.tsx](components/FunderCreationDialog.tsx)

**Features**:
- ✅ Modal dialog with full form for creating funders
- ✅ All fields from Final Fix Plan:
  - Name* (required with validation)
  - Type (dropdown: Public/Private/Charity/Internal/Government/Industry/EU/Other)
  - Programme/Call
  - Reference/Grant No.
  - Currency (dropdown: GBP/USD/EUR/JPY/CHF/CAD/AUD)
  - Start Date & End Date (date pickers)
  - Notes (textarea)
- ✅ Client-side validation with inline error messages
- ✅ Loading state during submission
- ✅ Error handling with user-friendly messages
- ✅ Callback `onFunderCreated(funderId)` for parent to handle
- ✅ Clean, accessible UI matching project style

**Props**:
```typescript
interface FunderCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onFunderCreated: (funderId: string) => void
  currentUserId: string
  organisationId?: string
}
```

---

## 🔨 In Progress

### 5. Integrate Funder Selection into ProjectCreationDialog

**Current File**: [components/ProjectCreationDialog.tsx](components/ProjectCreationDialog.tsx)

**What Needs to be Done**:
1. Import `FunderCreationDialog` and `getFunders` / `subscribeToFunders`
2. Add state for:
   - `funders: Funder[]` - list of available funders
   - `selectedFunderId: string | null` - currently selected funder
   - `showFunderDialog: boolean` - control funder creation modal
3. Add `useEffect` to load funders when master project step is reached
4. Add funder selection UI to master project form (after grant number, before budget):
   ```tsx
   <div>
     <Label htmlFor="funder">Funder *</Label>
     <div className="flex gap-2">
       <select
         id="funder"
         value={selectedFunderId || ""}
         onChange={(e) => setSelectedFunderId(e.target.value)}
         className="flex-1 px-3 py-2 border rounded-lg"
       >
         <option value="">Select a funder...</option>
         {funders.map(f => (
           <option key={f.id} value={f.id}>{f.name}</option>
         ))}
       </select>
       <Button onClick={() => setShowFunderDialog(true)}>
         + New Funder
       </Button>
     </div>
     {!selectedFunderId && <p className="text-red-500 text-sm">Required</p>}
   </div>
   ```
5. Auto-prompt funder dialog if `funders.length === 0` when step changes to "master-details"
6. After funder created, preselect it and update list
7. Validate funder is selected before allowing "Create Master Project"
8. Pass `funderId` to `onCreateMaster` callback

**Acceptance Criteria (P0-1)**:
- ✅ If no funders exist → modal opens automatically
- ⬜ On save → new funder appears in dropdown
- ⬜ "Create Master Project" button disabled until funder selected
- ⬜ Reloading page preserves newly added funder (handled by Firestore)

---

## 📋 Pending Tasks

### 6. Update ProjectCreationDialog for Unified Model (P0-2)

**Changes Needed**:
1. Update type determination logic:
   - When "Regular Project" selected → set `projectType: "REGULAR"`, no funder required
   - When "Master Project" selected → set `projectType: "MASTER"`, funder required
2. Update `handleCreateMasterProject()`:
   - Validate `selectedFunderId` is set
   - Pass `funderId` in project data
   - Set `projectType: "MASTER"`
3. Update `handleRegularProject()`:
   - Ensure regular projects get `projectType: "REGULAR"`
   - No funder field shown or required

**Acceptance Criteria (P0-2)**:
- ⬜ Only one way to create projects (unified flow)
- ⬜ Type determines required fields
- ⬜ Quick Add creates same data shape as wizard
- ⬜ Switching types updates visible fields

### 7. Add Funder Schema to Firestore Rules

**File to Update**: [firestore.rules](firestore.rules)

**Rules to Add**:
```javascript
match /funders/{funderId} {
  // Allow read for authenticated users in same org
  allow read: if request.auth != null;

  // Allow create for authenticated users (PI, Org Admin)
  allow create: if request.auth != null
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.name is string
    && request.resource.data.type in ['public', 'private', 'charity', 'internal', 'government', 'industry', 'eu', 'other'];

  // Allow update for creator or org admin
  allow update: if request.auth != null
    && (resource.data.createdBy == request.auth.uid || isOrgAdmin());

  // Allow delete for org admin only
  allow delete: if isOrgAdmin();
}
```

**Firestore Indexes** (if needed):
- Collection: `funders`
- Fields: `organisationId` (Ascending), `name` (Ascending)
- Query scope: Collection

### 8. End-to-End Testing

**Test Scenarios**:

**E2E: Fresh org with 0 funders**:
1. Navigate to project creation
2. Select "Master Project"
3. Funder dialog should open automatically
4. Fill in funder details (name required)
5. Submit funder creation
6. Funder appears in dropdown and is preselected
7. Fill in project details
8. Create master project successfully
9. Project appears on Gantt with funder link

**Negative: Empty funder name**:
1. Open funder creation dialog
2. Leave name field empty
3. Try to submit
4. See validation error: "Funder name is required"
5. Cannot submit until name provided

**Validation: Funder required for Master**:
1. Open master project creation
2. Try to proceed without selecting funder
3. Should see error or disabled button
4. Select funder → button enables

**Regular Project: No Funder**:
1. Select "Regular Project"
2. No funder field shown
3. Can create successfully without funder
4. Project has `projectType: "REGULAR"` and no `funderId`

---

## 📊 Implementation Status

### Overall Progress
```
P0-1 Funder Creation Flow: 75% complete
├── ✅ Funder interface updated
├── ✅ Firestore functions updated
├── ✅ FunderCreationDialog component created
├── 🔨 Integration with project creation (in progress)
└── ⬜ Firestore rules update (pending)

P0-2 Unified Project Model: 50% complete
├── ✅ Project interface updated (projectType field)
├── ✅ Funder link added (funderId field)
├── 🔨 Dialog update for type handling (in progress)
└── ⬜ Testing and validation (pending)
```

### Files Modified
1. ✅ lib/types.ts - Funder & Project interfaces
2. ✅ lib/firestoreService.ts - Funder CRUD functions
3. ✅ components/FunderCreationDialog.tsx - New component
4. 🔨 components/ProjectCreationDialog.tsx - Integration (in progress)
5. ⬜ firestore.rules - Security rules (pending)
6. ⬜ firestore.indexes.json - Indexes (if needed)

### Components Status
- ✅ FunderCreationDialog - Complete and ready
- 🔨 ProjectCreationDialog - Needs funder integration
- ⬜ Quick Add Project - Needs type selection update
- ⬜ Project Edit Dialog - May need funder field

---

## 🎯 Next Immediate Steps

1. **Complete ProjectCreationDialog integration** (highest priority):
   - Add funder state management
   - Add funder selection UI
   - Add auto-prompt logic
   - Add validation

2. **Update Firestore rules** for funders collection

3. **Test end-to-end** with fresh org

4. **Move to P1** implementation (Reactive Gantt with hierarchy)

---

## 🐛 Known Issues / Considerations

### Backward Compatibility
- Existing projects have `kind?: "master" | "regular"`
- New projects should use `projectType?: "MASTER" | "REGULAR"`
- Need migration or dual-field support during transition
- Consider: Read from both fields, write to both for now

### Quick Add Project
- Currently bypasses the type selection dialog
- Needs update to show type choice or default to REGULAR
- Documented in P0-2 requirements

### Funder Permissions
- Currently allowing any authenticated user to create funders
- May want to restrict to PI or Org Admin roles
- Can refine in firestore.rules

### Organisation Context
- Funder can optionally link to `organisationId`
- Need to pass org context from parent components
- May need to get from user profile or lab context

---

## 📝 Code Patterns Established

### Date Handling
```typescript
// When saving to Firestore:
if (data.startDate) {
  dataToSave.startDate = Timestamp.fromDate(data.startDate)
}

// When reading from Firestore:
return {
  ...data,
  startDate: data.startDate?.toDate(),
}
```

### Validation Pattern
```typescript
const validate = (): boolean => {
  const newErrors: Record<string, string> = {}

  if (!formData.name.trim()) {
    newErrors.name = "Field is required"
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### Dialog Pattern
```typescript
// State
const [isOpen, setIsOpen] = useState(false)

// Callback
const handleCreated = (id: string) => {
  // Update parent state
  // Close dialog
}

// Component
<FunderCreationDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onCreated={handleCreated}
/>
```

---

**Last Updated**: 2025-11-05
**Current Focus**: Integrating funder selection into ProjectCreationDialog
**Next Milestone**: P0 Blockers Complete → Move to P1 Core UX
