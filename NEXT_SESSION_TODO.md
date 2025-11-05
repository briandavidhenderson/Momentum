# Next Session TODO - Comprehensive Action Plan

## 🎯 Priority 1: Critical Fixes & Testing

### 1. Todo System Testing & Firestore Integration
**Status:** ⚠️ Not Yet Tested
**Components:** TodoList, TaskDetailPanel, Progress Calculation
**Priority:** HIGH

**Testing Tasks:**
- [ ] Test todo creation, toggle, deletion in UI
- [ ] Verify progress cascade works (todo → subtask → task → wp → project)
- [ ] Test with real Firestore data
- [ ] Verify real-time updates across browser tabs
- [ ] Test edge cases (empty todos, 100% completion, etc.)

**Firestore Integration Needed:**
- [ ] Add `updateProjectWithProgress()` to [lib/firestoreService.ts](lib/firestoreService.ts)
- [ ] Add `updateWorkpackageWithProgress()` to [lib/firestoreService.ts](lib/firestoreService.ts)
- [ ] Update todo handlers in app/page.tsx to persist to Firestore
- [ ] Subscribe to real-time todo changes
- [ ] Test concurrent updates from multiple users

**Files to Modify:**
```
lib/firestoreService.ts
  └─ Add: updateProjectWithProgress(projectId, project)
  └─ Add: updateWorkpackageWithProgress(wpId, workpackage)
  └─ Add: updateTaskTodos(taskId, todos)
  └─ Add: subscribeToTaskUpdates(taskId, callback)

app/page.tsx
  └─ Update: handleToggleTodo (add Firestore call)
  └─ Update: handleAddTodo (add Firestore call)
  └─ Update: handleDeleteTodo (add Firestore call)
```

### 2. Reagents & Consumables End-to-End Testing
**Status:** ⚠️ Implementation Complete, Not Tested
**Component:** EquipmentStatusPanel
**Priority:** HIGH

**Testing Checklist:**
- [ ] Create device with 2 reagents
- [ ] Verify InventoryItem auto-created in Firestore
- [ ] Check bidirectional linking (supply ↔ inventory)
- [ ] Add same reagent to second device
- [ ] Verify inventory item shows multiple device IDs
- [ ] Check reorder suggestions show combined burn rate
- [ ] Test reorder suggestion priority calculation
- [ ] Test day-to-day task creation for urgent reorders

**Potential Issues to Watch:**
- Race conditions when creating inventory items
- Duplicate inventory items for same product
- Burn rate aggregation accuracy
- Firestore write conflicts

### 3. Network View Validation
**Status:** ✅ Fixed, Needs Testing
**Component:** NetworkView
**Priority:** MEDIUM

**Testing Tasks:**
- [ ] Test with profiles missing org/institute/lab data
- [ ] Verify "Unknown" groups appear correctly
- [ ] Test network clustering algorithm
- [ ] Verify all users with names appear in network
- [ ] Test performance with 50+ profiles

---

## 🎨 Priority 2: UI Enhancements (User Requested)

### 1. Multi-Person Color Coding (Gantt Chart)
**Status:** 📝 Planned, Not Implemented
**Priority:** HIGH (User Requested)

**Requirements:**
- Solid color for single task owner
- Gradient/stripes for multiple people
- Consistent colors per person across project
- Color picker or auto-assignment

**Implementation Steps:**
1. Create `lib/personColors.ts`
   ```typescript
   - getPersonColor(personId): string
   - getMultiPersonGradient(personIds[]): string
   - setPersonColor(personId, color): void
   - generateColorPalette(): string[]
   ```

2. Create `components/MultiPersonGanttBar.tsx`
   - Custom Gantt bar renderer
   - Apply gradient backgrounds
   - Handle hover states

3. Update `components/GanttChart.tsx`
   - Use custom bar component
   - Apply person colors

4. Add color management UI
   - Person profile color picker
   - Reset to defaults button

**Files to Create:**
```
lib/personColors.ts (new)
components/MultiPersonGanttBar.tsx (new)
```

**Files to Modify:**
```
components/GanttChart.tsx
  └─ Import MultiPersonGanttBar
  └─ Pass person colors to bars
  └─ Add color legend

components/PeopleView.tsx or PersonDialog.tsx
  └─ Add color picker to person editor
```

### 2. Enhanced Drag & Drop for Task Assignment
**Status:** 📝 Partially Implemented
**Priority:** MEDIUM

