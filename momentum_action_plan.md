# Momentum Lab Management Platform - Development Action Plan

**Document Version:** 1.0  
**Date:** November 14, 2025  
**Based on User Testing Reports:** Complex Project Orchestration Test & Lab Software Usability Report

---

## Executive Summary

This action plan addresses critical bugs and missing features identified during comprehensive user testing of the Momentum lab management platform. The testing revealed significant issues across project management, task assignment, ordering, onboarding, and collaboration workflows. This document organizes fixes and improvements into five phases, prioritizing blocking issues first, then core functionality, followed by user experience enhancements and advanced features.

**Key Statistics:**
- 26 distinct bugs identified
- 29 feature requests/improvements proposed
- 4 critical blockers preventing basic workflows
- 2 user testing scenarios (10-person simulation partially completed)

---

## Phase 1: Critical Bug Fixes (Priority: BLOCKER)

**Timeline:** Sprint 1-2 (2-3 weeks)  
**Goal:** Fix bugs that prevent basic system functionality

### 1.1 Project & Work Package Core Issues

#### Bug #1: Project Names Not Persisting
**Severity:** Critical  
**Description:** When creating a Master Project with custom name, grant number, funder, budget, and dates, the system ignores the custom name and displays generic "New Project X" entries instead.

**Steps to Reproduce:**
1. Click "New Project" and choose "Master Project"
2. Enter custom project name (e.g., "Cancer Genomics Integration Project")
3. Fill grant number, funder, budget, dates
4. Click "Create Master"
5. Project list shows "New Project 14" instead of custom name

**Acceptance Criteria:**
- Custom project name appears in project list immediately after creation
- All metadata (grant number, funder, budget, dates) is saved and retrievable
- Project name persists across sessions and page refreshes

**Source:** Test Document 1, Section 2.1

---

#### Bug #2: Work Package Creation Always Fails
**Severity:** Critical  
**Description:** Creating work packages under any project always triggers alert "Failed to create workpackage. Please try again." regardless of input validity.

**Steps to Reproduce:**
1. Select a project
2. Click "Add Workpackage" button
3. Enter work package name (e.g., "WP1: Sample Preparation & RNA Extraction")
4. Enter valid start and end dates
5. Click "Create Workpackage"
6. Error alert appears

**Acceptance Criteria:**
- Work packages create successfully with valid input
- Created work packages appear under parent project
- Start/end dates and descriptions are saved
- Provide specific error messages if creation fails (e.g., "Invalid date range", "Duplicate name")

**Source:** Test Document 1, Section 2.1

---

### 1.2 Task Assignment System

#### Bug #3: Assignee Dropdown Empty (Only "Unassigned" Available)
**Severity:** Critical  
**Description:** Task editing modal's assignee dropdown only shows "Unassigned" option. No lab members appear for selection, making task assignment impossible.

**Steps to Reproduce:**
1. Create or edit a task
2. Open task editing modal
3. Click "Assignee" dropdown
4. Only "Unassigned" option visible

**Root Cause Investigation Needed:**
- Are lab members being loaded from database?
- Is there a query/API endpoint failure?
- Are permissions preventing member visibility?

**Acceptance Criteria:**
- Assignee dropdown populates with all lab members
- Members display with name and role (e.g., "Dr. Obi-Wan Kenobi (PI)")
- Selecting an assignee saves correctly
- Assigned tasks appear in assignee's personal view

**Source:** Test Document 1, Section 2.2

---

#### Bug #4: Linked Project Dropdown Empty
**Severity:** Critical  
**Description:** The "Linked Project" dropdown in task modal always shows "None" with no project entries available for selection.

**Steps to Reproduce:**
1. Open task editing modal
2. Attempt to select "Linked Project"
3. Dropdown contains no projects

**Acceptance Criteria:**
- Linked Project dropdown shows all available projects
- After linking, task contributes to project progress tracking
- Projects display with name and work package hierarchy

**Source:** Test Document 1, Section 2.2

---

### 1.3 Kanban Board Functionality

#### Bug #5: Drag-and-Drop Non-Functional
**Severity:** Critical  
**Description:** Task cards cannot be moved between columns (To Do → Working On It → Done). Cards snap back to original position after drag attempt.

**Steps to Reproduce:**
1. Navigate to Day-to-Day board
2. Drag a task card from "To Do" column
3. Drop onto "Working On It" column
4. Card returns to "To Do"

**Acceptance Criteria:**
- Task cards move between columns with drag-and-drop
- Status updates persist after drop
- Column counts update in real-time
- Changes sync across all users viewing the board

**Source:** Test Document 1, Section 2.2

---

### 1.4 Orders & Funding System

#### Bug #6: Funding Account Dropdown Empty
**Severity:** Critical  
**Description:** Order creation modal's "Funding Account" dropdown contains no options, preventing order creation. Alert "Please select a funding account" appears when attempting to submit.

**Steps to Reproduce:**
1. Click "New Order"
2. Fill product name, catalog number, supplier, price
3. Attempt to select funding account
4. Dropdown is empty
5. Cannot create order

**Root Cause Investigation Needed:**
- Are funding accounts being created during lab setup?
- Is there a default account creation process?
- Are accounts properly associated with users/labs?

