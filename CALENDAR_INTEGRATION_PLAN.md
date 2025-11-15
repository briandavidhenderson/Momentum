# Momentum Multi-Calendar Integration Plan

## ⚠️ STATUS: FUTURE ROADMAP - NOT YET IMPLEMENTED

> **This is a detailed specification for Google/Microsoft Calendar integration.**
>
> - 📋 **Status:** Planning Phase - Not Yet Started
> - 📅 **Expected Timeline:** Q2 2025 (7 weeks estimated)
> - 🎯 **Priority:** Medium-High
> - 💼 **Business Value:** High - Streamlines researcher scheduling

**Version:** 1.0
**Date:** 2025-01-13

---

## Executive Summary

Momentum will integrate Google Calendar, Microsoft Outlook/Office 365 Calendar, and internal lab events into a unified, real-time calendar experience. This feature will enable researchers and lab teams to view and manage all their events in one place, with automatic synchronization and conflict resolution.

### Key Benefits
- **Single Source of Truth**: All events (internal + external) in one interface
- **Real-Time Sync**: Automatic updates via push notifications/webhooks
- **Privacy-Preserving**: User controls which calendars to sync
- **Seamless Integration**: Leverages existing OAuth patterns (ORCID)
- **Zero Maintenance**: After one-time setup, sync happens automatically

