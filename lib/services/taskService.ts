/**
 * Task Service - Task and todo management
 * Handles todo updates for workpackages/projects and day-to-day task operations
 */

import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
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
import { logger } from "../logger"
import type { Workpackage, Project, Subtask } from "../types"

// ============================================================================
// TODO MANAGEMENT (for Task Subtasks)
// ============================================================================

/**
 * Update a workpackage with recalculated progress after todo changes
 * This updates the entire workpackage including nested tasks, subtasks, and todos
 */
export async function updateWorkpackageWithProgress(wpId: string, workpackage: Workpackage): Promise<void> {
  const db = getFirebaseDb()
  const wpRef = doc(db, "workpackages", wpId)

  // Convert dates to Timestamps
  const updateData: any = {
    ...workpackage,
    start: Timestamp.fromDate(workpackage.start),
    end: Timestamp.fromDate(workpackage.end),
    tasks: (workpackage.tasks || []).map(task => ({
      ...task,
      start: Timestamp.fromDate(task.start),
      end: Timestamp.fromDate(task.end),
      subtasks: task.subtasks?.map((subtask: Subtask) => ({
        ...subtask,
        start: Timestamp.fromDate(subtask.start),
        end: Timestamp.fromDate(subtask.end),
      })),
    })),
  }

  await updateDoc(wpRef, updateData)
}

/**
 * Update a project with recalculated progress after todo changes
 * For legacy projects without workpackages (tasks directly in project)
 */
export async function updateProjectWithProgress(projectId: string, project: Project): Promise<void> {
  const db = getFirebaseDb()
  const projectRef = doc(db, "projects", projectId)

  // Convert string dates to Timestamps for Firestore
  const updateData: any = {
    ...project,
  }

  // Project dates are ISO strings, convert to Firestore Timestamps
  if (project.startDate) {
    updateData.start = Timestamp.fromDate(new Date(project.startDate))
  }
  if (project.endDate) {
    updateData.end = Timestamp.fromDate(new Date(project.endDate))
  }

  await updateDoc(projectRef, updateData)
}

// ============================================================================
// DAY-TO-DAY TASKS
// ============================================================================

export interface FirestoreDayToDayTask {
  id: string
  title: string
  description?: string
  status: "todo" | "working" | "done"
  importance: string
  assigneeId?: string
  dueDate?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  tags?: string[]
  linkedProjectId?: string
  linkedTaskId?: string
  order: number
}

/**
 * Create a new day-to-day task
 * @returns The ID of the newly created task
 */
export async function createDayToDayTask(taskData: Omit<any, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const taskRef = doc(collection(db, "dayToDayTasks"))
  const taskId = taskRef.id

  const taskToSave = {
    ...taskData,
    id: taskId,
    dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  // Remove undefined fields (Firestore doesn't allow undefined, only null or omitted)
  const cleanedTask = Object.fromEntries(
    Object.entries(taskToSave).filter(([_, v]) => v !== undefined)
  )

  await setDoc(taskRef, cleanedTask)

  return taskId
}

/**
 * Update a day-to-day task
 */
export async function updateDayToDayTask(taskId: string, updates: Partial<any>): Promise<void> {
  const db = getFirebaseDb()
  const taskRef = doc(db, "dayToDayTasks", taskId)
  const updateData: any = { ...updates, updatedAt: serverTimestamp() }

  if (updates.dueDate) {
    updateData.dueDate = Timestamp.fromDate(updates.dueDate)
  }

  // Remove undefined fields (Firestore doesn't allow undefined, only null or omitted)
  const cleanedUpdate = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  )

  await updateDoc(taskRef, cleanedUpdate)
}

/**
 * Delete a day-to-day task
 */
export async function deleteDayToDayTask(taskId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "dayToDayTasks", taskId))
}

/**
 * Subscribe to day-to-day tasks with optional filtering
 */
export function subscribeToDayToDayTasks(
  filters: { labId?: string; userId?: string } | null,
  callback: (tasks: any[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "dayToDayTasks")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  } else if (filters?.userId) {
    q = query(q, where("createdBy", "==", filters.userId))
  }

  try {
    return onSnapshot(q,
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreDayToDayTask
          return {
            ...data,
            dueDate: data.dueDate?.toDate() || undefined,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          }
        })
        callback(tasks)
      },
      (error) => {
        logger.error("Error in subscribeToDayToDayTasks", error)
        // Don't throw - just log the error and return empty array
        callback([])
      }
    )
  } catch (error) {
    logger.error("Error setting up day-to-day tasks subscription", error)
    // Return a no-op unsubscribe function
    return () => {}
  }
}
