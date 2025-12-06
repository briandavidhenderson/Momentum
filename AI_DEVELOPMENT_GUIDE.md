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
| `npm run seed:users` | Seeds the database with test users/profiles. Requires `.env.local`. | `ts-node scripts/seed-users.ts` |
| `npm run check:db` | Diagnostic tool to dump masterProjects and Profiles. | `node scripts/check-db.js` |
| `npm run auth:wipe` | **New.** Wipes all Firebase Authentication users. | `ts-node scripts/wipe-auth.ts` |
| `npm run db:wipe` | **Dangerous.** Wipes Auth Users AND all Firestore collections. | `npm run auth:wipe && firebase firestore:delete` |

### The Correct Deployment Workflow

1.  **Modify Code:** Make changes to `firestore/rules/*.rules`, `functions/src`, or frontend components.
2.  **Build Rules:** Run `npm run build:rules` to update `firestore.rules`.
3.  **Build Functions:** Run `npm run build:functions` (or `build:all`) to compile backend code.
4.  **Deploy:** Run `npm run deploy:all`.

**Pitfall:** Running `firebase deploy` directly without running `build:rules` first will deploy the *old* `firestore.rules` file, overwriting your changes.

## 3. Architecture Overview

**For a complete index of all files, services, and components, see [WebApp_Context.md](WebApp_Context.md).**

### Frontend (Next.js)
*   **`components/views/`**: Major page views (e.g., `ProfileManagement.tsx`, `HomeDashboard.tsx`).
*   **`components/ui/`**: Reusable UI components (mostly Shadcn UI).
*   **`lib/hooks/`**: Custom hooks for logic encapsulation (e.g., `useAuth`, `useELN`).
*   **`lib/services/`**: Firestore interaction layers. **Do not put business logic in components if it belongs here.**

### UI Architecture (Styling & Components)
*   **Tailwind CSS:** The project uses Tailwind CSS for all styling. Styles are defined centrally in `tailwind.config.ts` and `app/globals.css`. Avoid creating separate CSS files; use utility classes.
*   **shadcn/ui:** The components in `components/ui/` (e.g., `button.tsx`, `card.tsx`) are from the **shadcn/ui** library.
    *   **Ownership:** These components are *copied* into the codebase, not installed as a dependency. This gives us full control to customize them.
    *   **Usage:** Always use these atomic components to build larger features. Do not build raw HTML buttons or inputs.

### Backend (Firebase)
*   **Firestore:** NoSQL database. Security rules are modularized in `firestore/rules/`.
*   **Cloud Functions:** Located in `firebase/functions/src`. Handles complex logic like ORCID linking, data aggregation, and triggers.

## 4. Key Workflows & State

### Authentication & Onboarding
*   **Flow:** `useAuth` hook manages the user session.
*   **Onboarding:** `OnboardingFlow.tsx` manages complex multi-step forms.
*   **Persistence:** Because ORCID linking requires a redirect, onboarding state MUST be persisted to `sessionStorage` to survive the round-trip.
*   **Error Handling:** Firebase now uses `auth/invalid-credential` for both "user not found" and "wrong password" (Email Enumeration Protection). The UI must handle this generic code by prompting the user to check credentials or sign up.
*   **Robustness:** If a user exists in Auth but has no Profile (e.g. wiped DB), `useAuth` correctly redirects to `OnboardingFlow`. If the user is deleted (wiped Auth), they must Sign Up again; Login will fail.

### Firestore Rules Generation
The `firestore.rules` file is **generated**.
*   **Source:** `firestore/rules/`
*   **Build Script:** `scripts/build-rules.js`
*   **Logic:** The script concatenates the numbered files (e.g., `00_base.rules`, `10_helpers.rules`) in order.
*   **Action:** If you need to change a permission, find the relevant `.rules` file in `firestore/rules/`, edit it, then run `npm run build:rules`.
*   **Note:** Updated `workpackages` read rule now checks `profileProjectId` for project‑team membership.
*   **Feature:** `AuthorNetworkView` uses `react-force-graph-3d`. Ensure `ForceGraphWrapper` is used for dynamic imports to avoid SSR issues with window object.

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

