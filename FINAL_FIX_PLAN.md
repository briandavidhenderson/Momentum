# Final Fix Plan - Priority Implementation Guide

## Overview
This document outlines critical fixes and enhancements organized by priority level (P0-P2). P0 items are blockers that must ship first.

---

## P0 — Blockers (Ship First)

### 1. Funder Creation Flow (Blocker)

**Problem**: New project flow blocks because there are no funders and no way to create one inline.

**Fix**:
- Add "Create Funder" modal available inline at the funder selection step
- Auto-prompt the modal if `funders.count === 0`
- After successful creation, preselect the newly created funder and enable "Continue"

**UI Components**:
- Button: `+ New Funder` next to the Funder select dropdown
- Modal fields (v1 minimal):
  - Name* (required)
  - Type: Public / Private / Charity / Internal
  - Programme/Call
  - Reference/Grant No.
  - Currency
  - Start date
  - End date
  - Notes
- Client validation on required fields with inline errors

**API/Database**:
- **Endpoints**:
  - `POST /funders` (body: fields above; requires `orgId`)
  - `GET /funders?orgId=...` to populate the select dropdown
- **Table**: `funders`
  ```sql
  - id (PK)
  - org_id (FK)
  - name (required)
  - type (enum: PUBLIC, PRIVATE, CHARITY, INTERNAL)
  - programme
  - reference
  - currency
  - start_date
  - end_date
  - notes
  - created_by (FK to users)
  - created_at
  ```

**Acceptance Criteria**:
- ✅ If no funders exist, modal opens automatically
- ✅ On save, new funder appears in dropdown and "Next" button enables
- ✅ Reloading the page preserves the newly added funder

**QA**:
- E2E: Fresh org with 0 funders → create funder inline → create master project successfully
- Negative: Leave Name empty → see validation; cannot submit

---

### 2. Unified Project Model (Blocker)

**Problem**: Two different project concepts appear; "Quick Add Project" creates duplicates/unsynced project types not linked to funders.

**Fix**:
- **Unify project model**:
  - **Master Project** = funded, linked to a Funder (multi-year items that employ people)
  - **Regular/Personal Project** = small, flexible, not funder-linked
- "Quick Add Project" must ask: "Type: Master Project (funded) / Regular Project (personal/lab)"
  - If "Master Project" chosen → require/select funder (with inline create)
  - If "Regular" → no funder field shown

**API/Database**:
- **Table Changes**: `projects`
  - Add `project_type` enum: `MASTER | REGULAR`
  - Add `funder_id` (nullable, required if `project_type = MASTER`)
- **Migration**: Set existing "quick add" projects to `project_type = REGULAR`, `funder_id = NULL`

**Acceptance Criteria**:
- ✅ Only one way to create a project; type determines required fields
- ✅ Creating a Master Project via Quick Add or full wizard yields identical data shape
- ✅ Switching types updates visible fields appropriately

**QA**:
- E2E: Quick Add → Master → select/create funder → project saved and appears on Timeline
- E2E: Quick Add → Regular → project saved and appears under Day-to-Day "Projects" section

---

## P1 — Core UX/Workflow Fixes

### 3. Reactive Gantt with Hierarchy & Progress Roll-up

**Problem**: Gantt on homepage doesn't update reactively from sub-items; hierarchy is missing.

**Fix**:
- **Data model hierarchy**:
  ```
  master_projects → work_packages → tasks → todos
  ```
- **Gantt visualization**:
  - Show Work Packages as rows under each Master Project bar
  - Expandable caret to reveal Tasks (or show in side panel on row click)
- **Progress roll-up logic**:
  - Task progress = mean of its To-dos' progress (0-100)
  - Work Package progress = mean of child Task progress
  - Master Project progress = mean of child Work Package progress
  - Any change to a To-do progress updates roll-ups in real time

**API/Database**:
- **Tables**:
  ```sql
  work_packages (
    id, master_project_id, title, start_date, end_date, description
  )

  tasks (
    id, work_package_id, title, description, status, priority, assignees[]
  )

  todos (
    id, task_id, title, description, due_date, progress_int_0_100
  )
  ```
- **Endpoints**:
  - `GET /timeline?orgId=...` returns nested structure with computed roll-ups
  - `PATCH /todos/:id {progress}` triggers recompute (server-side or client with server confirm)

**Acceptance Criteria**:
- ✅ Adding/editing a Work Package/Task/To-do updates Gantt within 1 interaction (no page reload)
- ✅ Roll-up numbers match underlying children

**QA**:
- Unit tests for roll-up math (odd counts, empty sets)
- E2E: Change a To-do to 50% → parent Task, WP, and Project progress update as expected

---

### 4. Day-to-Day Board: "Problem" State + Richer Task Cards

**Problem**: Only "To do / Working on it / Done" exist; no way to flag problems; insufficient details on cards.

**Fix**:
- **Add fourth column/state**: `Problem` (or "Blocked")
  - Allowed transitions: Any → Problem; Problem → To do/Working/Done
- **Task card fields** (condensed view):
  - Heading (title)
  - Short description (1-2 lines truncation)
  - Priority chip: Low / Medium / High / Critical
  - Optional: Due date, Assignees avatars
- **Priority colors** (WCAG AA accessible):
  - Low = green
  - Medium = yellow
  - High = orange
  - Critical = red
- Card expands on click for full description & comments

**API/Database**:
- **Table Changes**: `tasks`
  - Add `status` value: `PROBLEM`
  - Add `priority` enum: `LOW | MEDIUM | HIGH | CRITICAL`

**Acceptance Criteria**:
- ✅ Users can move items to Problem and back
- ✅ Cards show heading, truncated description, and clear priority chip
- ✅ Drag-and-drop works across all columns

