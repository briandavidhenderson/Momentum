import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore"
import { getFirebaseDb, sanitizeForFirestore } from "../firebase"
import type {
  CreateResearchPinInput,
  ResearchPin,
  ResearchPinVisibility,
  UpdateResearchPinInput,
} from "../types"
import { logger } from "../logger"

interface SubscribeToResearchPinsParams {
  labId: string
  userId: string
}

function deriveVisibility(pin: { visibility?: ResearchPinVisibility; isPrivate?: boolean }): ResearchPinVisibility {
  if (pin.visibility) return pin.visibility
  return pin.isPrivate ? 'private' : 'lab'
}

function mapResearchPin(docSnap: any): ResearchPin {
  const data = docSnap.data()
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt

  const visibility = deriveVisibility(data)

  return {
    id: docSnap.id,
    ...data,
    visibility,
    isPrivate: visibility === 'private',
    createdAt,
    updatedAt,
  }
}

export async function createResearchPin(pin: CreateResearchPinInput): Promise<string> {
  const db = getFirebaseDb()
  const pinsRef = collection(db, 'researchPins')

  const visibility = deriveVisibility(pin)
  const payload = sanitizeForFirestore({
    ...pin,
    visibility,
    isThinking: pin.isThinking ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const docRef = await addDoc(pinsRef, payload)
  logger.info('Created research pin', { id: docRef.id, visibility })
  return docRef.id
}

export async function updateResearchPin(pinId: string, updates: UpdateResearchPinInput): Promise<void> {
  const db = getFirebaseDb()
  const pinRef = doc(db, 'researchPins', pinId)
  const visibility = deriveVisibility(updates)

  const payload = sanitizeForFirestore({
    ...updates,
    visibility,
    isPrivate: visibility === 'private',
    updatedAt: serverTimestamp(),
  })

  await updateDoc(pinRef, payload)
  logger.info('Updated research pin', { pinId, visibility })
}

export async function deleteResearchPin(pinId: string): Promise<void> {
  const db = getFirebaseDb()
  const pinRef = doc(db, 'researchPins', pinId)
  await deleteDoc(pinRef)
  logger.info('Deleted research pin', { pinId })
}

export function subscribeToResearchPins(
  { labId, userId, boardId }: SubscribeToResearchPinsParams & { boardId?: string },
  onPins: (pins: ResearchPin[]) => void,
): Unsubscribe {
  const db = getFirebaseDb()
  const pinsRef = collection(db, 'researchPins')

  let pinsQuery;

  if (boardId) {
    // If boardId is provided, we filter by boardId.
    // We might need an index for boardId + createdAt
    pinsQuery = query(
      pinsRef,
      where('boardId', '==', boardId),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Fallback to labId query for backward compatibility or "All Pins" view
    pinsQuery = query(pinsRef, where('labId', '==', labId), orderBy('createdAt', 'desc'))
  }

  return onSnapshot(pinsQuery, (snapshot) => {
    const pins = snapshot.docs
      .map(mapResearchPin)
      .filter((pin) => {
        // If filtering by board, we assume board members have access.
        // But we still check private pins just in case.
        if (pin.visibility === 'private') {
          return pin.author?.userId === userId
        }
        return true; // Lab/Public pins are visible to board members
      })

    onPins(pins)
  })
}
