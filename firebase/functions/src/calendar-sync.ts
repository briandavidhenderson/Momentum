/**
 * Calendar Sync Utilities
 * Handles event normalization and syncing between Google Calendar, Microsoft Calendar, and Momentum
 */

import * as admin from "firebase-admin"
import { CalendarEvent, CalendarSyncLog } from "../../../lib/types"

/**
 * Google Calendar Event structure (simplified)
 */
interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    responseStatus?: string
    displayName?: string
  }>
  reminders?: {
    useDefault?: boolean
    overrides?: Array<{
      method: string
      minutes: number
    }>
  }
  recurrence?: string[]
  status?: string
  visibility?: string
  organizer?: {
    email: string
    displayName?: string
  }
  created?: string
  updated?: string
}

/**
 * Normalize Google Calendar event to Momentum CalendarEvent format
 */
export function normalizeGoogleEvent(
  googleEvent: GoogleCalendarEvent,
  userId: string,
  connectionId: string,
  calendarId: string
): Partial<CalendarEvent> {
  // Parse dates
  const startDateTime = googleEvent.start?.dateTime || googleEvent.start?.date
  const endDateTime = googleEvent.end?.dateTime || googleEvent.end?.date

  if (!startDateTime || !endDateTime) {
    throw new Error("Event missing start or end time")
  }

  const start = new Date(startDateTime)
  const end = new Date(endDateTime)

  // Map attendees
  const attendees = (googleEvent.attendees || []).map(attendee => ({
    personId: "", // TODO: Map email to PersonProfile ID
    role: attendee.displayName || attendee.email,
    response: mapGoogleResponseStatus(attendee.responseStatus),
    workloadImpactHours: undefined,
  }))

  // Map reminders
  const reminders = googleEvent.reminders?.overrides?.map(reminder => ({
    method: reminder.method as "email" | "notification" | "popup",
    minutesBefore: reminder.minutes,
  })) || []

  // Build normalized event
  const normalizedEvent: Partial<CalendarEvent> = {
    id: `google-${connectionId}-${googleEvent.id}`,
    title: googleEvent.summary || "(No title)",
    description: googleEvent.description || "",
    location: googleEvent.location || "",
    linkUrl: googleEvent.htmlLink || "",
    start,
    end,
    attendees,
    reminders,
    tags: [],
    visibility: mapGoogleVisibility(googleEvent.visibility),
    ownerId: userId,
    type: "other",
    notes: "",
    createdBy: userId,
    createdAt: new Date(googleEvent.created || Date.now()),
    updatedAt: new Date(googleEvent.updated || Date.now()),

    // Integration fields
    calendarSource: "google",
    calendarId,
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
    isReadOnly: true, // External events are read-only by default
    externalUrl: googleEvent.htmlLink || "",
    integrationRefs: {
      googleEventId: googleEvent.id,
    },
  }

  return normalizedEvent
}

/**
 * Map Google Calendar response status to Momentum format
 */
function mapGoogleResponseStatus(
  status?: string
): "accepted" | "declined" | "tentative" | "none" {
  switch (status) {
    case "accepted":
      return "accepted"
    case "declined":
      return "declined"
    case "tentative":
      return "tentative"
    default:
      return "none"
  }
}

/**
 * Map Google Calendar visibility to Momentum format
 */
function mapGoogleVisibility(
  visibility?: string
): "private" | "lab" | "organisation" {
  // Google uses: default, public, private, confidential
  // We map to Momentum's 3 levels
  switch (visibility) {
    case "private":
    case "confidential":
      return "private"
    case "public":
      return "organisation"
    default:
      return "lab"
  }
}

/**
 * Get access token for a connection (with refresh if needed)
 */
export async function getAccessToken(connectionId: string): Promise<string> {
  const tokenDoc = await admin
    .firestore()
    .collection("_calendarTokens")
    .doc(connectionId)
    .get()

  if (!tokenDoc.exists) {
    throw new Error("Token not found")
  }

  const tokenData = tokenDoc.data()!
  const now = Date.now()

  // Check if token is expired
  if (tokenData.expiresAt && tokenData.expiresAt < now) {
    // Token expired, need to refresh
    const newTokens = await refreshGoogleToken(
      tokenData.refreshToken,
      connectionId
    )
    return newTokens.accessToken
  }

  return tokenData.accessToken
}