**Current State:**
- ✅ Can drag people onto tasks
- ❌ No visual feedback during drag
- ❌ No drop zone highlighting
- ❌ Can't drag onto subtasks

**Enhancements Needed:**
- [ ] Add visual feedback during drag (tooltip "Drop to assign")
- [ ] Highlight droppable task/subtask bars
- [ ] Show preview of who will be assigned
- [ ] Support drag onto subtasks
- [ ] Support drag onto work packages (assign to all tasks)

**Files to Modify:**
```
components/GanttChart.tsx
  └─ Enhance DroppableBar component
  └─ Add visual feedback styles
  └─ Support subtask drops

app/page.tsx
  └─ Add handlePersonDropOnSubtask
```

### 3. Work Package Editor Dialog
**Status:** 📝 Planned, Not Implemented
**Priority:** MEDIUM

**Requirements:**
- Create/edit work packages
- Assign owner (dropdown + drag-drop)
- Set dates (date range picker)
- Set status and progress
- Add/remove tasks
- Link to master project

**UI Design:**
```
┌─────────────────────────────────────┐
│ Work Package Editor                 │
├─────────────────────────────────────┤
│ Name: [WP1: Data Collection      ]  │
│ Owner: [Dr. Smith ▼]                │
│ [Drag person here to assign]        │
│                                      │
│ Dates: [2025-01-01] to [2025-06-30] │
│ Status: [In Progress ▼]             │
│                                      │
│ Tasks:                               │
│ ☐ Task 1: Setup Equipment           │
│ ☐ Task 2: Collect Samples           │
│ [+ Add Task]                         │
│                                      │
│ [Cancel] [Save]                     │
└─────────────────────────────────────┘
```

**Files to Create:**
```
components/WorkPackageEditor.tsx (new)
```

**Files to Modify:**
```
app/page.tsx
  └─ Add workPackageEditorOpen state
  └─ Add handleSaveWorkPackage
```

### 4. Enhanced Project Creation Dialog
**Status:** 📝 Partially Implemented
**Priority:** MEDIUM

**Current State:**
- ✅ Basic project creation works
- ❌ No grant information fields
- ❌ No funding account selection
- ❌ No PI assignment
- ❌ No team member drag-drop

**Enhancements Needed:**
- [ ] Add "Master Project" checkbox
- [ ] Show grant fields (name, number, budget)
- [ ] Show funding accounts checkboxes
- [ ] PI selection dropdown
- [ ] Team members drag-drop area
- [ ] Timeline picker
- [ ] Budget currency selector

**Files to Modify:**
```
components/ProjectCreationDialog.tsx
  └─ Add master project toggle
  └─ Add grant information section
  └─ Add funding accounts section
  └─ Add team section with drag-drop
```

---

## 📚 Priority 3: Electronic Lab Notebook Enhancements

### 1. Voice Notes Feature
**Status:** 📝 Planned, Not Implemented
**Priority:** MEDIUM (User Requested)

**Requirements:**
- Record audio using Web Audio API
- Save to Firebase Storage
- Playback controls
- Optional transcription (Web Speech API)
- Attach to experiment pages

**Implementation Steps:**
1. Create `components/VoiceNoteRecorder.tsx`
   - Record button with timer
   - Stop/pause controls
   - Waveform visualization
   - File size limit (10MB)

2. Add Firebase Storage integration
   - Upload recorded audio
   - Generate download URL
   - Store URL in experiment data

3. Create `components/VoiceNotePlayer.tsx`
   - Audio playback controls
   - Timestamp display
   - Delete button

4. Update ElectronicLabNotebook
   - Add voice notes array to experiment
   - Render voice note list
   - Integration with existing UI

**Technology:**
- MediaRecorder API
- Firebase Storage
- Web Speech API (optional)
- Audio visualization library (e.g., wavesurfer.js)

**Files to Create:**
```
components/VoiceNoteRecorder.tsx (new)
components/VoiceNotePlayer.tsx (new)
lib/audioUtils.ts (new)
```

**Files to Modify:**
```
lib/types.ts
  └─ Add VoiceNote interface
  └─ Update ELNExperiment to include voiceNotes[]

components/ElectronicLabNotebook.tsx
  └─ Add voice notes section
  └─ Integrate recorder and players

lib/firestoreService.ts
  └─ Add uploadVoiceNote()
  └─ Add deleteVoiceNote()
```

