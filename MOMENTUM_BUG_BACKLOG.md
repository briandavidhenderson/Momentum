# Momentum – Bug & Improvement Backlog

**Product:** Momentum Lab Management
**Environment:** Production – https://momentum-a60c5.web.app
**Date:** 2025-11-14
**Tester Role:** External QA / Software Engineer

---

## 1. Issue Index

| ID        | Title                                                               | Area                     | Severity |
|----------|---------------------------------------------------------------------|--------------------------|----------|
| MMT-001  | "New Project" auto-creates generic entries, no configuration flow   | Project Timeline         | High     |
| MMT-002  | Project rows not navigable; instructions reference non-existent UX  | Project Timeline         | Medium   |
| MMT-003  | Day-to-Day Kanban: drag-and-drop of tasks does not work             | Day-to-Day               | High     |
| MMT-004  | Orders board: drag-and-drop & status updates non-functional         | Orders                   | High     |
| MMT-005  | New Order creation & display inconsistent                           | Orders / Inventory       | Medium   |
| MMT-006  | Equipment: "Add Device" creates placeholder card with no setup flow | Equipment                | Medium   |
| MMT-007  | Equipment: "Order Missing" / "Reorder" buttons do nothing           | Equipment / Orders link  | High     |
| MMT-008  | Calendar: "New Event" button unresponsive                           | Calendar                 | High     |
| MMT-009  | Lab Notebook: create/ report actions lack clear persistence/feedback| Lab Notebook             | Medium   |
| MMT-010  | People: no visible way to add team members                          | People                   | Medium   |
| MMT-011  | ORCID connect flow traps user on external page                      | My Profile / Auth        | Medium   |
| MMT-012  | Global: lack of error/success feedback & optimistic UI consistency  | Cross-cutting UX         | Medium   |

---

## 2. Detailed Issues

---

### MMT-001 – "New Project" auto-creates generic entries, no configuration flow

**Component:** Project Timeline
**Type:** Functional / UX
**Severity:** High

#### Description

Clicking **"New Project"** immediately inserts a generic "New Project X" row into the timeline without asking for:

- Project name / description
- Start/end dates
- Owner / lab / funding account

There is no follow-up modal to configure the project, and the created project appears as a bare task row.

#### Steps to Reproduce

1. Log in.
2. Navigate to **Project Timeline**.
3. Click the **"New Project"** button (top right of Project Dashboard).

#### Expected Behaviour

- A **Create Project** modal opens with fields (name, description, dates, lab, PI, funding, visibility).
- On successful save:
  - The new project appears in the list with the configured name.
  - Timeline entry reflects correct dates & duration.
- On cancel:
  - No project is created.

#### Actual Behaviour

- A new row named **"New Project X"** is created immediately.
- No configuration modal appears.
- Row has no obvious way to set basic properties besides clicking/ highlighting.

#### Front-End Notes

- Button likely wired to a simple `createProject()` stub that inserts a default project into state.
- Missing or bypassed project creation modal & form.
- Timeline row probably using static seed data structure with hard-coded values.

**FE Tasks**

- Implement `CreateProjectModal` (if not existing) and route **New Project** click through it.
- Validate form and only call backend `POST /projects` after user confirms.
- Update local state/store with server response; re-render timeline.

#### Back-End Notes

- Must expose `POST /projects` endpoint (or Firestore write) that:
  - Accepts project payload (name, description, start/end, owner, etc.).
  - Returns created project with ID and normalized dates.
- Consider adding default values (status, colour) server-side.

**Acceptance Criteria**

- New project **cannot** be created without at least a name and start date.
- After saving, newly configured project appears immediately with correct name and dates.
- No extra "New Project X" entries created without user input.

---

### MMT-002 – Project rows not navigable; instructions reference non-existent UX

**Component:** Project Timeline
**Type:** UX / Functional
**Severity:** Medium

#### Description

The "Getting Started" section instructs users to right-click work packages to add tasks and to click tasks to view "todos and subtasks". In the current UI:

- Clicking a project row only highlights it; no details open.
- Right-click on rows or timeline bars does nothing.

#### Steps to Reproduce

1. Create a project via MMT-001 or use existing "New Project X".
2. Attempt to:
   - Click the task name to open details.
   - Right-click the task name or bar to add a sub-task.

#### Expected Behaviour

- Clicking a project should open a **Project Detail / Work Package** view.
- Right-click should either:
  - Open a context menu, **or**
  - Be removed from instructions if not supported.

#### Actual Behaviour

- No navigation, no context menu.
- Instructions feel misleading / out of sync with implementation.

