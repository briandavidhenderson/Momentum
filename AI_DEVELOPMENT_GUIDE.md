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

## 7. Project Tracker

This section tracks the high-level state of the project to prevent drift.

### Current Phase: Customer Feedback & Hardening
*   **Goal:** Address feedback from `Customer_Feedback.txt` and ensure all features are fully functional (no mocks).

## 4. Active Focus (Phase 4: Smart Data & Reporting)
-   **Current Priority**: Connecting data silos and providing actionable insights.
-   **Key Features**:
    -   **Smart Inventory**: Low-stock alerts and usage tracking.
    -   **Reporting Dashboard**: Visualizing equipment usage and project progress.
-   **Recent Completions**:
    -   Global Command Palette & Quick Actions.
    -   Protocol Bench Mode (Real-time execution).
    -   Team Visibility & Dashboard Widgets.

### Completed Milestones
*   [x] Initial Architecture Setup
*   [x] Core Services (Auth, Projects, Inventory)