### 2. Image Upload & Annotation
**Status:** 📝 Planned, Not Implemented
**Priority:** MEDIUM (User Requested)

**Requirements:**
- Drag & drop image upload
- Camera capture (mobile)
- Drawing tools (pen, shapes, arrows)
- Post-it note annotations
- Save annotations with image
- OCR transcription (optional)

**Implementation Steps:**
1. Create `components/ImageAnnotationEditor.tsx`
   - Canvas-based drawing interface
   - Toolbar (pen, shapes, text, post-its)
   - Undo/redo
   - Save annotations

2. Create `components/PostItNote.tsx`
   - Draggable note component
   - Resizable
   - Color picker
   - Text input

3. Add Firebase Storage integration
   - Upload images
   - Store annotation data as JSON
   - Link to experiment

4. Optional: OCR integration
   - Google Cloud Vision API
   - Extract text from images
   - Insert into document

**Technology:**
- Fabric.js or Konva.js for canvas drawing
- Firebase Storage for images
- React DnD for post-its
- Google Cloud Vision API (optional, for OCR)

**Files to Create:**
```
components/ImageAnnotationEditor.tsx (new)
components/PostItNote.tsx (new)
components/ImageUploader.tsx (new)
lib/imageUtils.ts (new)
lib/ocrUtils.ts (new, optional)
```

**Files to Modify:**
```
lib/types.ts
  └─ Add AnnotatedImage interface
  └─ Update ELNExperiment to include images[]

components/ElectronicLabNotebook.tsx
  └─ Add image upload section
  └─ Integrate annotation editor

lib/firestoreService.ts
  └─ Add uploadImage()
  └─ Add saveAnnotations()
```

### 3. Whiteboard Feature
**Status:** 📝 Planned, Not Implemented
**Priority:** LOW

**Requirements:**
- Infinite canvas for sketching
- Drawing tools
- Embed in experiments
- Export as image

**Implementation:**
- Use Excalidraw library (open source whiteboard)
- Or build custom with Fabric.js
- Save whiteboard state as JSON

---

## 🧹 Priority 4: Project Cleanup & Maintenance

### 1. Documentation Consolidation
**Status:** ⚠️ Too Many MD Files
**Priority:** MEDIUM

**Current State:**
- 29 markdown files in root directory
- Some overlap between docs
- Multiple session summaries
- Hard to find relevant info

**Cleanup Plan:**

**Keep (Core Documentation):**
- `README.md` - Project overview
- `SETUP_FIREBASE_ENV.md` - Setup instructions
- `QUICK_REFERENCE.md` - Developer quick start

**Consolidate into Organized Folders:**

```
docs/
├── implementation/
│   ├── TODO_SYSTEM.md (merge TODO_SYSTEM_IMPLEMENTATION_COMPLETE.md)
│   ├── GANTT_ENHANCEMENTS.md (merge GANTT_ENHANCEMENTS_SESSION_SUMMARY.md)
│   ├── EQUIPMENT_SYSTEM.md (merge EQUIPMENT_*.md files)
│   ├── NETWORK_VIEW.md (merge NETWORK_*.md files)
│   └── ELN_FEATURES.md (from COMPLETE_FIXES_SESSION_2.md)
│
├── planning/
│   ├── SYSTEM_REDESIGN.md
│   ├── PROJECT_MANAGEMENT_PLAN.md
│   └── FUTURE_FEATURES.md
│
├── sessions/
│   ├── SESSION_001_PHASE_1.md
│   ├── SESSION_002_PHASE_2.md
│   ├── SESSION_003_PHASE_3.md
│   ├── SESSION_004_GANTT.md
│   └── SESSION_ARCHIVE.md (older session notes)
│
└── guides/
    ├── DEBUGGING_GUIDE.md
    ├── DEPLOYMENT_GUIDE.md
    └── TROUBLESHOOTING.md
```

**Files to Delete:**
```
BUILD_FIXES_APPLIED.md (merge into session docs)
CHANGELOG.md (outdated, use git log)
CODE_REVIEW_SUMMARY.md (merge into implementation docs)
COMPLETE_FIXES_SESSION_2.md (merge into session docs)
ERROR_LOGGING_PATCH.md (merge into debugging guide)
FIREBASE_UI_FIXES_SUMMARY.md (merge into session docs)
IMPROVEMENTS_SUMMARY.md (redundant)
IMPLEMENTATION_STATUS.md (outdated, use README)
SESSION_SUMMARY.md (merge with other session docs)
TYPES_UPDATE_SUMMARY.md (merge into implementation docs)
PHASE_*.md files (merge into organized session docs)
```