### User Experience
1. User clicks "Connect Google Calendar" in settings
2. OAuth popup → User authorizes → Connection established
3. Events automatically import and stay synchronized
4. User sees unified calendar with filtering by source
5. Conflicts resolved automatically or with simple UI prompts

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Technical Architecture](#technical-architecture)
3. [Data Model](#data-model)
4. [OAuth Integration](#oauth-integration)
5. [Sync Architecture](#sync-architecture)
6. [UI Components](#ui-components)
7. [Implementation Phases](#implementation-phases)
8. [Security & Privacy](#security--privacy)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)
11. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Existing Calendar Implementation

**Component:** `components/views/CalendarEvents.tsx`
- Basic event display (upcoming/past)
- Simple create/delete operations
- Event types: meeting, deadline, milestone, training, other
- View modes: day/week/month (UI only)

**Hook:** `lib/hooks/useCalendar.ts`
- Real-time Firestore subscription
- CRUD operations via AppContext
- Lab-scoped event access

**Data Structure:** `lib/types.ts` (CalendarEvent interface)
```typescript
interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: Date
  end: Date
  attendees: EventAttendee[]
  reminders?: EventReminder[]
  type?: "meeting" | "deadline" | "milestone" | "training" | "other"
  integrationRefs?: {  // ✅ Already exists!
    googleEventId?: string
    outlookEventId?: string
  }
  // ... additional fields
}
```

### Strengths
✅ **Type-safe** with comprehensive TypeScript interfaces
✅ **Real-time updates** via Firestore subscriptions
✅ **OAuth experience** from ORCID integration
✅ **Lab-based scoping** for multi-user support
✅ **Integration hooks** already in CalendarEvent type

### Gaps to Address
⚠️ No calendar source tracking (Google vs Outlook vs internal)
⚠️ No OAuth token storage for external calendars
⚠️ No sync orchestration logic
⚠️ No conflict detection/resolution
⚠️ No UI for connecting external calendars

---

## Technical Architecture

### System Overview

```
┌─────────────────┐
│   Frontend UI   │
│  (React/Next)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│   AppContext    │◄──────┤  useCalendar()   │
│   (Events)      │       └──────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│            Firestore Collections            │
│  ┌──────────┐ ┌───────────────┐ ┌────────┐ │
│  │ /events  │ │ /calendar     │ │ /sync  │ │
│  │          │ │ Connections   │ │ Logs   │ │
│  └──────────┘ └───────────────┘ └────────┘ │
└─────────────────────────────────────────────┘
         │                    ▲
         ▼                    │
┌──────────────────────────────────────────────┐
│       Firebase Cloud Functions               │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │  OAuth Handlers │  │  Sync Functions  │  │
│  │  (Google/MS)    │  │  (Webhooks)      │  │
│  └─────────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────┘
         │                    ▲
         ▼                    │
┌────────────────────────────────────────────┐
│       External Calendar APIs               │
│  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Google Calendar │  │ Microsoft Graph │ │
│  │      API        │  │   Calendar API  │ │
│  └─────────────────┘  └─────────────────┘ │
└────────────────────────────────────────────┘
```

### Data Flow

**Initial Connection:**
```
User → Connect Button → OAuth Function → Provider Consent →
Callback → Store Tokens → Fetch Calendars → Initial Sync → Firestore
```

**Real-Time Sync:**
```
Provider Event Change → Webhook POST → Cloud Function →
Fetch Delta → Normalize → Update Firestore → Real-time UI Update
```

**User Creates Event:**
```
User → Create Event Form → Firestore → (Future: Sync to Provider)
```

---

## Data Model

### New Type Definitions

#### CalendarConnection
```typescript
interface CalendarConnection {
  id: string                    // Firestore document ID
  userId: string                // Momentum user ID
  provider: 'google' | 'microsoft'
  providerAccountId: string     // email or unique ID from provider
  providerAccountName: string   // Display name (e.g., "john@example.com")

  // Connected calendars from this account
  calendars: ConnectedCalendar[]

  // Sync settings
  syncEnabled: boolean
  syncDirection: 'import' | 'export' | 'bidirectional'
  defaultCalendarId?: string    // Primary calendar for exports

  // Status & metadata
  status: 'active' | 'expired' | 'error'
  lastSyncedAt?: string
  syncError?: string

  // OAuth metadata (tokens stored server-side only)
  tokenExpiresAt?: string

  // Webhook/push notification IDs
  webhookChannelId?: string     // Google push channel
  subscriptionId?: string       // Microsoft subscription

  createdAt: string
  updatedAt?: string
}
```

#### ConnectedCalendar
```typescript
interface ConnectedCalendar {
  id: string                    // Calendar ID from provider
  name: string                  // Calendar name
  description?: string
  isPrimary: boolean            // Provider's primary calendar
  isSelected: boolean           // User chose to sync this calendar
  color?: string                // Calendar color for UI
  timeZone?: string             // Calendar timezone
  accessRole: 'owner' | 'writer' | 'reader'
}
```

#### Extended CalendarEvent
```typescript
// Add to existing CalendarEvent interface:
interface CalendarEvent {
  // ... existing fields ...

  // NEW FIELDS:
  calendarSource?: 'momentum' | 'google' | 'microsoft'
  calendarId?: string           // Specific calendar within provider
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncedAt?: string
  syncError?: string
  isReadOnly?: boolean          // External events may be read-only
  externalUrl?: string          // Link to event in external calendar
}
```

#### CalendarSyncLog
```typescript
interface CalendarSyncLog {
  id: string
  userId: string
  connectionId: string
  timestamp: string
  status: 'success' | 'partial' | 'failed'
  eventsImported: number
  eventsExported: number
  eventsUpdated: number
  eventsDeleted: number
  errors?: SyncError[]
  duration?: number             // Sync duration in ms
}

interface SyncError {
  eventId?: string
  eventTitle?: string
  error: string
  action: 'import' | 'export' | 'update' | 'delete'
}
```

#### CalendarConflict
```typescript
interface CalendarConflict {
  id: string
  eventId: string
  userId: string
  localVersion: Partial<CalendarEvent>
  remoteVersion: Partial<CalendarEvent>
  conflictFields: string[]      // Which fields differ
  detectedAt: string
  resolution?: 'local' | 'remote' | 'merge' | 'manual'
  resolvedAt?: string
  resolvedBy?: string           // User ID who resolved
}
```

#### Extended PersonProfile
```typescript
// Add to existing PersonProfile interface:
interface PersonProfile {
  // ... existing fields ...

  // NEW FIELDS:
  calendarConnections?: {
    google?: string             // CalendarConnection document ID
    microsoft?: string
  }
  calendarPreferences?: {
    defaultView: 'day' | 'week' | 'month'
    workingHours: {
      start: string             // e.g., "09:00"
      end: string               // e.g., "17:00"
    }
    showWeekends: boolean
    defaultCalendar?: string    // Which calendar to create events in
  }
}
```

### Firestore Collections

```
/events/{eventId}
  - All events (internal + external)
  - calendarSource field distinguishes origin

/calendarConnections/{connectionId}
  - One document per connected account
  - userId indexed for queries
  - Tokens NOT stored here (server-side only)

/calendarSyncLogs/{logId}
  - Audit trail of all sync operations
  - userId indexed for per-user queries

/calendarConflicts/{conflictId}
  - Unresolved conflicts requiring user input
  - Auto-deleted after resolution
```

### Firestore Security Rules

```javascript
match /events/{eventId} {
  // Existing rules + read-only for external events
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() &&
                   request.resource.data.createdBy == request.auth.uid;
  allow update: if isAuthenticated() && (
    // Can edit own events OR events in same lab (if admin)
    (resource.data.createdBy == request.auth.uid &&
     resource.data.isReadOnly != true) ||
    isAdmin()
  );
  allow delete: if isAdmin() || (
    isAuthenticated() &&
    resource.data.createdBy == request.auth.uid &&
    resource.data.isReadOnly != true
  );
}

match /calendarConnections/{connectionId} {
  // Users can only access their own connections
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update: if request.auth.uid == resource.data.userId;
  allow delete: if request.auth.uid == resource.data.userId;
}

match /calendarSyncLogs/{logId} {
  // Users can read their own logs
  allow read: if request.auth.uid == resource.data.userId;
  // Only functions can create logs
  allow create: if false;
}

match /calendarConflicts/{conflictId} {
  // Users can read and resolve their own conflicts
  allow read, update: if request.auth.uid == resource.data.userId;
  // Only functions can create conflicts
  allow create: if false;
}
```

---

## OAuth Integration

### Leveraging Existing ORCID Pattern

Momentum already has a proven OAuth implementation for ORCID (`lib/auth/orcid.ts`). We'll replicate this pattern for Google and Microsoft.

#### ORCID Pattern Overview

**Files:**
- `firebase/functions/src/index.ts` - OAuth functions (`orcidAuthStart`, `orcidAuthCallback`)
- `lib/auth/orcid.ts` - Client-side OAuth library

**Flow:**
1. User clicks "Connect" button
2. Frontend calls `orcidAuthStart` Cloud Function
3. Function generates OAuth URL with state parameter
4. Popup opens to provider consent screen
5. User authorizes → Provider redirects to callback
6. Callback function exchanges code for tokens
7. Tokens stored securely (encrypted)
8. Connection saved to Firestore
9. Popup closes → Success toast

### Google Calendar OAuth

#### Prerequisites
- Google Cloud Project with Calendar API enabled
- OAuth 2.0 credentials (Client ID + Secret)
- Authorized redirect URI: `https://momentum-a60c5.firebaseapp.com/__/auth/handler`

#### Scopes
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
```

#### Cloud Functions

**`googleCalendarAuthStart`**
```typescript
export const googleCalendarAuthStart = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
  }

  const userId = context.auth.uid
  const state = generateState(userId)

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
    `state=${state}&` +
    `access_type=offline&` +  // Get refresh token
    `prompt=consent`          // Force consent for refresh token

  return { authUrl, state }
})
```

**`googleCalendarAuthCallback`**
```typescript
export const googleCalendarAuthCallback = functions.https.onCall(async (data, context) => {
  // Verify authentication and state
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
  }

  const { code, state } = data
  const userId = context.auth.uid

  // Verify state parameter
  if (!verifyState(state, userId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid state parameter')
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code)

  // Get user's calendar list
  const calendars = await fetchCalendarList(tokens.access_token)

  // Store connection in Firestore
  const connection: CalendarConnection = {
    id: generateId(),
    userId,
    provider: 'google',
    providerAccountId: tokens.email,  // From ID token
    providerAccountName: tokens.email,
    calendars: calendars.map(cal => ({
      id: cal.id,
      name: cal.summary,
      isPrimary: cal.primary || false,
      isSelected: cal.primary || false,  // Auto-select primary
      color: cal.backgroundColor,
      timeZone: cal.timeZone,
      accessRole: cal.accessRole
    })),
    syncEnabled: true,
    syncDirection: 'import',
    status: 'active',
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    createdAt: new Date().toISOString()
  }

  await db.collection('calendarConnections').doc(connection.id).set(connection)

  // Store encrypted tokens in Secret Manager (server-side only)
  await storeEncryptedTokens(connection.id, tokens)

  // Register push notification channel
  await registerGooglePushChannel(connection.id, tokens.access_token)

  // Trigger initial sync
  await syncGoogleCalendar(connection.id)

  // Update user profile
  await db.collection('profiles').doc(userId).update({
    'calendarConnections.google': connection.id
  })

  return { success: true, connectionId: connection.id }
})
```

#### Client Library: `lib/calendar/google.ts`

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

/**
 * Initiate Google Calendar OAuth flow
 * Opens popup and handles callback
 */
export async function linkGoogleCalendar(): Promise<boolean> {
  const functions = getFunctions()
  const authStart = httpsCallable(functions, 'googleCalendarAuthStart')

  try {
    // Get auth URL
    const result = await authStart()
    const { authUrl, state } = result.data as { authUrl: string, state: string }

    // Open popup
    const popup = window.open(
      authUrl,
      'Google Calendar Authorization',
      'width=600,height=700'
    )

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.')
    }

    // Wait for callback
    return await waitForCallback(popup, state)
  } catch (error) {
    console.error('Google Calendar auth error:', error)
    return false
  }
}

async function waitForCallback(popup: Window, state: string): Promise<boolean> {
  // Poll popup for completion
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkInterval)
          resolve(false)
          return
        }

        // Check if callback completed
        const url = popup.location.href
        if (url.includes('state=' + state)) {
          popup.close()
          clearInterval(checkInterval)
          resolve(true)
        }
      } catch (e) {
        // Cross-origin error expected during OAuth flow
      }
    }, 500)

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval)
      popup.close()
      resolve(false)
    }, 300000)
  })
}

export async function unlinkGoogleCalendar(connectionId: string): Promise<void> {
  const functions = getFunctions()
  const unlink = httpsCallable(functions, 'unlinkGoogleCalendar')

  await unlink({ connectionId })
}

export function isGoogleCalendarLinked(profile: PersonProfile): boolean {
  return !!profile.calendarConnections?.google
}
```

### Microsoft/Outlook OAuth

#### Prerequisites
- Azure AD App Registration
- Application (client) ID + Client Secret
- Redirect URI: `https://momentum-a60c5.firebaseapp.com/__/auth/handler`
- API Permissions: `Calendars.Read`, `Calendars.ReadWrite`

#### Scopes
```
https://graph.microsoft.com/Calendars.Read
https://graph.microsoft.com/Calendars.ReadWrite
offline_access
```

#### Cloud Functions

**`microsoftCalendarAuthStart`**
```typescript
export const microsoftCalendarAuthStart = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
  }

  const userId = context.auth.uid
  const state = generateState(userId)

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${MS_CLIENT_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(MS_SCOPES)}&` +
    `state=${state}&` +
    `response_mode=query`

  return { authUrl, state }
})
```

**`microsoftCalendarAuthCallback`**
```typescript
export const microsoftCalendarAuthCallback = functions.https.onCall(async (data, context) => {
  // Similar to Google, but using Microsoft Graph API
  // Exchange code for tokens
  // Fetch calendars via /me/calendars
  // Create subscription for push notifications
  // Store connection in Firestore
})
```

---

## Sync Architecture

### Real-Time Sync Strategy

#### Google Calendar: Push Notifications

**Initial Setup (in `googleCalendarAuthCallback`):**
```typescript
async function registerGooglePushChannel(connectionId: string, accessToken: string) {
  const calendar = google.calendar({ version: 'v3', auth: accessToken })

  // Register watch for primary calendar
  const channel = await calendar.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: connectionId,                          // Our connection ID
      type: 'web_hook',
      address: 'https://us-central1-momentum-a60c5.cloudfunctions.net/googleCalendarWebhook',
      expiration: Date.now() + (7 * 24 * 60 * 60 * 1000)  // 7 days
    }
  })

  // Store channel info for renewal
  await db.collection('calendarConnections').doc(connectionId).update({
    webhookChannelId: channel.data.id,
    webhookResourceId: channel.data.resourceId,
    webhookExpiration: channel.data.expiration
  })
}
```

**Webhook Handler:**
```typescript
export const googleCalendarWebhook = functions.https.onRequest(async (req, res) => {
  // Verify notification
  const channelId = req.headers['x-goog-channel-id'] as string
  const resourceState = req.headers['x-goog-resource-state'] as string

  if (resourceState === 'sync') {
    // Initial sync notification - acknowledge and return
    res.status(200).send('OK')
    return
  }

  // Get connection
  const connectionSnap = await db.collection('calendarConnections')
    .where('webhookChannelId', '==', channelId)
    .limit(1)
    .get()

  if (connectionSnap.empty) {
    res.status(404).send('Connection not found')
    return
  }

  const connection = connectionSnap.docs[0].data() as CalendarConnection

  // Acknowledge immediately
  res.status(200).send('OK')

  // Process changes asynchronously
  await syncGoogleCalendarChanges(connection.id)
})
```

**Incremental Sync:**
```typescript
async function syncGoogleCalendarChanges(connectionId: string) {
  const connection = await getConnection(connectionId)
  const tokens = await getDecryptedTokens(connectionId)

  const calendar = google.calendar({ version: 'v3', auth: tokens.access_token })

  // Fetch incremental changes using syncToken
  const response = await calendar.events.list({
    calendarId: 'primary',
    syncToken: connection.syncToken,  // From previous sync
    singleEvents: true
  })

  const changes = response.data.items || []

  for (const googleEvent of changes) {
    if (googleEvent.status === 'cancelled') {
      // Event deleted
      await deleteEventByGoogleId(googleEvent.id)
    } else {
      // Event created or updated
      const momentumEvent = normalizeGoogleEvent(googleEvent, 'primary')
      await upsertEvent(momentumEvent)
    }
  }

  // Save new syncToken for next incremental sync
  await db.collection('calendarConnections').doc(connectionId).update({
    syncToken: response.data.nextSyncToken,
    lastSyncedAt: new Date().toISOString()
  })
}
```

**Channel Renewal (Cloud Scheduler):**
```typescript
export const renewGoogleCalendarChannels = functions.pubsub
  .schedule('every 5 days')
  .onRun(async (context) => {
    // Query connections with expiring channels
    const expiringSnap = await db.collection('calendarConnections')
      .where('provider', '==', 'google')
      .where('webhookExpiration', '<', Date.now() + (2 * 24 * 60 * 60 * 1000))
      .get()

    for (const doc of expiringSnap.docs) {
      const connection = doc.data() as CalendarConnection
      const tokens = await getDecryptedTokens(connection.id)

      // Stop old channel
      await stopGoogleChannel(connection.webhookChannelId, connection.webhookResourceId)

      // Register new channel
      await registerGooglePushChannel(connection.id, tokens.access_token)
    }
  })