/**
 * Refresh Google OAuth token
 */
async function refreshGoogleToken(
  refreshToken: string,
  connectionId: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    tokenUrl: "https://oauth2.googleapis.com/token",
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh token")
  }

  const data = await response.json()
  const accessToken = data.access_token
  const expiresIn = data.expires_in || 3600
  const expiresAt = Date.now() + expiresIn * 1000

  // Update stored tokens
  await admin
    .firestore()
    .collection("_calendarTokens")
    .doc(connectionId)
    .update({
      accessToken,
      expiresAt,
    })

  return { accessToken, expiresAt }
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  connectionId: string,
  calendarId: string,
  syncToken?: string
): Promise<{
  events: GoogleCalendarEvent[]
  nextSyncToken?: string
  nextPageToken?: string
}> {
  const accessToken = await getAccessToken(connectionId)

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`
  )

  // Add query parameters
  url.searchParams.set("maxResults", "250")
  url.searchParams.set("singleEvents", "true")
  url.searchParams.set("orderBy", "startTime")

  if (syncToken) {
    // Incremental sync
    url.searchParams.set("syncToken", syncToken)
  } else {
    // Initial sync - get events from 6 months ago to 1 year ahead
    const timeMin = new Date()
    timeMin.setMonth(timeMin.getMonth() - 6)
    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    url.searchParams.set("timeMin", timeMin.toISOString())
    url.searchParams.set("timeMax", timeMax.toISOString())
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to fetch Google Calendar events:", errorText)
    throw new Error("Failed to fetch events from Google Calendar")
  }

  const data = await response.json()

  return {
    events: data.items || [],
    nextSyncToken: data.nextSyncToken,
    nextPageToken: data.nextPageToken,
  }
}

/**
 * Sync events from Google Calendar to Momentum
 */
export async function syncGoogleCalendarEvents(
  userId: string,
  connectionId: string
): Promise<CalendarSyncLog> {
  const startTime = Date.now()
  let eventsImported = 0
  let eventsUpdated = 0
  let eventsDeleted = 0
  const errors: Array<{ eventId?: string; eventTitle?: string; error: string; action: string }> = []

  try {
    // Get connection details
    const connectionDoc = await admin
      .firestore()
      .collection("calendarConnections")
      .doc(connectionId)
      .get()

    if (!connectionDoc.exists) {
      throw new Error("Connection not found")
    }

    const connection = connectionDoc.data()!

    // Only sync selected calendars
    const selectedCalendars = connection.calendars.filter(
      (cal: any) => cal.isSelected
    )

    // Sync each selected calendar
    for (const calendar of selectedCalendars) {
      try {
        const { events, nextSyncToken } = await fetchGoogleCalendarEvents(
          connectionId,
          calendar.id,
          connection.syncToken
        )

        // Process each event
        for (const googleEvent of events) {
          try {
            // Check if event is deleted/cancelled
            if (googleEvent.status === "cancelled") {
              // Delete from Momentum
              const eventId = `google-${connectionId}-${googleEvent.id}`
              await admin.firestore().collection("events").doc(eventId).delete()
              eventsDeleted++
              continue
            }

            // Normalize event
            const normalizedEvent = normalizeGoogleEvent(
              googleEvent,
              userId,
              connectionId,
              calendar.id
            )

            // Check if event already exists
            const eventId = normalizedEvent.id!
            const existingEventDoc = await admin
              .firestore()
              .collection("events")
              .doc(eventId)
              .get()

            if (existingEventDoc.exists) {
              // Update existing event
              await admin
                .firestore()
                .collection("events")
                .doc(eventId)
                .update({
                  ...normalizedEvent,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastSyncedAt: new Date().toISOString(),
                })
              eventsUpdated++
            } else {
              // Create new event
              await admin
                .firestore()
                .collection("events")
                .doc(eventId)
                .set({
                  ...normalizedEvent,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                })
              eventsImported++
            }
          } catch (error: any) {
            console.error(`Error processing event ${googleEvent.id}:`, error)
            errors.push({
              eventId: googleEvent.id,
              eventTitle: googleEvent.summary,
              error: error.message,
              action: "import",
            })
          }
        }

        // Update sync token for incremental sync next time
        if (nextSyncToken) {
          await admin
            .firestore()
            .collection("calendarConnections")
            .doc(connectionId)
            .update({
              syncToken: nextSyncToken,
              lastSyncedAt: new Date().toISOString(),
            })
        }
      } catch (error: any) {
        console.error(`Error syncing calendar ${calendar.id}:`, error)
        errors.push({
          error: `Failed to sync calendar ${calendar.name}: ${error.message}`,
          action: "import",
        })
      }
    }

    // Create sync log
    const syncLog: Omit<CalendarSyncLog, "id"> = {
      userId,
      connectionId,
      timestamp: new Date().toISOString(),
      status: errors.length > 0 ? "partial" : "success",
      eventsImported,
      eventsExported: 0,
      eventsUpdated,
      eventsDeleted,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
    }

    // Store sync log
    const logRef = await admin.firestore().collection("calendarSyncLogs").add(syncLog)

    return {
      id: logRef.id,
      ...syncLog,
    }
  } catch (error: any) {
    console.error("Sync error:", error)

    // Create error sync log
    const syncLog: Omit<CalendarSyncLog, "id"> = {
      userId,
      connectionId,
      timestamp: new Date().toISOString(),
      status: "failed",
      eventsImported,
      eventsExported: 0,
      eventsUpdated,
      eventsDeleted,
      errors: [{ error: error.message, action: "import" }],
      duration: Date.now() - startTime,
    }

    const logRef = await admin.firestore().collection("calendarSyncLogs").add(syncLog)

    return {
      id: logRef.id,
      ...syncLog,
    }
  }
}

// ============================================================================
// MICROSOFT CALENDAR SYNC
// ============================================================================

/**
 * Microsoft Graph Calendar Event structure (simplified)
 */
interface MicrosoftCalendarEvent {
  id: string
  subject?: string
  bodyPreview?: string
  body?: {
    contentType: string
    content: string
  }
  location?: {
    displayName?: string
  }
  webLink?: string
  start?: {
    dateTime: string
    timeZone: string
  }
  end?: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    emailAddress: {
      address: string
      name?: string
    }
    status: {
      response: string
      time: string
    }
    type: string
  }>
  organizer?: {
    emailAddress: {
      address: string
      name?: string
    }
  }
  recurrence?: any
  isAllDay?: boolean
  isCancelled?: boolean
  sensitivity?: string
  showAs?: string
  createdDateTime?: string
  lastModifiedDateTime?: string
}

/**
 * Normalize Microsoft Calendar event to Momentum CalendarEvent format
 */
export function normalizeMicrosoftEvent(
  msEvent: MicrosoftCalendarEvent,
  userId: string,
  connectionId: string,
  calendarId: string
): Partial<CalendarEvent> {
  // Parse dates (Microsoft doesn't include 'Z' for UTC, add it)
  const startDateTime = msEvent.start?.dateTime
  const endDateTime = msEvent.end?.dateTime

  if (!startDateTime || !endDateTime) {
    throw new Error("Event missing start or end time")
  }

  // Microsoft Graph API returns times without Z for UTC
  const start = new Date(startDateTime + (startDateTime.endsWith('Z') ? '' : 'Z'))
  const end = new Date(endDateTime + (endDateTime.endsWith('Z') ? '' : 'Z'))

  // Map attendees
  const attendees = (msEvent.attendees || []).map(attendee => ({
    personId: "", // TODO: Map email to PersonProfile ID
    role: attendee.emailAddress.name || attendee.emailAddress.address,
    response: mapMicrosoftResponseStatus(attendee.status.response),
    workloadImpactHours: undefined,
  }))

  // Build normalized event
  const normalizedEvent: Partial<CalendarEvent> = {
    id: `microsoft-${connectionId}-${msEvent.id}`,
    title: msEvent.subject || "(No title)",
    description: msEvent.bodyPreview || msEvent.body?.content || "",
    location: msEvent.location?.displayName || "",
    linkUrl: msEvent.webLink || "",
    start,
    end,
    attendees,
    reminders: [], // Microsoft reminders need separate API call
    tags: [],
    visibility: mapMicrosoftVisibility(msEvent.sensitivity),
    ownerId: userId,
    type: "other",
    notes: "",
    createdBy: userId,
    createdAt: new Date(msEvent.createdDateTime || Date.now()),
    updatedAt: new Date(msEvent.lastModifiedDateTime || Date.now()),

    // Integration fields
    calendarSource: "microsoft",
    calendarId,
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
    isReadOnly: true, // External events are read-only by default
    externalUrl: msEvent.webLink || "",
    integrationRefs: {
      outlookEventId: msEvent.id,
    },
  }

  return normalizedEvent
}

/**
 * Map Microsoft Graph response status to Momentum format
 */
function mapMicrosoftResponseStatus(
  status?: string
): "accepted" | "declined" | "tentative" | "none" {
  switch (status) {
    case "accepted":
      return "accepted"
    case "declined":
      return "declined"
    case "tentativelyAccepted":
      return "tentative"
    default:
      return "none"
  }
}

/**
 * Map Microsoft sensitivity to Momentum visibility
 */
function mapMicrosoftVisibility(
  sensitivity?: string
): "private" | "lab" | "organisation" {
  // Microsoft uses: normal, personal, private, confidential
  switch (sensitivity) {
    case "private":
    case "confidential":
      return "private"
    case "normal":
      return "organisation"
    default:
      return "lab"
  }
}

/**
 * Refresh Microsoft OAuth token
 */
async function refreshMicrosoftToken(
  refreshToken: string,
  connectionId: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const config = {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`,
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh Microsoft token")
  }

  const data = await response.json()
  const accessToken = data.access_token
  const expiresIn = data.expires_in || 3600
  const expiresAt = Date.now() + expiresIn * 1000

  // Update stored tokens
  await admin
    .firestore()
    .collection("_calendarTokens")
    .doc(connectionId)
    .update({
      accessToken,
      expiresAt,
    })

  return { accessToken, expiresAt }
}

