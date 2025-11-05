# Project Cleanup Plan

## Overview

This document outlines a comprehensive cleanup strategy to maintain a clean, organized, and functional codebase. The goal is to consolidate documentation, remove obsolete files, organize code structure, and establish maintenance practices.

---

## 🗂️ Phase 1: Documentation Cleanup

### Current State
- **29 markdown files** in project root
- Multiple overlapping session summaries
- Scattered implementation notes
- Hard to find specific information
- No clear documentation hierarchy

### Proposed Structure

```
Momentum/
├── README.md                    # Project overview (KEEP)
├── SETUP_FIREBASE_ENV.md        # Setup instructions (KEEP)
├── QUICK_REFERENCE.md           # Developer quick start (KEEP)
│
├── docs/                        # NEW: All documentation here
│   │
│   ├── implementation/          # Feature implementation details
│   │   ├── TODO_SYSTEM.md
│   │   ├── GANTT_ENHANCEMENTS.md
│   │   ├── EQUIPMENT_SYSTEM.md
│   │   ├── NETWORK_VIEW.md
│   │   ├── ELN_FEATURES.md
│   │   ├── DAY_TO_DAY_BOARD.md
│   │   └── ONBOARDING_FLOW.md
│   │
│   ├── planning/                # Future plans and architecture
│   │   ├── SYSTEM_REDESIGN.md
│   │   ├── PROJECT_MANAGEMENT_PLAN.md
│   │   └── FUTURE_FEATURES.md
│   │
│   ├── sessions/                # Development session notes
│   │   ├── SESSION_001_INITIAL_SETUP.md
│   │   ├── SESSION_002_EQUIPMENT.md
│   │   ├── SESSION_003_FIRESTORE.md
│   │   ├── SESSION_004_GANTT.md
│   │   ├── SESSION_005_TODOS.md
│   │   └── ARCHIVE.md (older notes)
│   │
│   └── guides/                  # How-to guides
│       ├── DEBUGGING_GUIDE.md
│       ├── DEPLOYMENT_GUIDE.md
│       ├── TROUBLESHOOTING.md
│       └── TESTING_GUIDE.md
│
├── app/
├── components/
├── lib/
└── ...
```

### Files to Consolidate & Move

#### → docs/implementation/
**Create TODO_SYSTEM.md from:**
- `TODO_SYSTEM_IMPLEMENTATION_COMPLETE.md`
- Relevant sections from `GANTT_ENHANCEMENTS_SESSION_SUMMARY.md`

**Create EQUIPMENT_SYSTEM.md from:**
- `EQUIPMENT_INVENTORY_IMPROVEMENTS.md`
- `EQUIPMENT_PHASE_3_4_IMPLEMENTATION.md`
- Relevant sections from session summaries

**Create NETWORK_VIEW.md from:**
- `NETWORK_VIEW_FIX_SUMMARY.md`
- `NETWORK_VISUALIZATION_GUIDE.md`

**Create ELN_FEATURES.md from:**
- Relevant sections from `COMPLETE_FIXES_SESSION_2.md`
- ELN-related notes from other docs

**Create ONBOARDING_FLOW.md from:**
- `PHASE_4_ONBOARDING_FLOW.md`
- Onboarding-related sections from session docs

#### → docs/planning/
**Move & Rename:**
- `SYSTEM_REDESIGN_PLAN.md` → `docs/planning/SYSTEM_REDESIGN.md`
- `PROJECT_MANAGEMENT_ENHANCEMENT_PLAN.md` → `docs/planning/PROJECT_MANAGEMENT_PLAN.md`

**Create FUTURE_FEATURES.md from:**
- Voice notes plan
- Image annotation plan
- Whiteboard feature plan
- Multi-person color coding plan

#### → docs/sessions/
**Create Organized Session Notes:**
- `SESSION_001_INITIAL_SETUP.md` - Phase 1 work
- `SESSION_002_EQUIPMENT.md` - Equipment & inventory
- `SESSION_003_FIRESTORE.md` - Firestore deployment
- `SESSION_004_GANTT.md` - Gantt chart enhancements
- `SESSION_005_TODOS.md` - Todo system implementation

