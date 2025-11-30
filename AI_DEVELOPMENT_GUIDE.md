# AI Development & Architecture Guide

**CRITICAL: READ THIS BEFORE MODIFYING CODE**

This document outlines the architectural patterns, script sequences, and critical workflows of the Momentum project. It is designed to ensure that any AI agent or developer understands the "network of scripts" and dependencies before attempting changes.

## 1. The Golden Rules

1.  **Source of Truth:** Never edit generated files directly. Always find the source.
    *   **Firestore Rules:** Edit `firestore/rules/*.rules`, NOT `firestore.rules`.
    *   **Build Artifacts:** Never edit files in `.next` or `firebase/functions/lib`.
2.  **Understand the Chain:** Before running a script, check `package.json` to see what it calls.
3.  **State Persistence:** The application relies heavily on React Context and Hooks. Be wary of page reloads (e.g., during OAuth redirects) wiping state. Use `sessionStorage` where appropriate.
4.  **Search Before Create:** This project is large. Before creating ANY new module, component, or service, SEARCH the codebase for existing implementations. Do not duplicate functionality.


## 2. Script Ecosystem & Deployment Sequence

The `package.json` defines the orchestration of builds and deployments. Understanding this sequence is vital to avoid deploying stale or broken code.

### Critical Scripts

| Script | Description | Dependencies |
| :--- | :--- | :--- |
| `npm run build:rules` | **CRITICAL.** Concatenates files from `firestore/rules/` into the single `firestore.rules` file. | `node scripts/build-rules.js` |
| `npm run build:functions` | Compiles TypeScript Cloud Functions. | `cd firebase/functions && npm run build` |
| `npm run build` | Builds the Next.js frontend. | `next build` |
| `npm run deploy:all` | The master deployment command. **Does NOT auto-build rules.** | `deploy:rules` && `deploy:functions` && `deploy:hosting` |

### The Correct Deployment Workflow

1.  **Modify Code:** Make changes to `firestore/rules/*.rules`, `functions/src`, or frontend components.
2.  **Build Rules:** Run `npm run build:rules` to update `firestore.rules`.
3.  **Build Functions:** Run `npm run build:functions` (or `build:all`) to compile backend code.
4.  **Deploy:** Run `npm run deploy:all`.

**Pitfall:** Running `firebase deploy` directly without running `build:rules` first will deploy the *old* `firestore.rules` file, overwriting your changes.

## 3. Architecture Overview

### Frontend (Next.js)
*   **`components/views/`**: Major page views (e.g., `ProfileManagement.tsx`, `HomeDashboard.tsx`).
*   **`components/ui/`**: Reusable UI components (mostly Shadcn UI).
*   **`lib/hooks/`**: Custom hooks for logic encapsulation (e.g., `useAuth`, `useELN`).
*   **`lib/services/`**: Firestore interaction layers. **Do not put business logic in components if it belongs here.**

### Backend (Firebase)
*   **Firestore:** NoSQL database. Security rules are modularized in `firestore/rules/`.
*   **Cloud Functions:** Located in `firebase/functions/src`. Handles complex logic like ORCID linking, data aggregation, and triggers.

## 4. Key Workflows & State

### Authentication & Onboarding
*   **Flow:** `useAuth` hook manages the user session.
*   **Onboarding:** `OnboardingFlow.tsx` manages complex multi-step forms.
*   **Persistence:** Because ORCID linking requires a redirect, onboarding state MUST be persisted to `sessionStorage` to survive the round-trip.

### Firestore Rules Generation
The `firestore.rules` file is **generated**.
*   **Source:** `firestore/rules/`
*   **Build Script:** `scripts/build-rules.js`
*   **Logic:** The script concatenates the numbered files (e.g., `00_base.rules`, `10_helpers.rules`) in order.
*   **Action:** If you need to change a permission, find the relevant `.rules` file in `firestore/rules/`, edit it, then run `npm run build:rules`.

## 5. Pre-Modification Checklist

Before generating code or running commands, ask:
1.  [ ] Am I editing a source file or a generated file?
2.  [ ] Does this change affect the build process? (e.g., adding a new rule file)
3.  [ ] If I am changing `firestore.rules`, have I updated the source modules instead?
4.  [ ] Have I considered state persistence if this flow involves redirects?
5.  [ ] Did I run the build scripts before deploying?

## 6. Production Standards (NO MOCKS ALLOWED)

