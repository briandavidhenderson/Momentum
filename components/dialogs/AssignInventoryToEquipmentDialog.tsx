"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Package, AlertCircle, X } from "lucide-react"
import type { EquipmentDevice, InventoryItem, EquipmentSupply } from "@/lib/types"

interface AssignInventoryToEquipmentDialogProps {
    open: boolean
    onClose: () => void
    equipment: EquipmentDevice
    allInventory: InventoryItem[]
    onAssign: (equipmentId: string, inventoryItemId: string, supplySettings: { minQty: number; burnPerWeek: number }) => void
    onRemove: (equipmentId: string, supplyId: string) => void
}

export function AssignInventoryToEquipmentDialog({
    open,
    onClose,
    equipment,
    allInventory,
    onAssign,
    onRemove,
}: AssignInventoryToEquipmentDialogProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [minQty, setMinQty] = useState(10)
    const [burnPerWeek, setBurnPerWeek] = useState(1)

    // Get currently assigned inventory IDs
    const assignedInventoryIds = useMemo(() => {
        return new Set(equipment.supplies?.map(s => s.inventoryItemId) || [])
    }, [equipment.supplies])

    // Filter inventory items
    const filteredInventory = useMemo(() => {
        const term = searchTerm.toLowerCase()
        return allInventory.filter(item =>
            !assignedInventoryIds.has(item.id) && (
                item.productName.toLowerCase().includes(term) ||
                item.catNum.toLowerCase().includes(term) ||
                item.supplier?.toLowerCase().includes(term)
            )
        )
    }, [allInventory, searchTerm, assignedInventoryIds])

    // Get currently assigned items with full details
    const assignedItems = useMemo(() => {
        return equipment.supplies?.map(supply => {
            const inventoryItem = allInventory.find(inv => inv.id === supply.inventoryItemId)
            return {
                supply,
                inventoryItem
            }
        }).filter(item => item.inventoryItem) || []
    }, [equipment.supplies, allInventory])

    const handleAssign = () => {
        if (!selectedItem) return

        onAssign(equipment.id, selectedItem.id, {
            minQty,
            burnPerWeek,
        })

        // Reset form
        setSelectedItem(null)
        setMinQty(10)
        setBurnPerWeek(1)
        setSearchTerm("")
    }

    const handleRemoveSupply = (supplyId: string) => {
        onRemove(equipment.id, supplyId)
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Inventory for {equipment.name}</DialogTitle>
                    <DialogDescription>
                        Assign inventory items to this equipment and configure consumption settings
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Currently Assigned Inventory */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Currently Assigned ({assignedItems.length})
                        </h3>
                        {assignedItems.length === 0 ? (
                            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                                <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                                No inventory items assigned yet
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assignedItems.map(({ supply, inventoryItem }) => inventoryItem && (
                                    <div
                                        key={supply.id}
                                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{inventoryItem.productName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Cat# {inventoryItem.catNum} • {inventoryItem.supplier}
                                            </div>
                                            <div className="flex gap-3 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    Min: {supply.minQty}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    Burn: {supply.burnPerWeek}/wk
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                    Stock: {inventoryItem.currentQuantity}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveSupply(supply.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Inventory */}
                    <div className="border-t pt-6">
                        <h3 className="font-semibold mb-3">Assign New Inventory</h3>

                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, catalog #, or supplier..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Available Inventory List */}
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                            {filteredInventory.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                    {searchTerm ? "No matching inventory items" : "All available inventory items are already assigned"}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredInventory.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedItem(item)}
                                            className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${selectedItem?.id === item.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''
                                                }`}
                                        >
                                            <div className="font-medium text-sm">{item.productName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Cat# {item.catNum} • {item.supplier} • Stock: {item.currentQuantity}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Configuration for selected item */}
                        {selectedItem && (
                            <div className="mt-4 p-4 bg-brand-50 rounded-lg border border-brand-200">
                                <div className="font-medium text-sm mb-3">
                                    Configure: {selectedItem.productName}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="minQty" className="text-xs">Minimum Quantity</Label>
                                        <Input
                                            id="minQty"
                                            type="number"
                                            min={1}
                                            value={minQty}
                                            onChange={(e) => setMinQty(parseInt(e.target.value) || 1)}
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Reorder when below this level
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="burnPerWeek" className="text-xs">Burn Rate (per week)</Label>
                                        <Input
                                            id="burnPerWeek"
                                            type="number"
                                            min={0}
                                            step={0.1}
                                            value={burnPerWeek}
                                            onChange={(e) => setBurnPerWeek(parseFloat(e.target.value) || 0)}
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Weekly consumption rate
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleAssign}
                                    className="w-full mt-3 bg-brand-500 hover:bg-brand-600"
                                    size="sm"
                                >
                                    Assign to Equipment
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
