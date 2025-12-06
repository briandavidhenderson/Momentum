4.  [Components - Views (`components/views`)](#components---views)
5.  [Components - Feature Modules](#components---feature-modules)
6.  [Components - UI (`components/ui`)](#components---ui)
7.  [App Routing (`app`)](#app-routing)
8.  [UI Architecture](#ui-architecture)

---

## Services
*Business logic and data access layer (`lib/services`).*

| Service | Description | Intended Aim / Ground Truth |
| :--- | :--- | :--- |
| `announcementService.ts` | Manages system-wide announcements. | Broadcast critical system info to all users. |
| `auditService.ts` | Logs system actions for auditing purposes. | Provide immutable trail of who did what and when. |
| `bookingService.ts` | Handles general booking logic (rooms, etc.). | Prevent conflicts for shared resources. |
| `bufferService.ts` | **(lib/)** Manages chemical buffers and solutions. | Store reusable recipes (buffers/media) linked to inventory items. |
| `calendarService.ts` | Manages calendar events and integrations. | Unified view of all time-bound activities (experiments, meetings). |
| `deliverableService.ts` | Tracks project deliverables. | Ensure project milestones are met on time. |
| `elnService.ts` | Electronic Lab Notebook operations. | Digital twin of the physical lab notebook; legal record of work. |
| `equipmentService.ts` | Equipment inventory and status management. | Track lifecycle, status, and maintenance of lab hardware. |
| `equipmentBookingService.ts` | Specific logic for booking equipment. | specialized booking logic for instruments (conflicts, maintenance). |
| `fundingService.ts` | Manages funding accounts and budgets. | Track spend against grants to prevent overspending. |
| `groupService.ts` | User group management. | Manage permissions and team structures. |
| `healthService.ts` | **(New)** Health & Wellbeing module data. | Promote researcher wellbeing and prevent burnout. |
| `hierarchyService.ts` | Aggregates organizational structure (Orgs -> Labs). | Model the real-world academic/corporate hierarchy. |
| `incidentService.ts` | Safety incident reporting and tracking. | Compliance and safety monitoring; "See something, say something". |
| `inventoryService.ts` | General lab inventory management. | Track consumables location and quantity to prevent stockouts. |
| `networkService.ts` | Social/relational data (Memberships, Supervisions). | *Future:* Model mentorship and social graph within the lab. |
| `notificationService.ts` | User notifications and alerts. | Async communication of critical updates (approvals, errors). |
| `orderService.ts` | Procurement and order tracking. | Streamline purchasing and link it to inventory. |
| `organizationService.ts` | Core organizational entity management. | Manage the "Tenants" (Universities, Companies). |
| `profileService.ts` | User profile management (Extended attributes). | Store user preferences, roles, and scientific context. |
| `projectService.ts` | Project lifecycle management. | Container for all scientific work; the "Folder" of the lab. |
| `protocolService.ts` | Lab protocol management. | Version-controlled, executable standard operating procedures (SOPs). |
| `researchBoardService.ts` | Research idea boards and pins. | Visual knowledge management and ideation (Pinterest for Science). |
| `taskService.ts` | General task management. | Track atomic units of work not covered by experiments. |
| `userService.ts` | Core user account management. | Identity management and auth mapping. |
| `workpackageService.ts` | Project work package tracking. | Group tasks/experiments into logical phases (e.g., "Aim 1"). |

## Hooks
*Reusable React hooks (`lib/hooks`).*

| Hook | Purpose |
| :--- | :--- |
| `useAuth` | Authentication state and user context. |
| `useBookings` | Access to booking data. |
| `useBuffers` | Access to buffer/solution data. |
| `useCalendar` | Calendar event management. |
| `useDayToDayTasks` | Daily task management. |
| `useEquipment` | Equipment list and status. |
| `useFunding` | Funding account access and budget management. |
| `useOrders` | Order tracking and inventory reconciliation. |
| `useProjects` | Project list and active project context. |
| `useProtocols` | Protocol access and management. |
| `useUI` | UI state (modals, sidebars). |
| `useWorkpackages` | Work package data access. |

## Components - Core
*Core flow components located in `components/`.*

| Component | Description |
| :--- | :--- |
| `AuthPage.tsx` | Handles Login and Sign Up forms. Managed by `page.tsx`. |
| `OnboardingFlow.tsx` | Multi-step wizard for user profile setup. Persists state to `sessionStorage`. |
| `CookieConsentBanner.tsx` | GDPR compliance banner. |
| `NotificationBell.tsx` | Top bar notification indicator. |
| `TopModuleNavigation.tsx` | Main navigation bar. |

## Components - Views
*Top-level page views (`components/views`).*

| View Component | Route/Feature |
| :--- | :--- |
| `DayToDayBoard.tsx` | Daily task kanban/list view. |
| `ElectronicLabNotebook.tsx` | ELN interface. |
| `EquipmentManagement.tsx` | Equipment inventory and booking UI. |
| `FundingAdmin.tsx` | Funding account administration. |
| `HealthWellbeingView.tsx` | **(New)** Health dashboard and wellness logger. |
| `HierarchyExplorer.tsx` | Organizational structure browser. |
| `MyTasksView.tsx` | Personal task list. |
| `OrdersInventory.tsx` | Orders and inventory management. Accessed via "Orders & Inventory" nav item. |
| `PeopleView.tsx` | User directory and profile viewing. |
| `AuthorNetworkView.tsx` | **(New)** 3D visualizer for author collaborations (ORCID/NBIB). |
| `ProjectDashboard.tsx` | Project overview and management. |
| `ResearchBoard.tsx` | Research idea visualization. |
| `SettingsView.tsx` | Application settings. |
| `WhiteboardView.tsx` | Interactive whiteboard. |

## Components - Feature Modules
*Domain-specific components organized by folder (`components/`).*

| Module Folder | Description | Key Components |
| :--- | :--- | :--- |
| `admin` | Admin-only controls. | `AdminDashboard` |
| `buffers` | Chemical buffer/solution management. | `BufferManager`, `BufferEditor` |
| `dashboard` | Home dashboard widgets. | `HomeDashboard`, `MyWeeklyDigest` |
| `dialogs` | Reusable modal dialogs. | `DeliverableDialog`, `EventDialog` |
| `eln` | Electronic Lab Notebook. | `ELNJupyterCanvasV2`, `ELNReportGenerator` |
| `equipment` | Equipment management. | `EquipmentStatusPanel` (booking/reorder), `EquipmentNetworkPanel` |
| `experiments` | Experiment tracking. | `ExperimentList` |
| `groups` | User group management. | `GroupSelector` |
| `health` | Health & Wellbeing. | `HealthAnalytics`, `WorkoutPlanner` |
| `orders` | Order management. | `OrderList`, `OrderRequestForm` |
| `projects` | Project management. | `ProjectCreationDialog`, `ProjectResources` |
| `protocols` | Protocol editor/viewer. | `ProtocolBenchMode` (now a standalone view), `ProtocolEditor` |
| `training` | User training/competency. | `TrainingDashboard` |
| `whiteboard` | Whiteboard features. | `WhiteboardCanvas`, `WhiteboardSidebar` (with Execution tab) |

## Technology Stack & UI Architecture
*   **Framework:** Next.js 16 (App Router) with Turbopack.
*   **Library:** React 19.
*   **Styling Engine:** [Tailwind CSS](https://tailwindcss.com/). All styling is done via utility classes.
*   **Component Library:** [shadcn/ui](https://ui.shadcn.com/).
    *   **Location:** `components/ui/`.
    *   **Philosophy:** Components are source code, not dependencies. We own the code in `components/ui` and can modify it to fit our design system.
    *   **Theme:** Colors, fonts, and radii are controlled via CSS variables in `app/globals.css` and mapped in `tailwind.config.ts`.

## Types
*TypeScript definitions (`lib/types`).*

| Type File | Domain |
| :--- | :--- |
| `ai.types.ts` | AI agents and prompts. |
| `booking.types.ts` | Resource bookings. |
| `calendar.types.ts` | Events and schedules. |
| `eln.types.ts` | Lab notebook entries. |
| `equipment.types.ts` | Instruments and assets. |
| `funding.types.ts` | Budgets and grants. |
| `health.types.ts` | Health profile and workouts. |
| `organization.types.ts` | Org structure (Depts, Labs). |
| `project.types.ts` | Projects and work packages. |
| `protocol.types.ts` | Lab protocols. |
| `protocol.types.ts` | Lab protocols. |
| `protocolExecution.types.ts` | Tracking protocol runs/experiments. Used in `ProtocolBenchMode`. |
| `user.types.ts` | User accounts and roles. |
| `user.types.ts` | User accounts and roles. |

## App Routing
*Next.js App Router structure (`app/`).*

| Route | Description |
| :--- | :--- |
| `app/page.tsx` | Main entry point. Handles all main views (Dashboard, Projects, Lab, etc.) via state-based navigation. |
| `app/api/` | Backend API routes. |
| `app/auth/` | Authentication pages. |
| `app/whiteboard/` | Whiteboard full-screen view. |

### Note on Navigation
The application primarily uses state-based navigation (`mainView` state) to switch between modules without page reloads. Project details are now also handled via state (`activeProjectId`) within the `projects` view, replacing the previous `/projects/[id]` routing to ensure a smoother user experience.