**Source Material:**
- `PHASE_1_COMPLETION_SUMMARY.md`
- `PHASE_2_SERVICE_FUNCTIONS.md`
- `PHASE_3_FIRESTORE_DEPLOYMENT.md`
- `SESSION_SUMMARY.md`
- `FIREBASE_UI_FIXES_SUMMARY.md`
- `COMPLETE_FIXES_SESSION_2.md`

#### → docs/guides/
**Keep & Move:**
- `DEBUGGING_GUIDE.md` → `docs/guides/DEBUGGING_GUIDE.md`
- `TROUBLESHOOTING_CHECKLIST.md` → `docs/guides/TROUBLESHOOTING.md`

**Create DEPLOYMENT_GUIDE.md from:**
- `DEPLOYMENT_VERIFICATION.md`
- Firebase deployment sections from other docs

**Create TESTING_GUIDE.md (new):**
- Testing checklists from various docs
- Test strategy documentation
- Example test cases

### Files to Delete (After Consolidation)

```bash
# These will be merged into organized docs
rm BUILD_FIXES_APPLIED.md
rm CHANGELOG.md  # Use git log instead
rm CODE_REVIEW_SUMMARY.md
rm COMPLETE_FIXES_SESSION_2.md
rm ERROR_LOGGING_PATCH.md
rm FIREBASE_UI_FIXES_SUMMARY.md
rm IMPROVEMENTS_SUMMARY.md
rm IMPLEMENTATION_STATUS.md  # Outdated
rm SESSION_SUMMARY.md
rm TYPES_UPDATE_SUMMARY.md
rm PHASE_1_COMPLETION_SUMMARY.md
rm PHASE_2_SERVICE_FUNCTIONS.md
rm PHASE_3_FIRESTORE_DEPLOYMENT.md
rm PHASE_4_ONBOARDING_FLOW.md
rm EQUIPMENT_INVENTORY_IMPROVEMENTS.md
rm EQUIPMENT_PHASE_3_4_IMPLEMENTATION.md
rm NETWORK_VIEW_FIX_SUMMARY.md
rm NETWORK_VISUALIZATION_GUIDE.md
rm TODO_SYSTEM_IMPLEMENTATION_COMPLETE.md
rm GANTT_ENHANCEMENTS_SESSION_SUMMARY.md
rm IMPLEMENTATION_GUIDE.md  # Redundant
rm QUICK_START_TESTING.md  # Merge into TESTING_GUIDE
```

### Cleanup Commands

```bash
# Create docs directory structure
mkdir -p docs/implementation
mkdir -p docs/planning
mkdir -p docs/sessions
mkdir -p docs/guides

# Move files (examples)
mv DEBUGGING_GUIDE.md docs/guides/
mv TROUBLESHOOTING_CHECKLIST.md docs/guides/TROUBLESHOOTING.md
mv DEPLOYMENT_VERIFICATION.md docs/guides/DEPLOYMENT_GUIDE.md

# After consolidating content, delete old files
# (Only after confirming all content is preserved!)
```

---

## 🧹 Phase 2: Code Structure Cleanup

### Large Files to Refactor

#### app/page.tsx (4200+ lines)
**Problem:** Monolithic component, hard to maintain

**Solution:** Split into smaller modules

**Proposed Structure:**
```
app/
├── page.tsx (main component, ~500 lines)
├── hooks/
│   ├── useProjects.ts
│   ├── useWorkpackages.ts
│   ├── useTasks.ts
│   ├── useEquipment.ts
│   └── useInventory.ts
├── handlers/
│   ├── projectHandlers.ts
│   ├── taskHandlers.ts
│   ├── todoHandlers.ts
│   └── equipmentHandlers.ts
└── utils/
    ├── projectUtils.ts
    └── taskUtils.ts
```

**Refactoring Steps:**
1. Extract state management into custom hooks
2. Move event handlers to separate files
3. Split helper functions into utilities
4. Keep page.tsx as composition layer

#### lib/types.ts (1000+ lines)
**Problem:** All types in one file, hard to navigate

**Solution:** Split by domain