### Environments
*   **Production URL:** [https://momentum-a60c5.web.app](https://momentum-a60c5.web.app) - This is the "true website" and source of truth for the deployed application.


### The Correct Deployment Workflow

1.  **Modify Code:** Make changes to `firestore/rules/*.rules`, `functions/src`, or frontend components.
2.  **Build Rules:** Run `npm run build:rules` to update `firestore.rules`.
3.  **Build Functions:** Run `npm run build:functions` (or `build:all`) to compile backend code.
4.  **Deploy:** Run `npm run deploy:all`.

**Pitfall:** Running `firebase deploy` directly without running `build:rules` first will deploy the *old* `firestore.rules` file, overwriting your changes.

### Deployment Performance Note
*   **Double Build:** The project uses Firebase Web Frameworks (`"webframeworks": true` in `firebase.json`). This means `firebase deploy` **automatically runs `next build`** to optimize for hosting.
*   **Consequence:** If you run `npm run build` manually before `firebase deploy`, the app is built **twice**, significantly increasing deployment time.
*   **Optimization:** For faster deployments, you can rely on the automatic build during deploy, or accept the double-build as a verification step.

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
*   **Service:** `lib/whiteboardService.ts` (Includes execution widget support).
*   **Usage:** Free-form diagramming for protocols and workflows. Supports shapes, text, and connectors.
*   **Protocol Integration:** Supports `execution_widget` to visualize active protocol runs directly on the canvas.

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
*   **Chemicals:** `lib/bufferService.ts` manages buffer/solution definitions. UI via `BufferManager.tsx` and `BufferEditor.tsx`.
*   **Execution Tracking:** `lib/types/protocolExecution.types.ts` defines the schema for running protocols. Implemented in `ProtocolBenchMode.tsx`.

### Email Integration
*   **Components:** `IntegrationsSettings.tsx` (Profile), `ProjectEmailRules.tsx`, `ProjectEmailsPanel.tsx` (Project).
*   **Service:** `lib/services/emailService.ts`.
*   **Backend:**
    *   **OAuth:** `app/api/oauth/[provider]/route.ts` handles the auth flow for Google and Outlook.
    *   **Sync:** `firebase/functions/src/emailSync.ts` is a Cloud Function that fetches emails based on user-defined rules.
*   **Data Model:** `EmailIntegration` (tokens), `EmailRule` (filtering logic), `SyncedEmail` (stored messages).
*   **Key Workflow:** User connects account -> User adds rule to project -> Sync function runs -> Emails appear in project.
*   **Spec Reference:** See `email_integration_spec_for_momentum.md` for detailed architecture.

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
*   **Tooling:** Use `npm run seed:users` to automate this process correctly.

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

### UI Component Safety
*   **Select.Item Empty Values:** Radix UI `Select.Item` throws if `value` is an empty string. Use a placeholder like "unassigned" and convert back in `onValueChange`.
*   **Null Safety:** Always check parent existence before accessing children (e.g., `selectedWorkpackage?.tasks`). Don't assume an object is non-null just because the UI shows it.
*   **Context Safety (labId):** When creating entities (Orders, Inventory), always fallback to `currentUserProfile.labId` if the source object (e.g., an Order) might be missing it. Missing `labId` makes items invisible to queries.
*   **Empty States:** Never show a blank list. Use specific messages explaining *why* it's empty and *how* to fix it (e.g., "No Funding Accounts found. Ask your admin to create one.").
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

          ...data,
          labId: data.labId, // Explicitly preserve critical keys
          ...otherProps
        };
        ```
    2.  **Layered Verification:** When a property is missing, verify it at EVERY layer:
        *   **Service:** Log the raw Firestore data AND the return value.
        *   **Hook:** Log the data received from the service.
        *   **Component:** Log the props/context received.
    3.  **Temporary Debug Logs:** Don't be afraid to add `console.log("DEBUG: ...")` during active development. It is better to have noisy logs than invisible bugs. Remove them before final commit.
    4.  **Firestore Undefined:** Remember that Firestore *drops* fields that are `undefined`. If a field is optional in your Type but missing in Firestore, it won't exist in the data object.

### Lab ID & Profile Synchronization (Critical Lesson)
*   **The Context:** The `useAuth` hook loads the Firebase User first, then asynchronously fetches the `PersonProfile`.
*   **The Bug:** Components often check `if (user)` and assume the profile is ready. This leads to `labId` being undefined.
*   **The Consequence:** Firestore security rules reject writes without a valid `labId`, often silently if the promise isn't caught or if the UI doesn't handle the error state explicitly.
*   **The Fix Pattern:**
    1.  **Button States:** Disable action buttons (e.g., "Add Item") until `currentUserProfile?.labId` is truthy.
    2.  **Tooltip Feedback:** Show "Loading profile..." in the button tooltip while disabled.
    3.  **Prop Drilling:** If a parent component (`OrdersInventory`) waits for the profile, pass `labId` down to the child dialog (`AddInventoryDialog`) as a prop. Do not rely on the child hook to fetch it again in time.

### Protocol Creation & Security Rules
*   **The Problem:** Firestore rules often require `resource.data.createdBy == request.auth.uid`.
*   **The Pitfall:** Using `currentUserProfile.id` for `createdBy` can fail if the profile ID doesn't match the Auth UID (though they should match in this app) or if the profile is not yet loaded.
*   **The Fix:** Always use `authUser.uid` (from `useAuth` or `useAppContext`) for the `createdBy` field when creating new documents. Use `currentUserProfile.id` for application-level fields like `ownerId` or `profileId`.

### Debugging & Resilience Lessons
1.  **Visual Debugging:** When console logs are swallowed or unreliable (e.g., in server-side rendering or specific browser environments), build **Visual Debug Indicators** directly into the UI.
    *   *Example:* A temporary banner showing `Inventory Count: 0 | Lab ID: undefined` immediately reveals if the data is missing.
2.  **Fail Loudly:** Never swallow errors in service calls.
    *   *Bad:* `catch (e) { console.log(e) }`
    *   *Good:* `catch (e) { setError(e.message); toast.error("Failed to save: " + e.message); }`
3.  **Verify "Happy Path" Assumptions:** Just because a form submits doesn't mean the data was written. Always verify the *result* (e.g., the new item ID) or the *side effect* (the item appearing in the list).

### Toast Notifications
*   **The Problem:** Importing `toast` directly from `components/ui/use-toast` or `components/ui/toast` often fails or behaves unexpectedly.
*   **The Fix:** Always use the `useToast` hook.
    ```typescript
    // BAD
    import { toast } from "@/components/ui/use-toast";
    toast({ ... });

    // GOOD
    import { useToast } from "@/components/ui/use-toast";
    const { toast } = useToast();
    toast({ ... });
    ```

### Firebase Admin Imports
*   **The Problem:** The Firebase Admin SDK is initialized in `lib/firebaseAdmin.ts` (note the casing). Importing from `firebase-admin` directly in API routes without checking initialization can cause errors.
*   **The Fix:** Import initialized instances or helpers from `@/lib/firebaseAdmin`.

### Next.js 16 / Turbopack Compatibility
*   **The Problem:** Next.js 16 uses Turbopack by default. The legacy `webpack` config in `next.config.js` for excluding firebase-admin causes build failures.
*   **The Fix:** Use `serverExternalPackages: ['firebase-admin', 'firebase-functions']` in `next.config.js` instead.
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
    -   Fixed `permission-denied` for `protocolExecutions` (Added missing rules).
    -   Updated `isLabMember` rule to support `workingLabIds`.
    -   Implemented **Protocol-Based Scheduling** (Active/Passive phases).
    -   Implemented **Unified Global Search** (Command Palette & Direct Navigation).
    -   Implemented **Role-Based Dashboards** (Management vs Researcher Views).
    -   Added **Lab Pulse Widget** for real-time lab status.
    -   Patched **Firebase Admin Initialization** to fix local dev 500 errors.
    -   **Critical Fixes (Dec 2025):**
        -   **Login Crash:** Fixed `subscribeToUserTraining` in `trainingService.ts` to handle undefined `userId` gracefully.
        -   **Inventory Reconciliation:** Implemented client-side reconciliation in `OrdersInventory.tsx` (via `handleSaveEdit` and `handleDragEnd`) to ensure received orders create/update inventory items.
        -   **UI Patterns:** Adopted compact card designs and whole-card drag-and-drop for better mobile/touch usability in `OrdersInventory`.
        -   **Protocol Builder Integration:**
            -   **Live Resource Status:** Implemented polling for equipment and inventory status in `ProtocolBenchMode`.
            -   **Issue Persistence:** Integrated `incidentService` to persist reported issues to Firestore.
            -   **Real Booking Checks:** Updated `ResourceAvailabilityChecker` to check for actual booking conflicts using `equipmentBookingService`.
    -   **Flexible Workflows:**
        -   **Custom Fields:** Implemented `CustomFieldEditor` and schema support for Samples, Protocols, and Experiments.
        -   **Templates:** Created `TemplateGallery` and `templateService` for Protocol and Experiment instantiation.
    -   **Simulation Feedback Fixes:**
        -   **Project Navigation:** Fixed broken "View Project" link on dashboard cards.
        -   **Lab Settings:** Exposed Custom Field Editor via new Settings module for Lab Admins.
        -   **Onboarding:** Fixed "Continue Without Supervisor" navigation flow.
    -   **Unfinished Work Fixes:**
        -   **Experiment Templates:** Implemented Project Selector in `TemplateGallery` to allow instantiation.
        -   **Onboarding Persistence:** Implemented `sessionStorage` persistence for `currentStep` and form data to survive reloads.
        -   **Code Repair:** Fixed corrupted `handleComplete` function in `OnboardingFlow.tsx`.
    -   **Health & Wellbeing Module:**
        -   **New Module:** Implemented `HealthWellbeingView` with Dashboard, Planner, and Logger.
        -   **Data Model:** Added `HealthProfile`, `WorkoutPlan`, `WorkoutSession` types.
        -   **Service:** Created `healthService.ts` for managing health data.
        -   **UI:** Added "Health" tab to global navigation.
        -   **Community Features:** Implemented `healthCommunityService.ts` and Leaderboard UI.
        -   **Wellness Logging:** Added `LogWellnessDialog` and Recovery Score calculation.
    -   **Email Integration:**
        -   **Verified:** Confirmed functionality of `ProjectEmailRules` and `ProjectEmailsPanel`.
        -   **Status:** Feature is production-ready.
    -   **Critical Fixes (Dec 4, 2025):**
        -   **Onboarding Loop:** Fixed infinite redirection for seeded users by ensuring `users` document creation (via `seed:users`).
        -   **Dashboard Visibility:** Fixed race condition in Project/Task fetching (`useProjects`) by propagating `labId` from `AppContext`.
        -   **UI:** Fixed hidden input fields in Onboarding creation forms.
        -   **Training Service Crash:** Fixed `checkEquipmentTraining` to guard against undefined IDs.
        -   **Consent Banner Crash:** Added defensive checks in `CookieConsentBanner` to prevent login crashes.
        -   **Consent Banner Crash:** Added defensive checks in `CookieConsentBanner` to prevent login crashes.
        -   **Invalid Query:** Resolved "Unsupported field value: undefined" in Firestore queries.
        -   **Whiteboard Integration:** Implemented Protocol Execution Widget for live status tracking on whiteboards.
        -   **Security Update (Dec 5, 2025):**
        -   **Tech Stack:** Upgraded to React 19.2.1 and Next.js 16.0.7 to resolve CVE-2025-55182.
        -   **Config:** Migrated `next.config.js` to use `serverExternalPackages` (Turbopack support).
        -   **PWA:** Temporarily disabled PWA features for compatibility.
        -   **Breaking Change:** Updated API routes to handle async `params` in Next.js 15+.
*   [x] Production Runtime Error Resolution
*   [x] Global Search & Navigation
*   [x] Role-Based Dashboards
*   [x] Health Module Completion
*   [x] Inventory Navigation Improvement (Renamed to "Orders & Inventory")
*   [x] Whiteboard "Runs" Tab Verification (Confirmed present and functional)
*   [x] Console Error Fixes:
    *   Added missing `workoutSessions` index.
    *   Fixed Health module permissions (`exercises`, `healthMetrics`, `workoutPlans`).
    *   Fixed Workpackage permissions for legacy projects (`isProjectTeamMember` update).
*   [x] Refactored Project Navigation:
    *   Switched from URL-based routing (`/projects/[id]`) to state-based navigation (`activeProjectId`).
    *   Eliminated page reloads when viewing projects.
    *   Created `ProjectDetailContainer` to handle project detail view logic.
*   [x] **Performance Optimization (Dec 5, 2025):**
    *   Implemented **Lazy Loading** for heavy views (`ElectronicLabNotebook`, `WhiteboardView`, `ResearchBoard`, `ProtocolBenchMode`, `ReportsView`, `HealthWellbeingView`, `ProjectDetailContainer`, `EquipmentManagement`) in `app/page.tsx`.
    *   Added `LoadingFallback` spinner for better UX during module switches.
    *   Cleaned up `app/page.tsx` header typography and removed duplicate renders.

    -   **Critical Fixes (Dec 5, 2025):**
        -   **Dashboard Refactor:** Implemented "Bench Mode" and removed `ProtocolBenchMode` from the top of the dashboard.
        -   **Permission Fixes:** Resolved `workpackages` (projectId check) and `trainingRecords` (userId check) permission errors.
        -   **Indexing:** Added missing composite indexes for `healthMetrics` and `workoutSessions`.
        -   **Accessibility:** Added `DialogDescription` to `LogWellnessDialog` and `AddInventoryDialog`.
        -   **Planner Fix:** Wired "Plan a Workout" button to correct tab navigation.

    -   **Known Issues (Active Investigation)**
        -   **Favicon:** Missing `favicon.ico` (User action required).

## 9. Strategic Roadmap & User Feedback (2025)

Based on user feedback research, the following themes and recommendations now guide the development of Momentum.

### Cross-Cutting Themes
1.  **Low Friction & Fast Onboarding:** Scientists need immediate utility with minimal configuration.
2.  **Flexible Workflows:** Support for custom fields, templates, and modular dashboards to accommodate diverse lab needs.
3.  **Centralised Search & Linking:** Unified search across projects, samples, protocols, and ELN entries.
4.  **True Collaboration:** Inline comments, @mentions, and PI review workflows.
5.  **Hybrid Digital-Paper Workflows:** Seamless integration of physical notes/photos into the digital ELN.
6.  **Cost vs. Value:** High functionality is expected to justify costs.

### Improvement Recommendations (Prioritized)

#### 1. Streamline Onboarding
*   **Interactive Walkthrough:** Step-by-step tour on first login.
*   **Role-Aware Onboarding:** Pre-configured dashboards based on role (PI, Researcher, Bioinformatician).
*   **Self-Serve Help:** Context-sensitive sidebar with docs and videos.

#### 2. Support Flexible Workflows
*   **Custom Fields:** Allow admins to define metadata for samples/experiments.
*   **Templates:** Library of cloneable templates for experiments and protocols.
*   **Configurable Phases:** Custom statuses for projects and workpackages.

#### 3. Unified Global Search
*   **Cross-Module Search:** Global search bar indexing all entities (Projects, Samples, ELN, etc.).
*   **Smart Linking:** Autocomplete for @sample and @protocol references.
*   **OCR Search:** Search within attached images and PDFs.

#### 4. Enhance Collaboration
*   **Inline Comments:** Support for comments on tasks, samples, and ELN entries.
*   **Activity Feeds:** Dashboard widgets showing recent team activity.
*   **Review Workflows:** Formal sign-off processes for ELN entries and milestones.

#### 5. Mobile & Hybrid Capture
*   **PWA & Offline Mode:** Robust offline support for lab use.
*   **Quick Capture:** Mobile-friendly photo upload and annotation.
*   **Scan-to-Sample:** QR/Barcode scanning for inventory management.

#### 6. Role-Based Dashboards
*   **Custom Views:** Tailored widgets for PIs (Funding/Health) vs Researchers (Tasks/Experiments).
*   **Cross-Lab Visibility:** Controlled sharing of resources between labs.

#### 7. Advanced Integrations
*   **Data Analysis:** Jupyter notebook integration for bioinformatics.
*   **Instrument APIs:** Automated metadata import from sequencers and other hardware.

#### 8. Smart Editor Patterns
*   **Component:** `SmartStepEditor.tsx`.
*   **Pattern:** Use `cmdk` for mention menus (@inventory, @equipment) within text areas.
*   **Data Handling:** Store plain text in the instruction field, but side-effect populate the `requiredReagents` or `requiredEquipment` arrays when an item is selected.
*   **Parsing:** Use regex in `useEffect` to detect durations or other structured data from natural language input.

## 10. User Validation Script

**CRITICAL:** Before marking a feature as "Complete", you must mentally (or physically) simulate these user stories. If the feature fails any of these checks, it is NOT complete.

### Persona 1: Dr. Aoife Byrne (The PI)
*   **Goal:** High-level visibility, grant tracking, minimal friction.
*   **Validation Checks:**
    *   [ ] **The "Heartbeat" Check:** Can I see what is running *right now* (instruments, protocols) in < 5 seconds?
    *   [ ] **The "Grant" Check:** Can I link this new entity (experiment/task) to a specific Grant or Work Package?
    *   [ ] **The "Spam" Check:** Did this action trigger a notification? If yes, was it *absolutely critical*? (Avoid "Task moved to Done" spam).
    *   [ ] **The "1:1" Check:** Can I see a student's "Passive" phases to schedule a meeting without email tag?

### Persona 2: Dr. Mateo Rossi (The Postdoc Lead)
*   **Goal:** Deep work protection, complex protocol management.
*   **Validation Checks:**
    *   [ ] **The "Deep Work" Check:** Does the scheduler allow blocking out 3-4 hour chunks where *no one* can book me?
    *   [ ] **The "Slippage" Check:** If I drag an experiment start time by +2 hours, do all dependent steps (incubations, machine bookings) shift automatically?
    *   [ ] **The "Handover" Check:** If I am sick tomorrow, is there a single view I can screenshot to show my team what needs doing?
    *   [ ] **The "Glove" Check:** Are the buttons big enough to tap on a tablet while wearing nitrile gloves?

### Persona 3: Priya Nair (The PhD Student)
*   **Goal:** Bench guidance, simple logging, anxiety reduction.
*   **Validation Checks:**
    *   [ ] **The "Reality" Check:** Can I log a result (e.g., "Gel photo") directly from the experiment timeline with 1 tap?
    *   [ ] **The "Timer" Check:** If I have overlapping incubations, does the UI show me the *next* critical action clearly?
    *   [ ] **The "Duplicate Entry" Check:** Am I asking the user to type something (e.g., Sample ID) that the system should already know?
    *   [ ] **The "Night Owl" Check:** Does the scheduler force 9-5, or can I plan an experiment that runs until 2 AM?

### Persona 4: Sarah O’Connell (The Lab Manager)
*   **Goal:** Resource control, safety, order.
*   **Validation Checks:**
    *   [ ] **The "Ghost" Check:** If a user books a machine but doesn't check in, does the system auto-release the slot?
    *   [ ] **The "Burn Rate" Check:** Does running this protocol automatically decrement the associated inventory counts?
    *   [ ] **The "Training" Check:** Can a user book this machine *without* the required safety badge? (Should be NO).
    *   [ ] **The "Incident" Check:** Is the "Report Issue" button visible from the equipment page?

### Persona 5: James Liu (The QC Scientist)
*   **Goal:** Compliance, reproducibility, audit trails.
*   **Validation Checks:**
    *   [ ] **The "Audit" Check:** If I change a parameter in a completed run, is the original value preserved in history?
    *   [ ] **The "Hard Stop" Check:** Does the system prevent me from proceeding if a critical QC value is missing?
    *   [ ] **The "Version" Check:** Am I using the *exact* version of the SOP that was active on the day of the experiment?

### Persona 6: Dr. Lena Kovacs (The Data Scientist)
*   **Goal:** Data linkage, async collaboration.
*   **Validation Checks:**
    *   [ ] **The "Linkage" Check:** Can I trace a raw data file back to the specific protocol run and sample ID?
    *   [ ] **The "Context" Check:** When I view a dataset, can I see the "wet lab" context (temperature, operator, deviations)?
    *   [ ] **The "Export" Check:** Can I get this data out in a standard format (CSV, JSON) without copy-pasting?

### Persona 7: Emma Gallagher (The COO)
*   **Goal:** Operational overview, reporting, scalability.
*   **Validation Checks:**
    *   [ ] **The "Board Report" Check:** Can I generate a "Weekly Progress" summary without asking staff to write reports?
    *   [ ] **The "Bottleneck" Check:** Does the dashboard highlight resource constraints (e.g., "FACS machine at 95% capacity")?

### Persona 8: Ciara Murphy (The Clinical Coordinator)
*   **Goal:** Patient-lab sync, error minimization.
*   **Validation Checks:**
    *   [ ] **The "Patient" Check:** Can I view tasks grouped by Patient ID, not just by Project?
    *   [ ] **The "Window" Check:** Does the system alert me if a sample is approaching its processing time limit?

## 11. The "Hate" List (Anti-Patterns)

**Avoid these at all costs:**
1.  **The "10-Click" Rule:** If a common action (book machine, log sample) takes > 5 clicks, it is a failure.
2.  **The "Silo" Effect:** Never create a new data island. Bookings must talk to Inventory. Inventory must talk to Protocols.
3.  **The "Admin" Trap:** Do not ask users to manually enter data for "management reporting" if it doesn't help *them* do their job.
4.  **The "Rigid" Flow:** Always allow for exceptions (e.g., "I need to run this *now* even if the booking isn't perfect"). Log the deviation, but don't block the science (unless safety critical).
5.  **The "Hidden" Info:** Never bury status. If a machine is broken, show it on the home screen, the booking screen, and the protocol screen.

