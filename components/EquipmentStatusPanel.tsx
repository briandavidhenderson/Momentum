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

interface EquipmentStatusPanelProps {
  equipment: EquipmentDevice[]
  inventory: InventoryItem[]
  orders: Order[]
  masterProjects: MasterProject[]
  currentUserProfile: PersonProfile | null
  allProfiles: PersonProfile[] // For notification recipients
  onEquipmentCreate: (equipment: Omit<EquipmentDevice, 'id'>) => void
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
  const [devices, setDevices] = useState<EquipmentDevice[]>(equipment)
  const [editingDevice, setEditingDevice] = useState<EquipmentDevice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDeviceCreationModal, setShowDeviceCreationModal] = useState(false)
  const [checkStockItem, setCheckStockItem] = useState<{ deviceId: string; supplyId: string; currentQty: number } | null>(null)
  const [tempStockQty, setTempStockQty] = useState<string>("")
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [assigningDevice, setAssigningDevice] = useState<EquipmentDevice | null>(null)
  const [newDeviceForm, setNewDeviceForm] = useState<{
    name: string
    make: string
    model: string
    serialNumber: string
    maintenanceDays: number
  }>({
    name: '',
    make: '',
    model: '',
    serialNumber: '',
    maintenanceDays: EQUIPMENT_CONFIG.maintenance.defaultIntervalDays,
  })

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

    const supply = device.supplies.find(s => s.id === supplyId)
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
  const handleSaveStock = () => {
    if (!checkStockItem) return

    const device = devices.find(d => d.id === checkStockItem.deviceId)
    if (!device) return

    const supply = device.supplies.find(s => s.id === checkStockItem.supplyId)
    if (!supply || !supply.inventoryItemId) return

    const newQty = parseInt(tempStockQty)
    if (isNaN(newQty) || newQty < 0) {
      alert('Please enter a valid quantity')
      return
    }

    // Update inventory using the utility function
    const updatedItem = updateInventoryQuantity(supply.inventoryItemId, newQty, inventory)
    if (updatedItem) {
      const updatedInventory = inventory.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )
      onInventoryUpdate(updatedInventory)
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
        // Legacy field for backward compatibility
        chargeToAccount: inventoryItem?.chargeToAccount,
        // Add provenance for traceability
        sourceDeviceId: deviceId,
        sourceSupplyId: supply.id,
        sourceInventoryItemId: supply.inventoryItemId,
      }

      logger.info(`Creating order for ${enrichedSupply.name}`)
      onOrderCreate(newOrder)

      if (!silent) {
        alert(`✓ Order created for "${enrichedSupply.name}"\n\nGo to the Orders tab to complete the order details.`)
      }

      return true
    } catch (error) {
      logger.error('Error creating order', error)
      if (!silent) {
        alert(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      throw error
    }
  }

  // Handle order missing supplies
  // FIXED: Calculate needed qty from ORIGINAL device state, not mutated
  const handleOrderMissing = async (device: EquipmentDevice) => {
    try {
      const missingSupplies = device.supplies.filter(supply => {
        const enriched = enrichSupply(supply, inventory)
        if (!enriched) return false
        const neededQty = calculateNeededQuantity(enriched.currentQuantity || 0, supply.minQty || 1)
        return neededQty > 0
      })

      if (missingSupplies.length === 0) {
        alert(`No missing supplies for ${device.name}`)
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
        alert(`✓ Created ${successCount} order(s) for missing supplies on ${device.name}\n\nGo to the Orders tab to complete the order details.`)
      }
    } catch (error) {
      logger.error('Error creating orders', error)
      alert(`Failed to create orders: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle add device - opens modal with empty form
  const handleAddDevice = () => {
    setShowDeviceCreationModal(true)
  }

  // Handle create device from modal
  const handleCreateDevice = () => {
    if (!newDeviceForm.name.trim()) {
      alert('Please enter a device name')
      return
    }

    const newDevice: Omit<EquipmentDevice, 'id'> = {
      name: newDeviceForm.name,
      make: newDeviceForm.make,
      model: newDeviceForm.model,
      serialNumber: newDeviceForm.serialNumber,
      imageUrl: '',
      type: 'Device',
      maintenanceDays: newDeviceForm.maintenanceDays,
      lastMaintained: toISODateString(new Date()),
      threshold: EQUIPMENT_CONFIG.maintenance.defaultThreshold,
      supplies: [],
      sops: [],
      labId: currentUserProfile?.labId,
      createdAt: new Date().toISOString(),
    }

    onEquipmentCreate(newDevice)
    setShowDeviceCreationModal(false)
    setNewDeviceForm({
      name: '',
      make: '',
      model: '',
      serialNumber: '',
      maintenanceDays: EQUIPMENT_CONFIG.maintenance.defaultIntervalDays,
    })
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
              const mClass = getHealthClass(mh)
              const sClass = getHealthClass(sh)

              return (
                <div key={device.id} className="border border-border rounded-lg p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {device.imageUrl ? (
                        <Image src={device.imageUrl} alt={device.name} width={48} height={48} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{device.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {device.type} • Every {device.maintenanceDays} days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Last: {device.lastMaintained}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setAssigningDevice(device)}
                        title="Manage Inventory"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditDevice(device)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Maintenance Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Maintenance</span>
                      <Badge className={mClass === 'critical' ? 'bg-red-500' : mClass === 'warning' ? 'bg-orange-500' : 'bg-green-500'}>
                        {mh}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${mClass === 'critical' ? 'bg-red-500' :
                          mClass === 'warning' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}
                        style={{ width: `${mh}%` }}
                      />
                    </div>
                  </div>

                  {/* Supplies Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Supplies</span>
                      <Badge className={sClass === 'critical' ? 'bg-red-500' : sClass === 'warning' ? 'bg-orange-500' : 'bg-green-500'}>
                        {sh}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${sClass === 'critical' ? 'bg-red-500' :
                          sClass === 'warning' ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                        style={{ width: `${sh}%` }}
                      />
                    </div>
                  </div>

                  {/* Supplies List - Using Enriched Supply Data */}
                  <div className="flex flex-wrap gap-2">
                    {enrichDeviceSupplies(device, inventory).map(supply => {
                      const supplyClass = getHealthClass(supply.healthPercent)

                      return (
                        <div
                          key={supply.id}
                          className="relative bg-gray-50 border border-border rounded-full px-3 py-1.5 pr-20 text-xs"
                        >
                          <div className="flex items-center gap-1">
                            {supply.healthPercent <= 25 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                            <span className="font-medium">{supply.name}</span>
                            <span className="text-muted-foreground">
                              • Qty {supply.currentQuantity}/{supply.minQty} • Burn {supply.burnPerWeek}/wk
                            </span>
                          </div>
                          <div className={`absolute left-3 right-3 bottom-1 h-0.5 bg-gray-200 rounded-full overflow-hidden`}>
                            <div
                              className={`h-full ${supplyClass === 'critical' ? 'bg-red-500' :
                                supplyClass === 'warning' ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                              style={{ width: `${supply.healthPercent}%` }}
                            />
                          </div>
                          <div className="absolute right-3 bottom-2 text-[10px] text-muted-foreground">
                            {Math.round(supply.healthPercent)}%
                          </div>
                          <div className="absolute right-2 top-0.5 flex gap-1">
                            {supply.currentQuantity === 0 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-2 text-xs"
                                onClick={() => handleReorder(device.id, supply)}
                              >
                                Reorder
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-2 text-xs"
                                onClick={() => handleCheckStock(device.id, supply.id)}
                              >
                                Check Stock
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {onBookEquipment && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onBookEquipment(device)}
                        className="flex-1"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Book Now
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePerformMaintenance(device.id)}
                      className="flex-1"
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Perform Maintenance
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOrderMissing(device)}
                      className="flex-1"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Order Missing
                    </Button>
                  </div>

                  {/* Device Info */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    <div><strong>Make:</strong> {device.make || 'N/A'}</div>
                    <div><strong>Model:</strong> {device.model || 'N/A'}</div>
                    {device.serialNumber && (
                      <div><strong>Serial:</strong> {device.serialNumber}</div>
                    )}
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

      {/* Device Creation Modal */}
      <Dialog open={showDeviceCreationModal} onOpenChange={setShowDeviceCreationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Device</DialogTitle>
            <DialogDescription>
              Add a new equipment device to your lab
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="device-name">Device Name *</Label>
              <Input
                id="device-name"
                value={newDeviceForm.name}
                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                placeholder="e.g., PCR Thermocycler"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="device-make">Make</Label>
                <Input
                  id="device-make"
                  value={newDeviceForm.make}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, make: e.target.value })}
                  placeholder="e.g., Applied Biosystems"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="device-model">Model</Label>
                <Input
                  id="device-model"
                  value={newDeviceForm.model}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, model: e.target.value })}
                  placeholder="e.g., Veriti 96-Well"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="device-serial">Serial Number (Optional)</Label>
              <Input
                id="device-serial"
                value={newDeviceForm.serialNumber}
                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, serialNumber: e.target.value })}
                placeholder="Device serial number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="device-maintenance">Maintenance Interval (days)</Label>
              <Input
                id="device-maintenance"
                type="number"
                min={1}
                value={newDeviceForm.maintenanceDays}
                onChange={(e) => setNewDeviceForm({ ...newDeviceForm, maintenanceDays: parseInt(e.target.value) || 90 })}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDeviceCreationModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDevice} className="bg-brand-500 hover:bg-brand-600 text-white">
                Create Device
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
