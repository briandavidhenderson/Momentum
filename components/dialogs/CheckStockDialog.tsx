"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InventoryItem, PersonProfile } from "@/lib/types"
import { EnrichedSupply } from "@/lib/supplyUtils"
import { notifyLowStock, notifyCriticalStock, getLabManagers } from "@/lib/notificationUtils"

interface CheckStockDialogProps {
  open: boolean
  onClose: () => void
  supply: EnrichedSupply | null
  inventory: InventoryItem[]
  allProfiles: PersonProfile[]
  onInventoryUpdate: (updatedInventory: InventoryItem[]) => void
}

/**
 * Shared dialog for checking and updating stock quantities
 * Used by EquipmentStatusPanel and EquipmentNetworkPanel
 *
 * Features:
 * - Validates quantity input (non-negative numbers)
 * - Updates inventory item quantity
 * - Triggers low stock/critical stock notifications
 * - Calculates weeks remaining based on burn rate
 */
export function CheckStockDialog({
  open,
  onClose,
  supply,
  inventory,
  allProfiles,
  onInventoryUpdate,
}: CheckStockDialogProps) {
  const [tempStockQty, setTempStockQty] = useState<string>("")

  // Reset quantity input when supply changes
  useEffect(() => {
    if (supply) {
      setTempStockQty(supply.currentQuantity.toString())
    }
  }, [supply])

  const handleSave = async () => {
    if (!supply) return

    const newQty = parseFloat(tempStockQty)
    if (isNaN(newQty) || newQty < 0) {
      alert("Please enter a valid non-negative quantity")
      return
    }

    // Find the inventory item and update it
    const itemIndex = inventory.findIndex((item) => item.id === supply.inventoryItemId)
    if (itemIndex === -1) {
      logger.error("Inventory item not found", { inventoryItemId: supply.inventoryItemId })
      return
    }

    const updatedInventory = [...inventory]
    const minQty = updatedInventory[itemIndex].minQuantity || 0
    const updatedItem = {
      ...updatedInventory[itemIndex],
      currentQuantity: newQty,
      inventoryLevel:
        newQty === 0
          ? ("empty" as const)
          : newQty <= minQty
            ? ("low" as const)
            : newQty <= minQty * 2
              ? ("medium" as const)
              : ("full" as const),
    }
    updatedInventory[itemIndex] = updatedItem

    // Save the updated inventory
    onInventoryUpdate(updatedInventory)

    // PHASE 4: Trigger low stock notifications
    try {
      const weeksRemaining = calculateWeeksRemaining(newQty, supply.burnPerWeek)
      const managers = getLabManagers(allProfiles)

      // Critical stock: empty or less than 1 week remaining
      if (newQty === 0 || updatedItem.inventoryLevel === "empty") {
        await notifyCriticalStock(updatedItem, managers)
      }
      // Low stock: less than 2 weeks remaining
      else if (weeksRemaining < 2 || updatedItem.inventoryLevel === "low") {
        await notifyLowStock(updatedItem, managers, weeksRemaining)
      }
    } catch (error) {
      logger.error("Error sending stock notification", error)
      // Don't block the UI on notification failure
    }

    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check Stock</DialogTitle>
          <DialogDescription>
            Update the current quantity for this supply item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {supply && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product</Label>
                <div className="text-sm text-muted-foreground">{supply.name}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Current Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tempStockQty}
                  onChange={(e) => setTempStockQty(e.target.value)}
                  placeholder="Enter current quantity"
                />
              </div>

              {supply.burnPerWeek > 0 && (
                <div className="text-sm text-muted-foreground">
                  Burn rate: {supply.burnPerWeek.toFixed(2)} units/week
                  {parseFloat(tempStockQty) > 0 && (
                    <>
                      {" "}
                      • {calculateWeeksRemaining(parseFloat(tempStockQty), supply.burnPerWeek).toFixed(1)}{" "}
                      weeks remaining
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Calculate estimated weeks remaining based on current quantity and burn rate
 */
function calculateWeeksRemaining(currentQty: number, burnPerWeek: number): number {
  if (burnPerWeek <= 0) return Infinity
  return currentQty / burnPerWeek
}