#### Front-End Tasks

- Implement navigation from project row to `ProjectDetailView` (e.g. React Router navigation on row click).
- Remove or implement right-click context menu.
- Ensure instructions match actual UX.

#### Back-End Tasks

- If not present, provide APIs for project details:
  - `GET /projects/{id}` (with tasks/work packages).
  - `POST /projects/{id}/tasks`.

**Acceptance Criteria**

- Clicking any project row opens a dedicated detail page or side panel.
- Instructions exactly describe available interactions; no dead hints.

---

### MMT-003 – Day-to-Day Kanban: drag-and-drop of tasks does not work

**Component:** Day-to-Day Tasks
**Type:** Functional
**Severity:** High

#### Description

Kanban board visually suggests Trello-like drag-and-drop:

- Columns: **To Do**, **Working On It**, **Done**.
- Cards have drag handles.

Dragging any card between columns:

- Appears to move while dragging.
- On release, card snaps back; state does not change.

#### Steps to Reproduce

1. Navigate to **Day to Day**.
2. Create a **New Task** to ensure at least one card exists.
3. Drag the card from "To Do" to "Working On It" or "Done".

#### Expected Behaviour

- Card drops into target column.
- Status persists on refresh.
- Any counters or metrics update.

#### Actual Behaviour

- Card returns to original column.
- No persistent status change.

#### Front-End Tasks

- Validate drag-and-drop implementation:
  - If using `react-beautiful-dnd` / `dnd-kit`, ensure `onDragEnd` updates the underlying list and task `status`.
  - Ensure unique IDs for tasks and droppable areas.
- Wire status change to local store and backend mutation.

#### Back-End Tasks

- Ensure a `status` field exists for tasks (`TODO`, `IN_PROGRESS`, `DONE`).
- Provide endpoint (or Firestore doc) to update task status:
  - `PATCH /tasks/{id}` `{ status: "IN_PROGRESS" }`.
- Make sure security rules allow the current user to update their lab's tasks.

**Acceptance Criteria**

- Dragging a task between columns updates UI **and** persists on reload.
- No console errors during drag operations.

---

### MMT-004 – Orders board: drag-and-drop & status updates non-functional

**Component:** Orders
**Type:** Functional
**Severity:** High

#### Description

Orders view shows columns like **To Order**, **Ordered**, **Received** with counts per column. Problems:

- Dragging cards between columns does not move them.
- Editing order status in the modal and saving does **not** move the card or update counts.

#### Steps to Reproduce

1. Navigate to **Orders**.
2. Drag an existing order from "To Order" to "Ordered".
3. Edit an order:
   - Open **Edit**.
   - Change **Status** to "Ordered".
   - Click **Save Changes**.

#### Expected Behaviour

- Both drag-and-drop and status change in modal should:
  - Update the card's column.
  - Update counters.
  - Persist on reload.

#### Actual Behaviour

- Card visually returns to original column on drop.
- Modal's **Save Changes** appears to succeed, but card remains in original column; counters unchanged.

#### Front-End Tasks

- Fix drag-and-drop handling as per MMT-003 (Orders variant).
- Ensure modal **Save** handler:
  - Updates local order state's `status`.
  - Moves card to appropriate column.
- Add loading/error states while persisting status.

#### Back-End Tasks

- Endpoint to update order status (e.g. `PATCH /orders/{id}`).
- Ensure response is correctly handled in FE.
- Confirm status enum matches FE values (`"TO_ORDER"`, `"ORDERED"`, `"RECEIVED"` etc).

**Acceptance Criteria**

- Changing order status (drag or modal) consistently moves cards and updates counts and persists.

---

### MMT-005 – New Order creation & display inconsistent

**Component:** Orders / Inventory
**Type:** Functional / UX
**Severity:** Medium

#### Description

The **New Order** modal opens and allows data entry but behaviour after saving is unclear:

- Saved orders may not appear or appear only in "To Order".
- No visual confirmation of success/failure.

#### Steps to Reproduce

1. Navigate to **Orders**.
2. Click **New Order**.
3. Fill in required fields and save.
4. Observe board and counters.

#### Expected Behaviour

- After save:
  - Success toast / banner.
  - New order card appears in appropriate column (based on initial status).
  - Board counters update.

#### Actual Behaviour

- Inconsistent visibility of new orders.
- No confirmation message.

#### Front-End Tasks

- Ensure `onSubmit` of new order form:
  - Calls backend `POST /orders`.
  - On success, updates board state and closes modal.
  - Shows toast notification.
- Disable submit while saving; show errors on failure.

#### Back-End Tasks

