import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import {
  InventoryItem,
  InventoryLevel,
} from "../types"

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

export interface FirestoreInventoryItem {
  id: string
  productName: string
  catNum: string
  supplier?: string
  currentQuantity: number
  priceExVAT: number
  minQuantity?: number
  burnRatePerWeek?: number
  inventoryLevel: string
  receivedDate: Timestamp
  lastOrderedDate?: Timestamp | null
  chargeToAccount?: string
  accountId?: string
  notes?: string
  category?: string
  subcategory?: string
  createdBy: string
  labId?: string
  createdAt: Timestamp
  createdDate?: Timestamp
  updatedAt?: Timestamp
  equipmentDeviceIds?: string[]
}

export async function createInventoryItem(itemData: Omit<InventoryItem, 'id'> & {
  createdBy: string }): Promise<string> {
  const db = getFirebaseDb()
  const itemRef = doc(collection(db, "inventory"))
  const itemId = itemRef.id

  await setDoc(itemRef, {
    ...itemData,
    id: itemId,
    receivedDate: Timestamp.fromDate(itemData.receivedDate),
    lastOrderedDate: itemData.lastOrderedDate ? Timestamp.fromDate(itemData.lastOrderedDate) : null,
    createdAt: serverTimestamp(),
  })

  return itemId
}

export async function getInventory(): Promise<InventoryItem[]> {
  const db = getFirebaseDb()
  const querySnapshot = await getDocs(collection(db, "inventory"))

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreInventoryItem
    return {
      id: data.id,
      productName: data.productName,
      catNum: data.catNum,
      supplier: data.supplier,
      currentQuantity: data.currentQuantity,
      priceExVAT: data.priceExVAT,
      minQuantity: data.minQuantity,
      burnRatePerWeek: data.burnRatePerWeek,
      inventoryLevel: data.inventoryLevel as InventoryLevel,
      receivedDate: data.receivedDate.toDate(),
      lastOrderedDate: data.lastOrderedDate ? data.lastOrderedDate.toDate() : undefined,
      category: data.category,
      subcategory: data.subcategory,
      equipmentDeviceIds: data.equipmentDeviceIds,
      chargeToAccount: data.chargeToAccount,
      notes: data.notes,
      labId: data.labId,
      createdAt: data.createdAt ? data.createdAt.toDate() : data.createdDate ? data.createdDate.toDate() : undefined,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
    } as InventoryItem
  })
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<void> {
  const db = getFirebaseDb()
  const itemRef = doc(db, "inventory", itemId)
  const updateData: any = { ...updates }

  if (updates.receivedDate) updateData.receivedDate = Timestamp.fromDate(updates.receivedDate)
  if (updates.lastOrderedDate) updateData.lastOrderedDate = Timestamp.fromDate(updates.lastOrderedDate)

  await updateDoc(itemRef, updateData)
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "inventory", itemId))
}

export function subscribeToInventory(
  filters: { labId?: string } | null,
  callback: (inventory: InventoryItem[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "inventory")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const inventory = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreInventoryItem
      return {
        id: data.id,
        productName: data.productName,
        catNum: data.catNum,
        supplier: data.supplier,
        currentQuantity: data.currentQuantity,
        priceExVAT: data.priceExVAT,
        minQuantity: data.minQuantity,
        burnRatePerWeek: data.burnRatePerWeek,
        inventoryLevel: data.inventoryLevel as InventoryLevel,
        receivedDate: data.receivedDate.toDate(),
        lastOrderedDate: data.lastOrderedDate ? data.lastOrderedDate.toDate() : undefined,
        category: data.category,
        subcategory: data.subcategory,
        equipmentDeviceIds: data.equipmentDeviceIds,
        chargeToAccount: data.chargeToAccount,
        notes: data.notes,
        labId: data.labId,
        createdAt: data.createdAt ? data.createdAt.toDate() : data.createdDate ? data.createdDate.toDate() : undefined,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
      } as InventoryItem
    })
    callback(inventory)
  })
}
