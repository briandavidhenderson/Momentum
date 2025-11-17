/**
 * Project Service - Master project and legacy project management
 * Handles operations on 'masterProjects' and 'projects' collections
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
  onSnapshot,
  Unsubscribe,
  Timestamp,
  writeBatch,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import type { MasterProject, Project, Lab } from "../types"
import { getProfileByUserId } from "./profileService"

// ============================================================================
// MASTER PROJECTS
// ============================================================================

/**
 * Creates a new master project (major research grant/program)
 * @returns The ID of the newly created master project
 */
export async function createMasterProject(projectData: Omit<MasterProject, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  // Fix Bug #1: Validate that required fields are present
  if (!projectData.name || !projectData.name.trim()) {
    throw new Error("Project name is required")
  }

  const projectRef = doc(collection(db, "masterProjects"))
  const projectId = projectRef.id

  // Fix Bug #1: Ensure name is explicitly included and not empty
  const projectToSave = {
    ...projectData,
    name: projectData.name.trim(), // Ensure name is trimmed and explicit
    id: projectId,
    createdAt: serverTimestamp(),
    spentAmount: 0,
    committedAmount: 0,
    remainingBudget: projectData.totalBudget || 0,
    progress: 0,
    workpackageIds: projectData.workpackageIds || [],
  }

  await setDoc(projectRef, projectToSave)

  // Update lab's active project count
  const labRef = doc(db, "labs", projectData.labId)
  const labSnap = await getDoc(labRef)
  if (labSnap.exists()) {
    const labData = labSnap.data() as Lab
    await updateDoc(labRef, {
      activeProjectCount: (labData.activeProjectCount || 0) + 1,
    })
  }

  return projectId
}

/**
 * Gets all master projects, optionally filtered by lab, funder, or person
 */
export async function getMasterProjects(filters?: {
  labId?: string
  funderId?: string
  personId?: string  // Returns projects where person is a team member
}): Promise<MasterProject[]> {
  const db = getFirebaseDb()
  let q = collection(db, "masterProjects")

  if (filters?.labId) {
    q = query(q as any, where("labId", "==", filters.labId)) as any
  }
  if (filters?.funderId) {
    q = query(q as any, where("funderId", "==", filters.funderId)) as any
  }
  if (filters?.personId) {
    // Query for projects where person is in teamMemberIds array
    q = query(q as any, where("teamMemberIds", "array-contains", filters.personId)) as any
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as MasterProject)
}

/**
 * Updates a master project
 */
export async function updateMasterProject(projectId: string, updates: Partial<MasterProject>): Promise<void> {
  const db = getFirebaseDb()
  const projectRef = doc(db, "masterProjects", projectId)
  const updateData: any = { ...updates, updatedAt: new Date().toISOString() }
  await updateDoc(projectRef, updateData)
}

/**
 * Deletes a master project and all associated data (accounts, workpackages, etc.)
 */
export async function deleteMasterProject(projectId: string): Promise<void> {
  const db = getFirebaseDb()
  const batch = writeBatch(db)

  // Delete the project
  const projectRef = doc(db, "masterProjects", projectId)
  batch.delete(projectRef)

  // Find and delete all associated accounts
  const accountsQuery = query(collection(db, "accounts"), where("masterProjectId", "==", projectId))
  const accountsSnapshot = await getDocs(accountsQuery)
  accountsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Find and delete all associated workpackages
  const workpackagesQuery = query(collection(db, "workpackages"), where("masterProjectId", "==", projectId))
  const workpackagesSnapshot = await getDocs(workpackagesQuery)
  workpackagesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Commit the batch
  await batch.commit()
}

/**
 * Subscribes to master projects with optional filters
 */
export function subscribeToMasterProjects(
  filters: { labId?: string; funderId?: string; personId?: string } | null,
  callback: (projects: MasterProject[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "masterProjects")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }
  if (filters?.funderId) {
    q = query(q, where("funderId", "==", filters.funderId))
  }
  if (filters?.personId) {
    q = query(q, where("teamMemberIds", "array-contains", filters.personId))
  }

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => doc.data() as MasterProject)
    callback(projects)
  })
}

// ============================================================================
// PROJECT MANAGEMENT (LEGACY)
// ============================================================================

// NOTE: The following Project/ProfileProject functions are kept for backward compatibility
// New code should use MasterProject functions above

export interface FirestoreProject {
  id: string
  name: string
  start: Timestamp
  end: Timestamp
  progress: number
  color: string
  importance: string
  notes: string
  principalInvestigatorId?: string
  profileProjectId?: string
  fundedBy?: string[]
  visibility?: string
  createdBy: string
  labId?: string
  createdAt: Timestamp
}

export async function createProject(projectData: Omit<Project, 'id'> & {
  createdBy: string; labId?: string }): Promise<string> {
  const db = getFirebaseDb()
  const projectRef = doc(collection(db, "projects"))
  const projectId = projectRef.id

  // Get labId from user's profile if not provided
  let labId: string | undefined = projectData.labId
  if (!labId) {
    const profile = await getProfileByUserId(projectData.createdBy)
    labId = profile?.labId || undefined
  }

  await setDoc(projectRef, {
    ...projectData,
    id: projectId,
    labId: labId,
    createdAt: serverTimestamp(),
  })

  return projectId
}

export async function getProjects(userId: string): Promise<Project[]> {
  const db = getFirebaseDb()
  // Get user's profile to determine visible projects
  const profile = await getProfileByUserId(userId)
  if (!profile) return []

  const querySnapshot = await getDocs(collection(db, "projects"))
  const allProjects = querySnapshot.docs.map(doc => {
    const data = doc.data() as any
    return {
      ...data,
      // Convert Firestore timestamps to ISO strings if they exist
      startDate: data.start ? data.start.toDate().toISOString() : data.startDate,
      endDate: data.end ? data.end.toDate().toISOString() : data.endDate,
    } as Project
  })

  // Filter based on visibility (implement visibility logic here)
  return allProjects
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
  const db = getFirebaseDb()
  const projectRef = doc(db, "projects", projectId)
  const updateData: any = { ...updates }

  // startDate and endDate are already strings in Project type, no conversion needed

  await updateDoc(projectRef, updateData)
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "projects", projectId))
}

export function subscribeToProjects(
  filters: { labId?: string; userId?: string } | null,
  callback: (projects: Project[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  if (!filters?.userId) {
    logger.warn("subscribeToProjects called with undefined or empty userId")
    // Return a no-op unsubscribe function
    return () => {}
  }

  try {
    let q: Query = collection(db, "projects")

    if (filters?.labId) {
      q = query(q, where("labId", "==", filters.labId))
    }

    return onSnapshot(
      q,
      async (snapshot) => {
        const projects = snapshot.docs.map(doc => {
          const data = doc.data() as any
          return {
            ...data,
            // Convert Firestore timestamps to ISO strings if they exist
            startDate: data.start ? data.start.toDate().toISOString() : data.startDate,
            endDate: data.end ? data.end.toDate().toISOString() : data.endDate,
          } as Project
        })
        callback(projects)
      },
      (error) => {
        logger.error("Error in subscribeToProjects", error)
        // Don't throw - just log the error and return empty array
        callback([])
      }
    )
  } catch (error) {
    logger.error("Error setting up projects subscription", error)
    // Return a no-op unsubscribe function
    return () => {}
  }
}
