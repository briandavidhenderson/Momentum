import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import {
  EquipmentDevice,
} from "../types"

// ============================================================================
// EQUIPMENT
// ============================================================================

export async function createEquipment(equipmentData: Omit<EquipmentDevice, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const equipmentRef = doc(collection(db, "equipment"))
  const equipmentId = equipmentRef.id

  await setDoc(equipmentRef, {
    ...equipmentData,
    id: equipmentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return equipmentId
}

export async function getEquipment(): Promise<EquipmentDevice[]> {
  const db = getFirebaseDb()
  const querySnapshot = await getDocs(collection(db, "equipment"))

  return querySnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt as any).toISOString() : new Date().toISOString()),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt as any).toISOString() : undefined),
    } as EquipmentDevice
  })
}

export async function updateEquipment(equipmentId: string, updates: Partial<EquipmentDevice>): Promise<void> {
  const db = getFirebaseDb()
  const equipmentRef = doc(db, "equipment", equipmentId)
  const updateData: Record<string, any> = { ...updates, updatedAt: serverTimestamp() }
  await updateDoc(equipmentRef, updateData)
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "equipment", equipmentId))
}

export function subscribeToEquipment(labId: string | null, callback: (equipment: EquipmentDevice[]) => void): Unsubscribe {
  const db = getFirebaseDb()
  if (!labId) {
    logger.warn("subscribeToEquipment called with undefined or empty labId")
    callback([])
    return () => { }
  }

  try {
    const q = query(
      collection(db, "equipment"),
      where("labId", "==", labId),
      orderBy("name", "asc")
    )

    return onSnapshot(q,
      (snapshot) => {
        const equipment = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt as any).toISOString() : new Date().toISOString()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt as any).toISOString() : undefined),
          } as EquipmentDevice
        })
        callback(equipment)
      },
      (error) => {
        logger.error("Error in subscribeToEquipment", error)
        callback([])
      }
    )
  } catch (error) {
    logger.error("Error setting up equipment subscription", error)
    return () => { }
  }
}