**QA**:
- E2E: Create task → set priority High → move to Problem → visible red/orange signaling
- Accessibility check: Color + icon/label for users with color vision deficiency

---

### 5. "Report Problem" Button with Visibility Controls

**Problem**: No formal flow to raise/track problems across stakeholders.

**Fix**:
- **Add "Report Problem" button** on Task and To-do detail panels:
  - Sets state to `Problem`
  - Opens dialog with fields:
    - Problem title* (required)
    - What's blocking you?* (required)
    - Visibility: Project team only / PI & team / Lab-wide
  - Creates a Problem log entry linked to the Task/To-do, with comments thread

**API/Database**:
- **Table**: `problems`
  ```sql
  id, target_type (enum: TASK|TODO), target_id,
  title, detail, visibility (enum: TEAM|PI|LAB),
  created_by, created_at, status (enum: OPEN|RESOLVED)
  ```
- **Endpoints**:
  - `GET /problems?scope=...` for lists
  - `POST /problems`
  - `PATCH /problems/:id {status}`

**Acceptance Criteria**:
- ✅ Reporting a problem moves the item to Problem column and creates a log entry
- ✅ Visibility rules respected in lists/notifications
- ✅ PI can filter to see all OPEN problems across owned projects

**QA**:
- E2E: Create problem with Lab visibility → visible to non-members; change to TEAM → visibility narrows

---

## P2 — Information Architecture & Navigation

### 6. Move Regular/Personal Projects to Day-to-Day

**Problem**: "Create new project" for smaller, flexible work clutters the homepage.

**Fix**:
- In **Day-to-Day** view, add a `+ New Regular Project` button under a "Personal & Lab Projects" section
- These items appear as collections of tasks/boards (Kanban), separate from the funded Master Projects timeline

**Acceptance Criteria**:
- ✅ The homepage (Project Timeline) focuses on Master (funded) projects and their Gantt
- ✅ Day-to-Day exposes a clean list/grid of Regular Projects with owners and quick access to their boards

**QA**:
- E2E: Create Regular Project in Day-to-Day → appears there, not on funded Gantt (unless intentionally toggled to show)

---

## Supporting Changes (Shared)

### Data Model Summary (Net Changes)

**New Tables**:
- `funders` (see P0-1)
- `work_packages` (see P1-3)
- `problems` (see P1-5)

**Modified Tables**:
- `projects`:
  - Add `project_type` (enum: MASTER | REGULAR)
  - Add `funder_id` (nullable, required if MASTER)
- `tasks`:
  - Add `status` value: PROBLEM
  - Add `priority` (enum: LOW | MEDIUM | HIGH | CRITICAL)
- `todos`:
  - Add `progress_int_0_100`

### Key Endpoints

**Funders**:
- `GET /funders?orgId=...`
- `POST /funders`

**Projects**:
- `POST /projects` (validates `funder_id` when `project_type=MASTER`)

**Timeline**:
- `GET /timeline?orgId=...` (nested data with roll-ups)

**Work Packages, Tasks, Todos**:
- `POST /work-packages`
- `POST /tasks`
- `POST /todos`
- `PATCH /todos/:id`

**Problems**:
- `GET /problems`
- `POST /problems`
- `PATCH /problems/:id`

### Permissions

- **Funder create**: Org admin, PI (toggle in settings if needed)
- **Problems visibility**: Enforced server-side
- **Regular Projects**: Creators can invite/assign; PI can view all under their lab by default (configurable)

---

## Implementation Order

1. **P0-1**: Funder creation flow (enables project creation)
2. **P0-2**: Unified project model (prevents data inconsistency)
3. **P1-3**: Reactive Gantt with hierarchy (core visualization)
4. **P1-4**: Day-to-Day board enhancements (daily workflow)
5. **P1-5**: Problem reporting system (stakeholder communication)
6. **P2-6**: Information architecture refinement (UX polish)

---

## Testing Strategy

### Unit Tests
- Progress roll-up calculations (edge cases: empty, odd counts)
- Validation logic for required fields

### Integration Tests
- Funder creation → project creation flow
- Todo progress change → cascade to project level
- Problem visibility filtering

### E2E Tests
- Fresh org onboarding → create funder → create master project → add work package → add task → add todo → update progress
- Day-to-Day: Create task → set priority → move to Problem → report problem → resolve
- Regular project creation in Day-to-Day (not appearing on main timeline)

### Accessibility Tests
- Priority colors with WCAG AA contrast
- Color + icon/label for CVD users
- Keyboard navigation for all modals and drag-drop

---

## Rollout Plan

### Phase 1 (Week 1-2): P0 Blockers
- Database migrations for funders and project_type
- Funder creation modal
- Unified project creation flow
- Migration script for existing projects

### Phase 2 (Week 3-4): P1 Core UX
- Work packages table and API
- Reactive Gantt with hierarchy
- Progress roll-up engine
- Day-to-Day board Problem state
- Problem reporting system

### Phase 3 (Week 5-6): P2 Polish & Testing
- Regular project separation
- Comprehensive E2E tests
- Accessibility audit
- Performance optimization
- Documentation updates

---

## Success Metrics

- **P0**: 100% of users can create projects without blocking on funders
- **P1-3**: Gantt updates reflect todo changes within 500ms
- **P1-4**: 80% reduction in "where did my task go?" support queries
- **P1-5**: Problems logged and visible to appropriate stakeholders within 1 interaction
- **P2-6**: 90% of small projects created in Day-to-Day (not cluttering Timeline)

---

**Status**: 📋 Planning Phase
**Next Action**: Review with team → Prioritize → Begin P0-1 implementation
**Owner**: Development Team
**Last Updated**: 2025-11-05
