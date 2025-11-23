"use client"

import { useState, useEffect, useMemo } from "react"
import { useOrders } from "@/lib/hooks/useOrders"
import { useAuth } from "@/lib/hooks/useAuth"
import { Order, OrderStatus, InventoryItem, InventoryLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus, Package, ShoppingCart, CheckCircle, Clock, Archive, AlertCircle, Download, Upload, FileText, Beaker } from "lucide-react"
import { OrderCard } from "@/components/orders/OrderCard"
import ResearchBoard from "@/components/views/ResearchBoard"
import { OrderEditDialog } from "@/components/orders/OrderEditDialog"
import { OrderFormDialog } from "@/components/orders/OrderFormDialog"
import { AddInventoryDialog } from "@/components/dialogs/AddInventoryDialog"
import { ImportInventoryDialog } from "@/components/dialogs/ImportInventoryDialog"
import { createInventoryItem, deleteOrder, updateInventoryItem, updateEquipment } from "@/lib/firestoreService"
import {
  generateInventoryTemplate,
  exportInventoryToCSV,
  downloadCSV
} from "@/lib/utils/csvInventoryUtils"
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
  // Get deliverables for displaying linked deliverable names
  const { equipment, deliverables } = useAppContext()

  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showInventoryDialog, setShowInventoryDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'research'>('orders')

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

  // Helper to get deliverable name for an order
  const getDeliverableName = (order: Order): string | undefined => {
    if (!order.linkedDeliverableId) return undefined
    const deliverable = deliverables?.find(d => d.id === order.linkedDeliverableId)
    return deliverable?.name
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

  // Handle CSV template download
  const handleDownloadTemplate = () => {
    const template = generateInventoryTemplate()
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(template, `inventory_template_${timestamp}.csv`)
  }

  // Handle inventory export
  const handleExportInventory = () => {
    if (!inventory || inventory.length === 0) {
      alert("No inventory items to export")
      return
    }

    const csv = exportInventoryToCSV(inventory)
    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `inventory_export_${timestamp}.csv`)
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
          {activeTab === 'orders' && (
            <Button
              onClick={() => setShowOrderDialog(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          )}
          {activeTab === 'inventory' && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="text-slate-600 hover:text-slate-900"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                onClick={handleExportInventory}
                disabled={!inventory || inventory.length === 0}
                className="text-slate-600 hover:text-slate-900"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                className="text-blue-600 hover:text-blue-700 border-blue-300"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button
                onClick={() => setShowInventoryDialog(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </>
          )}
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
        <Button
          variant={activeTab === 'research' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('research')}
          className={activeTab === 'research' ? 'bg-brand-500 text-white' : ''}
        >
          <Beaker className="h-4 w-4 mr-2" />
          Research Board
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
                            deliverableName={getDeliverableName(order)}
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
                    onEdit={() => { }}
                    onDelete={() => { }}
                    deliverableName={getDeliverableName(activeOrder)}
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

          {/* Categorized Inventory */}
          {inventory && inventory.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                // Group inventory by category
                const grouped = inventory.reduce((acc, item) => {
                  const category = item.category || 'Uncategorized'
                  if (!acc[category]) acc[category] = []
                  acc[category].push(item)
                  return acc
                }, {} as Record<string, InventoryItem[]>)

                // Sort categories alphabetically, but keep Uncategorized last
                const sortedCategories = Object.keys(grouped).sort((a, b) => {
                  if (a === 'Uncategorized') return 1
                  if (b === 'Uncategorized') return -1
                  return a.localeCompare(b)
                })

                return sortedCategories.map(category => (
                  <div key={category} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        {category}
                      </h3>
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-500 font-medium">
                        {grouped[category].length} item{grouped[category].length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {grouped[category].map((item: InventoryItem) => {
                        // Determine border color based on stock level
                        const stockColor =
                          item.inventoryLevel === 'empty' ? 'border-l-red-400' :
                          item.inventoryLevel === 'low' ? 'border-l-orange-400' :
                          item.inventoryLevel === 'medium' ? 'border-l-emerald-400' :
                          'border-l-blue-400'

                        return (
                          <div
                            key={item.id}
                            className={`group relative bg-white rounded-lg border-l-4 ${stockColor} border border-slate-200 p-3 hover:shadow-md transition-all duration-200`}
                          >
                            {/* Product Info */}
                            <div className="space-y-1 mb-2">
                              <h4 className="font-medium text-sm text-slate-900 line-clamp-2 leading-tight">
                                {item.productName}
                              </h4>
                              <p className="text-xs text-slate-500 font-mono">
                                {item.catNum}
                              </p>
                            </div>

                            {/* Stock Badge & Quantity */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`
                                  w-2 h-2 rounded-full
                                  ${item.inventoryLevel === 'empty' ? 'bg-red-400' : ''}
                                  ${item.inventoryLevel === 'low' ? 'bg-orange-400' : ''}
                                  ${item.inventoryLevel === 'medium' ? 'bg-emerald-400' : ''}
                                  ${item.inventoryLevel === 'full' ? 'bg-blue-400' : ''}
                                `} />
                                <span className="text-xs text-slate-600 font-medium">
                                  Qty: {item.currentQuantity}
                                </span>
                              </div>
                              {item.supplier && (
                                <span className="text-xs text-slate-400 truncate max-w-[100px]">
                                  {item.supplier}
                                </span>
                              )}
                            </div>

                            {/* Reorder Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReorder(item)}
                              className="w-full h-7 text-xs text-slate-600 hover:text-brand-600 hover:bg-brand-50 border border-slate-200"
                            >
                              <Package className="h-3 w-3 mr-1.5" />
                              Reorder
                            </Button>

                            {/* Optional: Low stock indicator */}
                            {(item.inventoryLevel === 'empty' || item.inventoryLevel === 'low') && (
                              <div className="absolute top-2 right-2">
                                <div className={`
                                  w-5 h-5 rounded-full flex items-center justify-center
                                  ${item.inventoryLevel === 'empty' ? 'bg-red-100' : 'bg-orange-100'}
                                `}>
                                  <AlertCircle className={`
                                    h-3 w-3
                                    ${item.inventoryLevel === 'empty' ? 'text-red-600' : 'text-orange-600'}
                                  `} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Inventory Items</h3>
              <p className="text-sm text-slate-500 mb-4">
                Get started by adding items manually or importing from CSV
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowImportDialog(true)}
                  className="text-blue-600 border-blue-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => setShowInventoryDialog(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Research Board Tab */}
      {activeTab === 'research' && (
        <div className="space-y-4">
          <ResearchBoard />
        </div>
      )}

      {/* Dialogs */}
      {showOrderDialog && (
        <OrderFormDialog
          open={showOrderDialog}
          onOpenChange={() => setShowOrderDialog(false)}
          onSave={handleCreateOrder}
        />
      )}
      <OrderEditDialog
        order={editingOrder}
        open={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveEdit}
      />
      <AddInventoryDialog
        open={showInventoryDialog}
        onClose={() => setShowInventoryDialog(false)}
        onSuccess={() => {
          // Inventory list will automatically update via real-time subscription
          setShowInventoryDialog(false)
        }}
        labId={currentUserProfile?.labId}
      />
      <ImportInventoryDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={(count) => {
          // Inventory list will automatically update via real-time subscription
          alert(`Successfully imported ${count} inventory item${count !== 1 ? 's' : ''}!`)
        }}
        labId={currentUserProfile?.labId}
      />
    </div>
  )
}
