# Email Integration Spec – Gmail & Outlook Ingestion

> **Purpose**: This document describes how to add Gmail and Outlook email ingestion to the Momentum project‑management app so that emails from specific people are pulled into the app and linked to projects.
>
> **Audience**: An AI/codegen agent working on the Momentum codebase (Next.js + Firebase/Firestore + Cloud Functions).

---

## 1. High‑Level Goal

Enable a user to:

1. Connect their **Gmail** and/or **Outlook (Microsoft 365/Outlook.com)** account to Momentum via OAuth.
2. Define **email rules** per project (e.g. “all emails from `pi@university.ie` and `supplier@company.com` → Project X”).
3. Have a background job that periodically:
   - Fetches new emails from those senders (or a specific label/folder),
   - Normalises them into a common `SyncedEmail` format,
   - Stores them in Firestore, attached to the appropriate project.
4. Display these emails inside each project in a simple **Emails panel**, with links back to Gmail/Outlook to reply.

We want a, robust **v1** that uses **scheduled sync** (cron) rather than webhooks.

---

## 2. Tech Stack Assumptions

The implementation should assume:

- Frontend: **Next.js 14+** (App Router) with **TypeScript**.
- Backend: **Firebase** with:
  - **Firestore** (for data storage),
  - **Cloud Functions** (Node.js, TypeScript),
  - **Cloud Scheduler** (for cron‑like scheduled HTTP invocations).
- Auth: Momentum uses `useAuth` hook. **Important:** `userId` in this spec refers to the Firebase Auth UID. Be aware that the app also uses `PersonProfile` (linked via `profileId`). For integrations, linking to the Auth UID is correct, but UI displays might need `PersonProfile` data.
- Architecture:
  - Service logic goes in `lib/services/`.
  - UI components go in `components/views/` or `components/ui/`.
  - Types go in `lib/types/`.

---

## 3. Data Model

Define the following Firestore structures (collection names can be adjusted to match existing conventions, but keep the fields):

### 3.1 Email Integrations

Collection (or subcollection) for storing OAuth credentials per user.

**Option A (recommended)**: Subcollection under each user.

- Path: `users/{uid}/integrations/{provider}`

Where `provider` is `"google"` or `"outlook"`.

**Document shape:**

```ts
export type EmailIntegrationProvider = "google" | "outlook";

export interface EmailIntegration {
  provider: EmailIntegrationProvider;         // "google" | "outlook"
  emailAddress: string;                       // primary mailbox email
  accessToken: string;                        // store encrypted or in a secure way
  refreshToken: string;                       // required for offline access
  expiryDate: number;                         // ms since epoch
  scopes: string[];                           // granted scopes
  connectedAt: string;                        // ISO timestamp
  updatedAt: string;                          // ISO timestamp
}
```

Keep this collection **heavily access‑controlled**:

- Only the owning user and privileged backend should be able to read/write.
- Frontend should never see raw tokens; instead it receives boolean flags like `hasGoogleIntegration`.

### 3.2 Email Rules (Per Project)

Allow each project to define rules that map email senders → project.

**Path:** `projects/{projectId}/emailRules/{ruleId}`

**Document shape:**

```ts
export interface EmailRule {
  ruleId: string;            // Firestore doc id
  projectId: string;
  userId: string;            // who owns this rule (the mailbox owner)
  provider: EmailIntegrationProvider | "any"; // optional; for now we can support "any"
  senders: string[];         // list of email addresses (exact match)
  labelOrFolder?: string;    // optional: Gmail label or Outlook folder name for advanced users
  isActive: boolean;
  createdAt: string;         // ISO timestamp
  updatedAt: string;
}
```

For v1, only exact email address matches are required. Pattern matching can be added later.

### 3.3 Synced Emails

A unified representation of emails stored in Firestore.

**Path:** `projects/{projectId}/emails/{emailId}`

**Document shape:**

