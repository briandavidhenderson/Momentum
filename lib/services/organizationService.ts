/**
 * Organization Service - Organizational hierarchy management
 * Handles operations on 'organisations', 'institutes', and 'labs' collections
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import type { Organisation, Institute, Lab } from "../types"

// ============================================================================
// ORGANISATIONS
// ============================================================================

/**
 * Creates a new organisation (university, research institute, etc.)
 * @returns The ID of the newly created organisation
 */
export async function createOrganisation(orgData: Omit<Organisation, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  const orgRef = doc(collection(db, "organisations"))
  const orgId = orgRef.id

  logger.debug("Creating organisation", { orgId, name: orgData.name })

  const docData = {
    ...orgData,
    id: orgId,
    createdAt: new Date().toISOString(),
    memberCount: 0,
    instituteCount: 0,
  }

  try {
    await setDoc(orgRef, docData)
    logger.info("Organisation created successfully", { orgId, name: orgData.name })
  } catch (error) {
    logger.error("Error creating organisation", error, { orgId })
    throw error
  }

  return orgId
}

/**
 * Get all organisations
 */
export async function getOrganisations(): Promise<Organisation[]> {
  const db = getFirebaseDb()
  const querySnapshot = await getDocs(collection(db, "organisations"))
  return querySnapshot.docs.map(doc => doc.data() as Organisation)
}

/**
 * Subscribe to organisations
 */
export function subscribeToOrganisations(callback: (orgs: Organisation[]) => void): Unsubscribe {
  const db = getFirebaseDb()
  return onSnapshot(collection(db, "organisations"), (snapshot) => {
    const orgs = snapshot.docs.map(doc => doc.data() as Organisation)
    callback(orgs)
  })
}

// ============================================================================
// INSTITUTES
// ============================================================================

/**
 * Creates a new institute (department, school, faculty)
 * @returns The ID of the newly created institute
 */
export async function createInstitute(instituteData: Omit<Institute, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  const instituteRef = doc(collection(db, "institutes"))
  const instituteId = instituteRef.id

  await setDoc(instituteRef, {
    ...instituteData,
    id: instituteId,
    createdAt: new Date().toISOString(),
    memberCount: 0,
    labCount: 0,
  })

  // Update organisation's institute count
  const orgRef = doc(db, "organisations", instituteData.organisationId)
  const orgSnap = await getDoc(orgRef)
  if (orgSnap.exists()) {
    const orgData = orgSnap.data() as Organisation
    await updateDoc(orgRef, {
      instituteCount: (orgData.instituteCount || 0) + 1,
    })
  }

  return instituteId
}

/**
 * Get institutes, optionally filtered by organisation
 */
export async function getInstitutes(orgId?: string): Promise<Institute[]> {
  const db = getFirebaseDb()
  let q
  if (orgId) {
    q = query(collection(db, "institutes"), where("organisationId", "==", orgId))
  } else {
    q = collection(db, "institutes")
  }
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as Institute)
}

/**
 * Subscribe to institutes, optionally filtered by organisation
 */
export function subscribeToInstitutes(orgId: string | null, callback: (institutes: Institute[]) => void): Unsubscribe {
  const db = getFirebaseDb()
  const q = orgId
    ? query(collection(db, "institutes"), where("organisationId", "==", orgId))
    : collection(db, "institutes")

  return onSnapshot(q, (snapshot) => {
    const institutes = snapshot.docs.map(doc => doc.data() as Institute)
    callback(institutes)
  })
}

// ============================================================================
// LABS
// ============================================================================

/**
 * Creates a new lab (research group/laboratory)
 * @returns The ID of the newly created lab
 */
export async function createLab(labData: Omit<Lab, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  const labRef = doc(collection(db, "labs"))
  const labId = labRef.id

  await setDoc(labRef, {
    ...labData,
    id: labId,
    createdAt: new Date().toISOString(),
    memberCount: 0,
    activeProjectCount: 0,
  })

  // Update institute's lab count
  const instituteRef = doc(db, "institutes", labData.instituteId)
  const instituteSnap = await getDoc(instituteRef)
  if (instituteSnap.exists()) {
    const instituteData = instituteSnap.data() as Institute
    await updateDoc(instituteRef, {
      labCount: (instituteData.labCount || 0) + 1,
    })
  }

  return labId
}

/**
 * Get labs, optionally filtered by institute
 */
export async function getLabs(instituteId?: string): Promise<Lab[]> {
  const db = getFirebaseDb()
  let q
  if (instituteId) {
    q = query(collection(db, "institutes"), where("instituteId", "==", instituteId))
  } else {
    q = collection(db, "labs")
  }
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as Lab)
}

/**
 * Subscribe to labs, optionally filtered by institute
 */
export function subscribeToLabs(instituteId: string | null, callback: (labs: Lab[]) => void): Unsubscribe {
  const db = getFirebaseDb()
  const q = instituteId
    ? query(collection(db, "labs"), where("instituteId", "==", instituteId))
    : collection(db, "labs")

  return onSnapshot(q, (snapshot) => {
    const labs = snapshot.docs.map(doc => doc.data() as Lab)
    callback(labs)
  })
}
