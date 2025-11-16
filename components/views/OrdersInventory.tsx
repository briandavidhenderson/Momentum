"use client"

import { useState, useEffect, useMemo } from "react"
import { useOrders } from "@/lib/hooks/useOrders"
import { useAuth } from "@/lib/hooks/useAuth"
import { Order, OrderStatus, InventoryItem, InventoryLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus, Package, ShoppingCart, CheckCircle, Clock, Archive, AlertCircle } from "lucide-react"
import { OrderCard } from "@/components/OrderCard"
import { OrderEditDialog } from "@/components/OrderEditDialog"
import { OrderFormDialog } from "@/components/OrderFormDialog"
import { createInventoryItem, deleteOrder, updateInventoryItem, updateEquipment } from "@/lib/firestoreService"
import { reconcileReceivedOrder, validateOrderForReconciliation } from "@/lib/orderInventoryUtils"
import { useAppContext } from "@/lib/AppContext"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { logger } from "@/lib/logger"

// Droppable Column Component
function DroppableColumn({
  id,
  children,
  className
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-brand-500' : ''}`}
    >
      {children}
    </div>
  )
}

export function OrdersInventory() {
  const { currentUserProfile } = useAuth()
  const {
    orders,
    inventory,
    handleCreateOrder,
    handleDeleteOrder,
    handleUpdateOrder,
    handleReorder,
    handleUpdateInventoryLevel,
    handleDeleteInventoryItem,
  } = useOrders()

  // Get equipment for reconciliation (linking new inventory to devices)
  const { equipment } = useAppContext()

  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Auto-delete received orders older than 7 days
  useEffect(() => {
    if (!orders || !currentUserProfile) return

    const checkAndDeleteOldOrders = async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const oldReceivedOrders = orders.filter(order => {
        if (order.status !== 'received' || !order.receivedDate) return false
        const receivedDate = new Date(order.receivedDate)
        return receivedDate < sevenDaysAgo
      })

      for (const order of oldReceivedOrders) {
        await deleteOrder(order.id)
      }
    }

    // Check immediately and then every hour
    checkAndDeleteOldOrders()
    const interval = setInterval(checkAndDeleteOldOrders, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [orders, currentUserProfile])

  // Organize orders by status
  const ordersByStatus = useMemo(() => {
    const toOrder = (orders || []).filter(o => o.status === 'to-order')
    const ordered = (orders || []).filter(o => o.status === 'ordered')
    const received = (orders || []).filter(o => o.status === 'received')
    return { toOrder, ordered, received }
  }, [orders])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !currentUserProfile) return

    const orderId = active.id as string
    const newStatus = over.id as OrderStatus

    // Find the order being dragged
    const order = orders?.find(o => o.id === orderId)
    if (!order || order.status === newStatus) return

    const wasReceived = order.status === 'received'
    const nowReceived = newStatus === 'received'

    // Update order status and dates
    const updates: Partial<Order> = { status: newStatus }

    if (newStatus === 'ordered' && !order.orderedDate) {
      updates.orderedDate = new Date()
    }

    if (nowReceived && !order.receivedDate) {
      updates.receivedDate = new Date()

      // Reconcile order with inventory (check for existing items before creating)
      try {
        // Validate order before reconciliation
        const validation = validateOrderForReconciliation({
          ...order,
          ...updates
        } as Order)

        if (!validation.valid) {
          logger.error('Order validation failed', { errors: validation.errors })
          alert(`Cannot reconcile order: ${validation.errors.join(', ')}`)
          return
        }

        // Reconcile with existing inventory
        const result = reconcileReceivedOrder(
          { ...order, ...updates } as Order,
          inventory || [],
          equipment || []
        )

        if (result.action === 'CREATE') {
          // Create new inventory item
          await createInventoryItem({
            ...result.inventoryItem,
            createdBy: currentUserProfile.id,
          })
          if (result.message) logger.info(result.message)
        } else {
          // Update existing inventory item
          await updateInventoryItem(result.inventoryItem.id, result.inventoryItem)
          if (result.message) logger.info(result.message)
        }

        // If supply was linked to a device, update the device
        if (result.updatedDevices) {
          for (const device of result.updatedDevices) {
            await updateEquipment(device.id, device)
            logger.info('Linked inventory item to device', {
              productName: result.inventoryItem.productName,
              deviceName: device.name,
            })
          }
        }
      } catch (error) {
        logger.error('Failed to reconcile inventory', error)
        alert('Failed to update inventory. Please try again.')
        return // Don't update order status if inventory reconciliation failed
      }
    }

    try {
      await handleUpdateOrder(orderId, updates)
    } catch (error) {
      logger.error('Failed to update order status', error)
      // Error is already shown by the hook
    }
  }

  const handleEdit = (order: Order) => {
    setEditingOrder(order)
  }

  const handleSaveEdit = async (orderId: string, updates: Partial<Order>) => {
    try {
      await handleUpdateOrder(orderId, updates)
      setEditingOrder(null)
    } catch (error) {
      logger.error('Failed to save order edits', error)
      // Error is already shown by the hook, keep modal open for user to retry
    }
  }

  const handleDelete = async (orderId: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      await handleDeleteOrder(orderId)
    }
  }

  const activeOrder = activeId ? orders?.find(o => o.id === activeId) : null

  const getColumnStyles = (status: OrderStatus) => {
    switch (status) {
      case 'to-order':
        return {
          container: 'bg-white border-gray-200',
          header: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white',
          icon: <Clock className="h-5 w-5 text-white" />,
          title: 'To Order'
        }
      case 'ordered':
        return {
          container: 'bg-white border-gray-200',
          header: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
          icon: <ShoppingCart className="h-5 w-5 text-white" />,
          title: 'Ordered'
        }
      case 'received':
        return {
          container: 'bg-white border-gray-200',
          header: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
          icon: <CheckCircle className="h-5 w-5 text-white" />,
          title: 'Received'
        }
      default:
        return {
          container: 'bg-white border-gray-200',
          header: 'bg-gray-500 text-white',
          icon: <Package className="h-5 w-5 text-white" />,
          title: 'Unknown'
        }
    }
  }

  const getInventoryLevelColor = (level: InventoryLevel) => {
    switch (level) {
      case 'empty':
        return 'border-red-300 bg-red-50'
      case 'low':
        return 'border-orange-300 bg-orange-50'
      case 'medium':
        return 'border-green-300 bg-green-50'
      case 'full':
        return 'border-blue-300 bg-blue-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders & Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Manage lab orders and track inventory levels
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowOrderDialog(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <Button
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('orders')}
          className={activeTab === 'orders' ? 'bg-brand-500 text-white' : ''}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Orders
        </Button>
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className={activeTab === 'inventory' ? 'bg-brand-500 text-white' : ''}
        >
          <Package className="h-4 w-4 mr-2" />
          Inventory
        </Button>
      </div>

      {/* Orders Kanban Board */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-5 border border-border shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {ordersByStatus.toOrder.length}
                  </p>
                  <p className="text-sm text-muted-foreground">To Order</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-5 border border-border shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {ordersByStatus.ordered.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ordered</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-5 border border-border shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {ordersByStatus.received.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-5 border border-border shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {orders?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['to-order', 'ordered', 'received'] as OrderStatus[]).map(status => {
                const columnStyles = getColumnStyles(status)
                const itemCount = status === 'to-order' ? ordersByStatus.toOrder.length :
                                 status === 'ordered' ? ordersByStatus.ordered.length :
                                 ordersByStatus.received.length
                const items = status === 'to-order' ? ordersByStatus.toOrder :
                             status === 'ordered' ? ordersByStatus.ordered :
                             ordersByStatus.received

                return (
                  <DroppableColumn
                    key={status}
                    id={status}
                    className={`rounded-xl border-2 overflow-hidden ${columnStyles.container} min-h-[500px] transition-all shadow-card`}
                  >
                    {/* Column Header with saturated color */}
                    <div className={`flex items-center gap-3 px-4 py-3 ${columnStyles.header}`}>
                      {columnStyles.icon}
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex-1">
                        {columnStyles.title}
                      </h3>
                      <span className="bg-white/20 px-2.5 py-1 rounded-full text-sm font-bold">
                        {itemCount}
                      </span>
                    </div>

                    <SortableContext
                      id={status}
                      items={items.map(o => o.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="p-4 space-y-3">
                        {items.map(order => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                        {items.length === 0 && (
                          <div className="empty-drop-zone flex flex-col items-center justify-center py-12">
                            <Package className="h-12 w-12 mb-3 text-gray-300" />
                            <p className="text-sm font-medium">Drop orders here</p>
                            <p className="text-xs mt-1">Drag and drop to organize</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DroppableColumn>
                )
              })}
            </div>

            <DragOverlay>
              {activeOrder ? (
                <div className="opacity-90">
                  <OrderCard
                    order={activeOrder}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-5 border border-red-300 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.filter(i => i.inventoryLevel === 'empty').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Empty</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-5 border border-orange-300 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.filter(i => i.inventoryLevel === 'low').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-5 border border-green-300 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.filter(i => i.inventoryLevel === 'medium' || i.inventoryLevel === 'full').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Stocked</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-5 border border-border shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-lg">
                  <Archive className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory && inventory.length > 0 ? (
              inventory.map((item: InventoryItem) => (
                <div
                  key={item.id}
                  className={`bg-card rounded-lg border-2 p-4 ${getInventoryLevelColor(item.inventoryLevel)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package className="h-5 w-5 flex-shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">{item.productName}</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item)}
                      className="text-xs ml-2"
                    >
                      Reorder
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cat. Number:</span>
                      <span className="font-medium">{item.catNum || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level:</span>
                      <span className="font-medium capitalize">{item.inventoryLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{item.currentQuantity || 0}</span>
                    </div>
                    {item.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-muted-foreground">{item.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                No inventory items found. Items will appear here when orders are received.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showOrderDialog && (
        <OrderFormDialog
          open={showOrderDialog}
          onClose={() => setShowOrderDialog(false)}
          onSave={handleCreateOrder}
        />
      )}
      <OrderEditDialog
        order={editingOrder}
        open={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