```

#### Microsoft Graph: Subscription Notifications

**Initial Setup (in `microsoftCalendarAuthCallback`):**
```typescript
async function createGraphSubscription(connectionId: string, accessToken: string) {
  const subscription = {
    changeType: 'created,updated,deleted',
    notificationUrl: 'https://us-central1-momentum-a60c5.cloudfunctions.net/microsoftCalendarWebhook',
    resource: 'me/events',
    expirationDateTime: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString(),  // 3 days
    clientState: connectionId  // For verification
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  })

  const data = await response.json()

  // Store subscription info
  await db.collection('calendarConnections').doc(connectionId).update({
    subscriptionId: data.id,
    subscriptionExpiration: data.expirationDateTime
  })
}
```

**Webhook Handler:**
```typescript
export const microsoftCalendarWebhook = functions.https.onRequest(async (req, res) => {
  // Handle validation token (Microsoft requires this on first setup)
  if (req.query.validationToken) {
    res.status(200).send(req.query.validationToken)
    return
  }

  // Verify clientState
  const notifications = req.body.value || []

  for (const notification of notifications) {
    const connectionId = notification.clientState

    // Acknowledge
    res.status(202).send('Accepted')

    // Process changes asynchronously
    await syncMicrosoftCalendarChanges(connectionId)
  }
})
```

**Incremental Sync (Delta Queries):**
```typescript
async function syncMicrosoftCalendarChanges(connectionId: string) {
  const connection = await getConnection(connectionId)
  const tokens = await getDecryptedTokens(connectionId)

  // Use delta query for incremental changes
  const deltaLink = connection.deltaLink ||
                   'https://graph.microsoft.com/v1.0/me/events/delta'

  const response = await fetch(deltaLink, {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
  })

  const data = await response.json()
  const changes = data.value || []

  for (const msEvent of changes) {
    if (msEvent['@removed']) {
      // Event deleted
      await deleteEventByOutlookId(msEvent.id)
    } else {
      // Event created or updated
      const momentumEvent = normalizeMicrosoftEvent(msEvent, 'primary')
      await upsertEvent(momentumEvent)
    }
  }

  // Save deltaLink for next sync
  await db.collection('calendarConnections').doc(connectionId).update({
    deltaLink: data['@odata.deltaLink'],
    lastSyncedAt: new Date().toISOString()
  })
}
```

**Subscription Renewal:**
```typescript
export const renewMicrosoftSubscriptions = functions.pubsub
  .schedule('every 2 days')
  .onRun(async (context) => {
    // Microsoft subscriptions expire after 3 days
    const expiringSnap = await db.collection('calendarConnections')
      .where('provider', '==', 'microsoft')
      .where('subscriptionExpiration', '<', new Date(Date.now() + (1 * 24 * 60 * 60 * 1000)).toISOString())
      .get()

    for (const doc of expiringSnap.docs) {
      const connection = doc.data() as CalendarConnection
      const tokens = await getDecryptedTokens(connection.id)

      // Renew subscription
      const newExpiration = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString()

      await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${connection.subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expirationDateTime: newExpiration })
      })

      // Update Firestore
      await doc.ref.update({ subscriptionExpiration: newExpiration })
    }
  })