**Proposed Structure:**
```
lib/types/
├── index.ts (re-export all)
├── project.ts
├── task.ts
├── person.ts
├── equipment.ts
├── inventory.ts
├── eln.ts
├── dayToDay.ts
└── common.ts
```

**Example project.ts:**
```typescript
// lib/types/project.ts
export interface Project {
  id: string
  name: string
  // ... project fields
}

export interface Workpackage {
  id: string
  name: string
  // ... workpackage fields
}

export interface Task {
  id: string
  name: string
  // ... task fields
}
```

#### components/ElectronicLabNotebook.tsx (800+ lines)
**Problem:** Complex component with many features

**Solution:** Break into sub-components

**Proposed Structure:**
```
components/eln/
├── ElectronicLabNotebook.tsx (main, ~200 lines)
├── ExperimentList.tsx
├── ExperimentEditor.tsx
├── PageEditor.tsx
├── VoiceNoteRecorder.tsx (future)
├── ImageAnnotator.tsx (future)
└── WhiteboardCanvas.tsx (future)
```

#### components/EquipmentStatusPanel.tsx (1000+ lines)
**Problem:** Handles too many responsibilities

**Solution:** Split into focused components

**Proposed Structure:**
```
components/equipment/
├── EquipmentStatusPanel.tsx (main, ~300 lines)
├── EquipmentList.tsx
├── EquipmentEditorModal.tsx
├── SupplyList.tsx
├── ReorderSuggestions.tsx
└── EquipmentFilters.tsx
```

### Unused Code Cleanup

**Find Unused Exports:**
```bash
# Install tool
npm install -g ts-prune

# Find unused exports
ts-prune
```

**Find Unused Imports:**
```bash
# Already configured in ESLint
npm run lint -- --fix
```

**Remove Commented Code:**
```bash
# Manual review needed
# Check for:
# - Large commented blocks
# - Old implementation attempts
# - Debug code
```

**Files to Review:**
- `app/page.tsx` - Many commented sections
- `lib/firestoreService.ts` - Old migration code?
- `components/GanttChart.tsx` - Unused handlers?

### TypeScript Strict Mode

**Enable in tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Fix Issues Gradually:**
1. Enable one flag at a time
2. Fix compilation errors
3. Test thoroughly
4. Move to next flag

---

## 🗄️ Phase 3: Firebase & Configuration Cleanup

### Firestore Rules Review

**Current File:** `firestore.rules` (17,000 characters)

**Actions:**
1. Review all rules for correctness
2. Remove duplicate rules
3. Add comments explaining complex logic
4. Test with Firebase emulator
5. Document permission model

**Testing:**
```bash
# Start emulator
firebase emulators:start --only firestore

# Run rule tests
firebase emulators:exec --only firestore "npm test"
```

### Firestore Indexes Review

**Current File:** `firestore.indexes.json`

**Actions:**
1. Review all indexes
2. Remove unused indexes
3. Add missing indexes for new queries
4. Test query performance
5. Document index purpose

**Check Index Usage:**
```bash
# Use Firebase Console
# Firestore → Indexes → Usage Stats
# Remove indexes with 0 queries
```

### Firebase Storage Rules

**Current File:** `storage.rules`

**Actions:**
1. Review upload permissions
2. Add file size limits
3. Add file type restrictions
4. Test upload/download flows

**Example Improvements:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images - max 10MB
    match /images/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // Voice notes - max 10MB
    match /voice/{noteId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('audio/.*');
    }
  }
}
```

### Environment Variables

**Review .env.local:**
```bash
# Check all required vars are set
# Remove unused vars
# Add comments for each var
```

**Create .env.example:**
```bash
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: Firebase Emulator
USE_FIREBASE_EMULATOR=false
```

---

## 🔧 Phase 4: Build & Performance Optimization

### Bundle Size Analysis

**Current:** 249 kB

**Actions:**
1. Analyze bundle composition
2. Identify large dependencies
3. Implement code splitting
4. Lazy load heavy components

**Commands:**
```bash
# Analyze bundle
npm run build -- --analyze

# Or use webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer
```

**Optimization Strategies:**
```typescript
// Lazy load heavy components
const ElectronicLabNotebook = dynamic(
  () => import('@/components/ElectronicLabNotebook'),
  { loading: () => <p>Loading...</p> }
)

