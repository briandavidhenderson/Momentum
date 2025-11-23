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
  LabPoll,
} from "../types"

// ============================================================================
// LAB POLLS
// ============================================================================

export async function createLabPoll(pollData: Omit<LabPoll, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const pollRef = doc(collection(db, "labPolls"))
  const pollId = pollRef.id

  await setDoc(pollRef, {
    ...pollData,
    id: pollId,
    createdAt: serverTimestamp(),
  })

  return pollId
}

export async function updateLabPoll(pollId: string, updates: Partial<LabPoll>): Promise<void> {
  const db = getFirebaseDb()
  const pollRef = doc(db, "labPolls", pollId)
  await updateDoc(pollRef, updates)
}

export async function deleteLabPoll(pollId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "labPolls", pollId))
}

export function subscribeToLabPolls(
  filters: { labId?: string } | null,
  callback: (polls: LabPoll[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  if (!filters?.labId) {
    logger.warn("subscribeToLabPolls called with undefined or empty labId")
    callback([])
    return () => {}
  }

  try {
    let q: Query = collection(db, "labPolls")

    if (filters?.labId && filters.labId !== undefined && filters.labId !== null && filters.labId !== "") {
      q = query(q, where("labId", "==", filters.labId), orderBy("createdAt", "desc"))
    }

    return onSnapshot(q,
      (snapshot) => {
        const polls = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          } as LabPoll
        })
        callback(polls)
      },
      (error) => {
        logger.error("Error in subscribeToLabPolls", error)
        callback([])
      }
    )
  } catch (error) {
    logger.error("Error setting up lab polls subscription", error)
    return () => {}
  }
}