```

### Event Normalization

**`lib/calendar/normalize.ts`:**

```typescript
/**
 * Normalize Google Calendar event to Momentum format
 */
export function normalizeGoogleEvent(
  googleEvent: any,
  calendarId: string,
  labId: string,
  userId: string
): Omit<CalendarEvent, 'id'> {
  return {
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description,
    location: googleEvent.location,
    linkUrl: googleEvent.htmlLink,
    start: new Date(googleEvent.start.dateTime || googleEvent.start.date),
    end: new Date(googleEvent.end.dateTime || googleEvent.end.date),
    attendees: (googleEvent.attendees || []).map((a: any) => ({
      email: a.email,
      name: a.displayName || a.email,
      status: mapGoogleResponseStatus(a.responseStatus)
    })),
    reminders: (googleEvent.reminders?.overrides || []).map((r: any) => ({
      method: r.method === 'email' ? 'email' : 'notification',
      minutes: r.minutes
    })),
    visibility: googleEvent.visibility === 'private' ? 'private' : 'public',
    calendarSource: 'google',
    calendarId: calendarId,
    isReadOnly: true,  // External events are read-only initially
    externalUrl: googleEvent.htmlLink,
    integrationRefs: {
      googleEventId: googleEvent.id
    },
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    labId: labId,
    createdBy: userId,
    createdAt: new Date(googleEvent.created),
    updatedAt: new Date(googleEvent.updated)
  }
}

/**
 * Normalize Microsoft Graph event to Momentum format
 */
export function normalizeMicrosoftEvent(
  msEvent: any,
  calendarId: string,
  labId: string,
  userId: string
): Omit<CalendarEvent, 'id'> {
  return {
    title: msEvent.subject || 'Untitled Event',
    description: msEvent.bodyPreview || msEvent.body?.content,
    location: msEvent.location?.displayName,
    linkUrl: msEvent.webLink,
    start: new Date(msEvent.start.dateTime + 'Z'),  // Microsoft doesn't include Z
    end: new Date(msEvent.end.dateTime + 'Z'),
    attendees: (msEvent.attendees || []).map((a: any) => ({
      email: a.emailAddress.address,
      name: a.emailAddress.name,
      status: mapMsResponseStatus(a.status.response)
    })),
    visibility: msEvent.sensitivity === 'private' ? 'private' : 'public',
    calendarSource: 'microsoft',
    calendarId: calendarId,
    isReadOnly: true,
    externalUrl: msEvent.webLink,
    integrationRefs: {
      outlookEventId: msEvent.id
    },
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    labId: labId,
    createdBy: userId,
    createdAt: new Date(msEvent.createdDateTime),
    updatedAt: new Date(msEvent.lastModifiedDateTime)
  }
}

function mapGoogleResponseStatus(status: string): 'accepted' | 'declined' | 'tentative' | 'needsAction' {
  const map: Record<string, any> = {
    'accepted': 'accepted',
    'declined': 'declined',
    'tentative': 'tentative',
    'needsAction': 'needsAction'
  }
  return map[status] || 'needsAction'
}

function mapMsResponseStatus(status: string): 'accepted' | 'declined' | 'tentative' | 'needsAction' {
  const map: Record<string, any> = {
    'accepted': 'accepted',
    'declined': 'declined',
    'tentativelyAccepted': 'tentative',
    'notResponded': 'needsAction'
  }
  return map[status] || 'needsAction'
}
```

### Conflict Detection & Resolution

**`lib/calendar/conflicts.ts`:**

```typescript
/**
 * Detect if an event has conflicting changes
 */
export function detectConflict(
  localEvent: CalendarEvent,
  remoteEvent: CalendarEvent
): CalendarConflict | null {
  // No conflict if:
  // 1. Event hasn't been synced before (lastSyncedAt is undefined)
  // 2. Local hasn't been modified since last sync
  // 3. Remote hasn't been modified since last sync

  if (!localEvent.lastSyncedAt) {
    return null  // First sync, no conflict possible
  }

  const lastSync = new Date(localEvent.lastSyncedAt)
  const localModified = localEvent.updatedAt ? new Date(localEvent.updatedAt) : new Date(0)
  const remoteModified = remoteEvent.updatedAt ? new Date(remoteEvent.updatedAt) : new Date(0)

  // Both modified after last sync = conflict
  if (localModified > lastSync && remoteModified > lastSync) {
    const conflictFields = findConflictingFields(localEvent, remoteEvent)

    return {
      id: generateId(),
      eventId: localEvent.id,
      userId: localEvent.createdBy,
      localVersion: localEvent,
      remoteVersion: remoteEvent,
      conflictFields,
      detectedAt: new Date().toISOString()
    }
  }

  return null
}

function findConflictingFields(local: CalendarEvent, remote: CalendarEvent): string[] {
  const fields = ['title', 'description', 'location', 'start', 'end']
  const conflicts: string[] = []

  for (const field of fields) {
    const localVal = JSON.stringify(local[field])
    const remoteVal = JSON.stringify(remote[field])

    if (localVal !== remoteVal) {
      conflicts.push(field)
    }
  }

  return conflicts
}

/**
 * Resolve conflict using specified strategy
 */
export function resolveConflict(
  conflict: CalendarConflict,
  resolution: 'local' | 'remote' | 'merge'
): CalendarEvent {
  switch (resolution) {
    case 'local':
      return conflict.localVersion as CalendarEvent

    case 'remote':
      return conflict.remoteVersion as CalendarEvent

    case 'merge':
      // Simple merge: prefer local for content, remote for timestamps
      return {
        ...conflict.remoteVersion,
        title: conflict.localVersion.title || conflict.remoteVersion.title,
        description: conflict.localVersion.description || conflict.remoteVersion.description,
        location: conflict.localVersion.location || conflict.remoteVersion.location
      } as CalendarEvent
  }
}