### 2. Code Quality Improvements

**Unused Imports/Code:**
- [ ] Run ESLint with unused vars check
- [ ] Remove commented-out code blocks
- [ ] Remove debug console.logs (or add flag)
- [ ] Remove unused type definitions

**TypeScript Strict Mode:**
- [ ] Enable strict mode in tsconfig.json
- [ ] Fix any type assertions
- [ ] Add proper null checks
- [ ] Fix implicit any types

**Performance Optimization:**
- [ ] Memoize expensive calculations (progress calculation)
- [ ] Add React.memo to frequently re-rendered components
- [ ] Lazy load heavy components (ELN, Equipment panels)
- [ ] Virtualize long lists (todos, inventory)

**Files to Review:**
```
app/page.tsx (4000+ lines - consider splitting)
lib/types.ts (1000+ lines - consider splitting)
components/ElectronicLabNotebook.tsx (large file)
components/EquipmentStatusPanel.tsx (large file)
```

### 3. Firestore Rules & Indexes Review

**Security Rules:**
- [ ] Review firestore.rules for proper access control
- [ ] Test rules with Firebase emulator
- [ ] Add unit tests for security rules
- [ ] Document permission model

**Indexes:**
- [ ] Review firestore.indexes.json
- [ ] Remove unused indexes
- [ ] Add indexes for common queries
- [ ] Test query performance

**Files:**
```
firestore.rules
firestore.indexes.json
storage.rules
```

### 4. Git Repository Cleanup

**Untracked Files to Add:**
```
components/TodoList.tsx
components/TaskDetailPanel.tsx
lib/progressCalculation.ts
TODO_SYSTEM_IMPLEMENTATION_COMPLETE.md
NEXT_SESSION_TODO.md (this file)
PROJECT_CLEANUP_PLAN.md (next file)
```

**Files to Remove from Tracking:**
```
ACADEMIC_RESEARCH_PLAN.md (deleted)
STATIC_EXPORT_NOTES.md (deleted)
```

**Git Commands:**
```bash
# Stage new files
git add components/TodoList.tsx
git add components/TaskDetailPanel.tsx
git add lib/progressCalculation.ts
git add *.md

# Commit changes
git commit -m "feat: implement todo system with progress cascade

- Add Todo interface and progress calculation engine
- Create TodoList and TaskDetailPanel components
- Integrate with Gantt chart context menu
- Update documentation and create next session plan"

# Optional: Create feature branch
git checkout -b feature/todo-system
```

---

## 🔍 Priority 5: Bug Fixes & Known Issues

### 1. Known TODOs in Code

**OnboardingFlow.tsx:205**
```typescript
country: "Unknown", // TODO: Add country selection
```
**Action:** Add country dropdown to onboarding flow

**ProfileSetupPage.tsx:310, 390**
```typescript
country: "Unknown", // TODO: Add country selection in UI
```
**Action:** Add country field to profile setup

### 2. Build Warnings to Fix

**ElectronicLabNotebook.tsx:94**
```
Warning: React Hook useCallback has a missing dependency: 'createNewPage'
```
**Action:** Add createNewPage to dependency array or remove it

**Multiple Components:**
```
Warning: Using `<img>` could result in slower LCP
```
**Action:** Replace `<img>` tags with Next.js `<Image />` component

**ProfileSetupPage.tsx:228**
```
Warning: React Hook useMemo has unnecessary dependencies
```
**Action:** Remove formData.institute and formData.organisation from deps

### 3. Potential Race Conditions

**Concurrent Firestore Updates:**
- Todo toggling from multiple users
- Equipment inventory updates
- Project progress calculations

**Action:** Implement optimistic updates with conflict resolution

### 4. Mobile Responsiveness

**Issues:**
- Gantt chart not touch-friendly
- Task detail panel too wide on mobile
- Drag & drop doesn't work on touch devices

**Action:**
- Add touch event handlers
- Use responsive breakpoints
- Test on mobile devices

---

## 📊 Priority 6: Testing & Quality Assurance

### 1. Unit Tests (Currently None!)

**Priority Areas:**
- [ ] Progress calculation functions
- [ ] Equipment burn rate calculations
- [ ] Date utilities
- [ ] Person helpers
- [ ] Validation schemas