- Implement `POST /orders` with validation and default status.
- Return created order with ID and status.

**Acceptance Criteria**

- Every successfully created order is visible immediately in the correct column with a success message.
- API failures surface as clear error to user.

---

### MMT-006 – Equipment: "Add Device" creates placeholder card with no setup flow

**Component:** Equipment – Equipment Status
**Type:** Functional / UX
**Severity:** Medium

#### Description

**Add Device** button:

- Instantly adds a "New Device" card into Equipment Status.
- Card shows 100% maintenance & supplies, but has no details.
- No initial configuration modal.

Editing existing devices works, but new devices start as essentially random placeholders.

#### Steps to Reproduce

1. Navigate to **Equipment**.
2. Scroll down to **Equipment Status**.
3. Click **Add Device**.

#### Expected Behaviour

- A **Create Device** modal opens with fields:
  - Name, make, model, serial.
  - Maintenance interval, reminders.
  - Linked supplies (optional).
- Only on save is the device card created.

#### Actual Behaviour

- Device card appears immediately with generic name and no metadata.

#### Front-End Tasks

- Similar to MMT-001:
  - Add a `CreateDeviceModal`.
  - Replace "auto-add card" logic with "open modal and create on save".
- Ensure maintenance/supplies bars initially reflect reality (e.g. 0% / unknown until configured).

#### Back-End Tasks

- Provide `POST /devices`.
- Default fields (maintenance interval, next maintenance date) set server-side if omitted.

**Acceptance Criteria**

- User cannot create a device without at least a name.
- Newly added devices always have a minimal, meaningful configuration.

---

### MMT-007 – Equipment: "Order Missing" / "Reorder" buttons do nothing

**Component:** Equipment – Supplies / Orders Integration
**Type:** Functional
**Severity:** High

#### Description

On equipment cards:

- There is a **Reorder** button within the supplies line.
- There is an **Order Missing** button at bottom of card.

Clicking either:

- Produces no visible change.
- Does not open Orders view or create a new order.

#### Steps to Reproduce

1. Navigate to **Equipment** → Equipment Status.
2. On any device with supplies, click:
   - **Reorder** in the supply line, or
   - **Order Missing**.

#### Expected Behaviour

One of:

- Open **New Order** modal pre-filled with device & supply info, **or**
- Automatically create an order and show confirmation + link to Orders page.

#### Actual Behaviour

- UI remains unchanged, no feedback, no new orders visible.

#### Front-End Tasks

- Wire these actions to correct flows:
  - Option A: navigate to Orders view with pre-filled form.
  - Option B: call `POST /orders` directly and show toast + badge.
- Provide visual feedback (spinner / disabled state / toast).

#### Back-End Tasks

- Ensure endpoint to create orders from device context supports:
  - Device ID / supply ID.
  - Default quantity based on burn-rate.

**Acceptance Criteria**

- Clicking "Order Missing" or "Reorder" always results in either:
  - A prefilled new order modal, or
  - A visible new order in Orders board, plus feedback.

---

### MMT-008 – Calendar: "New Event" button unresponsive

**Component:** Calendar & Events
**Type:** Functional
**Severity:** High

#### Description

On the **Calendar & Events** page:

- Cards show counts for Meetings, Deadlines, Milestones, Training.
- Upcoming and Recent Past Events panels are empty.
- Clicking **"New Event"** does not open any modal; no visible reaction.

#### Steps to Reproduce

1. Navigate to **Calendar**.
2. Click **New Event**.

#### Expected Behaviour

- A **Create Event** modal opens with:
  - Title, type (meeting/deadline/etc.), date/time, location, attendees.
- On save:
  - Event appears under Upcoming Events.
  - Counters update accordingly.

#### Actual Behaviour

- Button appears clickable but produces no UI change.

#### Front-End Tasks

- Hook up **New Event** button to event creation modal.
- Implement event list rendering (Upcoming & Past).
- Ensure counters are derived from events, not hardcoded.

#### Back-End Tasks

- Provide `POST /events`, `GET /events` endpoints or Firestore queries.
- Support event types for stats.

**Acceptance Criteria**

- User can create at least one event and see it immediately.
- Upcoming/Recent lists and counters reflect created events.

---

### MMT-009 – Lab Notebook: create / report actions lack clear persistence/feedback

**Component:** Lab Notebook
**Type:** UX / Functional
**Severity:** Medium

#### Description

Lab Notebook view supports:

- Experiments list.
- "Generate Report".
- "New Experiment".

Current behaviour:

- Modals appear and can be cancelled.
- It is not clear when a new experiment or report has been successfully saved.
- There is no "Experiment created" / "Report generated" feedback.
- Hard to tell which experiments/reports are "real" vs. sample data.

#### Steps to Reproduce

1. Navigate to **Lab Notebook**.
2. Click **New Experiment** → fill data → save.
3. Click **Generate Report** for an experiment.

#### Expected Behaviour

- Clear success/failure feedback (toast, banner).
- Newly created experiment/report appears in relevant list with timestamps.
- Reports are easily identifiable and openable.

#### Actual Behaviour

- UI changes are subtle; user cannot easily confirm action success.
- No visible error/success messages.

#### Front-End Tasks

- Ensure successful create/update calls:
  - Update local state and render new items.
  - Show toast notifications.
- Clearly label which items are "reports" vs. raw experiment entries.

#### Back-End Tasks

- Confirm experiment and report schemas.
- Ensure writes succeed and errors are propagated to FE.

**Acceptance Criteria**

- After creating experiment or report, user receives visible confirmation and sees the new item.

---

### MMT-010 – People: no visible way to add team members

**Component:** People
**Type:** Feature Gap / UX
**Severity:** Medium

#### Description

The **People** view shows:

- Current user card (Brian Henderson).
- Org chart and network graph.

There is no obvious control to:

- Invite new users.
- Add lab members manually (e.g., placeholders).

#### Steps to Reproduce

1. Navigate to **People**.
2. Look for "Add Person", "Invite", or similar controls.

#### Expected Behaviour

Depending on product design:

- At least one of:
  - "Add Person" button to create local profiles.
  - "Invite via email" to connect to auth.
  - Integration with institution directory.

#### Actual Behaviour

- Single user only; instructions mention "drag to assign people" elsewhere but there is no way to create more people in this UI.

#### Front-End Tasks

- Design and implement an **Add Person / Invite** flow.
- Ensure new profiles show up across app (project assignment, Day-to-Day, etc.).

#### Back-End Tasks

- Person profile schema and `POST /profiles`.
- Link to authentication system if invitations are required.

**Acceptance Criteria**

- Admin/PI can add at least one additional person and see them in People list and network.

---

### MMT-011 – ORCID connect flow traps user on external page

**Component:** My Profile → ORCID
**Type:** UX / Auth Flow
**Severity:** Medium

#### Description

Clicking **Connect ORCID** on My Profile:

- Opens ORCID OAuth page with cookie consent and sign-in.
- Returning to Momentum is non-obvious; browser back may not correctly complete OAuth.
- From a user perspective, it feels like leaving the app with no clear way back unless they manually re-open Momentum.

#### Steps to Reproduce

1. Navigate to **My Profile**.
2. Scroll to ORCID section.
3. Click **Connect ORCID**.

#### Expected Behaviour

- Typical OAuth behaviour:
  - User signs in at ORCID.
  - ORCID redirects back to Momentum at a `/oauth/orcid/callback` route.
  - App shows a success message and populates ORCID info.

#### Actual Behaviour

- ORCID page shows cookie consent and sign-in.
- It is unclear what happens after sign-in; user had to manually navigate back.

#### Front-End Tasks

- Implement dedicated ORCID OAuth callback route that:
  - Handles `code`/`state` params.
  - Displays success/failure message and updates profile.
- After clicking **Connect ORCID**, open a new window or redirect but show clear instructions.

#### Back-End Tasks

- Implement ORCID OAuth integration:
  - Exchange `code` for access token.
  - Fetch ORCID profile data.
  - Store ORCID iD & token (if needed).
- Ensure CSRF/`state` validation.

**Acceptance Criteria**

- After successful ORCID sign-in, user is automatically returned to Momentum and sees their ORCID ID linked with a success message.

---

### MMT-012 – Global: lack of error/success feedback & optimistic UI consistency

**Component:** Global UX
**Type:** UX / Reliability
**Severity:** Medium

#### Description

Across modules (Projects, Orders, Equipment, Lab Notebook):

- Actions often have **no immediate feedback**:
  - No spinner on saving.
  - No toast on success or error.
- Some views appear to use static seed data or local state without confirming backend success.

This makes it difficult for users to know if actions have worked or if data is real.

#### Front-End Tasks

- Introduce a central **notification/toast system**.
- For every major mutation (create/update/delete):
  - Show pending state (disable buttons, small spinner).
  - On success, show toast & update state.
  - On error, show descriptive error message.
- Audit components for actions that silently fail or do nothing and ensure they surface errors.

#### Back-End Tasks

- Standardize error responses (HTTP codes & JSON body).
- Consider basic monitoring/logging for failed operations.

