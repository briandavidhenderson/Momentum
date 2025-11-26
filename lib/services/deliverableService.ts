/**
 * Deliverable Service - Deliverable management
 * Handles operations on the 'deliverables' collection
 *
 * Deliverables are the primary unit of work output in the project hierarchy:
 * Project → Workpackage → Deliverable → (optional) ProjectTask
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import type { Deliverable, DeliverableLink, DeliverableReview, DeliverableMetric } from "../types"

// ============================================================================
// DELIVERABLE MANAGEMENT
// ============================================================================

export interface FirestoreDeliverable {
  id: string
  name: string
  description?: string
  workpackageId: string

  // Dates & Progress
  dueDate?: string
  startDate?: string
  progress: number
  status: string

  // Ownership
  ownerId?: string
  contributorIds?: string[]

  // Structure
  projectTaskIds?: string[]

  // Linked Entities
  linkedOrderIds?: string[]
  linkedDayToDayTaskIds?: string[]
  linkedELNExperimentIds?: string[]
  linkedDocumentUrls?: DeliverableLink[]

  // Quality & Review
  reviewHistory?: DeliverableReview[]
  metrics?: DeliverableMetric[]
  blockers?: string[]

  // Metadata
  notes?: string
  tags?: string[]
  importance: string

  // Timestamps
  createdAt: Timestamp | string
  createdBy: string
  updatedAt?: Timestamp | string
  lastUpdatedBy?: string

  // UI State
  isExpanded?: boolean
}

/**
 * Create a new deliverable
 * @returns The ID of the newly created deliverable
 */
export async function createDeliverable(
  deliverableData: Omit<Deliverable, 'id' | 'createdAt'> & { createdBy: string }
): Promise<string> {
  const db = getFirebaseDb()
  const deliverableRef = doc(collection(db, "deliverables"))
  const deliverableId = deliverableRef.id

  const deliverableToSave = {
    ...deliverableData,
    id: deliverableId,
    createdAt: serverTimestamp(),
  }

  // Remove undefined fields (Firestore doesn't allow undefined, only null or omitted)
  const cleanedDeliverable = Object.fromEntries(
    Object.entries(deliverableToSave).filter(([_, v]) => v !== undefined)
  )

  await setDoc(deliverableRef, cleanedDeliverable)

  return deliverableId
}

/**
 * Get a single deliverable by ID
 */
export async function getDeliverable(deliverableId: string): Promise<Deliverable | null> {
  const db = getFirebaseDb()
  const deliverableRef = doc(db, "deliverables", deliverableId)
  const docSnap = await getDoc(deliverableRef)

  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data() as FirestoreDeliverable
  return {
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  } as Deliverable
}

/**
 * Get all deliverables for a workpackage
 */
export async function getDeliverablesByWorkpackage(workpackageId: string): Promise<Deliverable[]> {
  const db = getFirebaseDb()
  const q = query(collection(db, "deliverables"), where("workpackageId", "==", workpackageId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreDeliverable
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Deliverable
  })
}

/**
 * Get all deliverables for a project (across all workpackages)
 */
export async function getDeliverablesByProject(projectId: string): Promise<Deliverable[]> {
  const db = getFirebaseDb()
  // Note: This requires workpackages to be queried first, or we need a projectId field on Deliverable
  // For now, this is a placeholder - implementation depends on whether we add projectId to Deliverable
  // Alternative: Query all workpackages for project, then query deliverables for each workpackage
  throw new Error("getDeliverablesByProject not yet implemented - requires workpackage query first")
}

/**
 * Get deliverables by owner
 */
export async function getDeliverablesByOwner(ownerId: string): Promise<Deliverable[]> {
  const db = getFirebaseDb()
  const q = query(collection(db, "deliverables"), where("ownerId", "==", ownerId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreDeliverable
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Deliverable
  })
}

/**
 * Get deliverables linked to a specific order
 */
