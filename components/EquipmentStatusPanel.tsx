"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EquipmentDevice, EquipmentSupply, InventoryItem, Order, InventoryLevel, MasterProject, ReorderSuggestion, PersonProfile, EquipmentTaskType } from "@/lib/types"
import { Package, Plus, Edit2, Wrench, ShoppingCart, AlertTriangle, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { calculateReorderSuggestions } from "@/lib/equipmentUtils"
import { ReorderSuggestionsPanel } from "@/components/orders/ReorderSuggestionsPanel"
import { DayToDayTask } from "@/lib/dayToDayTypes"
import {
  calculateMaintenanceHealth,
  calculateWeeksRemaining,
  calculateSuppliesHealth,
  calculateStockPercentage,
  calculateNeededQuantity,
  toISODateString,
  parseDateSafe,
  weeksToHealthPercentage,
} from "@/lib/equipmentMath"
import { formatCurrency, getHealthClass, getHealthColor, getHealthTextColor, generateId, EQUIPMENT_CONFIG } from "@/lib/equipmentConfig"
import { enrichSupply, enrichDeviceSupplies, updateInventoryQuantity, EnrichedSupply } from "@/lib/supplyUtils"
import { notifyLowStock, notifyCriticalStock, getLabManagers } from "@/lib/notificationUtils"
import { CheckStockDialog } from "@/components/dialogs/CheckStockDialog"
import { EquipmentEditorDialog } from "@/components/dialogs/EquipmentEditorDialog"
import { AssignInventoryToEquipmentDialog } from "@/components/dialogs/AssignInventoryToEquipmentDialog"
import { logger } from "@/lib/logger"
import { useToast } from "@/components/ui/toast"
import { BookingDialog } from "@/components/equipment/BookingDialog"
import { CommentsSection } from "@/components/CommentsSection"
import { MessageSquare } from "lucide-react"

interface EquipmentStatusPanelProps {
  equipment: EquipmentDevice[]
  inventory: InventoryItem[]
  orders: Order[]
  masterProjects: MasterProject[]
  currentUserProfile: PersonProfile | null
  allProfiles: PersonProfile[] // For notification recipients
  onEquipmentCreate: (equipment: Omit<EquipmentDevice, 'id'>) => Promise<void> | void
  onEquipmentUpdate: (equipmentId: string, updates: Partial<EquipmentDevice>) => void
  onInventoryUpdate: (inventory: InventoryItem[]) => void
  onOrderCreate: (order: Order) => void
  onTaskCreate?: (task: DayToDayTask) => void
  onBookEquipment?: (device: EquipmentDevice) => void
}

export function EquipmentStatusPanel({
  equipment,
  inventory,
  orders,
  masterProjects,
  currentUserProfile,
  allProfiles,
  onEquipmentCreate,
  onEquipmentUpdate,
  onInventoryUpdate,
  onOrderCreate,
  onTaskCreate,
  onBookEquipment,
}: EquipmentStatusPanelProps) {
  const { toast } = useToast()
  const [devices, setDevices] = useState<EquipmentDevice[]>(equipment)
  const [editingDevice, setEditingDevice] = useState<EquipmentDevice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [checkStockItem, setCheckStockItem] = useState<{ deviceId: string; supplyId: string; currentQty: number } | null>(null)
  const [tempStockQty, setTempStockQty] = useState<string>("")
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [assigningDevice, setAssigningDevice] = useState<EquipmentDevice | null>(null)
  const [bookingDevice, setBookingDevice] = useState<EquipmentDevice | null>(null)
  const [viewingCommentsFor, setViewingCommentsFor] = useState<EquipmentDevice | null>(null)

  useEffect(() => {
    setDevices(equipment)
  }, [equipment])

  // Calculate reorder suggestions
  const reorderSuggestions = useMemo(() => {
    const allSuggestions = calculateReorderSuggestions(inventory, equipment, masterProjects)
    // Filter out dismissed suggestions
    return allSuggestions.filter(s => !dismissedSuggestions.has(s.inventoryItemId))
  }, [inventory, equipment, masterProjects, dismissedSuggestions])

  // Use imported calculation functions (now testable and safe)
  const maintenanceHealth = (device: EquipmentDevice): number => {
    if (!device) return 100
    return calculateMaintenanceHealth(device.lastMaintained, device.maintenanceDays)
  }

  const suppliesHealth = (device: EquipmentDevice): number => {
    if (!device || !device.supplies) return 100
    return calculateSuppliesHealth(device.supplies)
  }

  // Get all to-do items (maintenance and low supplies)
  const todoItems = useMemo(() => {
    const todos: Array<{ msg: string; deviceId: string; type: 'maintenance' | 'supplies' }> = []

    devices.forEach(device => {
      const mh = maintenanceHealth(device)
      const sh = suppliesHealth(device)

      if (mh <= device.threshold) {
        todos.push({
          msg: `${device.name}: maintenance at ${mh}%`,
          deviceId: device.id,
          type: 'maintenance'
        })
      }

      if (sh <= 25) {
        todos.push({
          msg: `${device.name}: low supplies at ${sh}%`,
          deviceId: device.id,
          type: 'supplies'
        })
      }
    })

    return todos
  }, [devices])

  // Handle maintenance
  const handlePerformMaintenance = (deviceId: string) => {
    onEquipmentUpdate(deviceId, { lastMaintained: toISODateString(new Date()) })
  }

  // Handle check stock - opens modal with enriched supply data
  const handleCheckStock = (deviceId: string, supplyId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    const supply = (device.supplies || []).find(s => s.id === supplyId)
    if (!supply) return

    // Enrich to get current quantity from inventory
    const enriched = enrichSupply(supply, inventory)
    if (!enriched) {
      logger.error("Cannot check stock - inventory item not found", {
        inventoryItemId: supply.inventoryItemId,
      })
      return
    }

    setCheckStockItem({
      deviceId,
      supplyId,
      currentQty: enriched.currentQuantity
    })
    setTempStockQty(enriched.currentQuantity.toString())
  }

  // Handle save stock - updates inventory quantity
  const handleSaveStock = async () => {
    if (!checkStockItem) return

    const device = devices.find(d => d.id === checkStockItem.deviceId)
    if (!device) return

    const supply = (device.supplies || []).find(s => s.id === checkStockItem.supplyId)
    if (!supply || !supply.inventoryItemId) return

    const newQty = parseInt(tempStockQty)
    if (isNaN(newQty) || newQty < 0) {
      toast({ title: 'Please enter a valid quantity', variant: 'destructive' })
      return
    }

    // Update inventory using the utility function
    const updatedItem = updateInventoryQuantity(supply.inventoryItemId, newQty, inventory)
    if (updatedItem) {
      const updatedInventory = inventory.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )
      onInventoryUpdate(updatedInventory)

      // Check for low stock and notify
      // Calculate weeks remaining based on burn rate
      // We need to aggregate burn rate for this item across all devices
      // But for simplicity, we can just check against minQuantity or use the item's inventoryLevel
      // The updateInventoryQuantity util updates inventoryLevel

      if (updatedItem.inventoryLevel === 'low' || updatedItem.inventoryLevel === 'empty') {
        const managers = getLabManagers(allProfiles)
        // Calculate weeks remaining if possible
        // We can use the utility from equipmentUtils if we had it imported, or just estimate
        // For now, let's use a simplified check or just notify based on level

        // Re-calculate burn rate to get accurate weeks remaining
        // This logic is similar to calculateReorderSuggestions but for a single item
        const devicesUsingItem = devices.filter(d =>
          (d.supplies || []).some(s => s.inventoryItemId === updatedItem.id)
        )

        let totalBurnRate = 0
        devicesUsingItem.forEach(d => {
          const s = (d.supplies || []).find(s => s.inventoryItemId === updatedItem.id)
          if (s) totalBurnRate += s.burnPerWeek
        })

        const weeksRemaining = totalBurnRate > 0 ? updatedItem.currentQuantity / totalBurnRate : 999

        if (updatedItem.inventoryLevel === 'empty') {
          await notifyCriticalStock(updatedItem, managers)
        } else if (weeksRemaining < 4) { // Notify if less than 4 weeks
          await notifyLowStock(updatedItem, managers, weeksRemaining)
        }
      }
    }

    // Close dialog
    setCheckStockItem(null)
    setTempStockQty('')
  }

  // Handle reorder - adds to "To Order" section
  // FIXED: Now takes explicit neededQty to avoid calculation errors
  const handleReorder = async (deviceId: string, supply: EquipmentSupply, explicitNeededQty?: number, silent = false) => {
    try {
      // Enrich supply to get current quantity and other inventory data
      const enrichedSupply = enrichSupply(supply, inventory)
      if (!enrichedSupply) {
        logger.error("Cannot create order - inventory item not found", {
          inventoryItemId: supply.inventoryItemId,
        })
        return false
      }

      const neededQty = explicitNeededQty ?? calculateNeededQuantity(enrichedSupply.currentQuantity || 0, supply.minQty || 1)
      if (neededQty <= 0) {
        logger.info('No reorder needed - sufficient quantity')
        return false
      }

      const device = devices.find(d => d.id === deviceId)
      if (!device) {
        logger.error('Device not found', new Error(`Device ${deviceId} not found`))
        return false
      }

      if (!silent) {
        if (!confirm(`Are you sure you want to create a reorder for "${enrichedSupply.name}"?`)) {
          return false
        }
      }

      // Create order
      const inventoryItem = supply.inventoryItemId ? inventory.find(i => i.id === supply.inventoryItemId) : null
      const newOrder: Order = {
        id: generateId('order'), // FIXED: Use crypto.randomUUID()
        productName: enrichedSupply.name,
        catNum: inventoryItem?.catNum || '',
        supplier: enrichedSupply.supplier || '',
        // Use account from inventory item, or placeholder
        accountId: inventoryItem?.chargeToAccount || "temp_account_placeholder",
        accountName: "Select Account",
        funderId: "temp_funder_placeholder",
        funderName: "Select Funder",
        masterProjectId: "temp_project_placeholder",
        masterProjectName: "Select Project",
        priceExVAT: enrichedSupply.price,
        currency: EQUIPMENT_CONFIG.currency.code, // FIXED: Use centralized currency
        status: 'to-order',
        orderedBy: currentUserProfile?.id || '',
        orderedDate: undefined, // Will be set when order is actually placed
        receivedDate: undefined,
        createdBy: currentUserProfile?.id || '',
        createdDate: new Date(),
        category: inventoryItem?.category,
        subcategory: inventoryItem?.subcategory,
        visibility: 'lab',

        // Legacy field for backward compatibility
        chargeToAccount: inventoryItem?.chargeToAccount,
        // Add provenance for traceability
        sourceDeviceId: deviceId,
        sourceSupplyId: supply.id,
        sourceInventoryItemId: supply.inventoryItemId,
        labId: currentUserProfile?.labId,
      }

      logger.info(`Creating order for ${enrichedSupply.name}`)
      onOrderCreate(newOrder)

      if (!silent) {
        toast({ title: `Order created for "${enrichedSupply.name}"`, description: "Go to the Orders tab to complete the order details." })
      }

      return true
    } catch (error) {
      logger.error('Error creating order', error)
      if (!silent) {
        toast({ title: `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' })
      }
      throw error
    }
  }

  // Handle order missing supplies
  // FIXED: Calculate needed qty from ORIGINAL device state, not mutated
  const handleOrderMissing = async (device: EquipmentDevice) => {
    try {
      const missingSupplies = (device.supplies || []).filter(supply => {
        const enriched = enrichSupply(supply, inventory)
        if (!enriched) return false
        const neededQty = calculateNeededQuantity(enriched.currentQuantity || 0, supply.minQty || 1)
        return neededQty > 0
      })

      if (missingSupplies.length === 0) {
        toast({ title: `No missing supplies for ${device.name}` })
        return
      }

      if (!confirm(`Found ${missingSupplies.length} missing supplies for ${device.name}. Create orders for all?`)) {
        return
      }

      logger.info(`Creating ${missingSupplies.length} orders for ${device.name}`)

      let successCount = 0
      for (const supply of missingSupplies) {
        const enriched = enrichSupply(supply, inventory)
        if (!enriched) continue
        const neededQty = calculateNeededQuantity(enriched.currentQuantity || 0, supply.minQty || 1)
        // Pass explicit needed qty and silent=true to avoid multiple alerts
        const success = await handleReorder(device.id, supply, neededQty, true)
        if (success) successCount++
      }

      if (successCount > 0) {
        toast({ title: `Created ${successCount} order(s) for missing supplies on ${device.name}`, description: "Go to the Orders tab to complete the order details." })
      }
    } catch (error) {
      logger.error('Error creating orders', error)
      toast({ title: `Failed to create orders: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' })
    }
  }

  // Handle add device - opens modal with empty form
  const handleAddDevice = () => {
    const newDevice: EquipmentDevice = {
      id: 'new-device', // Temp ID
      name: '',
      make: '',
      model: '',
      serialNumber: '',
      imageUrl: '',
      type: 'Device',
      maintenanceDays: EQUIPMENT_CONFIG.maintenance.defaultIntervalDays,
      lastMaintained: toISODateString(new Date()),
      threshold: EQUIPMENT_CONFIG.maintenance.defaultThreshold,
      supplies: [],
      sops: [],
      labId: currentUserProfile?.labId,
      createdAt: new Date().toISOString(),
      workingLabId: '',
      workingLabName: ''
    }
    setEditingDevice(newDevice)
    setIsModalOpen(true)
  }

  // Handle edit device
  const handleEditDevice = (device: EquipmentDevice) => {
    setEditingDevice({ ...device })
    setIsModalOpen(true)
  }

  // Handle save device
  const handleSaveDevice = (device: EquipmentDevice) => {
    if (devices.find(d => d.id === device.id)) {
      onEquipmentUpdate(device.id, device)
    } else {
      const { id, ...newDevice } = device;
      onEquipmentCreate(newDevice);
    }
    setEditingDevice(null)
    setIsModalOpen(false)
  }

  // TODO: Phase 5 - Extract this to shared AddSupplyDialog component
  // This function still uses old EquipmentSupply structure and needs refactoring
  // For now, it's deprecated - use inventory-first approach (create inventory item, then link)
  const handleAddSupply = (supply: EquipmentSupply) => {
    if (!editingDevice) return

    const updatedSupplies = [...editingDevice.supplies, supply]
    handleSaveDevice({ ...editingDevice, supplies: updatedSupplies })

    // Update inventory item to link it to this device (if not already linked)
    // NOTE: With new structure, supply should already have inventoryItemId set from dialog
    // The inventory item contains all the product details (name, price, quantity)
    if (supply.inventoryItemId) {
      const existingInventory = inventory.find(i => i.id === supply.inventoryItemId)

      if (existingInventory) {
        // Add this device to the inventory item's device list if not already present
        const deviceIds = existingInventory.equipmentDeviceIds || []
        if (!deviceIds.includes(editingDevice.id)) {
          const updatedInventory = inventory.map(i =>
            i.id === supply.inventoryItemId
              ? { ...i, equipmentDeviceIds: [...deviceIds, editingDevice.id] }
              : i
          )
          onInventoryUpdate(updatedInventory)
        }
      }
    }
  }

  // Handle create order from reorder suggestion
  const handleCreateOrderFromSuggestion = (suggestion: ReorderSuggestion) => {
    const inventoryItem = inventory.find(i => i.id === suggestion.inventoryItemId)

    // If we have multiple accounts to split across, create separate orders
    // For now, create a single order with the first account
    const primaryAccount = suggestion.chargeToAccounts[0]

    const newOrder: Order = {
      id: generateId('order'), // FIXED: Use crypto.randomUUID()
      productName: suggestion.itemName,
      catNum: suggestion.catNum,
      supplier: '',
      accountId: primaryAccount?.accountId || "temp_account_placeholder",
      accountName: primaryAccount?.accountName || "Select Account",
      funderId: "temp_funder_placeholder",
      funderName: "Select Funder",
      masterProjectId: primaryAccount?.projectId || "temp_project_placeholder",
      masterProjectName: primaryAccount?.projectName || "Select Project",
      priceExVAT: inventoryItem?.priceExVAT || 0,
      currency: EQUIPMENT_CONFIG.currency.code, // FIXED: Use centralized currency
      status: 'to-order',
      orderedBy: currentUserProfile?.id || '',
      orderedDate: undefined,
      receivedDate: undefined,
      createdBy: currentUserProfile?.id || '',
      createdDate: new Date(),
      category: inventoryItem?.category,
      subcategory: inventoryItem?.subcategory,
      chargeToAccount: primaryAccount?.accountId,
      // FIXED: Add provenance for traceability
      sourceInventoryItemId: suggestion.inventoryItemId,
      visibility: 'lab',
    }

    onOrderCreate(newOrder)
  }

  // Handle create task from reorder suggestion
  const handleCreateTaskFromSuggestion = (suggestion: ReorderSuggestion) => {
    if (!onTaskCreate) return

    const daysUntilEmpty = suggestion.weeksTillEmpty * 7
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + Math.floor(daysUntilEmpty))
    // Round to midnight for consistency
    dueDate.setHours(0, 0, 0, 0)

    // FIXED: Map priority properly without `as any`
    let importance: DayToDayTask['importance'] = 'medium'
    if (suggestion.priority === 'urgent') importance = 'critical'
    else if (suggestion.priority === 'high') importance = 'high'
    else if (suggestion.priority === 'medium') importance = 'medium'
    else importance = 'low'

    const task: DayToDayTask = {
      id: generateId('task'), // FIXED: Use crypto.randomUUID()
      title: `Reorder ${suggestion.itemName}`,
      description: `${suggestion.weeksTillEmpty.toFixed(1)} weeks remaining. Order ${suggestion.suggestedOrderQty} units (${formatCurrency(suggestion.estimatedCost)}). Used by: ${suggestion.affectedEquipment.map(e => e.name).join(', ')}`,
      status: 'todo',
      importance,
      assigneeId: currentUserProfile?.id,
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUserProfile?.userId || currentUserProfile?.id || 'system',
      inventoryItemId: suggestion.inventoryItemId,
      taskType: EquipmentTaskType.REORDER, // FIXED: Use enum value
      metadata: {
        weeksRemaining: suggestion.weeksTillEmpty,
        suggestedQty: suggestion.suggestedOrderQty,
        estimatedCost: suggestion.estimatedCost
      },
      order: 0
    }

    onTaskCreate(task)
  }

  // Handle dismiss suggestion
  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId))
  }

  // Render component
  return (
    <div className="card-monday mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="h2 text-foreground">🧪 Equipment Status</h2>
        <Button onClick={handleAddDevice} className="bg-brand-500 hover:bg-brand-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      {/* Reorder Suggestions Panel */}
      {reorderSuggestions.length > 0 && (
        <div className="mb-6">
          <ReorderSuggestionsPanel
            suggestions={reorderSuggestions}
            masterProjects={masterProjects}
            onCreateOrder={handleCreateOrderFromSuggestion}
            onCreateTask={handleCreateTaskFromSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Equipment Panel */}
        <div className="lg:col-span-2">
          <div className="text-xs text-muted-foreground mb-4">
            Two health bars per device: <strong>Maintenance</strong> and <strong>Supplies</strong>. Each supply shows a burn-rate meter.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map(device => {
              const mh = maintenanceHealth(device)
              const sh = suppliesHealth(device)

              // New color logic for health bars
              const getBarColor = (val: number) => {
                if (val <= 25) return 'bg-rose-500'
                if (val <= 50) return 'bg-amber-500'
                return 'bg-emerald-500'
              }

              const mColor = getBarColor(mh)
              const sColor = getBarColor(sh)

              return (
                <div key={device.id} className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 overflow-hidden">
                  {/* Header Section */}
                  <div className="p-5 pb-3 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                        {device.imageUrl ? (
                          <Image src={device.imageUrl} alt={device.name} fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <Wrench className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 leading-tight">{device.name}</h3>
                        <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{device.type}</span>
                          <span>•</span>
                          <span>{device.make} {device.model}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => setAssigningDevice(device)}
                        title="Manage Inventory"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => handleEditDevice(device)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Health Indicators */}
                  <div className="px-5 py-3 grid grid-cols-2 gap-6">
                    {/* Maintenance Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Maintenance</span>
                        <span className={`text-xs font-bold ${mh <= 25 ? 'text-rose-600' : 'text-slate-700'}`}>{mh}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${mColor}`} style={{ width: `${mh}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        Due: {device.lastMaintained}
                      </div>
                    </div>

                    {/* Supplies Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplies</span>
                        <span className={`text-xs font-bold ${sh <= 25 ? 'text-rose-600' : 'text-slate-700'}`}>{sh}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sColor}`} style={{ width: `${sh}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {(device.supplies || []).length} items linked
                      </div>
                    </div>
                  </div>

                  {/* Supplies List (Compact) */}
                  {(device.supplies || []).length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50">
                      <div className="space-y-2">
                        {enrichDeviceSupplies(device, inventory).slice(0, 3).map(supply => {
                          const supplyColor = getBarColor(supply.healthPercent)
                          return (
                            <div key={supply.id} className="flex items-center justify-between text-xs group/supply">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full ${supplyColor} flex-shrink-0`} />
                                <span className="font-medium text-slate-700 truncate">{supply.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-mono">{supply.currentQuantity}/{supply.minQty}</span>
                                {supply.currentQuantity === 0 ? (
                                  <button
                                    onClick={() => handleReorder(device.id, supply)}
                                    className="text-rose-600 hover:text-rose-700 font-medium opacity-0 group-hover/supply:opacity-100 transition-opacity"
                                  >
                                    Order
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleCheckStock(device.id, supply.id)}
                                    className="text-blue-600 hover:text-blue-700 font-medium opacity-0 group-hover/supply:opacity-100 transition-opacity"
                                  >
                                    Check
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {(device.supplies || []).length > 3 && (
                          <div className="text-[10px] text-center text-slate-400 pt-1">
                            + {(device.supplies || []).length - 3} more supplies
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                    {onBookEquipment && (
                      <Button
                        size="sm"
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm h-8 text-xs font-medium"
                        onClick={() => {
                          if (onBookEquipment) {
                            onBookEquipment(device)
                          } else {
                            setBookingDevice(device)
                          }
                        }}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                        Book
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm h-8 text-xs font-medium"
                      onClick={() => handlePerformMaintenance(device.id)}
                    >
                      <Wrench className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                      Maintain
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm h-8 text-xs font-medium"
                      onClick={() => handleOrderMissing(device)}
                    >
                      <ShoppingCart className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                      Order
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm h-8 text-xs font-medium"
                      onClick={() => setViewingCommentsFor(device)}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                      Discuss
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar: To-Dos */}
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-3">🔧 Maintenance & Supplies To-Dos</h3>
            {todoItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All good — no tasks due.</p>
            ) : (
              <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                {todoItems.map((todo, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-border">
                    <span className="text-sm">{todo.msg}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (todo.type === 'maintenance') {
                          handlePerformMaintenance(todo.deviceId)
                        } else {
                          const device = devices.find(d => d.id === todo.deviceId)
                          if (device) handleOrderMissing(device)
                        }
                      }}
                    >
                      Resolve
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>



      {/* Check Stock Modal */}
      <Dialog open={!!checkStockItem} onOpenChange={() => setCheckStockItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Stock</DialogTitle>
            <DialogDescription>
              Update the current quantity for this supply item.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the current quantity for this supply:
          </p>
          {checkStockItem && (() => {
            const device = devices.find(d => d.id === checkStockItem.deviceId)
            const supply = device?.supplies.find(s => s.id === checkStockItem.supplyId)
            if (!supply) return null

            return (
              <div className="space-y-4">
                <div>
                  <Label>Current Quantity</Label>
                  <Input
                    type="number"
                    value={tempStockQty}
                    min={0}
                    onChange={(e) => setTempStockQty(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setCheckStockItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveStock}>
                    Save
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Device Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false)
          setEditingDevice(null)
        }
      }}>
        {editingDevice && (
          <EquipmentEditorDialog
            device={editingDevice}
            inventory={inventory}
            onClose={() => {
              setIsModalOpen(false)
              setEditingDevice(null)
            }}
            onSave={(device) => {
              handleSaveDevice(device)
              setIsModalOpen(false)
              setEditingDevice(null)
            }}
            onAddSupply={handleAddSupply}
          />
        )}
      </Dialog>

      {/* Inventory Assignment Dialog */}
      {assigningDevice && (
        <AssignInventoryToEquipmentDialog
          open={!!assigningDevice}
          onClose={() => setAssigningDevice(null)}
          equipment={assigningDevice}
          allInventory={inventory}
          onAssign={(equipmentId, inventoryItemId, settings) => {
            const device = devices.find(d => d.id === equipmentId)
            if (!device) return

            // Create new supply
            const newSupply: EquipmentSupply = {
              id: generateId('supply'),
              inventoryItemId,
              minQty: settings.minQty,
              burnPerWeek: settings.burnPerWeek,
            }

            // Update device
            const updatedSupplies = [...(device.supplies || []), newSupply]
            onEquipmentUpdate(equipmentId, { supplies: updatedSupplies })

            // Update inventory item (add device ID)
            const inventoryItem = inventory.find(i => i.id === inventoryItemId)
            if (inventoryItem) {
              const deviceIds = inventoryItem.equipmentDeviceIds || []
              if (!deviceIds.includes(equipmentId)) {
                const updatedInventory = inventory.map(i =>
                  i.id === inventoryItemId
                    ? { ...i, equipmentDeviceIds: [...deviceIds, equipmentId] }
                    : i
                )
                onInventoryUpdate(updatedInventory)
              }
            }
          }}
          onRemove={(equipmentId, supplyId) => {
            const device = devices.find(d => d.id === equipmentId)
            if (!device) return

            const supply = device.supplies?.find(s => s.id === supplyId)
            if (!supply) return

            // Update device
            const updatedSupplies = device.supplies.filter(s => s.id !== supplyId)
            onEquipmentUpdate(equipmentId, { supplies: updatedSupplies })

            // Update inventory item (remove device ID)
            if (supply.inventoryItemId) {
              const inventoryItem = inventory.find(i => i.id === supply.inventoryItemId)
              if (inventoryItem) {
                const deviceIds = inventoryItem.equipmentDeviceIds || []
                const updatedDeviceIds = deviceIds.filter(id => id !== equipmentId)
                const updatedInventory = inventory.map(i =>
                  i.id === supply.inventoryItemId
                    ? { ...i, equipmentDeviceIds: updatedDeviceIds }
                    : i
                )
                onInventoryUpdate(updatedInventory)
              }
            }
          }}
        />
      )}

      {/* Comments Dialog */}
      <Dialog open={!!viewingCommentsFor} onOpenChange={(open) => !open && setViewingCommentsFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discussion: {viewingCommentsFor?.name}</DialogTitle>
          </DialogHeader>
          {viewingCommentsFor && (
            <div className="mt-4">
              <CommentsSection
                entityType="equipment"
                entityId={viewingCommentsFor.id}
                entityTitle={viewingCommentsFor.name}
                // Use labId as owner or fallback to current user if undefined
                entityOwnerId={viewingCommentsFor.labId || currentUserProfile?.id}
                teamMembers={allProfiles.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}` }))}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