```ts
export interface SyncedEmail {
  id: string;                      // Firestore doc id
  projectId: string;
  userId: string;                  // Momentum user who owns the mailbox
  provider: EmailIntegrationProvider;
  providerMessageId: string;       // Gmail message id or Outlook message id
  threadId?: string;               // Gmail threadId or Outlook conversationId
  from: string;                    // raw "From" address
  to: string[];                    // list of recipients
  cc?: string[];
  subject: string;
  snippet: string;                 // short preview string (plain text)
  receivedAt: string;              // ISO timestamp of email receipt
  messageUrl?: string;             // deep link back to Gmail/Outlook web client
  hasAttachments: boolean;
  labels?: string[];               // optional: Gmail labels / Outlook categories
  // Optional: truncated plain‑text or HTML body for preview
  bodyPreview?: string;

  createdAt: string;               // when saved in Firestore
  updatedAt: string;
}
```

Raw MIME storage is **not required for v1**. Body preview should be short and safe to render.

---

## 4. OAuth Integration

We need two providers: **Google (Gmail)** and **Microsoft (Outlook)**.

### 4.1 Google / Gmail

1. **Create/Configure Google Cloud OAuth client** (done outside this code, but assume config is available via env):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (e.g. `https://<host>/api/oauth/google/callback`)

2. Request these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`

3. Implement **backend routes** (Next.js API routes or Cloud Functions with HTTP) for:

   - `GET /api/oauth/google/start`
     - Redirects the user to Google OAuth consent screen.
     - Includes `access_type=offline` and `prompt=consent` (first time) to get a refresh token.

   - `GET /api/oauth/google/callback`
     - Handles the `code` returned from Google.
     - Exchanges `code` for `access_token`, `refresh_token`, and `expiry`.
     - Uses current authenticated Momentum user `uid`.
     - Writes/updates `users/{uid}/integrations/google` document.
     - Redirects back to a frontend page, e.g. `/settings/integrations?google=connected`.

4. Provide a **disconnect** route:

   - `POST /api/oauth/google/disconnect`
     - Revokes the token via Google token revocation endpoint.
     - Deletes integration document from Firestore.

5. Implement token refreshing logic in a shared helper (backend only):

   ```ts
   async function getGoogleAuthClientForUser(uid: string): Promise<OAuth2Client | null> {
     // 1. Load EmailIntegration for provider = "google".
     // 2. If expired, use refreshToken to get a new accessToken & expiry.
     // 3. Update Firestore with new values.
     // 4. Return configured OAuth2Client.
   }
   ```

### 4.2 Microsoft / Outlook

1. Configure Azure app registration (done outside code) and expose config as env:
   - `MS_CLIENT_ID`
   - `MS_CLIENT_SECRET`
   - `MS_TENANT_ID` or `common`
   - `MS_REDIRECT_URI` (e.g. `https://<host>/api/oauth/outlook/callback`)

2. Request Graph delegated scope:
   - `Mail.Read`

3. Implement backend routes:

   - `GET /api/oauth/outlook/start`
     - Redirects user to Microsoft login with `response_type=code`, `scope=Mail.Read offline_access`.

   - `GET /api/oauth/outlook/callback`
     - Exchanges `code` for `access_token`, `refresh_token`, and `expiry`.
     - Writes/updates `users/{uid}/integrations/outlook` document.

   - `POST /api/oauth/outlook/disconnect`
     - Revokes tokens (if needed) and deletes integration document.

4. Implement a helper similar to Google’s for refreshing and returning a configured HTTP client for Graph API.

---

## 5. Scheduled Sync Job

Use **Cloud Scheduler** to hit an HTTPS Cloud Function every N minutes (e.g. 5 or 10). The function name can be `syncEmails`.

### 5.1 High‑Level Flow

1. Triggered by Cloud Scheduler (cron) with a secret token header for authorization.
2. `syncEmails` function does:

   1. Query Firestore for all users who have at least one `EmailIntegration` (google or outlook).
   2. For each user:
      - Load their integration documents.
      - Load all active `EmailRule` docs where `userId == uid`.
      - For each provider (google/outlook):
        - Fetch new emails for that provider and those rules.
        - Upsert into `projects/{projectId}/emails/`.

3. Maintain a **per user per provider sync cursor**, e.g. in:

   - `users/{uid}/integrations/{provider}.lastSyncedAt`

   This is used to only fetch emails newer than that timestamp.

