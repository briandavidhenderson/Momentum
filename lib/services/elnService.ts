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
  runTransaction,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import {
  ELNExperiment,
} from "../types"

// ============================================================================
// ELECTRONIC LAB NOTEBOOK (ELN)
// ============================================================================

export async function createELNExperiment(experimentData: Omit<ELNExperiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
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
  const experimentsRef = collection(db, "elnExperiments")
  const { or } = require("firebase/firestore");

  let q: Query;

  if (filters?.labId) {
    // If labId is provided, we want experiments that are:
    // 1. In this lab (visibility 'lab' or 'public')
    // 2. Shared with the current user (visibility 'shared')
    // 3. Created by the current user (always visible)
    // Note: This requires userId to be passed in filters for correct shared logic

    // Fallback if userId is not provided (should be provided)
    if (!filters.userId) {
      q = query(experimentsRef, where("labId", "==", filters.labId), orderBy("createdAt", "desc"));
    } else {
      q = query(
        experimentsRef,
        or(
          where("labId", "==", filters.labId),
          where("sharedWithUsers", "array-contains", filters.userId),
          where("createdBy", "==", filters.userId)
        ),
        orderBy("createdAt", "desc")
      );
    }
  } else if (filters?.userId) {
    q = query(experimentsRef, where("createdBy", "==", filters.userId), orderBy("createdAt", "desc"))
  } else {
    // Default fallback
    q = query(experimentsRef, orderBy("createdAt", "desc"))
  }

  return onSnapshot(q,
    (snapshot) => {
      const experiments = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          visibility: data.visibility || 'private',
          sharedWithUsers: data.sharedWithUsers || data.collaborators || [],
          sharedWithGroups: data.sharedWithGroups || (data.groupId ? [data.groupId] : []),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt as any).toISOString() : new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt as any).toISOString() : undefined),
        } as ELNExperiment
      }).filter(exp => {
        // Client-side visibility check
        if (!filters?.userId) return true; // Cannot filter without userId
        const userId = filters.userId;

        if (exp.createdBy === userId) return true;
        if (exp.visibility === 'public') return true;
        if (exp.visibility === 'lab' && exp.labId === filters.labId) return true;
        if (exp.visibility === 'shared') {
          return (exp.sharedWithUsers?.includes(userId)) ||
            (exp.collaborators?.includes(userId)); // Backward compatibility
        }
        return false;
      });

      callback(experiments)
    },
    (error) => {
      logger.error("Error in subscribeToELNExperiments", error)
      callback([])
    }
  )
}

export function subscribeToELNExperiment(
  experimentId: string,
  callback: (experiment: ELNExperiment | null) => void
): Unsubscribe {
  const db = getFirebaseDb()
  const docRef = doc(db, "elnExperiments", experimentId)

  return onSnapshot(docRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        callback({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt as any).toISOString() : new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt as any).toISOString() : undefined),
        } as ELNExperiment)
      } else {
        callback(null)
      }
    },
    (error) => {
      logger.error("Error subscribing to ELN experiment", error)
      callback(null)
    }
  )
}

export async function deductExperimentInventory(
  experimentId: string,
  inventoryId: string,
  quantityUsed: number
): Promise<void> {
  const db = getFirebaseDb()

  // 1. Get the experiment
  const expRef = doc(db, "elnExperiments", experimentId)
  // We need to read it first to update the specific item in the array
  // Ideally we would use arrayUnion/Remove but we need to update a property of an object in the array
  // So we read, modify, write.
  // Note: This is not atomic without a transaction, but sufficient for now.

  // 2. Get the inventory item
  const invRef = doc(db, "inventory", inventoryId)

  try {
    await runTransaction(db, async (transaction) => {
      const expDoc = await transaction.get(expRef)
      const invDoc = await transaction.get(invRef)

      if (!expDoc.exists()) throw "Experiment does not exist!"
      if (!invDoc.exists()) throw "Inventory item does not exist!"

      const expData = expDoc.data() as ELNExperiment
      const invData = invDoc.data() as any // InventoryItem

      // Find the item in experiment's consumedInventory
      const consumedItems = expData.consumedInventory || []
      const itemIndex = consumedItems.findIndex(i => i.inventoryId === inventoryId)

      if (itemIndex === -1) throw "Item not linked to experiment"

      const item = consumedItems[itemIndex]
      if (item.deducted) throw "Item already deducted"

      // Update inventory quantity
      const newQuantity = (invData.currentQuantity || 0) - quantityUsed
      if (newQuantity < 0) throw "Insufficient stock"

      transaction.update(invRef, {
        currentQuantity: newQuantity,
        updatedAt: serverTimestamp()
      })

      // Update experiment item
      const updatedItems = [...consumedItems]
      updatedItems[itemIndex] = { ...item, deducted: true, quantityUsed } // Update quantity used just in case

      transaction.update(expRef, {
        consumedInventory: updatedItems,
        updatedAt: serverTimestamp()
      })
    })
  } catch (e) {
    logger.error("Transaction failed: ", e)
    throw e
  }
}