export async function getDeliverablesLinkedToOrder(orderId: string): Promise<Deliverable[]> {
  const db = getFirebaseDb()
  const q = query(collection(db, "deliverables"), where("linkedOrderIds", "array-contains", orderId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreDeliverable
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Deliverable
  })
}

/**
 * Update a deliverable
 */
export async function updateDeliverable(
  deliverableId: string,
  updates: Partial<Deliverable>
): Promise<void> {
  const db = getFirebaseDb()
  const deliverableRef = doc(db, "deliverables", deliverableId)

  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  }

  // Remove undefined fields (Firestore doesn't allow undefined, only null or omitted)
  const cleanedUpdate = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  )

  await updateDoc(deliverableRef, cleanedUpdate)
}

/**
 * Delete a deliverable
 * Note: This should also handle cleanup of linked entities (ProjectTasks, etc.)
 */
export async function deleteDeliverable(deliverableId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "deliverables", deliverableId))

  // TODO: Consider cascade deletion of associated ProjectTasks
  // This might be handled by a Cloud Function for data integrity
}

/**
 * Subscribe to deliverables with optional filtering
 */
export function subscribeToDeliverables(
  filters: {
    labId?: string
    workpackageId?: string
    ownerId?: string
    status?: string
  } | null,
  callback: (deliverables: Deliverable[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "deliverables")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }
  if (filters?.workpackageId) {
    q = query(q, where("workpackageId", "==", filters.workpackageId))
  }
  if (filters?.ownerId) {
    q = query(q, where("ownerId", "==", filters.ownerId))
  }
  if (filters?.status) {
    q = query(q, where("status", "==", filters.status))
  }

  return onSnapshot(q, (snapshot) => {
    const deliverables = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreDeliverable
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Deliverable
    })
    callback(deliverables)
  })
}

/**
 * Link an order to a deliverable
 */
export async function linkOrderToDeliverable(deliverableId: string, orderId: string): Promise<void> {
  const db = getFirebaseDb()
  const deliverableRef = doc(db, "deliverables", deliverableId)
  const deliverable = await getDeliverable(deliverableId)

  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found`)
  }

  const linkedOrderIds = deliverable.linkedOrderIds || []
  if (!linkedOrderIds.includes(orderId)) {
    await updateDeliverable(deliverableId, {
      linkedOrderIds: [...linkedOrderIds, orderId],
    })
  }
}

/**
 * Unlink an order from a deliverable
 */
export async function unlinkOrderFromDeliverable(deliverableId: string, orderId: string): Promise<void> {
  const deliverable = await getDeliverable(deliverableId)

  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found`)
  }

  const linkedOrderIds = deliverable.linkedOrderIds || []
  await updateDeliverable(deliverableId, {
    linkedOrderIds: linkedOrderIds.filter(id => id !== orderId),
  })
}

/**
 * Add a review to a deliverable
 */
export async function addReviewToDeliverable(
  deliverableId: string,
  review: DeliverableReview
): Promise<void> {
  const deliverable = await getDeliverable(deliverableId)

  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found`)
  }

  const reviewHistory = deliverable.reviewHistory || []
  await updateDeliverable(deliverableId, {
    reviewHistory: [...reviewHistory, review],
  })
}

/**
 * Update a metric on a deliverable
 */
export async function updateDeliverableMetric(
  deliverableId: string,
  metricId: string,
  value: string
): Promise<void> {
  const deliverable = await getDeliverable(deliverableId)

  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found`)
  }

  const metrics = deliverable.metrics || []
  const updatedMetrics = metrics.map(m =>
    m.id === metricId ? { ...m, value } : m
  )

  await updateDeliverable(deliverableId, {
    metrics: updatedMetrics,
  })
}

/**
 * Calculate deliverable progress from project tasks
 */
export async function calculateDeliverableProgress(deliverableId: string): Promise<number> {
  // TODO: Implement progress calculation based on linked ProjectTasks
  // This would query all ProjectTasks with deliverableId and average their progress
  // For now, return 0 as placeholder
  return 0
}
