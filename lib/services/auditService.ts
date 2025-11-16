/**
 * Audit Service - Audit trail management
 * Handles operations on the 'auditTrails' collection
 * Tracks changes to entities for compliance and debugging
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import type { AuditTrail } from "../types"

export interface FirestoreAuditTrail {
  id: string
  entityType: string
  entityId: string
  change: string
  before?: any
  after?: any
  authorId: string
  createdAt: Timestamp
}

/**
 * Append an entry to the audit trail
 * @param entry - The audit trail entry to create (without id and createdAt)
 * @returns The ID of the created audit trail entry
 */
export async function appendAuditTrail(entry: Omit<AuditTrail, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  const ref = doc(collection(db, "auditTrails"))
  const id = ref.id
  await setDoc(ref, {
    ...entry,
    id,
    createdAt: serverTimestamp(),
  })
  return id
}

/**
 * Get audit trails for a specific entity
 * @param entityType - The type of entity (e.g., 'project', 'profile')
 * @param entityId - The ID of the entity
 * @param limitCount - Maximum number of entries to return (default: 20)
 * @returns Array of audit trail entries, sorted by creation date (newest first)
 */
export async function getAuditTrails(
  entityType: AuditTrail['entityType'],
  entityId: string,
  limitCount = 20
): Promise<AuditTrail[]> {
  const db = getFirebaseDb()
  // simple fetch; could add where/orderBy
  const snap = await getDocs(collection(db, "auditTrails"))
  return snap.docs
    .map(d => d.data() as FirestoreAuditTrail)
    .filter(a => a.entityType === entityType && a.entityId === entityId)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, limitCount)
    .map(a => ({
      ...a,
      createdAt: a.createdAt.toDate(),
    }) as AuditTrail)
}

/**
 * Subscribe to audit trails for a specific entity with real-time updates
 * @param filters - Filter by entityType and entityId
 * @param callback - Function to call with audit trail entries
 * @returns Unsubscribe function
 */
export function subscribeToAuditTrails(
  filters: { entityType: string; entityId: string } | null,
  callback: (entries: AuditTrail[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "auditTrails")

  if (filters?.entityType && filters?.entityId) {
    q = query(q, where("entityType", "==", filters.entityType), where("entityId", "==", filters.entityId))
  }

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs
      .map(d => d.data() as FirestoreAuditTrail)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .map(a => ({
        ...a,
        createdAt: a.createdAt.toDate(),
      }) as AuditTrail)
    callback(entries)
  })
}
