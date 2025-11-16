import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import {
  ELNExperiment,
} from "../types"

// ============================================================================
// ELECTRONIC LAB NOTEBOOK (ELN)
// ============================================================================

export async function createELNExperiment(experimentData: Omit<ELNExperiment, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const experimentRef = doc(collection(db, "elnExperiments"))
  const experimentId = experimentRef.id

  // Remove undefined values from experimentData
  const cleanData: any = {}
  Object.entries(experimentData).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value
    }
  })

  await setDoc(experimentRef, {
    ...cleanData,
    id: experimentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return experimentId
}

export async function updateELNExperiment(experimentId: string, updates: Partial<ELNExperiment>): Promise<void> {
  const db = getFirebaseDb()
  const experimentRef = doc(db, "elnExperiments", experimentId)

  // Deep clean function to remove undefined values and handle nested objects
  function deepClean(obj: any): any {
    if (obj === null || obj === undefined) {
      return null
    }

    if (Array.isArray(obj)) {
      return obj.map(item => deepClean(item)).filter(item => item !== null && item !== undefined)
    }

    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = deepClean(value)
        }
      }
      return cleaned
    }

    return obj
  }

  const cleanUpdates = deepClean(updates)
  const updateData: any = { ...cleanUpdates, updatedAt: serverTimestamp() }

  await setDoc(experimentRef, updateData, { merge: true })
}

export async function deleteELNExperiment(experimentId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "elnExperiments", experimentId))
}

export function subscribeToELNExperiments(
  filters: { labId?: string; userId?: string } | null,
  callback: (experiments: ELNExperiment[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "elnExperiments")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  } else if (filters?.userId) {
    q = query(q, where("createdBy", "==", filters.userId), orderBy("createdAt", "desc"))
  }

  try {
    return onSnapshot(q,
      (snapshot) => {
        const experiments = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
          } as ELNExperiment
        })
        callback(experiments)
      },
      (error) => {
        logger.error("Error in subscribeToELNExperiments", error)
        callback([])
      }
    )
  } catch (error) {
    logger.error("Error setting up ELN experiments subscription", error)
    return () => {}
  }
}