**CRITICAL:** This project is for production release.
1.  **No Mocks/Placeholders:** Do not use `console.log` to simulate actions. All buttons and inputs must perform their actual function (e.g., writing to Firestore, uploading to Storage).
2.  **Full Implementation:** If a feature requires backend support (e.g., file upload), implement the necessary service functions and storage rules. Do not skip this step.
3.  **Error Handling:** All "happy paths" must have corresponding error handling and user feedback (toasts, alerts).
4.  **Type Safety:** No `any`. Define proper interfaces in `types.ts`.

# AI Development & Architecture Guide

**CRITICAL: READ THIS BEFORE MODIFYING CODE**

This document outlines the architectural patterns, script sequences, and critical workflows of the Momentum project. It is designed to ensure that any AI agent or developer understands the "network of scripts" and dependencies before attempting changes.

## 1. The Golden Rules

1.  **Source of Truth:** Never edit generated files directly. Always find the source.
    *   **Firestore Rules:** Edit `firestore/rules/*.rules`, NOT `firestore.rules`.
    *   **Build Artifacts:** Never edit files in `.next` or `firebase/functions/lib`.
2.  **Understand the Chain:** Before running a script, check `package.json` to see what it calls.
3.  **State Persistence:** The application relies heavily on React Context and Hooks. Be wary of page reloads (e.g., during OAuth redirects) wiping state. Use `sessionStorage` where appropriate.
4.  **Search Before Create:** This project is large. Before creating ANY new module, component, or service, SEARCH the codebase for existing implementations. Do not duplicate functionality.


## 2. Script Ecosystem & Deployment Sequence

The `package.json` defines the orchestration of builds and deployments. Understanding this sequence is vital to avoid deploying stale or broken code.

### Critical Scripts

| Script | Description | Dependencies |
| :--- | :--- | :--- |
| `npm run build:rules` | **CRITICAL.** Concatenates files from `firestore/rules/` into the single `firestore.rules` file. | `node scripts/build-rules.js` |
| `npm run build:functions` | Compiles TypeScript Cloud Functions. | `cd firebase/functions && npm run build` |
| `npm run build` | Builds the Next.js frontend. | `next build` |
| `npm run deploy:all` | The master deployment command. **Does NOT auto-build rules.** | `deploy:rules` && `deploy:functions` && `deploy:hosting` |

### The Correct Deployment Workflow

1.  **Modify Code:** Make changes to `firestore/rules/*.rules`, `functions/src`, or frontend components.
2.  **Build Rules:** Run `npm run build:rules` to update `firestore.rules`.
3.  **Build Functions:** Run `npm run build:functions` (or `build:all`) to compile backend code.
4.  **Deploy:** Run `npm run deploy:all`.

**Pitfall:** Running `firebase deploy` directly without running `build:rules` first will deploy the *old* `firestore.rules` file, overwriting your changes.

## 3. Architecture Overview

### Frontend (Next.js)
*   **`components/views/`**: Major page views (e.g., `ProfileManagement.tsx`, `HomeDashboard.tsx`).
*   **`components/ui/`**: Reusable UI components (mostly Shadcn UI).
*   **`lib/hooks/`**: Custom hooks for logic encapsulation (e.g., `useAuth`, `useELN`).
*   **`lib/services/`**: Firestore interaction layers. **Do not put business logic in components if it belongs here.**

### Backend (Firebase)
*   **Firestore:** NoSQL database. Security rules are modularized in `firestore/rules/`.
*   **Cloud Functions:** Located in `firebase/functions/src`. Handles complex logic like ORCID linking, data aggregation, and triggers.
*   **Sample Management:**
    *   **`lib/types/sample.types.ts`**: Defines `Sample` (biological entities) and `StorageLocation` (hierarchical storage).
    *   **`lib/services/sampleService.ts`**: Handles CRUD and Genealogy logic.
    *   **Genealogy:** Samples track `parentId`. UI reconstructs the tree.
    *   **Storage:** Locations track `parentId`. UI (`StorageBrowser`) handles navigation.

### Project Management
*   **Core Components:** `ProjectDashboard.tsx` (Portfolio view), `ProjectDetailPage.tsx` (Single project view).
*   **Data Model:** `MasterProject` (parent), `Workpackage` (phase), `Deliverable` (milestone), `ProjectTask` (action item).
*   **Features:** Kanban board, Gantt chart, Budget tracking, File management.

### Whiteboards
*   **Component:** `WhiteboardView.tsx` & `WhiteboardEditor.tsx`.
*   **Service:** `lib/whiteboardService.ts`.
*   **Usage:** Free-form diagramming for protocols and workflows. Supports shapes, text, and connectors.

