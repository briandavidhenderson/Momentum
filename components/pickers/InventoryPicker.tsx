"use client"

import { useState, useEffect } from "react"
import { Check, Search, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { InventoryItem } from "@/lib/types/inventory.types"
import { getInventory } from "@/lib/services/inventoryService"
import { Badge } from "@/components/ui/badge"

interface InventoryPickerProps {
    value?: string
    onSelect: (item: InventoryItem) => void
    placeholder?: string
    className?: string
}

export function InventoryPicker({ value, onSelect, placeholder = "Select item...", className }: InventoryPickerProps) {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadInventory = async () => {
            setLoading(true)
            try {
                const data = await getInventory()
                setItems(data)
            } catch (error) {
                console.error("Failed to load inventory", error)
            } finally {
                setLoading(false)
            }
        }
        if (open) {
            loadInventory()
        }
    }, [open])

    const selectedItem = items.find((item) => item.id === value)

    const getStatusColor = (level: string) => {
        switch (level) {
            case 'in_stock': return 'bg-green-500'
            case 'low': return 'bg-yellow-500'
            case 'out_of_stock': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {selectedItem ? (
                        <div className="flex items-center gap-2 truncate">
                            <div className={cn("h-2 w-2 rounded-full", getStatusColor(selectedItem.inventoryLevel))} />
                            {selectedItem.productName}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search inventory..." />
                    <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup heading="Inventory Items">
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.productName}
                                    onSelect={() => {
                                        onSelect(item)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{item.productName}</span>
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {item.currentQuantity} {item.unit}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", getStatusColor(item.inventoryLevel))} />
                                            <span className="capitalize">{item.inventoryLevel.replace(/_/g, ' ')}</span>
                                            {item.catNum && <span>• REF: {item.catNum}</span>}
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
