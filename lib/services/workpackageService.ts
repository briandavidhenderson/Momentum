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
import type { Workpackage } from "../types"

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
}

/**
 * Create a new workpackage
 * @returns The ID of the newly created workpackage
 */
export async function createWorkpackage(workpackageData: Omit<Workpackage, 'id'> & {
  createdBy: string }): Promise<string> {
  const db = getFirebaseDb()
  const wpRef = doc(collection(db, "workpackages"))
  const wpId = wpRef.id

  // Fix Bug #2: Handle tasks array properly (could be empty for new workpackages)
  const tasksWithTimestamps = (workpackageData.tasks || []).map(task => ({
    ...task,
    start: task.start instanceof Date ? Timestamp.fromDate(task.start) : task.start,
    end: task.end instanceof Date ? Timestamp.fromDate(task.end) : task.end,
    subtasks: (task.subtasks || []).map(st => ({
      ...st,
      start: st.start instanceof Date ? Timestamp.fromDate(st.start) : st.start,
      end: st.end instanceof Date ? Timestamp.fromDate(st.end) : st.end,
    })),
  }))

  await setDoc(wpRef, {
    ...workpackageData,
    id: wpId,
    start: workpackageData.start instanceof Date ? Timestamp.fromDate(workpackageData.start) : workpackageData.start,
    end: workpackageData.end instanceof Date ? Timestamp.fromDate(workpackageData.end) : workpackageData.end,
    tasks: tasksWithTimestamps,
    createdAt: serverTimestamp(),
  })

  return wpId
}

/**
 * Get all workpackages for a profile project
 */
export async function getWorkpackages(profileProjectId: string): Promise<Workpackage[]> {
  const db = getFirebaseDb()
  const q = query(collection(db, "workpackages"), where("profileProjectId", "==", profileProjectId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreWorkpackage
    return {
      ...data,
      start: data.start.toDate(),
      end: data.end.toDate(),
      tasks: data.tasks.map(task => ({
        ...task,
        start: task.start.toDate(),
        end: task.end.toDate(),
      })),
    } as Workpackage
  })
}

/**
 * Update a workpackage
 */
export async function updateWorkpackage(wpId: string, updates: Partial<Workpackage>): Promise<void> {
  const db = getFirebaseDb()
  const wpRef = doc(db, "workpackages", wpId)
  const updateData: any = { ...updates }

  if (updates.start) updateData.start = Timestamp.fromDate(updates.start)
  if (updates.end) updateData.end = Timestamp.fromDate(updates.end)
  if (updates.tasks) {
    updateData.tasks = updates.tasks.map(task => ({
      ...task,
      start: Timestamp.fromDate(task.start),
      end: Timestamp.fromDate(task.end),
    }))
  }

  await updateDoc(wpRef, updateData)
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
        start: data.start.toDate(),
        end: data.end.toDate(),
        tasks: data.tasks.map(task => ({
          ...task,
          start: task.start.toDate(),
          end: task.end.toDate(),
        })),
      } as Workpackage
    })
    callback(wps)
  })
}