### 5.2 Fetching Emails – Gmail

Use the official Gmail REST API via `googleapis` library.

For each user & rule:

1. Build a query string `q` from `senders` and `lastSyncedAt`.

   - Example:

     ```
     from:pi@university.ie OR from:supplier@company.com newer_than:7d
     ```

   - Alternatively, if `labelOrFolder` is set and is a Gmail label id/name, use `labelIds` instead of `q` or in combination.

2. Call `gmail.users.messages.list`:

   ```ts
   const listRes = await gmail.users.messages.list({
     userId: "me",
     q,
     maxResults: 50,
   });
   ```

3. For each message ID returned:

   - Call `gmail.users.messages.get` with `format="metadata"` and headers `From, To, Cc, Subject, Date`.
   - Parse headers into fields of `SyncedEmail`.
   - Use the `snippet` field from Gmail for preview.
   - Derive `messageUrl` for Gmail web client, e.g.: `https://mail.google.com/mail/u/0/#all/<messageId>`.

4. Determine `projectId` by matching sender against rules for this user (one sender may match multiple projects; for v1 it’s acceptable to create one `SyncedEmail` per (project, message) pair).

5. Upsert into Firestore:

   - Document path: `projects/{projectId}/emails/{emailDocId}`.
   - `emailDocId` can be `provider + "_" + providerMessageId` plus projectId to avoid collisions.

6. Update `lastSyncedAt` for this provider/user after successful processing.

### 5.3 Fetching Emails – Outlook (Microsoft Graph)

Use Microsoft Graph REST API.

For each user & rule:

1. Build Graph `$filter` from `senders` and `lastSyncedAt`.

   - Example filter:

     ```
     (from/emailAddress/address eq 'pi@university.ie' or from/emailAddress/address eq 'supplier@company.com')
     and receivedDateTime ge 2025-01-01T00:00:00Z
     ```

2. Request:

   ```http
   GET https://graph.microsoft.com/v1.0/me/messages?
     $filter=<encoded filter>&
     $select=id,conversationId,from,toRecipients,ccRecipients,subject,bodyPreview,receivedDateTime,hasAttachments,webLink
   ```

3. Map response fields to `SyncedEmail`:

   - `providerMessageId = id`
   - `threadId = conversationId`
   - `from = from.emailAddress.address`
   - `to = toRecipients[].emailAddress.address`
   - `cc = ccRecipients[].emailAddress.address`
   - `subject = subject`
   - `snippet = bodyPreview`
   - `receivedAt = receivedDateTime`
   - `messageUrl = webLink`
   - `hasAttachments = hasAttachments`

4. As with Gmail, match sender → project via `EmailRule` and upsert into Firestore.

5. Update `lastSyncedAt` for Outlook integration.

---

## 6. Frontend UI Requirements

### 6.1 Integrations Page

Create or extend an **Integrations / Account Settings** page, e.g. `/settings/integrations`.

Features:

- Show two cards:
  - **Gmail**
    - Status: `Connected as user@xyz` or `Not connected`.
    - Button: `Connect Gmail` → calls `/api/oauth/google/start`.
    - Button (if connected): `Disconnect` → calls `/api/oauth/google/disconnect`.
  - **Outlook**
    - Same behaviour as Gmail.

- The frontend should **not** display any token data, only status and email address.

### 6.2 Project Email Rules

On each project page (e.g. `/projects/{projectId}`), add an "Emails" settings section or tab.

Features:

- List existing `EmailRule` documents for this project and current user.
- Allow the user to:
  - Add a rule:
    - Input: `senders` (comma‑separated emails).
    - Optional: `provider` dropdown (All / Gmail / Outlook).
    - Optional: `labelOrFolder` (advanced).
  - Activate/deactivate rules (`isActive` toggle).
  - Delete rules.

**Implementation notes:**

- Use Firestore queries or existing data layer to read/write `EmailRule` docs.
- Rules are per user (because they depend on that user’s mailbox), but attached to a project.

### 6.3 Project Email Panel

Add an **Emails** tab/panel inside the project view that shows synced messages.

Basic UI:

