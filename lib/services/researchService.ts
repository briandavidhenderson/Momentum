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
  { labId, userId }: SubscribeToResearchPinsParams,
  onPins: (pins: ResearchPin[]) => void,
): Unsubscribe {
  const db = getFirebaseDb()
  const pinsRef = collection(db, 'researchPins')

  const pinsQuery = query(pinsRef, where('labId', '==', labId), orderBy('createdAt', 'desc'))

  return onSnapshot(pinsQuery, (snapshot) => {
    const pins = snapshot.docs
      .map(mapResearchPin)
      .filter((pin) => {
        if (pin.visibility === 'private') {
          return pin.author?.userId === userId
        }
        return pin.visibility === 'lab' || pin.visibility === 'public'
      })

    onPins(pins)
  })
}