**Acceptance Criteria:**
- Funding account dropdown shows available accounts (BCR, CLuB, etc.)
- New accounts can be created by PIs/admins
- Accounts display remaining budget
- Order creation works when account selected

**Source:** Test Document 1, Section 2.3

---

### 1.5 Onboarding Critical Issues

#### Bug #7: Lab Creation Fails with Generic Error
**Severity:** Critical  
**Description:** During onboarding, attempting to create a new lab sometimes returns "Failed to create lab" error without details. Later, duplicate labs appear, suggesting creation eventually succeeded but wasn't acknowledged.

**Steps to Reproduce:**
1. Start onboarding process
2. Reach lab selection/creation step
3. Choose "Create new lab"
4. Enter lab name (e.g., "Republic Research")
5. Submit creation
6. Generic error appears
7. Later in workflow, lab appears multiple times

**Acceptance Criteria:**
- Lab creation succeeds consistently or provides specific error details
- No duplicate labs appear
- Immediate confirmation when lab is created
- Retry mechanism if creation fails

**Source:** Test Document 2, Phase 2

---

#### Bug #8: Non-PI Users Incorrectly Labeled as PIs
**Severity:** High  
**Description:** All non-PI users (postdocs, students, research scientists) have their profile "Reports To" field set to "None (I'm a PI)" even when they selected "No" to "Are you a PI?" during onboarding.

**Affected Roles:**
- Ahsoka Tano (Postdoc)
- Grogu (PhD Student)
- Padmé Amidala (Research Scientist)
- Darth Vader (Lab Manager)

**Acceptance Criteria:**
- Non-PI users have "Reports To" field correctly populated
- Field should show supervisor's name (e.g., "Reports To: Dr. Obi-Wan Kenobi")
- PI status stored correctly in database
- User permissions reflect actual role, not mislabeled PI status

**Source:** Test Document 2, Phase 2

---

### 1.6 Calendar System

#### Bug #9: New Event Button Unresponsive
**Severity:** High  
**Description:** Calendar's "New Event" button has no effect when clicked, preventing creation of meetings, milestones, or experiment schedules.

**Steps to Reproduce:**
1. Navigate to Calendar page
2. Click "New Event" button
3. Nothing happens

**Acceptance Criteria:**
- "New Event" button opens event creation modal
- Events can be created with title, date/time, participants
- Events appear on calendar after creation
- Events can be linked to projects/tasks

**Source:** Test Document 1, Section 2.5

---

## Phase 2: Core Functionality Implementation (Priority: HIGH)

**Timeline:** Sprint 3-5 (3-4 weeks)  
**Goal:** Implement missing core features required for basic collaborative workflows

### 2.1 Task Management Features

#### Feature #1: Sub-Tasks / To-Do Lists
**Description:** Add support for nested sub-tasks or checklist items within main tasks.

**Requirements:**
- Add "Sub-tasks" or "Checklist" section to task editing modal
- Sub-tasks should have:
  - Title/description
  - Completion checkbox
  - Optional due date
  - Optional assignee (can differ from parent task)
- Sub-tasks appear in assignee's day-to-day view
- Parent task shows completion percentage based on sub-task status
- Allow reordering sub-tasks via drag-and-drop

**Acceptance Criteria:**
- Users can add unlimited sub-tasks to any task
- Checking off sub-tasks updates parent task progress
- Sub-tasks persist across sessions
- Deletion of parent task prompts confirmation and cascades to sub-tasks

**Source:** Test Document 1, Section 2.2, Bug #12

---

#### Feature #2: Task Reordering Within Columns
**Description:** Allow users to manually reorder task cards within the same column to prioritize work.

**Requirements:**
- Drag-and-drop within same column changes task order
- Order persists across sessions and for all users
- Optional: Add priority field (High/Medium/Low) that affects default ordering

**Acceptance Criteria:**
- Tasks can be dragged up/down within a column
- Order is saved and consistent across users
- No performance degradation with 50+ tasks in a column

**Source:** Test Document 1, Section 3, Bug #19

---

#### Feature #3: Task Delayed Rendering Fix
**Description:** Newly created tasks sometimes fail to appear until page refresh.

**Requirements:**
- Implement real-time task rendering after creation
- Use WebSocket or polling for task list updates
- Show loading indicators during creation
- Provide success notification when task is created

**Acceptance Criteria:**
- Tasks appear immediately after creation without refresh
- Other users see new tasks within 2 seconds
- Failed task creation shows clear error message

**Source:** Test Document 1, Section 3, Bug #24

---

### 2.2 Project Infrastructure

#### Feature #4: Project Details Page
**Description:** Create dedicated details page for projects showing work packages, tasks, progress metrics, and team members.

**Requirements:**
- Accessible via right-click on project → "Open details" or clicking project name
- Display sections:
  - Project metadata (name, grant, budget, dates, funder)
  - Work packages with progress bars
  - Tasks organized by work package and status
  - Team members assigned to project
  - Budget spent vs. remaining
  - Timeline/Gantt view (optional Phase 3 enhancement)
- Edit button for PIs to modify project details

**Acceptance Criteria:**
- Project details page loads in <2 seconds
- All data is current and synchronized with task board
- Progress bars accurately reflect work package completion
- Non-PI users can view but not edit (unless granted permission)

**Source:** Test Document 1, Section 3, Bug #20

---

