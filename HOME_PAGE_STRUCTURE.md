# Home Page Structure & Component Organization

This document provides a detailed breakdown of the home page structure, navigation system, and all components to help plan reorganization.

## Table of Contents
- [Home Page Layout](#home-page-layout)
- [Navigation System](#navigation-system)
- [Component Breakdown by View](#component-breakdown-by-view)
- [Component File Locations](#component-file-locations)

---

## Home Page Layout

**File:** `app/page.tsx`

### Structure Overview

```
Home Page (app/page.tsx)
├── Header Section (sticky top-0)
│   ├── Title: "Momentum" + subtitle
│   ├── User Info (name, position/email)
│   ├── NotificationBell component
│   └── Sign Out button
│
├── TopModuleNavigation Component
│   └── Main navigation tabs (Project, Lab, Me, Network)
│
└── Content Area (p-6)
    └── Conditional rendering based on mainView state:
        ├── projects → ProjectDashboard
        ├── people → PeopleView
        ├── daytoday → DayToDayBoard
        ├── mytasks → MyTasksView
        ├── eln → ElectronicLabNotebook
        ├── orders → OrdersInventory
        ├── equipment → EquipmentManagement
        ├── bookings → MyBookingsView
        ├── calendar → CalendarEvents
        ├── whiteboard → WhiteboardPage
        ├── funding → FundingAdmin (role-restricted)
        ├── ledger → PersonalLedger
        ├── myprofile → EnhancedProfilePage
        ├── privacy → PrivacyDashboard
        └── profiles → ProfileManagement (admin-only)
```

### Authentication States

1. **Loading State** (`!mounted`): Shows "Loading..." message
2. **Auth State** (`authState === 'auth'`): Shows `AuthPage` component + "Clear All Data" button
3. **Setup State** (`authState === 'setup'`): Shows `OnboardingFlow` component
4. **Authenticated State**: Shows main application with navigation

### Global Components

- `CookieConsentBanner` - GDPR compliance banner (rendered at bottom)
- `DataClearDialog` - Dialog for clearing all data (shown when auth state)

---

## Navigation System

**File:** `components/TopModuleNavigation.tsx`

### Navigation Categories

The navigation is organized into 4 main categories with dropdown sub-items:

#### 1. **Project** Category (Blue-Grey Theme)
- **Icon:** `LayoutDashboard`
- **Color Scheme:** `text-blue-600 bg-blue-50 border-blue-200`
- **Sub-items:**
  - `projects` → "Timeline" (Activity icon)
  - `ledger` → "My Ledger" (Wallet icon)

#### 2. **Lab** Category (Emerald Theme)
- **Icon:** `FlaskConical`
- **Color Scheme:** `text-emerald-600 bg-emerald-50 border-emerald-200`
- **Sub-items:**
  - `equipment` → "Equipment" (Wrench icon)
  - `orders` → "Orders" (Package icon)
  - `eln` → "Lab Notebook" (FileText icon)
  - `funding` → "Funding" (DollarSign icon) - **Role Restricted** (PI/Finance Admin/Lab Manager only)

#### 3. **Me** Category (Violet Theme)
- **Icon:** `CircleUser`
- **Color Scheme:** `text-violet-600 bg-violet-50 border-violet-200`
- **Sub-items:**
  - `myprofile` → "My Profile" (CircleUser icon)
  - `daytoday` → "Day to Day" (Activity icon)
  - `mytasks` → "My Tasks" (ListTodo icon)
  - `calendar` → "Calendar" (Calendar icon)
  - `bookings` → "My Bookings" (Calendar icon)
  - `privacy` → "Privacy" (Shield icon)

#### 4. **Network** Category (Slate Theme)
- **Icon:** `Share2`
- **Color Scheme:** `text-slate-700 bg-slate-100 border-slate-200`
- **Sub-items:**
  - `people` → "People" (Users icon)
  - `whiteboard` → "Whiteboard" (Presentation icon)
  - `profiles` → "All Profiles" (Users icon) - **Admin Only**

### Navigation Behavior

- Hover or click to expand dropdown menu
- Active state highlighting based on current `mainView`
- Permission-based filtering (admin-only and role-restricted items)
- Categories without visible sub-items are hidden

---

## Component Breakdown by View

### 1. Projects View (`projects`)

**Component:** `components/views/ProjectDashboard.tsx`

#### Features:
- Project grid/list view toggle
- Search and filtering (status, funding, health)
- Project creation and import dialogs
- Project health indicators
- Budget summaries
- Gantt chart integration

#### Sub-components Used:
- `ProjectCard` - Individual project display
- `ProjectCreationDialog` - Create new project
- `ProjectImportDialog` - Import projects
- `ProjectDetailPage` - Detailed project view (shown when project selected)
- `DeliverableDialog` - Create/edit deliverables
- `TaskCreationDialog` - Create tasks
- `TaskEditDialog` - Edit tasks
- `PersonalTasksWidget` - Personal tasks sidebar

#### Internal Structure:
- Tabs for different views (if applicable)
- Filter controls (search, status, funding, health)
- View mode toggle (grid/list)
- Project cards with health badges and budget info

#### State Management:
- `selectedProjectForDetail` - Currently selected project
- `showProjectDialog` - Project creation dialog visibility
- `showImportDialog` - Import dialog visibility
- `showDeliverableDialog` - Deliverable dialog visibility
- `showTaskDialog` - Task creation dialog visibility
- `showTaskEditDialog` - Task edit dialog visibility
- Filter states: `searchTerm`, `statusFilter`, `fundingFilter`, `healthFilter`
- `viewMode` - Grid or list view

---

### 2. People View (`people`)

**Component:** `components/views/PeopleView.tsx`

#### Features:
- Multiple view modes: Grid, Org Chart, Network
- ORCID integration and filtering
- Organizational hierarchy display
- Profile cards with contact info
- Network visualization

#### Sub-components Used:
- `AdvancedNetworkView` - Network graph visualization
- `PositionBadge` - Position/role badge display
- `OrcidIcon` - ORCID verification badge

#### Internal Structure:
- View mode selector (grid/orgchart/network)
- ORCID filter (all/with/without)
- Profile cards in grid view
- Hierarchical org chart view
- Network graph view

#### State Management:
- `selectedProfile` - Currently selected profile
- `viewMode` - "grid" | "orgchart" | "network"
- `orcidFilter` - "all" | "with" | "without"

#### Data Filtering:
- Filters by `labId` if `currentUserProfile` provided
- ORCID verification filtering
- Groups by Organization → Institute → Lab hierarchy

---

### 3. Day to Day Board (`daytoday`)

**Component:** `components/views/DayToDayBoard.tsx`

#### Features:
- Kanban-style board with drag-and-drop
- Task status columns: To Do, In Progress, Done
- Task importance levels (low, medium, high, critical)
- Task assignment and reassignment
- Comments section
- Lab polls panel

#### Sub-components Used:
- `CommentsSection` - Task comments
- `LabPollPanel` - Lab polling functionality
- `DroppableColumn` - Kanban column wrapper
- Drag-and-drop from `@dnd-kit`

#### Internal Structure:
- Three-column Kanban board
- Task cards with importance color coding
- Task detail dialog
- Comments tab in task dialog
- Lab polls tab

#### State Management:
- Task status management
- Drag-and-drop state
- Selected task for detail view
- Task creation/editing dialogs

#### Task Properties:
- Title, description, due date
- Status (to-do, in-progress, done)
- Importance (low, medium, high, critical)
- Assignee
- Comments

---

### 4. My Tasks View (`mytasks`)

**Component:** `components/views/MyTasksView.tsx`

#### Features:
- Unified view of tasks from multiple sources
- Combines Day-to-Day tasks and Project tasks
- Filtering by source and status
- Search functionality
- Task grouping and display

#### Sub-components Used:
- Task cards (custom rendering)
- Filter controls

#### Internal Structure:
- Search bar
- Source filter (all/daytoday/project)
- Status filter (all/active/completed/overdue)
- Task list with grouping

#### State Management:
- `searchTerm` - Search query
- `sourceFilter` - "daytoday" | "project" | "all"
- `statusFilter` - "all" | "active" | "completed" | "overdue"

#### Task Sources:
1. **Day-to-Day Tasks** - From `dayToDayTasks` filtered by assignee
2. **Project Tasks** - From projects/workpackages where user is helper or owner

---

### 5. Electronic Lab Notebook (`eln`)

**Component:** `components/views/ElectronicLabNotebook.tsx`

#### Features:
- Experiment management
- Multimodal content (text, images, files)
- Jupyter notebook integration
- Report generation
- File upload/download

#### Sub-components Used:
- `ELNJupyterCanvasV2` - Jupyter notebook canvas
- `ELNReportGenerator` - Generate reports from experiments

#### Internal Structure:
- Experiment list sidebar
- Experiment detail view
- Tabs for different content types
- File management

#### State Management:
- `selectedExperiment` - Currently selected experiment
- `isCreatingExperiment` - Creation dialog state
- `deleteConfirmId` - Confirmation for deletion

#### Experiment Structure:
- Title, description
- Master project link
- Pages array
- Items array (multimodal content)
- Reports array

---

### 6. Orders & Inventory (`orders`)

**Component:** `components/views/OrdersInventory.tsx`

#### Features:
- Order management with drag-and-drop status updates
- Inventory management
- Order reconciliation
- CSV import/export
- Equipment linking

#### Sub-components Used:
- `OrderCard` - Individual order display
- `OrderEditDialog` - Edit order details
- `OrderFormDialog` - Create new order
- `AddInventoryDialog` - Add inventory items
- `ImportInventoryDialog` - Import inventory from CSV
- `DroppableColumn` - Drag-and-drop columns

#### Internal Structure:
- Tabs: "Orders" and "Inventory"
- Orders tab: Three-column Kanban (To Order, Ordered, Received)
- Inventory tab: Inventory list with levels and equipment links

#### State Management:
- `activeTab` - "orders" | "inventory"
- `showOrderDialog` - Order creation/editing
- `showInventoryDialog` - Inventory item dialog
- `showImportDialog` - CSV import dialog
- `editingOrder` - Currently editing order
- Drag-and-drop state for order status

#### Order Statuses:
- `to-order` - Needs to be ordered
- `ordered` - Order placed
- `received` - Order received (auto-deleted after 7 days)

---

### 7. Equipment Management (`equipment`)

**Component:** `components/views/EquipmentManagement.tsx`

#### Features:
- Equipment status overview
- Booking management
- Availability timeline
- Quick booking dialog

#### Sub-components Used:
- `EquipmentStatusPanel` - Equipment status display
- `MyBookingsView` - User's bookings
- `EquipmentAvailabilityTimeline` - Timeline view of availability
- `QuickBookingDialog` - Quick booking creation
- `EnableBookingButton` - Admin booking enablement

#### Internal Structure:
- Tabs: "Status", "Bookings", "Availability"
- Status tab: Equipment list with status
- Bookings tab: User's current and past bookings
- Availability tab: Timeline view for selected equipment

#### State Management:
- `activeTab` - "status" | "bookings" | "availability"
- `showBookingDialog` - Booking dialog visibility
- `selectedEquipmentForBooking` - Equipment selected for booking
- `selectedEquipmentForTimeline` - Equipment for timeline view
- `bookingDefaults` - Pre-filled booking times

---

### 8. My Bookings (`bookings`)

**Component:** `components/equipment/MyBookingsView.tsx`

#### Features:
- View user's equipment bookings
- Booking status and details
- Booking management

#### Note:
This is a separate view from the bookings tab in Equipment Management, providing a dedicated view for user's bookings.

---

### 9. Calendar Events (`calendar`)

**Component:** `components/views/CalendarEvents.tsx`

#### Features:
- Calendar view of events
- Event creation and management
- Event details

#### Sub-components Used:
- `CalendarView` - Calendar display component
- `EventDialog` - Event creation/editing
- `CalendarEventCard` - Event card display

---

### 10. Whiteboard (`whiteboard`)

**Component:** `app/whiteboard/page.tsx`

#### Features:
- Collaborative whiteboard
- Drawing and annotation tools
- Real-time collaboration

#### Note:
This is a separate page route, not a view component in the main app structure.

---

### 11. Funding Admin (`funding`)

**Component:** `components/views/FundingAdmin.tsx`

#### Access:
- **Role Restricted:** PI, Finance Admin, or Lab Manager only

#### Features:
- Funding allocation management
- Budget tracking
- Funding source management

---

### 12. Personal Ledger (`ledger`)

**Component:** `components/PersonalLedger.tsx`

#### Features:
- Personal budget overview
- Funding allocation display
- Transaction history
- Budget progress tracking

#### Internal Structure:
- Summary cards (Total Allocated, Total Spent, Total Committed, Total Remaining)
- Allocation cards with progress bars
- Transaction history list

#### State Management:
- `transactions` - Transaction history
- `transactionsLoading` - Loading state

---

### 13. My Profile (`myprofile`)

**Component:** `components/profile/EnhancedProfilePage.tsx`

#### Features:
- User profile display and editing
- ORCID integration
- Profile information management

---

### 14. Privacy Dashboard (`privacy`)

**Component:** `components/views/PrivacyDashboard.tsx`

#### Features:
- GDPR compliance tools
- Data export
- Privacy settings
- Data deletion requests

---

### 15. Profile Management (`profiles`)

**Component:** `components/views/ProfileManagement.tsx`

#### Access:
- **Admin Only**

#### Features:
- Manage all user profiles
- Profile creation and editing
- User import functionality

#### Sub-components Used:
- `UserImportDialog` - Bulk user import

---

## Component File Locations

### Main Page
- `app/page.tsx` - Home page component

### Navigation
- `components/TopModuleNavigation.tsx` - Main navigation component

### View Components
- `components/views/ProjectDashboard.tsx`
- `components/views/PeopleView.tsx`
- `components/views/DayToDayBoard.tsx`
- `components/views/MyTasksView.tsx`
- `components/views/ElectronicLabNotebook.tsx`
- `components/views/OrdersInventory.tsx`
- `components/views/EquipmentManagement.tsx`
- `components/views/CalendarEvents.tsx`
- `components/views/FundingAdmin.tsx`
- `components/views/PrivacyDashboard.tsx`
- `components/views/ProfileManagement.tsx`
- `components/views/ProjectDetailPage.tsx`
- `components/views/CalendarView.tsx`
- `components/views/PersonalProfilePage.tsx`

### Supporting Components
- `components/PersonalLedger.tsx`
- `components/profile/EnhancedProfilePage.tsx`
- `components/equipment/MyBookingsView.tsx`
- `app/whiteboard/page.tsx`

### Sub-components (by category)

#### Project Components
- `components/projects/ProjectCard.tsx`
- `components/projects/ProjectCreationDialog.tsx`
- `components/projects/ProjectImportDialog.tsx`
- `components/projects/TaskCreationDialog.tsx`
- `components/projects/TaskEditDialog.tsx`
- `components/projects/PersonalTasksWidget.tsx`

#### Equipment Components
- `components/equipment/EquipmentAvailabilityTimeline.tsx`
- `components/equipment/QuickBookingDialog.tsx`
- `components/EquipmentStatusPanel.tsx`
- `components/EquipmentNetworkPanel.tsx`

#### Order Components
- `components/orders/OrderCard.tsx`
- `components/orders/OrderEditDialog.tsx`
- `components/orders/OrderFormDialog.tsx`

#### Dialog Components
- `components/dialogs/AddInventoryDialog.tsx`
- `components/dialogs/ImportInventoryDialog.tsx`
- `components/DeliverableDialog.tsx`
- `components/EventDialog.tsx`
- `components/ProjectCreationDialog.tsx`
- `components/DataClearDialog.tsx`
- `components/DeletionConfirmationDialog.tsx`

#### Other Components
- `components/AuthPage.tsx`
- `components/OnboardingFlow.tsx`
- `components/NotificationBell.tsx`
- `components/CookieConsentBanner.tsx`
- `components/CommentsSection.tsx`
- `components/LabPollPanel.tsx`
- `components/AdvancedNetworkView.tsx`
- `components/ELNJupyterCanvasV2.tsx`
- `components/ELNReportGenerator.tsx`
- `components/CalendarEventCard.tsx`
- `components/CalendarSettings.tsx`
- `components/CalendarConnections.tsx`

---

## Reorganization Considerations

### Current Issues/Observations:

1. **Mixed Component Locations:**
   - Some views are in `components/views/`
   - Some are in `components/` root (e.g., `PersonalLedger.tsx`)
   - Some are in `app/` (e.g., `whiteboard/page.tsx`)

2. **Navigation Structure:**
   - 4 main categories with dropdowns
   - Some items might be better grouped differently
   - "My Bookings" appears both in Equipment Management and as standalone

3. **Component Naming:**
   - Mix of naming conventions (some use "View" suffix, some don't)
   - Some components are page-level, some are sub-components

4. **Feature Grouping:**
   - Equipment and Bookings are related but separate views
   - Calendar and Events could be more integrated
   - Project-related features are well-organized

### Suggested Reorganization Areas:

1. **Consolidate View Components:**
   - Move all main views to `components/views/`
   - Create consistent naming convention

2. **Group Related Features:**
   - Equipment + Bookings could be better integrated
   - Calendar + Events integration
   - Day-to-Day + My Tasks relationship

3. **Navigation Simplification:**
   - Consider if all categories are necessary
   - Evaluate if some items should be moved between categories

4. **Component Hierarchy:**
   - Establish clear component hierarchy
   - Separate page-level components from reusable components

---

## Notes

- All views are conditionally rendered based on `mainView` state from `AppContext`
- Permission checks are handled at the page level and in navigation
- Most components use `useAppContext()` for global state
- Authentication state determines what is shown
- The navigation system uses hover/click dropdowns with permission filtering

