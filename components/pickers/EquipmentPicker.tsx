"use client"

import { useState, useEffect } from "react"
import { Check, Search, FlaskConical } from "lucide-react"
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
import { EquipmentDevice } from "@/lib/types/equipment.types"
import { getEquipment } from "@/lib/services/equipmentService"
import { Badge } from "@/components/ui/badge"

interface EquipmentPickerProps {
    value?: string
    onSelect: (item: EquipmentDevice) => void
    placeholder?: string
    className?: string
}

export function EquipmentPicker({ value, onSelect, placeholder = "Select equipment...", className }: EquipmentPickerProps) {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<EquipmentDevice[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadEquipment = async () => {
            setLoading(true)
            try {
                const data = await getEquipment()
                setItems(data)
            } catch (error) {
                console.error("Failed to load equipment", error)
            } finally {
                setLoading(false)
            }
        }
        if (open) {
            loadEquipment()
        }
    }, [open])

    const selectedItem = items.find((item) => item.id === value)

    const isOnline = (item: EquipmentDevice) => {
        // Simple logic for now: if maintenance is not due, it's online
        // In a real app, this might check a 'status' field or IoT connectivity
        const maintenanceDue = new Date(item.lastMaintained).getTime() + (item.maintenanceDays * 86400000) < Date.now()
        return !maintenanceDue
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
                            <div className={cn("h-2 w-2 rounded-full", isOnline(selectedItem) ? "bg-green-500" : "bg-red-500")} />
                            {selectedItem.name}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search equipment..." />
                    <CommandList>
                        <CommandEmpty>No equipment found.</CommandEmpty>
                        <CommandGroup heading="Equipment">
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name}
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
                                            <span className="font-medium">{item.name}</span>
                                            <Badge variant={isOnline(item) ? "outline" : "destructive"} className="text-[10px] h-5">
                                                {isOnline(item) ? "Online" : "Maintenance"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{item.make} {item.model}</span>
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
