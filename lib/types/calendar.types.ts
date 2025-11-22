// ============================================================================
// CALENDAR TYPES
// ============================================================================

import type { RecurrenceFrequency, EventVisibility } from './common.types'

/**
 * RecurrenceRule - Defines recurring event pattern
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval?: number
  byWeekday?: string[]
  byMonthDay?: number[]
  endDate?: string
  occurrenceCount?: number
  customRRule?: string
}

/**
 * EventReminder - Reminder for a calendar event
 */
export interface EventReminder {
  id: string
  offsetMinutes: number
  method: "email" | "push" | "sms"
}

/**
 * EventAttendee - Person attending a calendar event
 */
export interface EventAttendee {
  personId: string // PersonProfile ID (not Person ID)
  role?: string
  response?: "accepted" | "declined" | "tentative" | "none"
  workloadImpactHours?: number
}

/**
 * CalendarEvent - Calendar event for meetings, deadlines, milestones
 */
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  linkUrl?: string
  start: Date
  end: Date
  recurrence?: RecurrenceRule
  attendees: EventAttendee[]
  reminders?: EventReminder[]
  tags?: string[]
  visibility: EventVisibility
  ownerId?: string // PersonProfile ID (not Person ID) // PersonProfile ID (not Person ID)
  relatedIds?: {
    masterProjectId?: string
    workpackageId?: string
    projectId?: string
    taskId?: string
    subtaskId?: string
    deliverableId?: string
    equipmentId?: string
  }
  type?: "meeting" | "deadline" | "milestone" | "training" | "equipment" | "other"
  notes?: string
  createdBy: string // User ID
  createdAt: Date
  updatedAt?: Date
  icsUrls?: {
    event?: string
    calendar?: string
  }
  integrationRefs?: {
    googleEventId?: string
    outlookEventId?: string
  }
  calendarSource?: "google" | "microsoft" | "manual"  // Source of calendar event
  calendarId?: string          // Specific calendar ID within the provider account

  // External calendar sync properties
  isReadOnly?: boolean          // True for synced external events that can't be edited
  externalUrl?: string          // URL to view event in external calendar (Google/Outlook)
  syncStatus?: "synced" | "pending" | "error"  // Sync status for external events
  lastSyncedAt?: Date          // Timestamp of last successful sync
  syncError?: string           // Error message if sync failed

  labId?: string
}

/**
 * CalendarSyncLog - Tracks calendar synchronization history
 */
export interface CalendarSyncLog {
  id: string
  userId: string
  connectionId: string         // CalendarConnection ID
  calendarSource?: "google" | "microsoft"
  syncType?: "full" | "incremental"
  timestamp: string            // ISO timestamp when sync occurred
  status: "success" | "failed" | "partial"
  eventsImported: number       // Events imported from external calendar
  eventsExported: number       // Events exported to external calendar
  eventsUpdated: number        // Events updated during sync
  eventsDeleted: number        // Events deleted during sync
  errors?: Array<{ error: string; action: string }>  // Detailed error information
  duration: number             // Sync duration in milliseconds
}

/**
 * ConnectedCalendar - Individual calendar within a provider account
 */
export interface ConnectedCalendar {
  id: string                    // Calendar ID from provider
  name: string                  // Calendar name
  description?: string
  isPrimary: boolean            // Provider's primary calendar
  isSelected: boolean           // User chose to sync this calendar
  color?: string                // Calendar color for UI
  timeZone?: string             // Calendar timezone
  accessRole: "owner" | "writer" | "reader"
}

/**
 * CalendarConnection - OAuth connection to external calendar provider
 */
export interface CalendarConnection {
  id: string                    // Firestore document ID
  userId: string                // Momentum user ID
  provider: "google" | "microsoft"
  providerAccountId: string     // email or unique ID from provider
  providerAccountName: string   // Display name (e.g., "john@example.com")

  // Connected calendars from this account
  calendars: ConnectedCalendar[]

  // Sync settings
  syncEnabled: boolean
  syncDirection: "import" | "export" | "bidirectional"
  defaultCalendarId?: string    // Primary calendar for exports

  // Status & metadata
  status: "active" | "expired" | "error"
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

/**
 * CalendarConflict - Tracks conflicts between local and remote calendar events
 */
export interface CalendarConflict {
  id: string
  eventId: string
  userId: string
  localVersion: Partial<CalendarEvent>
  remoteVersion: Partial<CalendarEvent>
  conflictFields: string[]      // Which fields differ
  detectedAt: string
  resolution?: "local" | "remote" | "merge" | "manual"
  resolvedAt?: string
  resolvedBy?: string           // User ID who resolved
}
