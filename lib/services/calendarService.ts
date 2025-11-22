/**
 * Calendar Service - Calendar events and integration management
 * Handles operations on 'events', 'calendarConnections', 'calendarSyncConflicts', and 'calendarSyncLogs' collections
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  writeBatch,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import type {
  CalendarEvent,
  CalendarConnection,
  CalendarConflict,
  CalendarSyncLog
} from "../types"
import { logger } from "../logger"

// ============================================================================
// EVENTS (Calendar)
// ============================================================================

export interface FirestoreCalendarEvent {
  id: string
  title: string
  start: Timestamp
  end: Timestamp
  ownerId?: string
  relatedIds?: { projectId?: string; workpackageId?: string; taskId?: string; deliverableId?: string }
  type?: string
  notes?: string
  createdBy: string
  createdAt: Timestamp
}

export async function createEvent(eventData: Omit<CalendarEvent, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const eventRef = doc(collection(db, "events"))
  const eventId = eventRef.id
  await setDoc(eventRef, {
    ...eventData,
    id: eventId,
    start: Timestamp.fromDate(eventData.start),
    end: Timestamp.fromDate(eventData.end),
    createdAt: serverTimestamp(),
  })
  return eventId
}

export async function updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
  const db = getFirebaseDb()
  const ref = doc(db, "events", eventId)
  const updateData: any = { ...updates }
  if (updates.start) updateData.start = Timestamp.fromDate(updates.start)
  if (updates.end) updateData.end = Timestamp.fromDate(updates.end)
  await updateDoc(ref, updateData)
}

export async function deleteEvent(eventId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "events", eventId))
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const db = getFirebaseDb()
  const snap = await getDocs(collection(db, "events"))
  return snap.docs.map(d => {
    const data = d.data() as FirestoreCalendarEvent
    return {
      ...data,
      start: data.start?.toDate() || new Date(),
      end: data.end?.toDate() || new Date(),
      createdAt: (data.createdAt && (data.createdAt as any).toDate) ? (data.createdAt as any).toDate() : new Date(),
    } as CalendarEvent
  })
}

export function subscribeToEvents(
  filters: { labId?: string } | null,
  callback: (events: CalendarEvent[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "events")

  if (filters?.labId && filters.labId !== undefined && filters.labId !== null && filters.labId !== "") {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(d => {
      const data = d.data() as FirestoreCalendarEvent
      return {
        ...data,
        start: data.start?.toDate() || new Date(),
        end: data.end?.toDate() || new Date(),
        createdAt: (data.createdAt && (data.createdAt as any).toDate) ? (data.createdAt as any).toDate() : new Date(),
      } as CalendarEvent
    })
    callback(events)
  })
}

// ============================================================================
// CALENDAR CONNECTIONS (Phase 1)
// ============================================================================

/**
 * Creates a new calendar connection
 * Note: OAuth tokens are stored server-side in Google Secret Manager, not here
 */
export async function createCalendarConnection(
  connectionData: Omit<CalendarConnection, 'id' | 'createdAt'>
): Promise<string> {
  const db = getFirebaseDb()
  const connectionRef = doc(collection(db, "calendarConnections"))
  const connectionId = connectionRef.id

  await setDoc(connectionRef, {
    ...connectionData,
    id: connectionId,
    createdAt: new Date().toISOString(),
  })

  return connectionId
}

/**
 * Gets calendar connections for a specific user
 */
export async function getCalendarConnections(userId: string): Promise<CalendarConnection[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConnections"),
    where("userId", "==", userId)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as CalendarConnection)
}

/**
 * Gets a single calendar connection by ID
 */
export async function getCalendarConnection(connectionId: string): Promise<CalendarConnection | null> {
  const db = getFirebaseDb()
  const connectionRef = doc(db, "calendarConnections", connectionId)
  const connectionSnap = await getDoc(connectionRef)
  if (!connectionSnap.exists()) return null
  return connectionSnap.data() as CalendarConnection
}

/**
 * Updates a calendar connection
 */
export async function updateCalendarConnection(
  connectionId: string,
  updates: Partial<CalendarConnection>
): Promise<void> {
  const db = getFirebaseDb()
  const connectionRef = doc(db, "calendarConnections", connectionId)
  const updateData: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await updateDoc(connectionRef, updateData)
}

/**
 * Deletes a calendar connection and all associated data
 * Performs batch deletion of:
 * - The connection itself
 * - Associated conflicts
 * - Associated sync logs
 * - Associated imported events (optional, based on cleanup preference)
 */
