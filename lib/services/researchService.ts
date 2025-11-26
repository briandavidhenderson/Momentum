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
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date())
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

  // We need two queries to satisfy security rules:
  // 1. Shared pins (lab/public) in this lab/board
  // 2. My private pins in this lab/board

  // Helper to merge and sort pins
  const mergePins = (shared: ResearchPin[], mine: ResearchPin[]) => {
    const all = new Map<string, ResearchPin>();
    shared.forEach(p => all.set(p.id, p));
    mine.forEach(p => all.set(p.id, p));

    return Array.from(all.values()).sort((a, b) => {
      const tA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const tB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return tB - tA;
    });
  };

  let sharedPins: ResearchPin[] = [];
  let myPins: ResearchPin[] = [];

  // Query 1: Shared Pins
  // We filter by labId (required by rules) and exclude private pins
  // Note: Firestore doesn't support != easily with other filters, so we use 'in' or just rely on 'labId' 
  // IF the rules allowed reading all lab pins. But the rules restrict private pins.
  // So we must query for pins that are NOT private.
  // Since 'visibility' might be missing on old data, we rely on the fact that 
  // createResearchPin sets it. For legacy data, we might miss some if we strictly filter.
  // However, the safest query that works with the rules is:
  // where('labId', '==', labId) AND where('visibility', 'in', ['lab', 'public'])

  let sharedQuery;
  if (boardId) {
    sharedQuery = query(
      pinsRef,
      where('boardId', '==', boardId),
      where('labId', '==', labId),
      where('visibility', 'in', ['lab', 'public']),
      orderBy('createdAt', 'desc')
    );
  } else {
    sharedQuery = query(
      pinsRef,
      where('labId', '==', labId),
      where('visibility', 'in', ['lab', 'public']),
      orderBy('createdAt', 'desc')
    );
  }

  const unsubShared = onSnapshot(sharedQuery, (snapshot) => {
    sharedPins = snapshot.docs.map(mapResearchPin);
    onPins(mergePins(sharedPins, myPins));
  }, (error) => {
    logger.warn("Error fetching shared pins", error);
    // Don't fail completely, just log. The user might only have private pins.
  });

  // Query 2: My Pins (Private and Public - but mainly to get the private ones)
  // We query by author.userId which is allowed by rules regardless of visibility
  let myQuery;
  if (boardId) {
    myQuery = query(
      pinsRef,
      where('boardId', '==', boardId),
      where('author.userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  } else {
    myQuery = query(
      pinsRef,
      where('labId', '==', labId),
      where('author.userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  }

  const unsubMine = onSnapshot(myQuery, (snapshot) => {
    myPins = snapshot.docs.map(mapResearchPin);
    onPins(mergePins(sharedPins, myPins));
  }, (error) => {
    logger.warn("Error fetching my pins", error);
  });

  return () => {
    unsubShared();
    unsubMine();
  };
}