**Acceptance Criteria**

- Every create/update/delete action:
  - Shows visible progress and final outcome.
  - Never fails silently.

---

## 3. Priority Recommendations

1. **Unblock core workflows**
   - Fix drag-and-drop + status updates (MMT-003, MMT-004).
   - Fix "New Event" creation (MMT-008).

2. **Correct misleading UX**
   - New Project & Add Device flows (MMT-001, MMT-006).
   - Project details navigation & instructions (MMT-002).

3. **Tighten equipment–orders integration**
   - "Order Missing" / "Reorder" actions (MMT-007).
   - Stabilise New Order creation and status updates (MMT-005).

4. **Improve confidence & adoption**
   - Global notification system and clear feedback (MMT-012).
   - ORCID and People flows to align with real usage (MMT-010, MMT-011).

---

## 4. Resolution Tracking

| ID      | Status | Assigned | Resolved Date | Notes |
|---------|--------|----------|---------------|-------|
| MMT-001 | 🔴 Open | TBD | - | Planned for Priority 2 implementation |
| MMT-002 | 🔴 Open | TBD | - | Planned for Priority 2 implementation |
| MMT-003 | ✅ **Resolved** | Claude | 2025-11-14 | Added error handling & logging to drag-and-drop |
| MMT-004 | ✅ **Resolved** | Claude | 2025-11-14 | Added error handling for drag & modal updates |
| MMT-005 | 🔴 Open | TBD | - | Planned for Priority 3 implementation |
| MMT-006 | 🔴 Open | TBD | - | Planned for Priority 2 implementation |
| MMT-007 | 🔴 Open | TBD | - | Planned for Priority 3 implementation |
| MMT-008 | ✅ **Resolved** | Claude | 2025-11-14 | Changed to open EventDialog instead of auto-create |
| MMT-009 | 🔴 Open | TBD | - | Planned for Priority 4 implementation |
| MMT-010 | 🔴 Open | TBD | - | Planned for Priority 4 implementation |
| MMT-011 | 🔴 Open | TBD | - | Planned for Priority 4 implementation |
| MMT-012 | 🔴 Open | TBD | - | Planned for Priority 4 implementation |

---

## 5. Resolution Summary

### Completed (2025-11-14)

**Commit:** `e330f20` - fix: Resolve high-priority drag-and-drop and calendar issues

✅ **MMT-003 - Day-to-Day Kanban drag-and-drop** (High Priority)
- **Changes Made:**
  - Added comprehensive error handling and logging to `handleMoveDayToDayTask` in `lib/hooks/useDayToDayTasks.ts`
  - Made `handleDragEnd` async with proper error handling in `components/views/DayToDayBoard.tsx`
  - Tasks now properly persist status changes when dragged between columns
  - Users receive clear error messages if updates fail
- **Impact:** Users can now reliably move tasks between "To Do", "Working On It", and "Done" columns

✅ **MMT-004 - Orders drag-and-drop & status updates** (High Priority)
- **Changes Made:**
  - Added error handling and logging to `handleUpdateOrder` in `lib/hooks/useOrders.ts`
  - Fixed drag-and-drop persistence with proper await in `components/views/OrdersInventory.tsx`
  - Fixed modal status update with error handling in `handleSaveEdit`
  - Both drag-and-drop and modal edits now properly persist
- **Impact:** Orders can be moved between "To Order", "Ordered", and "Received" columns via drag-and-drop or modal editing

✅ **MMT-008 - Calendar New Event button** (High Priority)
- **Changes Made:**
  - Changed "New Event" button from auto-creating placeholder events to opening `EventDialog`
  - Added proper event creation/edit modal flow in `components/views/CalendarEvents.tsx`
  - Integrated EventDialog with full event configuration (title, description, date/time, location, attendees, etc.)
  - Users can now configure event details before creating
- **Impact:** Users can create fully configured events instead of getting placeholder "New Event" entries

### Remaining Work

The following issues are documented but not yet implemented (see Priority Recommendations above):

**Priority 2 (Misleading UX):**
- MMT-001: New Project modal flow
- MMT-006: Add Device modal flow
- MMT-002: Project row navigation

**Priority 3 (Equipment-Orders Integration):**
- MMT-007: Equipment Order buttons functionality
- MMT-005: New Order creation stabilization

**Priority 4 (Confidence & Adoption):**
- MMT-012: Global notification system
- MMT-009: Lab Notebook feedback
- MMT-010: People management (add team members)
- MMT-011: ORCID OAuth flow improvements

---

**Last Updated:** 2025-11-14
**Document Version:** 1.1
