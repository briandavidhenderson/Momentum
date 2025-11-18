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
  accountName?: string
  fundingAllocationId?: string
  allocationName?: string
  labId?: string
  category?: string
  subcategory?: string
  priceExVAT?: number
  currency?: string
  supplier?: string
}

/**
 * Create a new order with funding transaction and budget tracking
 * @returns The ID of the newly created order
 */
export async function createOrder(orderData: Omit<Order, 'id'> & {
  createdBy: string }): Promise<string> {
  const db = getFirebaseDb()
  const orderRef = doc(collection(db, "orders"))
  const orderId = orderRef.id

  // Feature #7: Update budget tracking when creating order
  if (orderData.accountId && orderData.priceExVAT) {
    const { updateAccountBudget } = await import('../budgetUtils')
    const {
      createFundingTransaction,
      updateAllocationBudget,
      getAllocation
    } = await import('./fundingService')

    // Update account-level budget
    await updateAccountBudget(
      orderData.accountId,
      orderData.priceExVAT,
      null, // old status (creating new order)
      orderData.status // new status
    )

    // If order is linked to an allocation, update allocation and create transaction
    if (orderData.fundingAllocationId) {
      const allocation = await getAllocation(orderData.fundingAllocationId)

      if (allocation) {
        // Only update allocation if order is in "ordered" status (committed)
        if (orderData.status === 'ordered') {
          const newCommitted = allocation.currentCommitted + orderData.priceExVAT
          const newRemaining = (allocation.allocatedAmount || 0) - allocation.currentSpent - newCommitted

          await updateAllocationBudget(orderData.fundingAllocationId, {
            currentCommitted: newCommitted,
            remainingBudget: newRemaining,
            status: newRemaining <= 0 ? 'exhausted' : allocation.status,
          })

          // Create ORDER_COMMIT transaction
          await createFundingTransaction({
            fundingAccountId: orderData.accountId,
            fundingAccountName: orderData.accountName || '',
            allocationId: orderData.fundingAllocationId,
            allocationName: orderData.allocationName,
            labId: orderData.labId || '',
            orderId: orderId,
            orderNumber: orderData.catNum || orderId.substring(0, 8),
            amount: orderData.priceExVAT,
            currency: orderData.currency,
            type: 'ORDER_COMMIT',
            status: 'PENDING',
            description: `Order placed: ${orderData.productName}`,
            createdBy: orderData.createdBy,
            supplierName: orderData.supplier,
          })
        }

        // If order is directly received, create FINAL transaction
        if (orderData.status === 'received') {
          const newSpent = allocation.currentSpent + orderData.priceExVAT
          const newRemaining = (allocation.allocatedAmount || 0) - newSpent - allocation.currentCommitted

          await updateAllocationBudget(orderData.fundingAllocationId, {
            currentSpent: newSpent,
            remainingBudget: newRemaining,
            status: newRemaining <= 0 ? 'exhausted' : allocation.status,
          })

          // Create ORDER_RECEIVED transaction
          await createFundingTransaction({
            fundingAccountId: orderData.accountId,
            fundingAccountName: orderData.accountName || '',
            allocationId: orderData.fundingAllocationId,
            allocationName: orderData.allocationName,
            labId: orderData.labId || '',
            orderId: orderId,
            orderNumber: orderData.catNum || orderId.substring(0, 8),
            amount: orderData.priceExVAT,
            currency: orderData.currency,
            type: 'ORDER_RECEIVED',
            status: 'FINAL',
            description: `Order received: ${orderData.productName}`,
            createdBy: orderData.createdBy,
            finalizedAt: new Date().toISOString(),
            supplierName: orderData.supplier,
          })
        }
      }
    }
  }

  const orderToSave = {
    ...orderData,
    id: orderId,
    orderedDate: orderData.orderedDate ? Timestamp.fromDate(orderData.orderedDate) : null,
    receivedDate: orderData.receivedDate ? Timestamp.fromDate(orderData.receivedDate) : null,
    createdDate: Timestamp.fromDate(orderData.createdDate),
    createdAt: serverTimestamp(),
  }

  // Remove undefined fields (Firestore doesn't allow undefined, only null or omitted)
  const cleanedOrder = Object.fromEntries(
    Object.entries(orderToSave).filter(([_, v]) => v !== undefined)
  )

  await setDoc(orderRef, cleanedOrder)

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
      orderedDate: data.orderedDate?.toDate(),
      receivedDate: data.receivedDate?.toDate(),
      createdDate: data.createdDate?.toDate() || new Date(),
    } as Order
  })
}

/**
 * Update an order and sync budget changes with transactions
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
        const { updateAccountBudget } = await import('../budgetUtils')
        const {
          createFundingTransaction,
          updateAllocationBudget,
          getAllocation
        } = await import('./fundingService')

        // Update account-level budget
        await updateAccountBudget(
          currentOrder.accountId,
          currentOrder.priceExVAT,
          oldStatus as OrderStatus | null,
          newStatus as OrderStatus | null
        )

        // Update allocation-level budget if order has an allocation
        if (currentOrder.fundingAllocationId) {
          const allocation = await getAllocation(currentOrder.fundingAllocationId)

          if (allocation) {
            // Calculate new budget values based on status transition
            let newSpent = allocation.currentSpent
            let newCommitted = allocation.currentCommitted

            // Moving to 'ordered' - add to committed
            if (oldStatus === 'to-order' && newStatus === 'ordered') {
              newCommitted += currentOrder.priceExVAT

              // Create ORDER_COMMIT transaction
              await createFundingTransaction({
                fundingAccountId: currentOrder.accountId!,
                fundingAccountName: currentOrder.accountName || '',
                allocationId: currentOrder.fundingAllocationId,
                labId: currentOrder.labId || '',
                orderId: orderId,
                amount: currentOrder.priceExVAT,
                currency: currentOrder.currency || 'EUR',
                type: 'ORDER_COMMIT',
                status: 'PENDING',
                description: `Order committed: ${currentOrder.productName}`,
                createdBy: currentOrder.createdBy,
              })
            }

            // Moving back to 'to-order' - remove from committed
            if (oldStatus === 'ordered' && newStatus === 'to-order') {
              newCommitted -= currentOrder.priceExVAT
            }

            // Note: Moving to 'received' is handled by Cloud Function
            // The Cloud Function will create ORDER_RECEIVED and update budgets

            const newRemaining = (allocation.allocatedAmount || 0) - newSpent - newCommitted

            await updateAllocationBudget(currentOrder.fundingAllocationId, {
              currentSpent: newSpent,
              currentCommitted: newCommitted,
              remainingBudget: newRemaining,
              status: newRemaining <= 0 ? 'exhausted' : 'active',
            })
          }
        }
      }
    }
  }

  if (updates.orderedDate) updateData.orderedDate = Timestamp.fromDate(updates.orderedDate)
  if (updates.receivedDate) updateData.receivedDate = Timestamp.fromDate(updates.receivedDate)
  if (updates.createdDate) updateData.createdDate = Timestamp.fromDate(updates.createdDate)

  // Add updatedAt timestamp
  updateData.updatedAt = serverTimestamp()

  // Remove undefined fields (Firestore doesn't allow undefined, only null or omitted)
  const cleanedUpdate = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  )

  await updateDoc(orderRef, cleanedUpdate)
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
      const { updateAccountBudget } = await import('../budgetUtils')
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
        orderedDate: data.orderedDate?.toDate(),
        receivedDate: data.receivedDate?.toDate(),
        createdDate: data.createdDate?.toDate() || new Date(),
      } as Order
    })
    callback(orders)
  })
}