- Query: `projects/{projectId}/emails` ordered by `receivedAt` desc, limited (e.g. 50).
- Display in a table or list with columns:
  - From
  - Subject
  - Snippet
  - Provider icon (Gmail/Outlook)
  - Received date/time
  - Button/link: `Open in Gmail/Outlook` using `messageUrl`.

No reply/compose in v1; we just show and link out.

---

## 7. Security & Privacy

- Use **read‑only scopes**:
  - Gmail: `gmail.readonly`.
  - Outlook: `Mail.Read`.
- Tokens must be stored in Firestore with:
  - Very restrictive security rules (only backend service accounts can read tokens; user cannot see raw tokens from the client).
  - Consider encryption at rest (e.g. KMS) if available.
- Provide clear **Disconnect** controls that:
  - Revoke tokens.
  - Remove integration documents.
- Ensure that a user can only see emails for projects they have access to according to existing project permissions.

---

## 8. Implementation Order (Tasks for AI)

The AI agent implementing this feature should follow an incremental approach:

1. **Data Model Setup**
   - Add TypeScript types/interfaces for `EmailIntegration`, `EmailRule`, `SyncedEmail`.
   - Add Firestore helper functions (CRUD) for these entities.

2. **Gmail OAuth**
   - Implement `/api/oauth/google/start` and `/api/oauth/google/callback` routes.
   - Implement `EmailIntegration` write on successful callback.
   - Implement `/api/oauth/google/disconnect`.
   - Add Integration UI for Gmail (without sync yet).

3. **Outlook OAuth**
   - Implement `/api/oauth/outlook/start` and `/api/oauth/outlook/callback`.
   - Implement `EmailIntegration` write on successful callback.
   - Implement `/api/oauth/outlook/disconnect`.
   - Extend Integration UI for Outlook.

4. **Email Rules UI & Backend**
   - Implement Firestore CRUD for `EmailRule` at `projects/{projectId}/emailRules/`.
   - Add project‑level UI for managing rules.

5. **Sync Function**
   - Implement Cloud Function `syncEmails` (HTTP callable by Cloud Scheduler).
   - Implement helpers:
     - `getGoogleAuthClientForUser(uid)`
     - `getOutlookClientForUser(uid)`
     - `syncGmailForUserAndRules(uid, rules)`
     - `syncOutlookForUserAndRules(uid, rules)`
   - Maintain `lastSyncedAt` per integration.

6. **Project Email Panel**
   - Implement project‑level UI to list and view `SyncedEmail` docs.
   - Add links to `messageUrl`.

7. **Polish & Error Handling**
   - Handle missing integrations gracefully (e.g. show message: “Connect Gmail/Outlook to see emails”).
   - Log errors from sync function and implement simple retry logic.

---

## 9. Acceptance Criteria

- A logged‑in Momentum user can:
  1. Connect their Gmail account, and later disconnect it.
  2. Connect their Outlook account, and later disconnect it.
  3. For any project they can access, define one or more email rules by sender address.
  4. After the scheduled sync runs, see recent emails from those senders appear in the project’s Emails panel, with correct subject, from, snippet, and timestamp.
  5. Click a link to open the email in Gmail/Outlook.
- No emails are shown to users who do not have access to the project.
- Removing an integration stops further email imports for that user (existing emails may remain but no new ones are added).

---

## 10. Notes for Future Extensions (Optional)

These items are **not** required for v1 but the design should not block them:

- Support for Gmail/Outlook **labels/folders** as first‑class filters in `EmailRule`.
- Webhook‑based near real‑time sync:
  - Gmail `watch` + Pub/Sub.
  - Outlook Graph change notifications.
- Ability to attach emails directly to **tasks** or **milestones**.
- Full email body rendering with safe HTML sanitisation.
- Storing thread relationships and showing conversations.

---

This spec is intended to be self‑contained. The AI should now:

1. Map this design onto the existing Momentum codebase structure.
2. Generate the necessary TypeScript types, Firestore helpers, API routes, Cloud Functions, and React components.
3. Keep all new code behind clear feature flags or module boundaries if needed, so it can be integrated incrementally.