#### Feature #5: Work Package Management
**Description:** After fixing work package creation bug, add management capabilities.

**Requirements:**
- Edit work package name, dates, description
- Delete work packages (with confirmation and orphaned task handling)
- Assign work package lead/coordinator
- View all tasks within a work package
- Track work package progress (percentage complete)

**Acceptance Criteria:**
- Work packages can be edited inline or via modal
- Deleting work package prompts user to reassign or delete associated tasks
- Work package lead receives notifications about task updates
- Progress calculation includes all tasks (including sub-tasks)

**Source:** Test Document 1, Section 3, Bug #20

---

### 2.3 Ordering & Inventory System

#### Feature #6: Functional Order Management
**Description:** Complete implementation of order creation, status tracking, and budget integration.

**Requirements:**
- After fixing funding account dropdown (Bug #6):
  - Orders can be created with all required fields
  - Drag-and-drop between order status columns works
  - Order status can be edited via modal
- Order fields:
  - Product name, catalog number, supplier
  - Quantity, unit price, currency, total cost
  - Funding account (auto-populates available accounts)
  - Requester (auto-fills with current user)
  - Approver (defaults to PI, can be changed)
  - Notes/justification
  - Link to project/task (optional)

**Acceptance Criteria:**
- Orders move between "To Order", "Ordered", "Received" columns via drag-and-drop
- Order creation deducts cost from selected funding account
- Pending orders require approver action (approve/deny)
- Order history is searchable and exportable

**Source:** Test Document 1, Section 2.3

---

#### Feature #7: Budget Integration & Personal Ledger
**Description:** Implement personal ledger system for budget tracking and financial transparency.

**Requirements:**
- Each funding account has:
  - Total budget
  - Available balance
  - Committed funds (orders placed but not received)
  - Spent funds (received orders)
- Order creation/approval flow:
  1. User creates order, selects funding account
  2. System checks if sufficient funds available
  3. PI/approver receives notification
  4. On approval, cost moves from available → committed
  5. When order marked "Received", cost moves to spent
- Personal ledger shows:
  - User's transaction history
  - Orders they've requested
  - Budget allocations (if PI assigned them discretionary funds)

**Acceptance Criteria:**
- Budget calculations are accurate and real-time
- Users cannot overspend allocated budgets (system blocks or requires override)
- PIs can allocate sub-budgets to team members
- Financial reports exportable to CSV/Excel

**Source:** Test Document 1, Section 4, Features #10-11

---

### 2.4 Onboarding Improvements

#### Feature #8: Supervisor Assignment During Onboarding
**Description:** Add step to onboarding for non-PI users to select their supervisor/PI.

**Requirements:**
- After user indicates they are not a PI:
  - Show list of PIs in selected lab
  - Allow selection of primary supervisor
  - Optional: Add secondary supervisor field
- Selected supervisor appears in "Reports To" field on profile
- Supervisor receives notification of new team member
- Supervisor can later view all their supervisees

**Acceptance Criteria:**
- Non-PI users can select supervisor during onboarding
- "Reports To" field correctly populated on profile
- PIs see list of team members they supervise
- Supervisory relationships can be edited later by PI or admin

**Source:** Test Document 2, Phase 2, Friction Point #3

---

#### Feature #9: Role Descriptions & Guidance
**Description:** Add informational tooltips or help text explaining each role during onboarding.

**Requirements:**
- For each role option (Postdoc, PhD Student, Research Scientist, etc.):
  - Brief description (1-2 sentences)
  - Typical responsibilities
  - Default permissions (can create projects, approve orders, etc.)
- Display via tooltip on hover or expandable section
- Link to full documentation for detailed permission matrix

**Acceptance Criteria:**
- Role descriptions are clear and accurate
- Users can make informed role selection
- Help text doesn't clutter interface (collapsible/tooltip)

**Source:** Test Document 2, Phase 2, Friction Point #4

---

### 2.5 Equipment & Inventory (Previous Known Issues)

#### Bug #10: Add Device Auto-Creates Placeholder
**Description:** "Add Device" button automatically creates placeholder device card without user confirmation.

**Requirements:**
- Change "Add Device" to open modal for device details entry
- User enters device name, type, location, maintenance schedule
- Device only created after user confirms/submits

**Acceptance Criteria:**
- No devices created until user submits form
- Device list remains clean without unwanted placeholders
- Device creation provides confirmation message

**Source:** Test Document 1, Section 2.4

---

#### Bug #11: Order Missing/Reorder Buttons Non-Functional
**Description:** "Order Missing" and "Reorder" buttons on device/inventory cards have no effect.

**Requirements:**
- "Order Missing" button opens order creation modal with device-related supplies pre-filled
- "Reorder" button duplicates previous order for the device
- Both buttons provide feedback (loading state, success message)

**Acceptance Criteria:**
- Buttons trigger expected actions
- Order creation modal pre-populates relevant fields
- User can modify pre-filled order before submitting

**Source:** Test Document 1, Section 2.4

---

## Phase 3: User Experience Enhancements (Priority: MEDIUM)

**Timeline:** Sprint 6-8 (3-4 weeks)  
**Goal:** Improve usability, navigation, and user satisfaction

### 3.1 Interface & Navigation

#### Enhancement #1: Fix Modal Scrolling & Hidden Buttons
**Description:** Several modals require scrolling to reveal action buttons, causing user confusion.

**Affected Modals:**
- Create Master Project modal
- Task editing modal (when many sub-tasks)
- Order creation modal

**Requirements:**
- Implement sticky footer for modal action buttons
- Buttons remain visible at bottom of viewport
- Scrollable content area clearly indicated
- Keyboard shortcuts for submit (Enter) and cancel (Escape)

**Acceptance Criteria:**
- Action buttons always visible regardless of content length
- Scrolling works smoothly on all browsers
- Mobile responsive behavior maintained

**Source:** Test Document 1, Section 3, Bug #25

---

#### Enhancement #2: Real-Time Feedback & Loading States
**Description:** Add visual feedback for all async operations to improve perceived performance.

**Requirements:**
- Show loading spinners for:
  - Task creation/update
  - Order submission
  - Project creation
  - Work package creation
- Toast notifications for:
  - Successful operations ("Task created successfully")
  - Errors with actionable messages
  - Long-running operations ("Processing order, please wait...")
- Disable buttons during submission to prevent double-clicks
- Progress bars for bulk operations (batch task creation)

**Acceptance Criteria:**
- Users always know when system is processing
- No confusion about whether action succeeded
- Loading states resolve within 5 seconds or show progress

**Source:** Test Document 1, Section 4, Feature #25

---

#### Enhancement #3: Navigation State Persistence
**Description:** Navigating between sections unexpectedly resets forms and loses user input.

**Requirements:**
- Implement form state preservation:
  - Draft tasks saved to local storage
  - Warn user before navigating away from unsaved form
  - "Resume draft" option on return
- Browser back button works intuitively
- Tab/section changes don't reset filters or scroll position

**Acceptance Criteria:**
- No data loss when navigating between pages
- Confirmation dialog before discarding unsaved changes
- Form state survives accidental page refresh

**Source:** Test Document 1, Section 3, Bug #26

---

#### Enhancement #4: Tooltips & Contextual Help
**Description:** Add inline help to reduce learning curve for new users.

**Requirements:**
- Tooltip system for:
  - Unfamiliar buttons/icons
  - Field requirements (e.g., "Budget in Euros")
  - Feature explanations (e.g., "Work packages organize tasks into phases")
- Help icon (?) next to complex features that opens popover
- Link to full documentation in help popover
- Tooltips dismissible and don't appear after user becomes familiar (track in user settings)

**Acceptance Criteria:**
- Tooltips available for all non-obvious features
- Help content accurate and concise (1-2 sentences)
- Doesn't clutter interface for experienced users

**Source:** Test Document 1, Section 4, Feature #27

---

#### Enhancement #5: Streamline Onboarding Wizard
**Description:** Reduce onboarding fatigue by shortening wizard and deferring non-critical steps.

**Requirements:**
- Core onboarding (required):
  1. Organization/Institute/Lab selection
  2. Personal details
  3. Role selection
  4. Supervisor assignment (if not PI)
  5. Complete
- Deferred steps (post-login):
  - ORCID verification (prompt after first login)
  - Project creation (accessible from main dashboard)
  - Profile picture upload
- Progress indicator showing X of Y steps
- Allow "Save and finish later" at any step

**Acceptance Criteria:**
- Onboarding completable in <5 minutes for core path
- Users can access system after minimal setup
- Deferred tasks appear as reminders in dashboard
- Completion rate increases compared to current 10-step wizard

**Source:** Test Document 2, Phase 2, Friction Point #5

---

### 3.2 Collaboration & Communication

#### Enhancement #6: Comment Threads on Tasks & Projects
**Description:** Add discussion capability to tasks, work packages, and orders for asynchronous collaboration.

**Requirements:**
- Comment section at bottom of task/project detail view
- Features:
  - Rich text editor (bold, italic, lists, links)
  - @-mention team members (sends notification)
  - Attach files/images
  - Edit/delete own comments
  - Threaded replies (optional)
  - Timestamp and author for each comment
- Comments visible to all project members
- Email digest option for comment notifications

**Acceptance Criteria:**
- Comments post in real-time without refresh
- @-mentions trigger notifications
- File attachments upload successfully (<10MB)
- Comment history preserved indefinitely

**Source:** Test Document 1, Section 4, Feature #14

---

#### Enhancement #7: Notification System
**Description:** Implement in-app and email notifications for important events.

**Notification Triggers:**
- Task assigned to you
- Task deadline approaching (24 hours before)
- Task marked complete by assignee
- Comment mentions you
- Order requires your approval
- Calendar event starting soon (15 min warning)
- Project milestone reached

**Requirements:**
- Notification center icon in top navbar (bell icon with badge)
- Dropdown showing recent notifications (last 20)
- Mark as read/unread
- Link directly to relevant item
- User settings for notification preferences (email on/off per type)
- Daily digest email option

**Acceptance Criteria:**
- Notifications appear within 5 seconds of trigger
- No duplicate notifications
- Email notifications respect user preferences
- Notification history searchable

**Source:** Test Document 1, Section 4, Features #15-16

---

### 3.3 Personal Dashboards

#### Enhancement #8: User-Specific Dashboard
**Description:** Create personal landing page showing user's tasks, deadlines, and relevant updates.

**Dashboard Sections:**
- My Tasks (grouped by status, filtered to current user)
- Upcoming Deadlines (next 7 days)
- Orders I've Requested (pending approval or delivery)
- Equipment Bookings (upcoming reservations)
- Recent Activity (tasks completed, comments received)
- Quick Actions (Create Task, New Order, Book Equipment)

**Requirements:**
- Loads as default page after login
- Data updates in real-time
- Filterable/sortable sections
- Customizable layout (drag-and-drop sections)
- Export task list to CSV

**Acceptance Criteria:**
- Dashboard loads in <2 seconds
- Shows only user's assigned items
- "Jump to" links navigate to full task/order details
- Mobile-responsive design

**Source:** Test Document 1, Section 4, Feature #23

---

## Phase 4: Advanced Features & PI Tools (Priority: MEDIUM-LOW)

**Timeline:** Sprint 9-12 (4-6 weeks)  
**Goal:** Add sophisticated management, collaboration, and knowledge-sharing features

### 4.1 PI Dashboard & Lab Management

#### Feature #10: Comprehensive PI Dashboard
**Description:** Create specialized dashboard for PIs and lab managers to oversee team and resources.

**Dashboard Components:**

**Pending Orders Section:**
- List of purchase requests awaiting approval
- Quick approve/deny buttons with reason field
- Sort by amount, requestor, date
- Total pending spend displayed

**Budget Tracker:**
- Visual chart (pie/bar) of budget allocation
- Available funds vs. committed vs. spent
- Breakdown by funding source
- Alerts when budget <10% remaining
- Projection based on current burn rate

**Instrument Schedule Snapshot:**
- Next 7 days of equipment bookings
- Conflict detection (overlapping bookings)
- Quick-add booking capability
- Link to full calendar view

**Task Progress Overview:**
- List of active projects with completion percentage
- Overdue tasks by team member
- Bottlenecks (tasks blocked or waiting long time)
- Team velocity (tasks completed per week)

**Alerts & Notifications Center:**
- Unread messages/comments
- Expiring reagents (if inventory tracking added)
- Equipment maintenance due
- Team member certifications expiring
- Grant deadlines approaching

**Acceptance Criteria:**
- Dashboard loads in <3 seconds with 100+ tasks
- All data real-time synchronized
- Export capability for budget/task reports
- Customizable layout (PI can rearrange sections)
- Mobile-accessible for quick approvals

**Source:** Test Document 2, Phase 5, Proposal #1

---

### 4.2 Skills & Knowledge Management

#### Feature #11: Skills & Certifications System
**Description:** Track team member competencies for equipment and techniques.

**Requirements:**

**Skill Registry:**
- Predefined skills library (PCR, Western Blot, Mass Spectrometry, etc.)
- Custom skills can be added by PI
- Proficiency levels: Trainee, Competent, Expert, Trainer

**Certification Workflow:**
- PI assigns training task to user for specific equipment
- User completes training checklist
- Trainer (expert user) validates competency
- System issues certification
- Certifications have expiration dates (e.g., annual recertification)

**Equipment Access Control:**
- Equipment bookable only by certified users
- System blocks booking if user not certified
- "Request training" button for uncertified users

**Skill Discovery:**
- Lab members can search "Who knows X?"
- Skill-based filtering for task assignment
- Expertise badges on user profiles

**Acceptance Criteria:**
- Skills database comprehensive for typical lab techniques
- Certification workflow tracked and auditable
- Equipment booking respects certification requirements
- Users can request training from experts in-app

**Source:** Test Document 2, Phase 5, Proposal #2

---

#### Feature #12: Protocols Database
**Description:** Centralized repository for standard operating procedures and experimental protocols.

**Requirements:**

**Protocol Features:**
- Rich text editor with sections:
  - Title & purpose
  - Required equipment & reagents
  - Step-by-step instructions (numbered)
  - Safety notes & warnings
  - Expected results & troubleshooting
  - References
- Attach files (PDFs, images, data sheets)
- Tag with categories (Molecular Biology, Cell Culture, etc.)
- Estimate time required
- Difficulty level (Beginner, Intermediate, Advanced)

**Version Control:**
- Track protocol versions with change log
- Compare versions side-by-side
- Revert to previous version
- Fork protocol to create variant

**Permissions & Sharing:**
- Private (visible only to creator)
- Lab-only (visible to lab members)
- Institute-wide (visible across institute)
- Public (if enabled by admin)
- Transfer ownership (e.g., when student graduates)

**Collaboration:**
- Comments on protocols (annotations, expert tips)
- "Favorite" protocols for quick access
- Link protocols to tasks/experiments
- Usage analytics (views, successful completions)

**Acceptance Criteria:**
- Protocol creation intuitive with template
- Version history preserved indefinitely
- Search by tag, equipment, or keyword
- Protocols exportable to PDF with formatting preserved
- Commenting/annotation doesn't alter original protocol

**Source:** Test Document 2, Phase 5, Proposal #2

---

### 4.3 Enhanced Collaboration Tools

#### Feature #13: Lab Notebook Integration
**Description:** Expand existing notebook with project/task linkage and team collaboration.

**Current State:** Lab Notebook supports creating experiments and text cells but lacks integration.

**Enhancements:**
- Link notebook entries to tasks or projects
- Rich content support:
  - Markdown formatting
  - Embedded images & data visualizations
  - Attachments (up to 50MB per entry)
  - LaTeX for equations
- Collaborative editing:
  - Multiple users can contribute to shared notebook
  - Track who added each entry (author attribution)
  - Edit history & revision tracking
- Templates for common experiment types
- Export notebook or sections to PDF
- Generate lab reports from notebook entries

**Acceptance Criteria:**
- Notebooks load quickly even with 100+ entries
- Real-time collaborative editing without conflicts
- Linked tasks/projects navigable from notebook
- Search works across all notebook content
- Reports generate professional-quality output

**Source:** Test Document 2, Phase 5, Proposal #3

---

#### Feature #14: Integrated Chat/Discussion System
**Description:** Add lightweight messaging for quick team communication without leaving platform.

**Requirements:**
- Project-level chat channels (one per project)
- Lab-wide general channel
- Direct messages between users
- Features:
  - Real-time messaging (WebSocket)
  - @-mentions with notifications
  - File sharing in chat
  - Message search
  - Read receipts (optional)
  - Typing indicators
- Integration:
  - Link messages to tasks ("Convert to task" button)
  - Pin important messages
  - Archive old channels

**Acceptance Criteria:**
- Messages appear instantly (<1 second)
- Chat doesn't interfere with primary workflows
- Mobile-friendly interface
- Message history preserved
- Optional: Slack/Teams integration via webhook

**Source:** Test Document 2, Phase 5, Proposal #3

---

#### Feature #15: Role-Based Permissions System
**Description:** Implement granular permissions so PIs can customize who can perform which actions.

**Permission Dimensions:**
- **Projects:** View, Edit, Create, Delete
- **Tasks:** View All, View Assigned, Create, Edit, Delete
- **Orders:** Request, Approve, View All, View Own
- **Budget:** View, Edit Allocations, Create Accounts
- **Equipment:** Book, Manage, View Schedule
- **People:** View Lab, Invite, Edit Roles, Remove

**Role Templates:**
- PI (full permissions)
- Postdoc (most permissions except financial)
- PhD Student (limited permissions, needs approval for orders)
- Lab Manager (administrative permissions)
- Visiting Researcher (read-only or restricted)
- Custom roles (PI defines)

**Requirements:**
- PI can customize role templates for their lab
- Per-user permission overrides
- Permission changes take effect immediately
- Audit log of permission changes

**Acceptance Criteria:**
- Permissions enforced on both frontend and backend
- Unauthorized actions blocked with clear message
- PI can quickly adjust permissions for new team members
- No privilege escalation vulnerabilities

**Source:** Test Document 2, Phase 5, Proposal #3

---

### 4.4 Calendar & Scheduling Enhancements

#### Feature #16: Advanced Calendar Features
**Description:** After fixing Bug #9 (New Event button), add collaborative scheduling capabilities.

**Requirements:**

**Event Types:**
- Meetings (with participants, location/Zoom link, agenda)
- Milestones (project deadlines, grant submissions)
- Equipment bookings (linked to specific instruments)
- Experiments (linked to protocols and tasks)
- External events (conferences, seminars)

**Features:**
- Drag-and-drop event rescheduling
- Recurring events (daily, weekly, monthly)
- Participant availability checking
- Send calendar invites (.ics files via email)
- Conflict detection (overlapping bookings)
- Resource booking (rooms, equipment, core facilities)
- Time zone support for remote teams

**Task Integration:**
- Tasks with due dates appear on calendar
- Color-coding by project or priority
- Filter calendar by person, project, or resource

**Acceptance Criteria:**
- Calendar syncs across all team members instantly
- Equipment bookings respect certification requirements
- Conflicts flagged before event creation
- Export to iCal/Google Calendar supported

**Source:** Test Document 1, Section 4, Features #20-21

---

### 4.5 Privacy & Data Management

#### Feature #17: Privacy & Data Siloing Verification
**Description:** Ensure complete data isolation between labs and implement privacy controls.

**Requirements:**

**Data Siloing:**
- Projects, tasks, orders, notebooks scoped to lab
- Users from Lab A cannot see Lab B's data in any view
- Search results limited to user's lab
- Institute-level sharing requires explicit permission

**Audit System:**
- PI can view access logs:
  - Who viewed which projects/orders
  - When data was exported
  - Permission changes
- Compliance reports for data protection regulations

**User Controls:**
- Profile privacy settings (visible to lab, institute, or private)
- Opt-out of cross-institute features
- Data export (download my data)
- Account deletion (with data anonymization option)

**Testing Requirements:**
- Security penetration testing
- Attempt cross-lab data access from unauthorized accounts
- Verify API endpoints enforce lab scoping
- Check that search cannot leak data across boundaries

**Acceptance Criteria:**
- Zero unauthorized data access incidents
- Explicit messaging when search is scoped (e.g., "Results limited to your lab")
- PI can generate compliance reports
- Data export completes within 48 hours

**Source:** Test Document 2, Phase 4

---

#### Feature #18: Explicit Silo Boundaries in UI
**Description:** Make data scoping transparent to users to educate them about privacy.

**Requirements:**
- When search returns no results, display:
  - "No results found in [Your Lab Name]"
  - Option to "Search across institute" (if enabled)
- Scoping indicator in navigation (e.g., breadcrumb showing "Jedi Academy > Institute for Luminous Studies > Jedi Lab")
- Color-coding or icons for data visibility:
  - 🔒 Private (only you)
  - 👥 Lab (your lab members)
  - 🏛️ Institute (your institute)
  - 🌐 Public (if applicable)
- Warning when sharing data outside lab (confirmation dialog)

**Acceptance Criteria:**
- Users understand their data's visibility scope
- No confusion about why certain data isn't visible
- Privacy boundaries clear without being obtrusive

**Source:** Test Document 2, Phase 4, Suggestions

---

## Phase 5: Testing, Optimization & Documentation (Priority: ALL PHASES)

**Timeline:** Continuous throughout all sprints  
**Goal:** Ensure quality, performance, and usability of all implemented features

### 5.1 Testing Strategy

#### Test Plan #1: Automated Testing
**Requirements:**
- Unit tests for all business logic (target 80% coverage)
- Integration tests for API endpoints
- End-to-end tests for critical workflows:
  - User registration & onboarding
  - Project creation → Work package → Task → Completion
  - Order creation → Approval → Marking received
  - Equipment booking with certification check
- Visual regression testing for UI components
- Performance testing (load times, concurrent users)

**Acceptance Criteria:**
- CI/CD pipeline runs tests on every commit
- No merges to production with failing tests
- Critical path E2E tests complete in <10 minutes
- Performance budgets met (page loads <3 seconds)

---

#### Test Plan #2: Multi-User Scenario Testing
**Description:** Recreate testing scenarios from user reports with multiple simultaneous users.

**Scenarios:**
1. **Complex Project Orchestration:**
   - PI creates project with 3 work packages
   - Assigns tasks to 4 lab members
   - Lab members update task status
   - Orders are created and approved
   - Verify all data persists and syncs

2. **Onboarding Simulation:**
   - Create 10 users across 3 labs
   - Verify hierarchies correct (org → institute → lab)
   - Check reporting relationships
   - Attempt cross-lab data access (should fail)

3. **Collaboration Workflow:**
   - Create shared project
   - Multiple users comment on tasks
   - Users book overlapping equipment slots (should block)
   - Generate report with contributions from all users

**Acceptance Criteria:**
- All scenarios complete without errors
- Data consistency maintained across concurrent operations
- No race conditions or data loss
- Performance acceptable with 10+ simultaneous users

**Source:** Test Document 1 & 2 scenario designs

---

### 5.2 Performance Optimization

#### Optimization #1: Database Query Optimization
**Focus Areas:**
- Project/task queries (often querying large related data sets)
- User authentication & authorization checks
- Calendar event lookups (recurring events especially)
- Search functionality across notebooks/protocols

**Actions:**
- Add database indexes on frequently queried fields
- Implement query result caching (Redis)
- Paginate large result sets (tasks, orders, etc.)
- Use database connection pooling
- Profile slow queries and refactor

**Acceptance Criteria:**
- 95th percentile query time <200ms
- No N+1 query problems
- Dashboard loads <2 seconds with 500+ tasks in system

---

#### Optimization #2: Frontend Performance
**Focus Areas:**
- Large Kanban boards (50+ tasks per column)
- Calendar rendering (many events)
- Notebook with embedded images
- Real-time updates (WebSocket efficiency)

**Actions:**
- Implement virtual scrolling for long lists
- Lazy load images and attachments
- Debounce search inputs
- Use React.memo/useMemo for expensive components
- Code splitting for rarely-used features
- Compress assets (images, JS bundles)

**Acceptance Criteria:**
- Time to interactive <3 seconds on 3G connection
- 60 FPS scroll performance on boards
- Lighthouse score >90 for performance

---

### 5.3 Documentation & Training

#### Documentation #1: User Documentation
**Required Materials:**
- Getting Started Guide (5-minute quickstart)
- User Manual sections:
  - Onboarding & Profile Setup
  - Creating Projects & Work Packages
  - Task Management & Collaboration
  - Ordering & Budget Tracking
  - Equipment Booking & Certifications
  - Lab Notebook Best Practices
  - Protocols Database Usage
- Video tutorials (3-5 minutes each)
- FAQ section (common issues and solutions)
- Searchable help center

**Acceptance Criteria:**
- Documentation covers all features
- Screenshots/videos up-to-date
- Searchable and indexed
- Available in-app via help menu

---

#### Documentation #2: API Documentation
**Required Materials:**
- API reference (all endpoints, parameters, responses)
- Authentication guide (API keys, OAuth)
- Rate limiting policies
- Webhook documentation (for integrations)
- SDK/client library documentation (if provided)
- Example code snippets

**Acceptance Criteria:**
- Generated from code (OpenAPI/Swagger)
- Interactive API explorer
- Examples in multiple languages
- Kept in sync with codebase

---

#### Documentation #3: Developer Documentation
**Required Materials:**
- Architecture overview (system design, data models)
- Setup instructions (local development environment)
- Coding standards & style guide
- Git workflow & branching strategy
- Testing guidelines
- Deployment procedures
- Troubleshooting guide (common dev issues)

**Acceptance Criteria:**
- New developer can set up environment in <1 hour
- All major systems documented with diagrams
- Code comments explain complex logic
- Regularly updated with architectural changes

---

### 5.4 Security & Compliance

#### Security #1: Security Audit
**Focus Areas:**
- Authentication & authorization mechanisms
- Data encryption (at rest and in transit)
- SQL injection & XSS vulnerabilities
- CSRF protection
- Rate limiting & DDoS protection
- Secure file upload handling
- API security (authentication, input validation)

**Actions:**
- Conduct penetration testing
- Use OWASP dependency checker
- Review all user input sanitization
- Implement security headers (CSP, HSTS, etc.)
- Regular security updates for dependencies

**Acceptance Criteria:**
- No critical vulnerabilities found
- All sensitive data encrypted
- Authentication follows OWASP best practices
- Regular security scans integrated into CI/CD

---

#### Security #2: Compliance & Privacy
**Requirements:**
- GDPR compliance (if serving EU users):
  - Data protection impact assessment
  - Privacy policy & terms of service
  - Cookie consent management
  - Right to data portability
  - Right to deletion (with anonymization)
- HIPAA compliance (if handling health data):
  - Business associate agreements
  - Audit controls
  - Access controls & authentication
- Research data management:
  - Data retention policies
  - Backup & disaster recovery
  - Archival for completed projects

**Acceptance Criteria:**
- Legal review completed
- Privacy policy published and accessible
- Compliance documentation maintained
- Regular compliance audits scheduled

---

## Implementation Strategy & Recommendations

### Sprint Planning

**Phase 1 (Sprints 1-2):** Focus on critical bugs. All hands on deck to fix blockers. Daily standups to track progress. QA testing after each bug fix.

**Phase 2 (Sprints 3-5):** Implement core features. Assign feature leads. Weekly demos to stakeholders. Begin writing automated tests for new features.

**Phase 3 (Sprints 6-8):** UX enhancements. Gather user feedback continuously. Conduct usability testing sessions. Iterate based on feedback.

**Phase 4 (Sprints 9-12):** Advanced features. These are lower priority; implement based on user demand. Can be done in parallel with Phase 3 for different teams.

**Phase 5 (Continuous):** Testing, docs, security throughout all phases. Dedicated QA resource. Weekly security reviews.

---

### Resource Allocation

**Recommended Team Structure:**
- **Backend developers (2-3):** Focus on API, database, business logic
- **Frontend developers (2-3):** UI components, state management, performance
- **Full-stack developer (1):** Bridge backend/frontend, handle integration
- **QA engineer (1):** Write tests, conduct manual testing, regression testing
- **UX designer (0.5 FTE):** Interface mockups, usability testing, design system
- **Technical writer (0.5 FTE):** Documentation, help content, tutorials
- **Product manager (1):** Prioritization, stakeholder communication, roadmap

---

### Success Metrics

**Phase 1 Completion:**
- Zero critical bugs remaining
- All core workflows functional
- User can complete end-to-end project creation → task assignment → order approval

**Phase 2 Completion:**
- 90% of originally identified features implemented
- Multi-user collaboration works seamlessly
- 5 active labs using platform in beta

**Phase 3 Completion:**
- User satisfaction score >4/5
- <5% user-reported confusion/friction issues
- Onboarding completion rate >85%

**Phase 4 Completion:**
- PI adoption of advanced features >50%
- Protocols database has >20 protocols per lab
- Skills tracking used for >75% of equipment

**Ongoing:**
- Page load times <3 seconds (95th percentile)
- System uptime >99.5%
- Security incidents: 0
- User growth month-over-month >10%

---

## Priority Summary Matrix

| Priority | Phase | Features | Timeline |
|----------|-------|----------|----------|
| **P0 - Blocker** | Phase 1 | Bugs #1-9 | Weeks 1-3 |
| **P1 - Critical** | Phase 2 | Features #1-9 | Weeks 4-7 |
| **P2 - Important** | Phase 3 | Enhancements #1-8 | Weeks 8-11 |
| **P3 - Nice to Have** | Phase 4 | Features #10-18 | Weeks 12-18 |
| **P4 - Continuous** | Phase 5 | Testing, Docs, Security | Ongoing |

---

## Next Steps

1. **Immediate (This Week):**
   - Development team reviews this action plan
   - Assign bug fix owners for Phase 1
   - Set up project tracking (Jira, Linear, etc.)
   - Create Git branches for each phase

2. **Sprint 1 Kickoff:**
   - Daily standups at 9:30 AM
   - Fix bugs #1-4 (project/task critical issues)
   - QA testing environment setup
   - Begin writing E2E tests

3. **Stakeholder Communication:**
   - Share this plan with leadership
   - Schedule weekly demo on Fridays
   - Create public roadmap for user transparency
   - Set up feedback channels (Discord, email, in-app)

4. **Risk Management:**
   - Identify dependencies between features
   - Create mitigation plans for technical risks
   - Budget buffer time for unknowns (20% contingency)
   - Establish rollback procedures for production

---

## Appendix: Reference Documents

- **Test Document 1:** "Complex Project Orchestration Test – Momentum Web App (2025-11-14)"
- **Test Document 2:** "Lab Software Usability Report" (Onboarding & Multi-User Simulation)

For questions about this action plan, contact the product management team.

---

**Document Prepared By:** Software Development Team  
**Last Updated:** November 14, 2025  
**Next Review:** End of Sprint 2
