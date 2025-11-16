/**
 * Firestore service functions for Calendar Integration
 * Handles calendar connections, sync logs, and conflicts
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
  Timestamp,
  onSnapshot,
  Unsubscribe,
  limit,
} from "firebase/firestore"
import { getFirebaseDb } from "./firebase"
import {
  CalendarConnection,
  CalendarSyncLog,
  CalendarConflict,
} from "./types"
import { logger } from "./logger"

// ============================================================================
// CALENDAR CONNECTIONS
// ============================================================================

/**
 * Create a new calendar connection
 */
export async function createCalendarConnection(
  connectionData: Omit<CalendarConnection, 'id'>
): Promise<string> {
  const db = getFirebaseDb()
  const connectionsRef = collection(db, "calendarConnections")
  const newConnectionRef = doc(connectionsRef)

  const connection: CalendarConnection = {
    id: newConnectionRef.id,
    ...connectionData,
  }

  await setDoc(newConnectionRef, connection)
  return newConnectionRef.id
}

/**
 * Get a calendar connection by ID
 */
export async function getCalendarConnection(
  connectionId: string
): Promise<CalendarConnection | null> {
  const db = getFirebaseDb()
  const connectionRef = doc(db, "calendarConnections", connectionId)
  const connectionSnap = await getDoc(connectionRef)

  if (!connectionSnap.exists()) return null
  return connectionSnap.data() as CalendarConnection
}

/**
 * Get all calendar connections for a user
 */
export async function getUserCalendarConnections(
  userId: string
): Promise<CalendarConnection[]> {
  const db = getFirebaseDb()
  const connectionsRef = collection(db, "calendarConnections")
  const q = query(connectionsRef, where("userId", "==", userId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => doc.data() as CalendarConnection)
}

/**
 * Get calendar connection by provider for a user
 */
export async function getUserCalendarConnectionByProvider(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<CalendarConnection | null> {
  const db = getFirebaseDb()
  const connectionsRef = collection(db, "calendarConnections")
  const q = query(
    connectionsRef,
    where("userId", "==", userId),
    where("provider", "==", provider),
    limit(1)
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty || !snapshot.docs[0]) {
    return null
  }
  return snapshot.docs[0].data() as CalendarConnection
}

/**
 * Update a calendar connection
 */
export async function updateCalendarConnection(
  connectionId: string,
  updates: Partial<CalendarConnection>
): Promise<void> {
  const db = getFirebaseDb()
  const connectionRef = doc(db, "calendarConnections", connectionId)
  await updateDoc(connectionRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Delete a calendar connection
 */
export async function deleteCalendarConnection(
  connectionId: string
): Promise<void> {
  const db = getFirebaseDb()
  const connectionRef = doc(db, "calendarConnections", connectionId)
  await deleteDoc(connectionRef)
}

/**
 * Subscribe to user's calendar connections
 */
export function subscribeToCalendarConnections(
  userId: string,
  callback: (connections: CalendarConnection[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const connectionsRef = collection(db, "calendarConnections")
  const q = query(connectionsRef, where("userId", "==", userId))

  return onSnapshot(
    q,
    (snapshot) => {
      const connections = snapshot.docs.map(doc => doc.data() as CalendarConnection)
      callback(connections)
    },
    (error) => {
      logger.error("Error subscribing to calendar connections", error)
      callback([])
    }
  )
}

// ============================================================================
// CALENDAR SYNC LOGS
// ============================================================================

/**
 * Create a sync log (typically called by Cloud Functions)
 */
export async function createCalendarSyncLog(
  logData: Omit<CalendarSyncLog, 'id'>
): Promise<string> {
  const db = getFirebaseDb()
  const logsRef = collection(db, "calendarSyncLogs")
  const newLogRef = doc(logsRef)

  const log: CalendarSyncLog = {
    id: newLogRef.id,
    ...logData,
  }

  await setDoc(newLogRef, log)
  return newLogRef.id
}

/**
 * Get sync logs for a user
 */
export async function getUserSyncLogs(
  userId: string,
  limitCount: number = 50
): Promise<CalendarSyncLog[]> {
  const db = getFirebaseDb()
  const logsRef = collection(db, "calendarSyncLogs")
  const q = query(
    logsRef,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => doc.data() as CalendarSyncLog)
}

/**
 * Get sync logs for a specific connection
 */
export async function getConnectionSyncLogs(
  connectionId: string,
  limitCount: number = 20
): Promise<CalendarSyncLog[]> {
  const db = getFirebaseDb()
  const logsRef = collection(db, "calendarSyncLogs")
  const q = query(
    logsRef,
    where("connectionId", "==", connectionId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => doc.data() as CalendarSyncLog)
}

// ============================================================================
// CALENDAR CONFLICTS
// ============================================================================

/**
 * Create a calendar conflict (typically called by Cloud Functions)
 */
export async function createCalendarConflict(
  conflictData: Omit<CalendarConflict, 'id'>
): Promise<string> {
  const db = getFirebaseDb()
  const conflictsRef = collection(db, "calendarConflicts")
  const newConflictRef = doc(conflictsRef)

  const conflict: CalendarConflict = {
    id: newConflictRef.id,
    ...conflictData,
  }

  await setDoc(newConflictRef, conflict)
  return newConflictRef.id
}

/**
 * Get a conflict by ID
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
 * Get all unresolved conflicts for a user
 */
export async function getUserCalendarConflicts(
  userId: string
): Promise<CalendarConflict[]> {
  const db = getFirebaseDb()
  const conflictsRef = collection(db, "calendarConflicts")
  const q = query(
    conflictsRef,
    where("userId", "==", userId),
    where("resolution", "==", null)
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => doc.data() as CalendarConflict)
}

/**
 * Resolve a calendar conflict
 */
export async function resolveCalendarConflict(
  conflictId: string,
  resolution: 'local' | 'remote' | 'merge' | 'manual',
  resolvedBy: string
): Promise<void> {
  const db = getFirebaseDb()
  const conflictRef = doc(db, "calendarConflicts", conflictId)
  await updateDoc(conflictRef, {
    resolution,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  })
}

/**
 * Delete a resolved conflict
 */
export async function deleteCalendarConflict(
  conflictId: string
): Promise<void> {
  const db = getFirebaseDb()
  const conflictRef = doc(db, "calendarConflicts", conflictId)
  await deleteDoc(conflictRef)
}

/**
 * Subscribe to user's unresolved conflicts
 */
export function subscribeToCalendarConflicts(
  userId: string,
  callback: (conflicts: CalendarConflict[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const conflictsRef = collection(db, "calendarConflicts")
  const q = query(
    conflictsRef,
    where("userId", "==", userId),
    where("resolution", "==", null)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const conflicts = snapshot.docs.map(doc => doc.data() as CalendarConflict)
      callback(conflicts)
    },
    (error) => {
      logger.error("Error subscribing to calendar conflicts", error)
      callback([])
    }
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a user has any calendar connections
 */
export async function hasCalendarConnections(userId: string): Promise<boolean> {
  const connections = await getUserCalendarConnections(userId)
  return connections.length > 0
}

/**
 * Check if a specific provider is connected for a user
 */
export async function isProviderConnected(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<boolean> {
  const connection = await getUserCalendarConnectionByProvider(userId, provider)
  return connection !== null && connection.status === 'active'
}

/**
 * Get sync status summary for a user
 */
export async function getUserSyncStatus(userId: string): Promise<{
  totalConnections: number
  activeConnections: number
  errorConnections: number
  lastSyncedAt?: string
}> {
  const connections = await getUserCalendarConnections(userId)

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