**Setup:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Files to Create:**
```
__tests__/
├── lib/
│   ├── progressCalculation.test.ts
│   ├── equipmentUtils.test.ts
│   └── personHelpers.test.ts
└── components/
    ├── TodoList.test.tsx
    └── TaskDetailPanel.test.tsx
```

### 2. Integration Tests

**Scenarios:**
- [ ] Create project → add workpackage → add task → add subtask → add todo → complete
- [ ] Create device → add reagent → check inventory → trigger reorder
- [ ] Create ELN experiment → add pages → save → retrieve
- [ ] User onboarding flow → profile creation → join lab

### 3. E2E Tests (Cypress/Playwright)

**Critical User Flows:**
- [ ] Authentication flow
- [ ] Project creation and management
- [ ] Task assignment and completion
- [ ] Equipment inventory management
- [ ] Lab poll creation and response

### 4. Performance Testing

**Metrics to Track:**
- [ ] Initial page load time (target: < 3s)
- [ ] Time to interactive (target: < 5s)
- [ ] Bundle size (current: 249 kB)
- [ ] Firestore read/write operations
- [ ] Rendering performance with 100+ projects

---

## 🚀 Priority 7: Deployment & DevOps

### 1. Firebase Deployment Checklist

**Before Deploy:**
- [ ] Run full build (`npm run build`)
- [ ] Test in production mode (`npm start`)
- [ ] Review Firestore indexes
- [ ] Review security rules
- [ ] Check environment variables
- [ ] Review Firebase billing limits

**Deploy Commands:**
```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Firestore indexes
firebase deploy --only firestore:indexes
```

### 2. Environment Configuration

**Check .env.local:**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Action:** Ensure all keys are set correctly

### 3. Monitoring & Analytics

**Setup:**
- [ ] Firebase Performance Monitoring
- [ ] Firebase Crashlytics
- [ ] Google Analytics
- [ ] Error tracking (Sentry)

### 4. Backup Strategy

**Firestore Backups:**
- [ ] Enable automated backups
- [ ] Test restore procedure
- [ ] Document backup schedule

**Storage Backups:**
- [ ] Backup Firebase Storage
- [ ] Store image copies
- [ ] Document recovery process

---

## 📝 Summary: What to Work On Next Session

### Immediate (Start Here):
1. **Test Todo System** - Verify UI works, add Firestore persistence
2. **Test Reagents/Consumables** - End-to-end inventory linking
3. **Multi-Person Colors** - Implement gradient bars for Gantt chart

### Short Term (Next 1-2 Sessions):
4. **Work Package Editor** - Full CRUD for work packages
5. **Enhanced Project Dialog** - Grant info, funding accounts, team
6. **Voice Notes for ELN** - Recording and playback

### Medium Term (Next 3-5 Sessions):
7. **Image Annotation for ELN** - Upload, draw, post-its
8. **Project Cleanup** - Consolidate docs, organize folders
9. **Unit Tests** - Start with critical functions
10. **Mobile Responsiveness** - Fix touch events, responsive layouts

### Long Term (Future):
11. **Whiteboard Feature** - Excalidraw integration
12. **E2E Testing** - Cypress setup
13. **Performance Optimization** - Memoization, lazy loading
14. **Advanced Features** - Real-time collaboration, notifications

---

## 📦 Files to Commit This Session

```bash
# New files
git add components/TodoList.tsx
git add components/TaskDetailPanel.tsx
git add lib/progressCalculation.ts
git add TODO_SYSTEM_IMPLEMENTATION_COMPLETE.md
git add NEXT_SESSION_TODO.md

# Modified files (already tracked)
git add lib/types.ts
git add app/page.tsx
git add components/NetworkView.tsx
git add components/GanttChart.tsx
git add GANTT_ENHANCEMENTS_SESSION_SUMMARY.md

# Commit
git commit -m "feat: implement todo system with cascading progress calculation

- Add Todo interface to types with completion tracking
- Create progress calculation engine with cascade logic
- Implement TodoList component with progress bar
- Implement TaskDetailPanel with expandable subtasks
- Integrate with Gantt chart via context menu
- Fix Network View profile filtering
- Update master projects integration
- Add comprehensive documentation"
```

---

*Document created: 2025-11-05*
*Last updated: 2025-11-05*
*Build status: ✅ Passing (249 kB)*