/**
 * Auto-resolve conflicts using heuristics
 */
export function autoResolveConflict(conflict: CalendarConflict): 'local' | 'remote' | null {
  // Auto-resolve in favor of:
  // 1. More recent change
  // 2. More complete data (more fields filled)

  const localModified = conflict.localVersion.updatedAt ?
    new Date(conflict.localVersion.updatedAt) : new Date(0)
  const remoteModified = conflict.remoteVersion.updatedAt ?
    new Date(conflict.remoteVersion.updatedAt) : new Date(0)

  const timeDiff = Math.abs(remoteModified.getTime() - localModified.getTime())

  // If modified within 5 seconds, can't auto-resolve
  if (timeDiff < 5000) {
    return null  // Require manual resolution
  }

  // Prefer most recent
  return remoteModified > localModified ? 'remote' : 'local'
}
```

---

## UI Components

### Calendar Connections Component

**`components/CalendarConnections.tsx`:**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { CalendarIcon, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { linkGoogleCalendar, unlinkGoogleCalendar } from '@/lib/calendar/google'
import { linkMicrosoftCalendar, unlinkMicrosoftCalendar } from '@/lib/calendar/microsoft'
import { useAuth } from '@/lib/hooks/useAuth'

export function CalendarConnections() {
  const { currentUserProfile } = useAuth()
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(false)

  const googleConnected = !!currentUserProfile?.calendarConnections?.google
  const microsoftConnected = !!currentUserProfile?.calendarConnections?.microsoft

  const handleConnectGoogle = async () => {
    setLoading(true)
    try {
      const success = await linkGoogleCalendar()
      if (success) {
        toast.success('Google Calendar connected successfully!')
      } else {
        toast.error('Failed to connect Google Calendar')
      }
    } catch (error) {
      toast.error('Error connecting Google Calendar')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!currentUserProfile?.calendarConnections?.google) return

    setLoading(true)
    try {
      await unlinkGoogleCalendar(currentUserProfile.calendarConnections.google)
      toast.success('Google Calendar disconnected')
    } catch (error) {
      toast.error('Error disconnecting Google Calendar')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectMicrosoft = async () => {
    setLoading(true)
    try {
      const success = await linkMicrosoftCalendar()
      if (success) {
        toast.success('Microsoft Calendar connected successfully!')
      } else {
        toast.error('Failed to connect Microsoft Calendar')
      }
    } catch (error) {
      toast.error('Error connecting Microsoft Calendar')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectMicrosoft = async () => {
    if (!currentUserProfile?.calendarConnections?.microsoft) return

    setLoading(true)
    try {
      await unlinkMicrosoftCalendar(currentUserProfile.calendarConnections.microsoft)
      toast.success('Microsoft Calendar disconnected')
    } catch (error) {
      toast.error('Error disconnecting Microsoft Calendar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Sync events from your Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {googleConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="success">Connected</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <Badge variant="secondary">Not Connected</Badge>
                </>
              )}
            </div>
            {googleConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnectGoogle}
                disabled={loading}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnectGoogle}
                disabled={loading}
              >
                Connect Google Calendar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Microsoft Outlook
          </CardTitle>
          <CardDescription>
            Sync events from your Outlook/Office 365 calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {microsoftConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="success">Connected</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <Badge variant="secondary">Not Connected</Badge>
                </>
              )}
            </div>
            {microsoftConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnectMicrosoft}
                disabled={loading}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnectMicrosoft}
                disabled={loading}
              >
                Connect Outlook Calendar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Calendar Source Filters

**Update `components/views/CalendarEvents.tsx`:**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export function CalendarEvents() {
  const { events } = useAppContext()

  // Source filters
  const [sourceFilters, setSourceFilters] = useState({
    momentum: true,
    google: true,
    microsoft: true
  })

  // Filter events by source
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const source = event.calendarSource || 'momentum'
      return sourceFilters[source]
    })
  }, [events, sourceFilters])

  // Count by source
  const eventCounts = useMemo(() => {
    return {
      momentum: events.filter(e => !e.calendarSource || e.calendarSource === 'momentum').length,
      google: events.filter(e => e.calendarSource === 'google').length,
      microsoft: events.filter(e => e.calendarSource === 'microsoft').length
    }
  }, [events])

  return (
    <div className="space-y-4">
      {/* Source Filters */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Calendar Sources</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="filter-momentum"
              checked={sourceFilters.momentum}
              onCheckedChange={(checked) =>
                setSourceFilters({...sourceFilters, momentum: checked})
              }
            />
            <Label htmlFor="filter-momentum" className="cursor-pointer">
              Lab Events ({eventCounts.momentum})
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="filter-google"
              checked={sourceFilters.google}
              onCheckedChange={(checked) =>
                setSourceFilters({...sourceFilters, google: checked})
              }
            />
            <Label htmlFor="filter-google" className="cursor-pointer">
              Google Calendar ({eventCounts.google})
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="filter-microsoft"
              checked={sourceFilters.microsoft}
              onCheckedChange={(checked) =>
                setSourceFilters({...sourceFilters, microsoft: checked})
              }
            />
            <Label htmlFor="filter-microsoft" className="cursor-pointer">
              Outlook Calendar ({eventCounts.microsoft})
            </Label>
          </div>
        </div>
      </Card>

      {/* Rest of calendar UI... */}
      {/* Use filteredEvents instead of events */}
    </div>
  )
}
```

### Conflict Resolution Dialog

**`components/CalendarConflictDialog.tsx`:**

```tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface CalendarConflictDialogProps {
  conflict: CalendarConflict | null
  onResolve: (resolution: 'local' | 'remote' | 'merge') => void
  onClose: () => void
}

export function CalendarConflictDialog({ conflict, onResolve, onClose }: CalendarConflictDialogProps) {
  if (!conflict) return null

  const local = conflict.localVersion
  const remote = conflict.remoteVersion

  const providerName = local.calendarSource === 'google' ? 'Google Calendar' : 'Outlook'

  return (
    <Dialog open={!!conflict} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Calendar Sync Conflict
          </DialogTitle>
          <DialogDescription>
            This event was modified in both Momentum and {providerName}.
            Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-4">
          {/* Momentum Version */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Momentum Version</h4>
              <Badge>Local</Badge>
            </div>
            <EventPreview event={local} highlightFields={conflict.conflictFields} />
            <Button
              className="w-full mt-4"
              onClick={() => onResolve('local')}
            >
              Keep Momentum Version
            </Button>
          </div>

          {/* Provider Version */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{providerName} Version</h4>
              <Badge variant="secondary">Remote</Badge>
            </div>
            <EventPreview event={remote} highlightFields={conflict.conflictFields} />
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => onResolve('remote')}
            >
              Keep {providerName} Version
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onResolve('merge')}>
            Merge Both (Keep Most Recent)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EventPreview({ event, highlightFields }: { event: Partial<CalendarEvent>, highlightFields?: string[] }) {
  const isHighlighted = (field: string) => highlightFields?.includes(field)

  return (
    <div className="space-y-2 text-sm">
      <div className={isHighlighted('title') ? 'bg-yellow-100 p-1 rounded' : ''}>
        <span className="font-medium">Title:</span> {event.title}
      </div>
      <div className={isHighlighted('description') ? 'bg-yellow-100 p-1 rounded' : ''}>
        <span className="font-medium">Description:</span> {event.description || 'None'}
      </div>
      <div className={isHighlighted('location') ? 'bg-yellow-100 p-1 rounded' : ''}>
        <span className="font-medium">Location:</span> {event.location || 'None'}
      </div>
      <div className={isHighlighted('start') ? 'bg-yellow-100 p-1 rounded' : ''}>
        <span className="font-medium">Start:</span> {event.start ? new Date(event.start).toLocaleString() : 'N/A'}
      </div>
      <div className={isHighlighted('end') ? 'bg-yellow-100 p-1 rounded' : ''}>
        <span className="font-medium">End:</span> {event.end ? new Date(event.end).toLocaleString() : 'N/A'}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Modified: {event.updatedAt ? new Date(event.updatedAt).toLocaleString() : 'Unknown'}
      </div>
    </div>
  )
}
```

