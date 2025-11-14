"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EquipmentDevice, EquipmentSupply, InventoryItem, Order, InventoryLevel, MasterProject, ReorderSuggestion, PersonProfile, EquipmentTaskType } from "@/lib/types"
import { Package, Plus, Edit2, Wrench, ShoppingCart, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { calculateReorderSuggestions } from "@/lib/equipmentUtils"
import { ReorderSuggestionsPanel } from "@/components/ReorderSuggestionsPanel"
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

interface EquipmentStatusPanelProps {
  equipment: EquipmentDevice[]
  inventory: InventoryItem[]
  orders: Order[]
  masterProjects: MasterProject[]
  currentUserProfile: PersonProfile | null
  onEquipmentCreate: (equipment: Omit<EquipmentDevice, 'id'>) => void
  onEquipmentUpdate: (equipmentId: string, updates: Partial<EquipmentDevice>) => void
  onInventoryUpdate: (inventory: InventoryItem[]) => void
  onOrderCreate: (order: Order) => void
  onTaskCreate?: (task: DayToDayTask) => void
}

export function EquipmentStatusPanel({
  equipment,
  inventory,
  orders,
  masterProjects,
  currentUserProfile,
  onEquipmentCreate,
  onEquipmentUpdate,
  onInventoryUpdate,
  onOrderCreate,
  onTaskCreate,
}: EquipmentStatusPanelProps) {
  const [devices, setDevices] = useState<EquipmentDevice[]>(equipment)
  const [editingDevice, setEditingDevice] = useState<EquipmentDevice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [checkStockItem, setCheckStockItem] = useState<{ deviceId: string; supplyId: string; currentQty: number } | null>(null)
  const [tempStockQty, setTempStockQty] = useState<string>("")
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

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
    return calculateMaintenanceHealth(device.lastMaintained, device.maintenanceDays)
  }

  const suppliesHealth = (device: EquipmentDevice): number => {
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

  // Handle check stock - now opens modal with local state
  const handleCheckStock = (deviceId: string, supplyId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    const supply = device.supplies.find(s => s.id === supplyId)
    if (!supply) return

    setCheckStockItem({ deviceId, supplyId, currentQty: supply.qty })
    setTempStockQty(supply.qty.toString())
  }

  // Handle save stock quantity (explicit save button)
  const handleSaveStock = () => {
    if (!checkStockItem) return

    const newQty = parseFloat(tempStockQty)
    if (isNaN(newQty) || newQty < 0) return

    const device = devices.find(d => d.id === checkStockItem.deviceId)
    if (!device) return

    const updatedSupplies = device.supplies.map(s =>
      s.id === checkStockItem.supplyId ? { ...s, qty: newQty } : s
    )

    onEquipmentUpdate(checkStockItem.deviceId, { supplies: updatedSupplies })
    setCheckStockItem(null)
    setTempStockQty("")
  }

  // Handle reorder - adds to "To Order" section
  // FIXED: Now takes explicit neededQty to avoid calculation errors
  const handleReorder = (deviceId: string, supply: EquipmentSupply, explicitNeededQty?: number) => {
    const neededQty = explicitNeededQty ?? calculateNeededQuantity(supply.qty || 0, supply.minQty || 1)
    if (neededQty <= 0) return

    const device = devices.find(d => d.id === deviceId)
    if (!device) return

    // Create order
    const inventoryItem = supply.inventoryItemId ? inventory.find(i => i.id === supply.inventoryItemId) : null
    const newOrder: Order = {
      id: generateId('order'), // FIXED: Use crypto.randomUUID()
      productName: supply.name,
      catNum: inventoryItem?.catNum || '',
      supplier: '',
      // Use account from inventory item, or placeholder
      accountId: inventoryItem?.chargeToAccount || "temp_account_placeholder",
      accountName: "Select Account",
      funderId: "temp_funder_placeholder",
      funderName: "Select Funder",
      masterProjectId: "temp_project_placeholder",
      masterProjectName: "Select Project",
      priceExVAT: supply.price,
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

    onOrderCreate(newOrder)
  }

  // Handle order missing supplies
  // FIXED: Calculate needed qty from ORIGINAL device state, not mutated
  const handleOrderMissing = (device: EquipmentDevice) => {
    device.supplies.forEach(supply => {
      const neededQty = calculateNeededQuantity(supply.qty || 0, supply.minQty || 1)
      if (neededQty > 0) {
        // Pass explicit needed qty to avoid recalculation
        handleReorder(device.id, supply, neededQty)
      }
    })
  }

  // Handle add device - opens modal with empty form
  const handleAddDevice = () => {
    const newDevice: EquipmentDevice = {
      id: '', // Temporary ID, will be replaced on save
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

  // Handle add supply
  const handleAddSupply = (supply: EquipmentSupply) => {
    if (!editingDevice) return

    const updatedSupplies = [...editingDevice.supplies, supply]
    handleSaveDevice({ ...editingDevice, supplies: updatedSupplies })

    // Also create/update inventory item if needed
    const existingInventory = inventory.find(i =>
      i.productName === supply.name &&
      i.equipmentDeviceIds?.includes(editingDevice.id)
    )

    if (!existingInventory) {
      const newInventoryItem: InventoryItem = {
        id: generateId('inventory'), // FIXED: Use crypto.randomUUID()
        productName: supply.name,
        catNum: '',
        inventoryLevel: supply.qty === 0 ? 'empty' :
          supply.qty < supply.minQty ? 'low' :
          supply.qty < supply.minQty * 2 ? 'medium' : 'full',
        receivedDate: new Date(),
        priceExVAT: supply.price,
        currentQuantity: supply.qty,
        minQuantity: supply.minQty,
        burnRatePerWeek: supply.burnPerWeek,
        equipmentDeviceIds: [editingDevice.id],
        category: undefined,
      }

      onInventoryUpdate([...inventory, newInventoryItem])

      // Link supply to inventory
      const updatedSupply = { ...supply, inventoryItemId: newInventoryItem.id }
      const updatedDevice = {
        ...editingDevice,
        supplies: editingDevice.supplies.map(s => s.id === supply.id ? updatedSupply : s)
      }
      handleSaveDevice(updatedDevice)
    } else {
      // Update existing inventory
      const updatedInventory = inventory.map(item => {
        if (item.id === existingInventory.id) {
          return {
            ...item,
            equipmentDeviceIds: [...(item.equipmentDeviceIds || []), editingDevice.id],
            currentQuantity: supply.qty,
            minQuantity: supply.minQty,
            burnRatePerWeek: supply.burnPerWeek,
          }
        }
        return item
      })
      onInventoryUpdate(updatedInventory)
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
                        size="sm"
                        variant="ghost"
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
                        className={`h-full rounded-full transition-all ${
                          mClass === 'critical' ? 'bg-red-500' :
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
                        className={`h-full rounded-full transition-all ${
                          sClass === 'critical' ? 'bg-red-500' :
                          sClass === 'warning' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${sh}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Supplies List */}
                  <div className="flex flex-wrap gap-2">
                    {device.supplies.map(supply => {
                      const weeks = calculateWeeksRemaining(supply.qty, supply.burnPerWeek)
                      const percent = weeksToHealthPercentage(weeks)
                      const supplyClass = getHealthClass(percent)
                      
                      return (
                        <div
                          key={supply.id}
                          className="relative bg-gray-50 border border-border rounded-full px-3 py-1.5 pr-20 text-xs"
                        >
                          <div className="flex items-center gap-1">
                            {percent <= 25 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                            <span className="font-medium">{supply.name}</span>
                            <span className="text-muted-foreground">
                              • Qty {supply.qty}/{supply.minQty} • Burn {supply.burnPerWeek}/wk
                            </span>
                          </div>
                          <div className={`absolute left-3 right-3 bottom-1 h-0.5 bg-gray-200 rounded-full overflow-hidden`}>
                            <div
                              className={`h-full ${
                                supplyClass === 'critical' ? 'bg-red-500' :
                                supplyClass === 'warning' ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="absolute right-3 bottom-2 text-[10px] text-muted-foreground">
                            {Math.round(percent)}%
                          </div>
                          <div className="absolute right-2 top-0.5 flex gap-1">
                            {supply.qty === 0 ? (
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
          <EquipmentEditorModal
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
    </div>
  )
}

// Equipment Editor Modal Component
interface EquipmentEditorModalProps {
  device: EquipmentDevice
  inventory: InventoryItem[]
  onClose: () => void
  onSave: (device: EquipmentDevice) => void
  onAddSupply: (supply: EquipmentSupply) => void
}

function EquipmentEditorModal({
  device,
  inventory,
  onClose,
  onSave,
  onAddSupply,
}: EquipmentEditorModalProps) {
  const [formData, setFormData] = useState({
    name: device.name,
    make: device.make || '',
    model: device.model || '',
    serialNumber: device.serialNumber || '',
    imageUrl: device.imageUrl || '',
    type: device.type,
    maintenanceDays: device.maintenanceDays,
    lastMaintained: device.lastMaintained,
    threshold: device.threshold,
  })
  const [supplies, setSupplies] = useState<EquipmentSupply[]>(device.supplies)
  const [newSupply, setNewSupply] = useState({
    name: '',
    price: '',
    qty: '',
    minQty: '',
    burnPerWeek: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(device.imageUrl || null)

  // Update form data when device changes
  useEffect(() => {
    setFormData({
      name: device.name,
      make: device.make || '',
      model: device.model || '',
      serialNumber: device.serialNumber || '',
      imageUrl: device.imageUrl || '',
      type: device.type,
      maintenanceDays: device.maintenanceDays,
      lastMaintained: device.lastMaintained,
      threshold: device.threshold,
    })
    setSupplies(device.supplies)
    setImagePreview(device.imageUrl || null)
  }, [device])

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Convert image to base64 for storage (or you can upload to Firebase Storage)
  const handleImageSave = async (): Promise<string | undefined> => {
    if (imageFile) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.readAsDataURL(imageFile)
      })
    }
    return imagePreview || undefined
  }

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Please enter a device name')
      return
    }
    if (!formData.make.trim()) {
      alert('Please enter the device make (manufacturer)')
      return
    }
    if (!formData.model.trim()) {
      alert('Please enter the device model')
      return
    }

    // Handle image upload
    let finalImageUrl = formData.imageUrl
    if (imageFile) {
      const base64Image = await handleImageSave()
      if (base64Image) {
        finalImageUrl = base64Image
      }
    }

    const updatedDevice: EquipmentDevice = {
      ...device,
      name: formData.name,
      make: formData.make,
      model: formData.model,
      serialNumber: formData.serialNumber || '',
      imageUrl: finalImageUrl || '',
      type: formData.type,
      maintenanceDays: formData.maintenanceDays,
      lastMaintained: formData.lastMaintained,
      threshold: formData.threshold,
      supplies,
      sops: device.sops || [],
      updatedAt: new Date().toISOString(),
    }
    onSave(updatedDevice)
  }

  const handleAddSupplyRow = () => {
    if (!newSupply.name.trim()) return
    
    const supply: EquipmentSupply = {
      id: `supply-${Date.now()}`,
      name: newSupply.name.trim(),
      price: parseFloat(newSupply.price) || 0,
      qty: parseInt(newSupply.qty) || 0,
      minQty: parseInt(newSupply.minQty) || 0,
      burnPerWeek: parseFloat(newSupply.burnPerWeek) || 0,
    }
    
    setSupplies([...supplies, supply])
    onAddSupply(supply)
    setNewSupply({ name: '', price: '', qty: '', minQty: '', burnPerWeek: '' })
  }

  const handleRemoveSupply = (index: number) => {
    setSupplies(supplies.filter((_, i) => i !== index))
  }

  const isNewDevice = !device.id || device.id === '';

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNewDevice ? 'Add New Device' : 'Edit Device'}</DialogTitle>
          <DialogDescription>
            {isNewDevice
              ? 'Configure device details, maintenance schedule, and supply management.'
              : 'Update device details, maintenance schedule, and supply management.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Device Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PCR Thermocycler"
            />
          </div>
          <div>
            <Label>Make *</Label>
            <Input
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              placeholder="e.g., Applied Biosystems"
            />
          </div>
          <div>
            <Label>Model *</Label>
            <Input
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., Veriti 96-Well"
            />
          </div>
          <div>
            <Label>Serial Number (Optional)</Label>
            <Input
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              placeholder="Device serial number"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Input
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="e.g., PCR Machine"
            />
          </div>
          <div>
            <Label>Device Image (Optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="cursor-pointer"
            />
            {imagePreview && (
              <div className="mt-2">
                <Image src={imagePreview} alt="Preview" width={96} height={96} className="w-24 h-24 object-cover rounded border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImagePreview(null)
                    setImageFile(null)
                    setFormData({ ...formData, imageUrl: '' })
                  }}
                  className="mt-1 text-xs"
                >
                  Remove Image
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>Maintenance Interval (days)</Label>
            <Input
              type="number"
              min={1}
              value={formData.maintenanceDays}
              onChange={(e) => setFormData({ ...formData, maintenanceDays: parseInt(e.target.value) || 90 })}
            />
          </div>
          <div>
            <Label>Last Maintained</Label>
            <Input
              type="date"
              value={formData.lastMaintained}
              onChange={(e) => setFormData({ ...formData, lastMaintained: e.target.value })}
            />
          </div>
          <div>
            <Label>Maintenance Threshold % (To-Do)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 20 })}
            />
          </div>
        </div>

        <h4 className="font-semibold mb-3">Reagents & Consumables</h4>
        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Price (€)</th>
                <th className="text-left p-2">Qty</th>
                <th className="text-left p-2">Min Qty</th>
                <th className="text-left p-2">Burn / wk</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((supply, idx) => (
                <tr key={supply.id} className="border-t border-border">
                  <td className="p-2">
                    <Input
                      value={supply.name}
                      onChange={(e) => {
                        const updated = [...supplies]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setSupplies(updated)
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={supply.price || ''}
                      onChange={(e) => {
                        const updated = [...supplies]
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        updated[idx] = { ...updated[idx], price: value }
                        setSupplies(updated)
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={supply.qty || ''}
                      onChange={(e) => {
                        const updated = [...supplies]
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                        updated[idx] = { ...updated[idx], qty: value }
                        setSupplies(updated)
                      }}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={supply.minQty || ''}
                      onChange={(e) => {
                        const updated = [...supplies]
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                        updated[idx] = { ...updated[idx], minQty: value }
                        setSupplies(updated)
                      }}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={supply.burnPerWeek || ''}
                      onChange={(e) => {
                        const updated = [...supplies]
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        updated[idx] = { ...updated[idx], burnPerWeek: value }
                        setSupplies(updated)
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-2">
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveSupply(idx)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Item name"
            value={newSupply.name}
            onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
            className="flex-2"
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Price (€)"
            value={newSupply.price}
            onChange={(e) => setNewSupply({ ...newSupply, price: e.target.value })}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Qty"
            value={newSupply.qty}
            onChange={(e) => setNewSupply({ ...newSupply, qty: e.target.value })}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Min Qty"
            value={newSupply.minQty}
            onChange={(e) => setNewSupply({ ...newSupply, minQty: e.target.value })}
            className="flex-1"
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Burn/wk"
            value={newSupply.burnPerWeek}
            onChange={(e) => setNewSupply({ ...newSupply, burnPerWeek: e.target.value })}
            className="flex-1"
          />
          <Button onClick={handleAddSupplyRow} className="bg-brand-500 hover:bg-brand-600 text-white">
            + Add Item
          </Button>
        </div>
        
        <h4 className="font-semibold mb-3 mt-6">Standard Operating Procedures (SOPs)</h4>
        <div className="border border-border rounded-lg p-4 mb-4 bg-gray-50">
          <p className="text-sm text-muted-foreground mb-3">
            SOPs are version-controlled documents that describe how to use this device. Each SOP includes version history.
          </p>
          {device.sops && device.sops.length > 0 ? (
            <div className="space-y-3">
              {device.sops.map((sop) => (
                <div key={sop.id} className="border border-border rounded p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-semibold">{sop.title}</h5>
                      <p className="text-xs text-muted-foreground">
                        Version {sop.version} • Updated {new Date(sop.updatedAt || sop.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {sop.content}
                  </div>
                  {sop.history && sop.history.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Version History ({sop.history.length})</summary>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {sop.history.map((version, idx) => (
                          <div key={idx} className="border-l-2 pl-2">
                            <strong>v{version.version}</strong> - {new Date(version.updatedAt).toLocaleDateString()}
                            {version.changeNotes && <div className="text-xs">{version.changeNotes}</div>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No SOPs yet. Add SOPs will be available in a future update.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">Save</Button>
        </div>
    </DialogContent>
  )
}

