"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InventoryItem, EquipmentSupply } from "@/lib/types"

interface AddSupplyDialogProps {
  open: boolean
  onClose: () => void
  deviceId: string
  inventory: InventoryItem[]
  existingSupplies?: EquipmentSupply[]
  onAdd: (deviceId: string, supply: EquipmentSupply) => Promise<void>
}

/**
 * Shared dialog for adding supplies to equipment
 * Used by EquipmentStatusPanel and EquipmentNetworkPanel
 *
 * Features:
 * - Select from existing inventory items
 * - Set device-specific parameters (minQty, burnPerWeek)
 * - Optional account override for procurement
 * - Prevents duplicate supply assignments
 */
export function AddSupplyDialog({
  open,
  onClose,
  deviceId,
  inventory,
  existingSupplies = [],
  onAdd,
}: AddSupplyDialogProps) {
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("")
  const [minQty, setMinQty] = useState<string>("")
  const [burnPerWeek, setBurnPerWeek] = useState<string>("")
  const [accountOverride, setAccountOverride] = useState<string>("")

  // Filter out inventory items that are already linked to this device
  const existingInventoryIds = existingSupplies
    .map((s) => s.inventoryItemId)
    .filter((id): id is string => !!id)

  const availableInventory = inventory.filter(
    (item) => !existingInventoryIds.includes(item.id)
  )

  const handleSave = async () => {
    if (!selectedInventoryId) {
      alert("Please select an inventory item")
      return
    }

    const selectedItem = inventory.find((item) => item.id === selectedInventoryId)
    if (!selectedItem) {
      console.error("Selected inventory item not found")
      return
    }

    // Create the supply link
    const supply: EquipmentSupply = {
      id: `supply-${Date.now()}`,
      name: selectedItem.productName,
      inventoryItemId: selectedInventoryId,
      minQty: parseFloat(minQty) || selectedItem.minQuantity || 0,
      burnPerWeek: parseFloat(burnPerWeek) || 0,
      accountOverride: accountOverride.trim() || undefined,
    }

    try {
      await onAdd(deviceId, supply)
      handleReset()
      onClose()
    } catch (error) {
      console.error("Error adding supply:", error)
      alert("Failed to add supply. Please try again.")
    }
  }

  const handleReset = () => {
    setSelectedInventoryId("")
    setMinQty("")
    setBurnPerWeek("")
    setAccountOverride("")
  }

  const handleCancel = () => {
    handleReset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Supply to Equipment</DialogTitle>
          <DialogDescription>
            Link an inventory item to this equipment and configure device-specific parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Inventory Item Selection */}
          <div className="space-y-2">
            <Label htmlFor="inventory-select">Inventory Item *</Label>
            {availableInventory.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 bg-yellow-50 rounded border border-yellow-200">
                No available inventory items. All items are already linked to this device or no
                inventory exists.
              </div>
            ) : (
              <select
                id="inventory-select"
                value={selectedInventoryId}
                onChange={(e) => {
                  setSelectedInventoryId(e.target.value)
                  // Auto-populate minQty from inventory item
                  const item = inventory.find((i) => i.id === e.target.value)
                  if (item) {
                    setMinQty((item.minQuantity || 0).toString())
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select inventory item...</option>
                {availableInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName} - {item.currentQuantity} units available
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Minimum Quantity */}
          <div className="space-y-2">
            <Label htmlFor="min-qty">
              Minimum Quantity for This Device
              <span className="text-xs text-muted-foreground ml-2">(Reorder threshold)</span>
            </Label>
            <Input
              id="min-qty"
              type="number"
              min={0}
              step="0.01"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground">
              Alert when stock falls below this level for this specific device
            </p>
          </div>

          {/* Burn Rate */}
          <div className="space-y-2">
            <Label htmlFor="burn-rate">
              Burn Rate (Units per Week)
              <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
            </Label>
            <Input
              id="burn-rate"
              type="number"
              min={0}
              step="0.01"
              value={burnPerWeek}
              onChange={(e) => setBurnPerWeek(e.target.value)}
              placeholder="e.g., 2.5"
            />
            <p className="text-xs text-muted-foreground">
              Average consumption rate for predictive reordering
            </p>
          </div>

          {/* Account Override */}
          <div className="space-y-2">
            <Label htmlFor="account-override">
              Funding Account Override
              <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
            </Label>
            <Input
              id="account-override"
              value={accountOverride}
              onChange={(e) => setAccountOverride(e.target.value)}
              placeholder="e.g., Special Grant Account"
            />
            <p className="text-xs text-muted-foreground">
              Use a specific funding account for reordering this supply
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedInventoryId || availableInventory.length === 0}
            className="bg-brand-500 hover:bg-brand-600"
          >
            Add Supply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