/**
 * Get access token for Microsoft connection (with refresh if needed)
 */
async function getMicrosoftAccessToken(connectionId: string): Promise<string> {
  const tokenDoc = await admin
    .firestore()
    .collection("_calendarTokens")
    .doc(connectionId)
    .get()

  if (!tokenDoc.exists) {
    throw new Error("Token not found")
  }

  const tokenData = tokenDoc.data()!
  const now = Date.now()

  // Check if token is expired
  if (tokenData.expiresAt && tokenData.expiresAt < now) {
    // Token expired, need to refresh
    const newTokens = await refreshMicrosoftToken(
      tokenData.refreshToken,
      connectionId
    )
    return newTokens.accessToken
  }

  return tokenData.accessToken
}

/**
 * Fetch events from Microsoft Calendar using delta query
 */
export async function fetchMicrosoftCalendarEvents(
  connectionId: string,
  calendarId: string,
  deltaLink?: string
): Promise<{
  events: MicrosoftCalendarEvent[]
  nextDeltaLink?: string
  nextLink?: string
}> {
  const accessToken = await getMicrosoftAccessToken(connectionId)

  let url: string
  if (deltaLink) {
    // Use delta link for incremental sync
    url = deltaLink
  } else {
    // Initial sync - get events from 6 months ago to 1 year ahead
    const timeMin = new Date()
    timeMin.setMonth(timeMin.getMonth() - 6)
    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    const graphUrl = new URL(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/delta`
    )
    graphUrl.searchParams.set("$top", "250")
    graphUrl.searchParams.set(
      "$filter",
      `start/dateTime ge '${timeMin.toISOString()}' and start/dateTime le '${timeMax.toISOString()}'`
    )
    url = graphUrl.toString()
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to fetch Microsoft Calendar events:", errorText)
    throw new Error("Failed to fetch events from Microsoft Calendar")
  }

  const data = await response.json()

  return {
    events: data.value || [],
    nextDeltaLink: data["@odata.deltaLink"],
    nextLink: data["@odata.nextLink"],
  }
}

/**
 * Sync events from Microsoft Calendar to Momentum
 */
export async function syncMicrosoftCalendarEvents(
  userId: string,
  connectionId: string
): Promise<CalendarSyncLog> {
  const startTime = Date.now()
  let eventsImported = 0
  let eventsUpdated = 0
  let eventsDeleted = 0
  const errors: Array<{ eventId?: string; eventTitle?: string; error: string; action: string }> = []

  try {
    // Get connection details
    const connectionDoc = await admin
      .firestore()
      .collection("calendarConnections")
      .doc(connectionId)
      .get()

    if (!connectionDoc.exists) {
      throw new Error("Connection not found")
    }

    const connection = connectionDoc.data()!

    // Only sync selected calendars
    const selectedCalendars = connection.calendars.filter(
      (cal: any) => cal.isSelected
    )

    // Sync each selected calendar
    for (const calendar of selectedCalendars) {
      try {
        const { events, nextDeltaLink } = await fetchMicrosoftCalendarEvents(
          connectionId,
          calendar.id,
          connection.deltaLink
        )

        // Process each event
        for (const msEvent of events) {
          try {
            // Check if event is deleted/cancelled
            // Microsoft marks deleted events with @removed property
            if ((msEvent as any)["@removed"] || msEvent.isCancelled) {
              // Delete from Momentum
              const eventId = `microsoft-${connectionId}-${msEvent.id}`
              await admin.firestore().collection("events").doc(eventId).delete()
              eventsDeleted++
              continue
            }

            // Normalize event
            const normalizedEvent = normalizeMicrosoftEvent(
              msEvent,
              userId,
              connectionId,
              calendar.id
            )

            // Check if event already exists
            const eventId = normalizedEvent.id!
            const existingEventDoc = await admin
              .firestore()
              .collection("events")
              .doc(eventId)
              .get()

            if (existingEventDoc.exists) {
              // Update existing event
              await admin
                .firestore()
                .collection("events")
                .doc(eventId)
                .update({
                  ...normalizedEvent,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastSyncedAt: new Date().toISOString(),
                })
              eventsUpdated++
            } else {
              // Create new event
              await admin
                .firestore()
                .collection("events")
                .doc(eventId)
                .set({
                  ...normalizedEvent,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                })
              eventsImported++
            }
          } catch (error: any) {
            console.error(`Error processing event ${msEvent.id}:`, error)
            errors.push({
              eventId: msEvent.id,
              eventTitle: msEvent.subject,
              error: error.message,
              action: "import",
            })
          }
        }

        // Update delta link for incremental sync next time
        if (nextDeltaLink) {
          await admin
            .firestore()
            .collection("calendarConnections")
            .doc(connectionId)
            .update({
              deltaLink: nextDeltaLink,
              lastSyncedAt: new Date().toISOString(),
            })
        }
      } catch (error: any) {
        console.error(`Error syncing calendar ${calendar.id}:`, error)
        errors.push({
          error: `Failed to sync calendar ${calendar.name}: ${error.message}`,
          action: "import",
        })
      }
    }

    // Create sync log
    const syncLog: Omit<CalendarSyncLog, "id"> = {
      userId,
      connectionId,
      timestamp: new Date().toISOString(),
      status: errors.length > 0 ? "partial" : "success",
      eventsImported,
      eventsExported: 0,
      eventsUpdated,
      eventsDeleted,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
    }

    // Store sync log
    const logRef = await admin.firestore().collection("calendarSyncLogs").add(syncLog)

    return {
      id: logRef.id,
      ...syncLog,
    }
  } catch (error: any) {
    console.error("Sync error:", error)

    // Create error sync log
    const syncLog: Omit<CalendarSyncLog, "id"> = {
      userId,
      connectionId,
      timestamp: new Date().toISOString(),
      status: "failed",
      eventsImported,
      eventsExported: 0,
      eventsUpdated,
      eventsDeleted,
      errors: [{ error: error.message, action: "import" }],
      duration: Date.now() - startTime,
    }

    const logRef = await admin.firestore().collection("calendarSyncLogs").add(syncLog)

    return {
      id: logRef.id,
      ...syncLog,
    }
  }
}