### Research Boards
*   **Component:** `components/views/research/ResearchBoardDetail.tsx`.
*   **Purpose:** Visual knowledge management (Pinterest-style).
*   **Features:**
    *   **Pins:** Images, Videos, Papers, Notes.
    *   **AI Analysis:** "Analyze with AI" button uses Gemini to extract insights from pins.
    *   **Chat:** `ResearchBoardChat.tsx` allows chatting with the board's context.

### Electronic Lab Notebook (ELN)
*   **Component:** `ElectronicLabNotebook.tsx`.
*   **Data Model:** `ELNExperiment` (parent), `ELNItem` (content), `ELNReport` (summary).
*   **Integrations:**
    *   **Samples:** Linked via `samplesUsed` array. Managed by `SamplePicker`.
    *   **Protocols:** Linked via `protocolsUsed` array. Managed by `ProtocolPicker`.
    *   **Projects:** Linked via `masterProjectId`.
*   **Features:** Multimodal canvas (Jupyter-style), AI report generation, Resource linking.

### Protocol Management
*   **Components:** `ProtocolBenchMode.tsx`, `ProtocolEditor.tsx`.
*   **Scheduling:** `calendarService.ts` handles creating events for active/passive phases.
*   **Inventory Integration:** `ResourceAvailabilityChecker.tsx` performs pre-flight checks against `InventoryItem` data.

## 4. Key Workflows & State

### Authentication & Onboarding
*   **Flow:** `useAuth` hook manages the user session.
*   **Onboarding:** `OnboardingFlow.tsx` manages complex multi-step forms.
*   **Persistence:** Because ORCID linking requires a redirect, onboarding state MUST be persisted to `sessionStorage` to survive the round-trip.
*   **Race Condition Prevention:** When creating a new user profile, the Profile Document must be created **LAST**, after all other entities (Projects, Funding Accounts) are created. This prevents `useAuth` from detecting the profile and switching the view to 'app' before the onboarding process is fully complete.

### Firestore Rules Generation
The `firestore.rules` file is **generated**.
*   **Source:** `firestore/rules/`
*   **Build Script:** `scripts/build-rules.js`
*   **Logic:** The script concatenates the numbered files (e.g., `00_base.rules`, `10_helpers.rules`) in order.
*   **Action:** If you need to change a permission, find the relevant `.rules` file in `firestore/rules/`, edit it, then run `npm run build:rules`.

### Data Seeding Best Practices
*   **Collection Names:** Always use `personProfiles` (not `user_profiles`) and `users`.
*   **Data Integrity:** When seeding users, you MUST create both a `users` document (for auth mapping) and a `personProfiles` document (for application data).
*   **Linking:** The `users` document must contain a `profileId` field that matches the ID of the `personProfiles` document.
*   **Ids:** For simplicity in seeding, it is recommended to use the User UID as the `profileId`.

### SPA Navigation & Routing
*   **Single Page Application:** The application is a SPA. Most "pages" (e.g., Equipment, Reports) are actually views rendered within `app/page.tsx` based on state.
*   **Direct Navigation:** Direct navigation to sub-routes like `/equipment` or `/reports` will result in a 404 error because these are not physical pages in the `app/` directory.
*   **Routing Logic:** Navigation is handled by the `TopModuleNavigation` component, which updates the `mainView` state in `AppContext`.
*   **Exceptions:** Some distinct pages do exist (e.g., `/auth/*`, `/projects/[id]`), but the core dashboard modules are virtual views.

## 5. Pre-Modification Checklist

Before generating code or running commands, ask:
1.  [ ] Am I editing a source file or a generated file?
2.  [ ] Does this change affect the build process? (e.g., adding a new rule file)
3.  [ ] If I am changing `firestore.rules`, have I updated the source modules instead?
4.  [ ] Have I considered state persistence if this flow involves redirects?
5.  [ ] Did I run the build scripts before deploying?

## 6. Production Standards (NO MOCKS ALLOWED)

**CRITICAL:** This project is for production release.
1.  **No Mocks/Placeholders:** Do not use `console.log` to simulate actions. All buttons and inputs must perform their actual function (e.g., writing to Firestore, uploading to Storage).
2.  **Full Implementation:** If a feature requires backend support (e.g., file upload), implement the necessary service functions and storage rules. Do not skip this step.
3.  **Error Handling:** All "happy paths" must have corresponding error handling and user feedback (toasts, alerts).
4.  **Type Safety:** No `any`. Define proper interfaces in `types.ts`.

## 7. Common Pitfalls & Best Practices