const EquipmentStatusPanel = dynamic(
  () => import('@/components/EquipmentStatusPanel'),
  { loading: () => <p>Loading...</p> }
)
```

### React Performance

**Memoization Candidates:**
```typescript
// lib/progressCalculation.ts
export const calculateTaskProgress = React.memo((task: Task): number => {
  // ... calculation
})

// components/TodoList.tsx
export const TodoList = React.memo(({ subtask, onToggleTodo, ... }) => {
  // ... component
})
```

**useMemo for Expensive Calculations:**
```typescript
// In app/page.tsx
const projectProgress = useMemo(
  () => calculateProjectProgress(project),
  [project]
)
```

**useCallback for Handlers:**
```typescript
const handleToggleTodo = useCallback(
  (todoId: string) => {
    // ... handler
  },
  [dependencies]
)
```

### Build Warnings

**Fix Current Warnings:**

1. **ElectronicLabNotebook.tsx:94**
```typescript
// BEFORE
useCallback(() => {
  // uses createNewPage
}, [])

// AFTER
useCallback(() => {
  // uses createNewPage
}, [createNewPage])
```

2. **Multiple img tags**
```typescript
// BEFORE
<img src={url} alt={alt} />

// AFTER
import Image from 'next/image'
<Image src={url} alt={alt} width={100} height={100} />
```

3. **ProfileSetupPage.tsx:228**
```typescript
// BEFORE
useMemo(() => {
  // doesn't use formData.institute or formData.organisation
}, [formData.institute, formData.organisation])

// AFTER
useMemo(() => {
  // ...
}, []) // or add correct deps
```

---

## 📝 Phase 5: Git Repository Cleanup

### Untracked Files to Commit

**New Feature Files:**
```bash
git add components/TodoList.tsx
git add components/TaskDetailPanel.tsx
git add lib/progressCalculation.ts
```

**Documentation:**
```bash
git add TODO_SYSTEM_IMPLEMENTATION_COMPLETE.md
git add NEXT_SESSION_TODO.md
git add PROJECT_CLEANUP_PLAN.md
```

### Remove Deleted Files

**Check for deleted files:**
```bash
git status | grep deleted
```

**Remove from tracking:**
```bash
git rm ACADEMIC_RESEARCH_PLAN.md
git rm STATIC_EXPORT_NOTES.md
```

### Create .gitignore Entries

**Add to .gitignore:**
```bash
# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Documentation drafts
docs/drafts/
*.draft.md

# Test coverage
coverage/
.nyc_output/

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db

# Build analysis
.next/analyze/
```

### Commit Strategy

**Feature Branch:**
```bash
git checkout -b feature/todo-system
git add components/TodoList.tsx
git add components/TaskDetailPanel.tsx
git add lib/progressCalculation.ts
git add lib/types.ts
git add app/page.tsx
git commit -m "feat: implement todo system with progress cascade"
```

**Documentation Branch:**
```bash
git checkout -b docs/reorganize
# Move and consolidate docs
git add docs/
git commit -m "docs: reorganize documentation structure"
```

**Cleanup Branch:**
```bash
git checkout -b chore/cleanup
# Remove obsolete files
git rm BUILD_FIXES_APPLIED.md
git rm CHANGELOG.md
# etc.
git commit -m "chore: remove obsolete documentation files"
```

---

## ✅ Phase 6: Testing & Quality Assurance

### Setup Testing Framework

**Install Dependencies:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev @types/jest
```

**Create jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

**Create jest.setup.js:**
```javascript
import '@testing-library/jest-dom'
```

**Update package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Write Critical Tests

**Priority 1: Progress Calculation**
```typescript
// __tests__/lib/progressCalculation.test.ts
describe('calculateSubtaskProgress', () => {
  it('calculates 0% for no todos', () => {
    const subtask = { todos: [] }
    expect(calculateSubtaskProgress(subtask)).toBe(0)
  })

  it('calculates 33% for 1/3 completed', () => {
    const subtask = {
      todos: [
        { completed: true },
        { completed: false },
        { completed: false }
      ]
    }
    expect(calculateSubtaskProgress(subtask)).toBe(33)
  })
})
```