---

## Implementation Phases

### Phase 1: Foundation & Type System (Week 1)

**Deliverables:**
- ✅ New type definitions in `lib/types.ts`
- ✅ Extended CalendarEvent interface
- ✅ Extended PersonProfile interface
- ✅ New Firestore collections created
- ✅ Updated Firestore security rules
- ✅ New Firestore service functions

**Files to Create/Modify:**
- `lib/types.ts` - Add new interfaces
- `firestore.rules` - Add new collection rules
- `lib/firestoreService.ts` - Add connection CRUD operations

**Testing:**
- Unit tests for type definitions
- Firestore rules test suite

---

### Phase 2: Google Calendar OAuth (Week 2)

**Deliverables:**
- ✅ Google OAuth Cloud Functions
- ✅ Client-side Google OAuth library
- ✅ Token encryption/decryption utilities
- ✅ Calendar connection UI component

**Files to Create/Modify:**
- `firebase/functions/src/index.ts` - Add Google OAuth functions
- `lib/calendar/google.ts` - Client library
- `components/CalendarConnections.tsx` - Connection UI
- `lib/calendar/encryption.ts` - Token security

**Environment Setup:**
```bash
# Google Cloud Console
1. Create OAuth 2.0 credentials
2. Add authorized redirect URI: https://momentum-a60c5.firebaseapp.com/__/auth/handler
3. Enable Calendar API

# Firebase Functions Config
firebase functions:config:set google.client_id="YOUR_CLIENT_ID"
firebase functions:config:set google.client_secret="YOUR_CLIENT_SECRET"
firebase functions:config:set google.redirect_uri="https://momentum-a60c5.firebaseapp.com/__/auth/handler"
```

**Testing:**
- Manual OAuth flow test
- Token refresh test
- Calendar list fetching test

---

### Phase 3: Google Calendar Sync (Week 3)

**Deliverables:**
- ✅ Initial sync function
- ✅ Webhook handler for push notifications
- ✅ Channel renewal scheduler
- ✅ Event normalization utility
- ✅ Incremental sync with syncToken

**Files to Create/Modify:**
- `firebase/functions/src/index.ts` - Add sync functions
- `lib/calendar/normalize.ts` - Event normalization
- Cloud Scheduler job configuration

**Testing:**
- Initial sync with sample calendar
- Webhook notification handling
- Incremental sync verification
- Channel expiration and renewal

---

### Phase 4: Calendar Settings UI (Week 4)

**Deliverables:**
- ✅ Calendar source filters in CalendarEvents
- ✅ Sync status indicators
- ✅ Calendar selection (which calendars to sync)
- ✅ Manual sync trigger button

**Files to Create/Modify:**
- `components/views/CalendarEvents.tsx` - Add filters
- `components/CalendarConnections.tsx` - Enhance with calendar selection
- `components/CalendarSyncStatus.tsx` - Status indicators

**Testing:**
- Filter functionality
- Calendar selection persistence
- Manual sync triggering
- Real-time event updates in UI

---

### Phase 5: Microsoft/Outlook Integration (Week 5)

**Deliverables:**
- ✅ Microsoft OAuth Cloud Functions
- ✅ Client-side Microsoft OAuth library
- ✅ Graph API subscription management
- ✅ Delta query sync
- ✅ Subscription renewal scheduler
- ✅ Microsoft event normalization

**Files to Create/Modify:**
- `firebase/functions/src/index.ts` - Add Microsoft OAuth functions
- `lib/calendar/microsoft.ts` - Client library
- `lib/calendar/normalize.ts` - Add Microsoft normalization
- Cloud Scheduler job for subscription renewal

**Environment Setup:**
```bash
# Azure AD Portal
1. Create app registration
2. Add API permissions: Calendars.Read, Calendars.ReadWrite, offline_access
3. Generate client secret

# Firebase Functions Config
firebase functions:config:set microsoft.client_id="YOUR_APP_ID"
firebase functions:config:set microsoft.client_secret="YOUR_SECRET"
firebase functions:config:set microsoft.tenant_id="common"
```

**Testing:**
- Microsoft OAuth flow
- Graph API calls
- Webhook notifications
- Subscription renewal

---

### Phase 6: Sync Orchestration & Conflict Resolution (Week 6)

**Deliverables:**
- ✅ Conflict detection logic
- ✅ Auto-resolution heuristics
- ✅ Conflict resolution UI
- ✅ Sync orchestration service
- ✅ Error handling and retry logic
- ✅ Sync logs and audit trail

**Files to Create/Modify:**
- `lib/calendar/conflicts.ts` - Conflict logic
- `components/CalendarConflictDialog.tsx` - Resolution UI
- `lib/calendar/sync.ts` - Orchestration
- `lib/calendar/errors.ts` - Error handling

**Testing:**
- Simultaneous modification test
- Auto-resolution scenarios
- Manual resolution UI flow
- Error recovery

---

### Phase 7: Polish & Optimization (Week 7)

**Deliverables:**
- ✅ Rate limiting and throttling
- ✅ Batch operations optimization
- ✅ Timezone handling improvements
- ✅ User notifications for sync events
- ✅ Performance monitoring
- ✅ Documentation and help text

**Files to Create/Modify:**
- `lib/calendar/rateLimit.ts` - Rate limiting
- `lib/calendar/timezone.ts` - TZ utilities
- `components/CalendarHelp.tsx` - Help documentation

**Testing:**
- Load testing with large calendars
- Rate limit behavior
- Timezone edge cases
- End-to-end user flow

---

## Security & Privacy

### OAuth Token Security

**Storage:**
- ✅ Access tokens and refresh tokens stored in Google Secret Manager
- ✅ Encrypted at rest
- ✅ Never sent to client
- ✅ Only accessible by Cloud Functions