### Firestore Timestamps
*   **The Problem:** Firestore dates are returned as `Timestamp` objects, but the app often expects native `Date` objects or ISO strings.
*   **The Crash:** Calling `.toDate()` on an undefined field or a field that is already a string (e.g., from a previous bad save) will crash the app.
*   **The Fix:** Always check for existence and type before converting.
    ```typescript
    // BAD
    start: data.start.toDate()

    // GOOD
    start: data.start?.toDate ? data.start.toDate() : (data.start || new Date())
    ```

### Firestore Indexes
*   **Composite Indexes:** Complex queries (e.g., filtering by multiple fields or sorting) require composite indexes.
*   **Error Message:** `FirebaseError: The query requires an index.`
*   **Resolution:** The error message in the console ALWAYS contains a direct link to create the index. Click it.
*   **Deployment:** Indexes are defined in `firestore.indexes.json`. After creating an index via the console, run `firebase firestore:indexes > firestore.indexes.json` to save it to the codebase.

### Firestore Rules & Client Queries
*   **The Problem:** Client-side queries using `or(...)` will fail with `permission-denied` if the Firestore security rules don't explicitly allow access for *each* condition.
*   **The Fix:** Ensure your `.rules` file has corresponding logic. For example, if querying by `sharedWithUsers`, the rule MUST check `resource.data.sharedWithUsers`.

### Defensive UI Coding
*   **The Problem:** Accessing properties like `.icon` on undefined objects (e.g., `category.icon`) crashes the React render loop.
*   **The Fix:** Always use optional chaining (`?.`) and provide fallbacks.
    ```typescript
    const Icon = category?.icon || Activity; // Fallback to Activity icon
    ```

### Sorting & Status Types
*   **The Problem:** When defining custom sorting logic (e.g., `statusOrder`), TypeScript will fail the build if you don't account for **ALL** possible values in the union type.
*   **The Fix:** Ensure your sorting object includes every key from the type definition.
    ```typescript
    // BAD (Missing 'blocked')
    const statusOrder = { todo: 0, working: 1, done: 2, history: 3 }
    
    // GOOD
    const statusOrder = { todo: 0, working: 1, done: 2, history: 3, blocked: 4 }
    ```

### Date Handling in Interfaces
*   **The Problem:** Mixing `Date` objects and ISO strings causes type mismatches, especially when initializing new objects.
*   **The Fix:** Be consistent. If an interface expects a string (e.g., `createdAt: string`), use `.toISOString()`.
    ```typescript
    // BAD
    createdAt: new Date()
    
    // GOOD
    createdAt: new Date().toISOString()
    ```

### React Hooks Dependencies
*   **The Problem:** Defining functions inside a component and using them in `useEffect` without `useCallback` causes build errors or infinite loops.
*   **The Fix:** Wrap functions in `useCallback` if they are dependencies of a `useEffect`.
    ```typescript
    const loadData = useCallback(async () => { ... }, [dependency]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);
    ```

### Routing & View State
*   **The Problem:** Scattering routing logic across multiple components (e.g., `HomeDashboard` handling views it shouldn't) leads to dead code and unreachable states.
*   **The Fix:** Consolidate high-level view routing in `app/page.tsx`. Ensure string literals for view states (e.g., `'mobile_home'`) match exactly across all files.

## 8. Project Tracker

This section tracks the high-level state of the project to prevent drift.

### Current Phase: Post-Deployment Stabilization
*   **Goal:** Resolve runtime errors (`permission-denied`, crashes) and ensure stability in the production environment.

### Active Focus (Phase 13: Build & Deployment Hardening)
-   **Current Priority**: Ensuring clean builds and successful deployments.
-   **Key Features**:
    -   **Build Stability**: Resolving strict type errors in sorting and date handling.
    -   **Routing Consolidation**: Centralizing view logic in `app/page.tsx`.
-   **Recent Completions**:
    -   Fixed `statusOrder` build error in `useOptimisticDayToDayTasks`.
    -   Consolidated Dashboard Routing (Removed dead code from `HomeDashboard`).
    -   Refactored `MobileHome` to Functional Component.
    -   Fixed `permission-denied` for Research Boards.
    -   Fixed unsafe `toDate()` calls across all services.
    -   Implemented **Protocol-Based Scheduling** (Active/Passive phases).

### Completed Milestones
*   [x] Initial Architecture Setup
*   [x] Core Services (Auth, Projects, Inventory)
*   [x] Mobile & Bench Experience
*   [x] Build & Deploy Pipeline Fixes