**Priority 2: Equipment Utils**
```typescript
// __tests__/lib/equipmentUtils.test.ts
describe('calculateReorderSuggestions', () => {
  it('suggests reorder when stock < 4 weeks', () => {
    // Test implementation
  })
})
```

**Priority 3: Component Tests**
```typescript
// __tests__/components/TodoList.test.tsx
describe('TodoList', () => {
  it('renders todos correctly', () => {
    // Test implementation
  })

  it('calls onToggleTodo when checkbox clicked', () => {
    // Test implementation
  })
})
```

### Setup ESLint & Prettier

**Install:**
```bash
npm install --save-dev prettier eslint-config-prettier
```

**Create .prettierrc:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Update .eslintrc.json:**
```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "warn"
  }
}
```

---

## 📋 Cleanup Checklist

### Documentation
- [ ] Create `docs/` folder structure
- [ ] Consolidate implementation docs
- [ ] Consolidate session notes
- [ ] Move planning docs
- [ ] Move guides
- [ ] Delete obsolete MD files (after consolidation)
- [ ] Update README.md with new structure

### Code
- [ ] Split app/page.tsx into modules
- [ ] Split lib/types.ts by domain
- [ ] Refactor ElectronicLabNotebook
- [ ] Refactor EquipmentStatusPanel
- [ ] Remove unused imports (ESLint)
- [ ] Remove commented code
- [ ] Fix TypeScript warnings
- [ ] Enable strict mode (gradually)

### Firebase
- [ ] Review and test Firestore rules
- [ ] Review and optimize indexes
- [ ] Update Storage rules
- [ ] Create .env.example
- [ ] Document Firebase configuration

### Performance
- [ ] Analyze bundle size
- [ ] Implement code splitting
- [ ] Add React.memo where needed
- [ ] Add useMemo for calculations
- [ ] Fix build warnings

### Git
- [ ] Commit new todo system files
- [ ] Remove deleted files from tracking
- [ ] Update .gitignore
- [ ] Create feature branches
- [ ] Write good commit messages

### Testing
- [ ] Setup Jest
- [ ] Write progress calculation tests
- [ ] Write equipment utils tests
- [ ] Write component tests
- [ ] Setup ESLint & Prettier
- [ ] Run tests in CI/CD

---

## 🎯 Success Criteria

After cleanup is complete:

1. **Documentation**
   - ✅ All docs organized in `docs/` folder
   - ✅ Easy to find specific information
   - ✅ No redundant or obsolete files
   - ✅ README clearly explains project structure

2. **Code Quality**
   - ✅ No files over 500 lines (except generated)
   - ✅ No unused imports or variables
   - ✅ No ESLint warnings
   - ✅ TypeScript strict mode enabled

3. **Performance**
   - ✅ Bundle size < 300 kB
   - ✅ Initial load < 3 seconds
   - ✅ Time to interactive < 5 seconds

4. **Testing**
   - ✅ Test coverage > 50% for critical paths
   - ✅ All tests passing
   - ✅ CI/CD pipeline configured

5. **Git**
   - ✅ Clean working directory
   - ✅ Logical commit history
   - ✅ No uncommitted changes
   - ✅ Proper .gitignore

---

## 📅 Timeline

**Week 1: Documentation**
- Days 1-2: Create docs structure, start consolidation
- Days 3-4: Finish consolidation, delete old files
- Day 5: Update README, review

**Week 2: Code Refactoring**
- Days 1-2: Split app/page.tsx
- Days 3-4: Split lib/types.ts, refactor components
- Day 5: Remove unused code, fix warnings

**Week 3: Firebase & Testing**
- Days 1-2: Review and update Firebase config
- Days 3-4: Setup testing framework
- Day 5: Write initial tests

**Week 4: Performance & Final Review**
- Days 1-2: Optimize bundle, add memoization
- Days 3-4: Fix remaining issues
- Day 5: Final review, documentation update

---

*Document created: 2025-11-05*
*Estimated effort: 2-4 weeks*
*Priority: MEDIUM (after critical features)*
