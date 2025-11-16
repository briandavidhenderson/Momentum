/**
 * Order Service - Order management and tracking
 * Handles operations on the 'orders' collection
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
  serverTimestamp,
} from "firebase/firestore"
import type { Query } from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import type { Order, OrderStatus } from "../types"

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

export interface FirestoreOrder {
  id: string
  productName: string
  catNum: string
  status: string
  orderedBy?: string
  orderedDate?: Timestamp | null
  receivedDate?: Timestamp | null
  createdBy: string
  createdDate: Timestamp
  chargeToAccount?: string
  accountId?: string
  category?: string
  subcategory?: string
  priceExVAT?: number
}

/**
 * Create a new order
 * @returns The ID of the newly created order
 */
export async function createOrder(orderData: Omit<Order, 'id'> & {
  createdBy: string }): Promise<string> {
  const db = getFirebaseDb()
  const orderRef = doc(collection(db, "orders"))
  const orderId = orderRef.id

  // Feature #7: Update budget tracking when creating order
  if (orderData.accountId && orderData.priceExVAT) {
    const { updateAccountBudget } = await import('./budgetUtils')
    await updateAccountBudget(
      orderData.accountId,
      orderData.priceExVAT,
      null, // old status (creating new order)
      orderData.status // new status
    )
  }

  await setDoc(orderRef, {
    ...orderData,
    id: orderId,
    orderedDate: orderData.orderedDate ? Timestamp.fromDate(orderData.orderedDate) : null,
    receivedDate: orderData.receivedDate ? Timestamp.fromDate(orderData.receivedDate) : null,
    createdDate: Timestamp.fromDate(orderData.createdDate),
    createdAt: serverTimestamp(),
  })

  return orderId
}

/**
 * Get all orders
 */
export async function getOrders(): Promise<Order[]> {
  const db = getFirebaseDb()
  const querySnapshot = await getDocs(collection(db, "orders"))

  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreOrder
    return {
      ...data,
      orderedDate: data.orderedDate ? data.orderedDate.toDate() : undefined,
      receivedDate: data.receivedDate ? data.receivedDate.toDate() : undefined,
      createdDate: data.createdDate.toDate(),
    } as Order
  })
}

/**
 * Update an order
 */
export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
  const db = getFirebaseDb()
  const orderRef = doc(db, "orders", orderId)
  const updateData: any = { ...updates }

  // Feature #7: Update budget tracking when order status changes
  if (updates.status) {
    const orderDoc = await getDoc(orderRef)
    if (orderDoc.exists()) {
      const currentOrder = orderDoc.data() as FirestoreOrder
      const oldStatus = currentOrder.status
      const newStatus = updates.status

      if (oldStatus !== newStatus && currentOrder.accountId && currentOrder.priceExVAT) {
        const { updateAccountBudget } = await import('./budgetUtils')
        await updateAccountBudget(
          currentOrder.accountId,
          currentOrder.priceExVAT,
          oldStatus as OrderStatus | null,
          newStatus as OrderStatus | null
        )
      }
    }
  }

  if (updates.orderedDate) updateData.orderedDate = Timestamp.fromDate(updates.orderedDate)
  if (updates.receivedDate) updateData.receivedDate = Timestamp.fromDate(updates.receivedDate)
  if (updates.createdDate) updateData.createdDate = Timestamp.fromDate(updates.createdDate)

  await updateDoc(orderRef, updateData)
}

/**
 * Delete an order
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const db = getFirebaseDb()
  // Feature #7: Update budget tracking when deleting order
  const orderRef = doc(db, "orders", orderId)
  const orderDoc = await getDoc(orderRef)

  if (orderDoc.exists()) {
    const order = orderDoc.data() as FirestoreOrder
    if (order.accountId && order.priceExVAT) {
      const { updateAccountBudget } = await import('./budgetUtils')
      await updateAccountBudget(
        order.accountId,
        order.priceExVAT,
        order.status as OrderStatus | null,
        null // deleting order
      )
    }
  }

  await deleteDoc(orderRef)
}

/**
 * Subscribe to orders with optional filtering
 */
export function subscribeToOrders(
  filters: { labId?: string } | null,
  callback: (orders: Order[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "orders")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreOrder
      return {
        ...data,
        orderedDate: data.orderedDate ? data.orderedDate.toDate() : undefined,
        receivedDate: data.receivedDate ? data.receivedDate.toDate() : undefined,
        createdDate: data.createdDate.toDate(),
      } as Order
    })
    callback(orders)
  })
}
