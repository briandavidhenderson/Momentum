/**
 * Workpackage Service - Workpackage management
 * Handles operations on the 'workpackages' collection
 */

import {
  collection,
  doc,
  getDocs,
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
import type { Workpackage, Subtask } from "../types"

// Remove undefined fields recursively and normalize dates to Firestore Timestamps.
function deepClean(value: any): any {
  if (value === undefined) return undefined
  if (value instanceof Date) return Timestamp.fromDate(value)
  if (value instanceof Timestamp) return value

  if (Array.isArray(value)) {
    return value
      .map((item) => deepClean(item))
      .filter((item) => item !== undefined)
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const cleaned: any = {}
    for (const [key, val] of Object.entries(value)) {
      const cleanedVal = deepClean(val)
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal
      }
    }
    return cleaned
  }

  return value
}

// ============================================================================
// WORKPACKAGE MANAGEMENT
// ============================================================================

export interface FirestoreWorkpackage {
  id: string
  name: string
  profileProjectId: string
  start: Timestamp
  end: Timestamp
  progress: number
  importance: string
  notes?: string
  tasks: any[]
  createdBy: string
  createdAt: Timestamp
  updatedAt?: Timestamp
}

/**
 * Create a new workpackage
 * @returns The ID of the newly created workpackage
 */
export async function createWorkpackage(workpackageData: Omit<Workpackage, 'id'> & {
  createdBy: string
}): Promise<string> {
  const db = getFirebaseDb()
  const wpRef = doc(collection(db, "workpackages"))
  const wpId = wpRef.id

  // Fix Bug #2: Handle tasks array properly (could be empty for new workpackages)
  const tasksWithTimestamps = (workpackageData.tasks || []).map(task => ({
    ...task,
    start: task.start instanceof Date ? Timestamp.fromDate(task.start) : task.start,
    end: task.end instanceof Date ? Timestamp.fromDate(task.end) : task.end,
    subtasks: (task.subtasks || []).map((st: Subtask) => ({
      ...st,
      start: st.start instanceof Date ? Timestamp.fromDate(st.start) : st.start,
      end: st.end instanceof Date ? Timestamp.fromDate(st.end) : st.end,
    })),
  }))

  // Map projectId to profileProjectId for Firestore (backward compatibility)
  const { projectId, ...restData } = workpackageData as any

  const payload = deepClean({
    ...restData,
    id: wpId,
    profileProjectId: projectId, // Map projectId to profileProjectId for Firestore
    start: workpackageData.start,
    end: workpackageData.end,
    tasks: tasksWithTimestamps,
    createdAt: serverTimestamp(),
  })

  console.log("DEBUG: createWorkpackage payload", JSON.stringify(payload));
  await setDoc(wpRef, payload)

  return wpId
}

/**
 * Get all workpackages for a profile project
 */
export async function getWorkpackages(profileProjectId: string): Promise<Workpackage[]> {
  if (!profileProjectId) return []
  const db = getFirebaseDb()
  const q = query(collection(db, "workpackages"), where("profileProjectId", "==", profileProjectId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreWorkpackage
    return {
      ...data,
      projectId: data.profileProjectId, // Map old field to new field name
      status: 'active', // Default status for legacy data
      deliverableIds: [], // Default empty array for legacy data
      start: data.start?.toDate ? data.start.toDate() : (data.start ? new Date(data.start as any) : new Date()),
      end: data.end?.toDate ? data.end.toDate() : (data.end ? new Date(data.end as any) : new Date()),
      tasks: data.tasks?.map(task => ({
        ...task,
        start: task.start?.toDate ? task.start.toDate() : (task.start ? new Date(task.start as any) : new Date()),
        end: task.end?.toDate ? task.end.toDate() : (task.end ? new Date(task.end as any) : new Date()),
      })) || [],
    } as Workpackage
  })
}

/**
 * Update a workpackage
 */
export async function updateWorkpackage(wpId: string, updates: Partial<Workpackage>): Promise<void> {
  const db = getFirebaseDb()
  const wpRef = doc(db, "workpackages", wpId)
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  }

  if (updates.start instanceof Date) updateData.start = Timestamp.fromDate(updates.start)
  if (updates.end instanceof Date) updateData.end = Timestamp.fromDate(updates.end)
  if (updates.tasks) {
    updateData.tasks = updates.tasks.map(task => ({
      ...task,
      start: task.start instanceof Date ? Timestamp.fromDate(task.start) : task.start,
      end: task.end instanceof Date ? Timestamp.fromDate(task.end) : task.end,
      subtasks: (task.subtasks || []).map((st: Subtask) => ({
        ...st,
        start: st.start instanceof Date ? Timestamp.fromDate(st.start) : st.start,
        end: st.end instanceof Date ? Timestamp.fromDate(st.end) : st.end,
      })),
    }))
  }

  const cleanedUpdate = deepClean(updateData)

  await updateDoc(wpRef, cleanedUpdate)
}

/**
 * Delete a workpackage
 */
export async function deleteWorkpackage(wpId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "workpackages", wpId))
}

/**
 * Subscribe to workpackages with optional filtering
 */
export function subscribeToWorkpackages(
  filters: { profileProjectId?: string } | null,
  callback: (wps: Workpackage[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "workpackages")

  if (filters?.profileProjectId) {
    q = query(q, where("profileProjectId", "==", filters.profileProjectId))
  }

  return onSnapshot(q, (snapshot) => {
    const wps = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreWorkpackage
      return {
        ...data,
        projectId: data.profileProjectId, // Map old field to new field name
        status: 'active', // Default status for legacy data
        deliverableIds: [], // Default empty array for legacy data
        start: data.start?.toDate ? data.start.toDate() : (data.start ? new Date(data.start as any) : new Date()),
        end: data.end?.toDate ? data.end.toDate() : (data.end ? new Date(data.end as any) : new Date()),
        tasks: data.tasks?.map(task => ({
          ...task,
          start: task.start?.toDate ? task.start.toDate() : (task.start ? new Date(task.start as any) : new Date()),
          end: task.end?.toDate ? task.end.toDate() : (task.end ? new Date(task.end as any) : new Date()),
        })) || [],
      } as Workpackage
    })
    callback(wps)
  })
}
