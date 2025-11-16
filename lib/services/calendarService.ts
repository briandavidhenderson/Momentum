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
      start: data.start.toDate(),
      end: data.end.toDate(),
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

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(d => {
      const data = d.data() as FirestoreCalendarEvent
      return {
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
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
 * Deletes a calendar connection
 */
export async function deleteCalendarConnection(connectionId: string): Promise<void> {
  const db = getFirebaseDb()
  // Also delete associated sync conflicts and logs
  const batch = writeBatch(db)

  // Delete the connection
  const connectionRef = doc(db, "calendarConnections", connectionId)
  batch.delete(connectionRef)

  // Delete associated conflicts
  const conflictsQuery = query(
    collection(db, "calendarSyncConflicts"),
    where("connectionId", "==", connectionId)
  )
  const conflictsSnapshot = await getDocs(conflictsQuery)
  conflictsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Delete associated logs
  const logsQuery = query(
    collection(db, "calendarSyncLogs"),
    where("connectionId", "==", connectionId)
  )
  const logsSnapshot = await getDocs(logsQuery)
  logsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()
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
      console.error("Error in subscribeToCalendarConnections:", error)
      callback([])
    }
  )
}

// ============================================================================
// CALENDAR SYNC CONFLICTS
// ============================================================================

/**
 * Creates a new sync conflict
 */
export async function createSyncConflict(
  conflictData: Omit<CalendarConflict, 'id'>
): Promise<string> {
  const db = getFirebaseDb()
  const conflictRef = doc(collection(db, "calendarSyncConflicts"))
  const conflictId = conflictRef.id

  await setDoc(conflictRef, {
    ...conflictData,
    id: conflictId,
  })

  return conflictId
}

/**
 * Gets unresolved conflicts for a connection
 */
export async function getUnresolvedConflicts(connectionId: string): Promise<CalendarConflict[]> {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarSyncConflicts"),
    where("connectionId", "==", connectionId),
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
  const conflictRef = doc(db, "calendarSyncConflicts", conflictId)
  await updateDoc(conflictRef, {
    resolved: true,
    resolvedAt: new Date().toISOString(),
    resolution,
    resolvedBy,
  })
}

/**
 * Subscribes to unresolved conflicts for a user
 */
export function subscribeToUnresolvedConflicts(
  connectionId: string,
  callback: (conflicts: CalendarConflict[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "calendarSyncConflicts"),
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
      console.error("Error in subscribeToUnresolvedConflicts:", error)
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