export async function deleteCalendarConnection(
  connectionId: string,
  deleteImportedEvents: boolean = false
): Promise<void> {
  const db = getFirebaseDb()
  const batch = writeBatch(db)

  try {
    // Delete the connection
    const connectionRef = doc(db, "calendarConnections", connectionId)
    batch.delete(connectionRef)

    // Delete associated conflicts (updated collection name)
    const conflictsQuery = query(
      collection(db, "calendarConflicts"),
      where("connectionId", "==", connectionId)
    )
    const conflictsSnapshot = await getDocs(conflictsQuery)
    conflictsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    logger.info(`Deleting ${conflictsSnapshot.size} conflicts for connection ${connectionId}`)

    // Delete associated logs
    const logsQuery = query(
      collection(db, "calendarSyncLogs"),
      where("connectionId", "==", connectionId)
    )
    const logsSnapshot = await getDocs(logsQuery)
    logsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    logger.info(`Deleting ${logsSnapshot.size} sync logs for connection ${connectionId}`)

    // Optionally delete imported events from this connection
    if (deleteImportedEvents) {
      const eventsQuery = query(
        collection(db, "events"),
        where("calendarConnectionId", "==", connectionId),
        where("isReadOnly", "==", true)
      )
      const eventsSnapshot = await getDocs(eventsQuery)
      eventsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      logger.info(`Deleting ${eventsSnapshot.size} imported events for connection ${connectionId}`)
    }

    await batch.commit()
    logger.info(`Successfully deleted calendar connection ${connectionId}`)
  } catch (error) {
    logger.error('Error deleting calendar connection', { connectionId, error })
    throw new Error(`Failed to delete calendar connection: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Subscribes to calendar connections for a user with real-time updates
 */
export function subscribeToCalendarConnections(
  userId: string,
  callback: (connections: CalendarConnection[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConnections"),
    where("userId", "==", userId)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const connections = snapshot.docs.map(doc => doc.data() as CalendarConnection)
      callback(connections)
    },
    (error) => {
      logger.error("Error in subscribeToCalendarConnections", error)
      callback([])
    }
  )
}

// ============================================================================
// CALENDAR SYNC CONFLICTS
// ============================================================================

/**
 * Creates a new calendar conflict
 * Note: Collection renamed from "calendarSyncConflicts" to "calendarConflicts" for consistency
 */
export async function createSyncConflict(
  conflictData: Omit<CalendarConflict, 'id'>
): Promise<string> {
  const db = getFirebaseDb()
  const conflictRef = doc(collection(db, "calendarConflicts"))
  const conflictId = conflictRef.id

  await setDoc(conflictRef, {
    ...conflictData,
    id: conflictId,
  })

  return conflictId
}

/**
 * Gets a single conflict by ID
 */
export async function getCalendarConflict(
  conflictId: string
): Promise<CalendarConflict | null> {
  const db = getFirebaseDb()
  const conflictRef = doc(db, "calendarConflicts", conflictId)
  const conflictSnap = await getDoc(conflictRef)

  if (!conflictSnap.exists()) return null
  return conflictSnap.data() as CalendarConflict
}

/**
 * Gets unresolved conflicts for a connection
 */
export async function getUnresolvedConflicts(connectionId: string): Promise<CalendarConflict[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConflicts"),
    where("connectionId", "==", connectionId),
    where("resolved", "==", false)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as CalendarConflict)
}

/**
 * Gets all unresolved conflicts for a user across all connections
 */
export async function getUserCalendarConflicts(
  userId: string
): Promise<CalendarConflict[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConflicts"),
    where("userId", "==", userId),
    where("resolved", "==", false)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as CalendarConflict)
}

/**
 * Resolves a sync conflict
 */
export async function resolveSyncConflict(
  conflictId: string,
  resolution: "keep_momentum" | "keep_external" | "merge" | "manual",
  resolvedBy: string
): Promise<void> {
  const db = getFirebaseDb()
  const conflictRef = doc(db, "calendarConflicts", conflictId)
  await updateDoc(conflictRef, {
    resolved: true,
    resolvedAt: new Date().toISOString(),
    resolution,
    resolvedBy,
  })
}

/**
 * Deletes a resolved conflict
 */
export async function deleteCalendarConflict(
  conflictId: string
): Promise<void> {
  const db = getFirebaseDb()
  const conflictRef = doc(db, "calendarConflicts", conflictId)
  await deleteDoc(conflictRef)
}

/**
 * Subscribes to unresolved conflicts for a specific connection
 */
export function subscribeToUnresolvedConflicts(
  connectionId: string,
  callback: (conflicts: CalendarConflict[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConflicts"),
    where("connectionId", "==", connectionId),
    where("resolved", "==", false)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const conflicts = snapshot.docs.map(doc => doc.data() as CalendarConflict)
      callback(conflicts)
    },
    (error) => {
      logger.error("Error in subscribeToUnresolvedConflicts", error)
      callback([])
    }
  )
}

/**
 * Subscribes to all unresolved conflicts for a user
 */
export function subscribeToCalendarConflicts(
  userId: string,
  callback: (conflicts: CalendarConflict[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConflicts"),
    where("userId", "==", userId),
    where("resolved", "==", false)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const conflicts = snapshot.docs.map(doc => doc.data() as CalendarConflict)
      callback(conflicts)
    },
    (error) => {
      logger.error("Error in subscribeToCalendarConflicts", error)
      callback([])
    }
  )
}

// ============================================================================
// CALENDAR SYNC LOGS
// ============================================================================

/**
 * Creates a new sync log entry
 */
export async function createSyncLog(
  logData: Omit<CalendarSyncLog, 'id'>
): Promise<string> {
  const db = getFirebaseDb()
  const logRef = doc(collection(db, "calendarSyncLogs"))
  const logId = logRef.id

  await setDoc(logRef, {
    ...logData,
    id: logId,
  })

  return logId
}

/**
 * Gets recent sync logs for a connection
 */
export async function getSyncLogs(
  connectionId: string,
  limit: number = 50
): Promise<CalendarSyncLog[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarSyncLogs"),
    where("connectionId", "==", connectionId),
    orderBy("syncStartedAt", "desc")
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs
    .slice(0, limit)
    .map(doc => doc.data() as CalendarSyncLog)
}

/**
 * Updates a sync log entry (e.g., when sync completes)
 */
export async function updateSyncLog(
  logId: string,
  updates: Partial<CalendarSyncLog>
): Promise<void> {
  const db = getFirebaseDb()
  const logRef = doc(db, "calendarSyncLogs", logId)
  await updateDoc(logRef, updates)
}

/**
 * Gets recent sync logs for a specific connection
 * More specific than getSyncLogs - filters by connectionId
 */
export async function getConnectionSyncLogs(
  connectionId: string,
  limitCount: number = 20
): Promise<CalendarSyncLog[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarSyncLogs"),
    where("connectionId", "==", connectionId),
    orderBy("syncStartedAt", "desc")
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs
    .slice(0, limitCount)
    .map(doc => doc.data() as CalendarSyncLog)
}

/**
 * Gets recent sync logs for a user across all connections
 */
export async function getUserSyncLogs(
  userId: string,
  limitCount: number = 50
): Promise<CalendarSyncLog[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarSyncLogs"),
    where("userId", "==", userId),
    orderBy("syncStartedAt", "desc")
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs
    .slice(0, limitCount)
    .map(doc => doc.data() as CalendarSyncLog)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a calendar connection by provider for a specific user
 * Useful for checking if a user has already connected a specific calendar type
 */
export async function getUserCalendarConnectionByProvider(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<CalendarConnection | null> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarConnections"),
    where("userId", "==", userId),
    where("provider", "==", provider)
  )
  const querySnapshot = await getDocs(q)

  if (querySnapshot.empty) return null
  return querySnapshot.docs[0].data() as CalendarConnection
}

/**
 * Checks if a user has any calendar connections
 * Useful for onboarding and feature gating
 */
export async function hasCalendarConnections(userId: string): Promise<boolean> {
  const connections = await getCalendarConnections(userId)
  return connections.length > 0
}

/**
 * Checks if a specific provider is connected and active for a user
 * Returns true only if connection exists and status is 'active'
 */
export async function isProviderConnected(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<boolean> {
  const connection = await getUserCalendarConnectionByProvider(userId, provider)
  return connection !== null && connection.status === 'active'
}

/**
 * Gets comprehensive sync status summary for a user
 * Useful for dashboard displays and health checks
 */
export async function getUserSyncStatus(userId: string): Promise<{
  totalConnections: number
  activeConnections: number
  errorConnections: number
  lastSyncedAt?: string
}> {
  const connections = await getCalendarConnections(userId)

  const active = connections.filter(c => c.status === 'active')
  const errors = connections.filter(c => c.status === 'error')

  const lastSynced = connections
    .map(c => c.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0]

  return {
    totalConnections: connections.length,
    activeConnections: active.length,
    errorConnections: errors.length,
    lastSyncedAt: lastSynced,
  }
}