**Implementation:**
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

async function storeEncryptedTokens(connectionId: string, tokens: any) {
  const client = new SecretManagerServiceClient()

  const secretData = JSON.stringify({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in
  })

  await client.createSecret({
    parent: `projects/${PROJECT_ID}`,
    secretId: `calendar-tokens-${connectionId}`,
    secret: {
      replication: { automatic: {} }
    }
  })

  await client.addSecretVersion({
    parent: `projects/${PROJECT_ID}/secrets/calendar-tokens-${connectionId}`,
    payload: {
      data: Buffer.from(secretData)
    }
  })
}

async function getDecryptedTokens(connectionId: string) {
  const client = new SecretManagerServiceClient()

  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/calendar-tokens-${connectionId}/versions/latest`
  })

  const secretData = version.payload.data.toString('utf8')
  return JSON.parse(secretData)
}
```

### Webhook Verification

**Google:**
```typescript
// Verify Google push notifications
function verifyGoogleWebhook(req: functions.Request): boolean {
  const channelToken = req.headers['x-goog-channel-token']
  // Verify token matches what we registered
  return channelToken === EXPECTED_TOKEN
}
```

**Microsoft:**
```typescript
// Verify Microsoft Graph notifications
function verifyMicrosoftWebhook(req: functions.Request): boolean {
  const clientState = req.body.value?.[0]?.clientState
  // Verify clientState matches our connectionId
  return !!clientState && connectionExists(clientState)
}
```

### Data Privacy

**Principles:**
1. **User Control**: Users explicitly authorize each connection
2. **Minimal Scope**: Request only necessary permissions
3. **Transparent**: Clear UI showing what's synced
4. **Revocable**: Easy disconnection process
5. **Lab-Scoped**: Events respect lab access controls

**Firestore Rules:**
```javascript
// Users can only access their own calendar connections
match /calendarConnections/{connectionId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}

// Events respect lab access
match /events/{eventId} {
  allow read: if isAuthenticated() &&
    (resource.data.labId == getUserLabId(request.auth.uid) ||
     resource.data.createdBy == request.auth.uid);
}
```

### Rate Limiting

**Google Calendar API:**
- 1,000,000 queries per day
- 10 queries per second per user

**Microsoft Graph:**
- 10,000 requests per 10 minutes per app

**Implementation:**
```typescript
class TokenBucket {
  private tokens: number
  private lastRefill: number
  private capacity: number
  private refillRate: number

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity
    this.refillRate = refillRate
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    // Wait for refill
    const waitTime = (1 - this.tokens) / this.refillRate * 1000
    await new Promise(resolve => setTimeout(resolve, waitTime))
    this.tokens = 0
  }

  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }
}

// Usage
const googleRateLimiter = new TokenBucket(10, 10)  // 10 req/sec

async function callGoogleAPI() {
  await googleRateLimiter.acquire()
  // Make API call
}
```

---

## Testing Strategy

### Unit Tests

**Event Normalization:**
```typescript
describe('normalizeGoogleEvent', () => {
  it('should convert Google event to Momentum format', () => {
    const googleEvent = {
      id: 'google123',
      summary: 'Team Meeting',
      start: { dateTime: '2025-01-15T10:00:00-05:00' },
      end: { dateTime: '2025-01-15T11:00:00-05:00' },
      htmlLink: 'https://calendar.google.com/event?id=google123'
    }

    const result = normalizeGoogleEvent(googleEvent, 'primary', 'lab1', 'user1')

    expect(result.title).toBe('Team Meeting')
    expect(result.calendarSource).toBe('google')
    expect(result.integrationRefs?.googleEventId).toBe('google123')
    expect(result.externalUrl).toBe('https://calendar.google.com/event?id=google123')
  })
})
```

**Conflict Detection:**
```typescript
describe('detectConflict', () => {
  it('should detect conflict when both versions modified after last sync', () => {
    const localEvent = {
      id: '1',
      title: 'Local Title',
      lastSyncedAt: '2025-01-01T00:00:00Z',
      updatedAt: new Date('2025-01-02T00:00:00Z')
    }

    const remoteEvent = {
      id: '1',
      title: 'Remote Title',
      updatedAt: new Date('2025-01-02T01:00:00Z')
    }

    const conflict = detectConflict(localEvent, remoteEvent)

    expect(conflict).not.toBeNull()
    expect(conflict.conflictFields).toContain('title')
  })

  it('should not detect conflict if only remote modified', () => {
    const localEvent = {
      id: '1',
      title: 'Same Title',
      lastSyncedAt: '2025-01-02T00:00:00Z',
      updatedAt: new Date('2025-01-01T00:00:00Z')  // Before last sync
    }

    const remoteEvent = {
      id: '1',
      title: 'Same Title',
      updatedAt: new Date('2025-01-02T01:00:00Z')  // After last sync
    }

    const conflict = detectConflict(localEvent, remoteEvent)

    expect(conflict).toBeNull()
  })
})
```

### Integration Tests

**OAuth Flow:**
```typescript
describe('Google OAuth Flow', () => {
  it('should complete full OAuth flow', async () => {
    // 1. Call googleCalendarAuthStart
    const startResult = await googleCalendarAuthStart.call({ auth: { uid: 'user1' } }, {})
    expect(startResult.authUrl).toContain('accounts.google.com')

    // 2. Simulate user authorization and callback
    const callbackResult = await googleCalendarAuthCallback.call(
      { auth: { uid: 'user1' } },
      { code: 'mock_auth_code', state: startResult.state }
    )

    expect(callbackResult.success).toBe(true)
    expect(callbackResult.connectionId).toBeDefined()

    // 3. Verify connection created in Firestore
    const connection = await db.collection('calendarConnections')
      .doc(callbackResult.connectionId)
      .get()

    expect(connection.exists).toBe(true)
    expect(connection.data().provider).toBe('google')
  })
})
```

**Sync Operation:**
```typescript
describe('Calendar Sync', () => {
  it('should sync events from Google Calendar', async () => {
    const connectionId = 'test-connection-1'

    // Mock Google API responses
    jest.spyOn(google.calendar(), 'events').mockResolvedValue({
      data: {
        items: [
          {
            id: 'event1',
            summary: 'Test Event',
            start: { dateTime: '2025-01-15T10:00:00Z' },
            end: { dateTime: '2025-01-15T11:00:00Z' }
          }
        ],
        nextSyncToken: 'sync_token_123'
      }
    })

    await syncGoogleCalendar(connectionId)

    // Verify event created
    const events = await db.collection('events')
      .where('integrationRefs.googleEventId', '==', 'event1')
      .get()

    expect(events.size).toBe(1)
    expect(events.docs[0].data().title).toBe('Test Event')
  })
})
```

### Manual Testing Checklist

**OAuth Flow:**
- [ ] Click "Connect Google Calendar"
- [ ] Popup opens to Google consent screen
- [ ] Authorize access
- [ ] Popup closes automatically
- [ ] Success toast appears
- [ ] Connection shows as "Connected" in UI

**Event Sync:**
- [ ] Create event in Google Calendar
- [ ] Event appears in Momentum within 30 seconds
- [ ] Event details match (title, time, location)
- [ ] Update event in Google Calendar
- [ ] Updates reflect in Momentum
- [ ] Delete event in Google Calendar
- [ ] Event disappears from Momentum

**Filtering:**
- [ ] Toggle "Google Calendar" off
- [ ] Google events disappear
- [ ] Toggle back on
- [ ] Google events reappear
- [ ] Repeat for Outlook

**Conflict Resolution:**
- [ ] Modify event in Momentum
- [ ] Quickly modify same event in Google Calendar
- [ ] Conflict dialog appears
- [ ] Choose "Keep Momentum Version"
- [ ] Verify correct version persists
- [ ] Repeat choosing "Keep Google Version"

**Disconnection:**
- [ ] Click "Disconnect"
- [ ] Confirmation dialog appears
- [ ] Confirm disconnection
- [ ] External events remain (read-only)
- [ ] Future updates no longer sync
- [ ] Reconnect works correctly

---

## Deployment Plan

### Prerequisites

1. **Google Cloud Setup:**
   - ✅ Google Cloud Project created
   - ✅ Calendar API enabled
   - ✅ OAuth 2.0 credentials configured
   - ✅ Redirect URI whitelisted

2. **Azure AD Setup:**
   - ✅ App registration created
   - ✅ API permissions granted (Calendars.Read, Calendars.ReadWrite)
   - ✅ Client secret generated
   - ✅ Redirect URI configured

3. **Firebase Setup:**
   - ✅ Secret Manager API enabled
   - ✅ Cloud Scheduler jobs configured
   - ✅ Functions environment variables set

4. **Code Deployment:**
   - ✅ All type definitions merged
   - ✅ Firestore rules updated
   - ✅ Cloud Functions deployed
   - ✅ Frontend changes deployed

### Deployment Steps

**Week 1 (Foundation):**
```bash
# 1. Deploy type definitions
git checkout -b calendar-integration-foundation
# Make changes to lib/types.ts
git commit -m "feat: Add calendar connection types"

# 2. Deploy Firestore rules
firebase deploy --only firestore:rules

# 3. Deploy Firestore service updates
npm run build
firebase deploy --only hosting
```

**Week 2 (Google OAuth):**
```bash
# 1. Set environment variables
firebase functions:config:set google.client_id="..."
firebase functions:config:set google.client_secret="..."

# 2. Deploy functions
firebase deploy --only functions

# 3. Deploy frontend
npm run build
firebase deploy --only hosting

# 4. Test with personal Google account
```

**Week 3 (Google Sync):**
```bash
# 1. Deploy sync functions
firebase deploy --only functions

# 2. Create Cloud Scheduler job
gcloud scheduler jobs create pubsub renewGoogleChannels \
  --schedule="every 5 days" \
  --topic=renewGoogleChannels \
  --message-body="{}"

# 3. Test sync with real calendar
```

**Week 4 (UI):**
```bash
# 1. Deploy UI updates
npm run build
firebase deploy --only hosting

# 2. Test filters and settings
```

**Week 5 (Microsoft):**
```bash
# 1. Set Microsoft environment variables
firebase functions:config:set microsoft.client_id="..."
firebase functions:config:set microsoft.client_secret="..."

# 2. Deploy Microsoft functions
firebase deploy --only functions

# 3. Create subscription renewal scheduler
gcloud scheduler jobs create pubsub renewMicrosoftSubscriptions \
  --schedule="every 2 days" \
  --topic=renewMicrosoftSubscriptions \
  --message-body="{}"

# 4. Test with Outlook account
```

**Week 6 (Conflicts):**
```bash
# 1. Deploy conflict resolution
firebase deploy --only functions,hosting

# 2. Test conflict scenarios
```

**Week 7 (Polish):**
```bash
# 1. Final deployment
firebase deploy

# 2. Performance testing
# 3. Documentation review
# 4. User acceptance testing
```

### Rollout Strategy

**Phase 1: Internal Testing (1 week)**
- Deploy to development environment
- Test with team members' calendars
- Gather feedback
- Fix critical bugs

**Phase 2: Beta Users (2 weeks)**
- Enable for 10-20 volunteer users
- Monitor sync logs for errors
- Collect user feedback
- Iterate on UI/UX

**Phase 3: Gradual Rollout (2 weeks)**
- Enable for 25% of users
- Monitor performance metrics
- Enable for 50% of users
- Monitor API usage
- Enable for all users

**Phase 4: Full Production (Ongoing)**
- Monitor sync success rate
- Track API quota usage
- Respond to user feedback
- Add enhancements based on usage

### Monitoring

**Key Metrics:**
```typescript
// Log to Firebase Analytics
analytics.logEvent('calendar_connected', {
  provider: 'google'
})

analytics.logEvent('calendar_sync_completed', {
  provider: 'google',
  events_imported: 15,
  duration_ms: 1234
})

analytics.logEvent('calendar_sync_failed', {
  provider: 'google',
  error: 'rate_limit_exceeded'
})
```

**Alerts:**
- Sync failure rate > 5%
- API quota at 80%
- Average sync latency > 60 seconds
- Conflict rate > 10%

---

## Success Metrics

### Adoption Metrics

**Target: 60% of active users connect at least one calendar within 3 months**

- Weekly new connections
- Google vs Microsoft distribution
- Disconnection rate
- Re-connection rate

### Reliability Metrics

**Target: 99% sync success rate**

- Sync success rate per provider
- Average sync latency
- Webhook delivery rate
- Channel/subscription renewal success rate

### Performance Metrics

**Target: Sub-30-second sync latency**

- P50, P95, P99 sync latency
- Events per sync operation
- API call count per sync
- Firestore write operations

### User Satisfaction Metrics

**Target: <5% manual conflict resolution rate**

- Auto-resolved conflicts vs manual
- Conflict frequency
- Time to resolution
- User-reported sync issues

### API Usage Metrics

**Target: Stay within free tier limits**

- Google Calendar API calls per day
- Microsoft Graph API calls per day
- Secret Manager operations
- Cloud Function invocations

---

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating Google Calendar, Microsoft Outlook, and internal lab events into Momentum's unified calendar experience. By leveraging the existing ORCID OAuth pattern, clean type system, and real-time Firestore architecture, we can deliver this feature with minimal disruption to the existing codebase.

**Key Advantages:**
- ✅ Proven OAuth pattern from ORCID integration
- ✅ Real-time sync with push notifications
- ✅ Automatic conflict resolution with manual fallback
- ✅ Secure token storage with Secret Manager
- ✅ Phased rollout minimizes risk
- ✅ Comprehensive monitoring and metrics

**Timeline:** 7 weeks from start to full production
**Team Effort:** 1-2 developers, part-time
**Risk Level:** Low (building on proven patterns)

The result will be a seamless, professional-grade calendar integration that dramatically increases Momentum's value for research labs and teams, replacing fragmented scheduling systems with a unified source of truth.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-13
**Next Review:** Upon Phase 1 completion
