"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandGroup, CommandItem, CommandList, CommandInput, CommandEmpty } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProtocolStep } from "@/lib/types/protocol.types"
import { getInventory } from "@/lib/services/inventoryService"
import { getEquipment } from "@/lib/services/equipmentService"
import { InventoryItem } from "@/lib/types/inventory.types"
import { EquipmentDevice } from "@/lib/types/equipment.types"
import { cn } from "@/lib/utils"
import { FlaskConical, Package, Clock } from "lucide-react"

interface SmartStepEditorProps {
    step: ProtocolStep
    onUpdate: (updates: Partial<ProtocolStep>) => void
    labId?: string
    placeholder?: string
    className?: string
    id?: string
}

export function SmartStepEditor({ step, onUpdate, labId, placeholder, className, id }: SmartStepEditorProps) {
    const [text, setText] = useState(step.instruction)
    const [showMenu, setShowMenu] = useState(false)
    const [cursorPosition, setCursorPosition] = useState(0)
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [equipment, setEquipment] = useState<EquipmentDevice[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [query, setQuery] = useState("")

    // Sync local text with step instruction if it changes externally
    useEffect(() => {
        if (step.instruction !== text) {
            setText(step.instruction)
        }
    }, [step.instruction])

    // Load resources on mount
    useEffect(() => {
        const loadResources = async () => {
            const [invData, eqData] = await Promise.all([
                getInventory({ labId }),
                getEquipment()
            ])
            setInventory(invData)
            setEquipment(labId ? eqData.filter(e => e.labId === labId) : eqData)
        }
        loadResources()
    }, [labId])

    // Duration parsing
    useEffect(() => {
        const durationRegex = /\b(\d+)\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\b/i
        const match = text.match(durationRegex)
        if (match) {
            const value = parseInt(match[1])
            const unit = match[2].toLowerCase()
            let minutes = value
            if (unit.startsWith('h')) {
                minutes = value * 60
            }

            // Only update if different to avoid loops
            if (step.expectedDuration !== minutes) {
                onUpdate({ expectedDuration: minutes })
            }
        }
    }, [text, onUpdate, step.expectedDuration])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value
        setText(newText)
        onUpdate({ instruction: newText })

        const pos = e.target.selectionStart
        setCursorPosition(pos)

        // Check for @ trigger
        const lastChar = newText.slice(pos - 1, pos)
        if (lastChar === '@') {
            setShowMenu(true)
            setQuery("")
        } else if (showMenu) {
            // If menu is open, update query based on text after @
            const textBeforeCursor = newText.slice(0, pos)
            const lastAt = textBeforeCursor.lastIndexOf('@')
            if (lastAt !== -1) {
                setQuery(textBeforeCursor.slice(lastAt + 1))
            } else {
                setShowMenu(false)
            }
        }
    }

    const handleSelect = (item: InventoryItem | EquipmentDevice, type: 'inventory' | 'equipment') => {
        const textBeforeCursor = text.slice(0, cursorPosition)
        const textAfterCursor = text.slice(cursorPosition)
        const lastAt = textBeforeCursor.lastIndexOf('@')

        if (lastAt !== -1) {
            const name = 'productName' in item ? item.productName : item.name
            const newText = textBeforeCursor.slice(0, lastAt) + name + " " + textAfterCursor
            setText(newText)
            onUpdate({ instruction: newText })

            // Add to resources
            if (type === 'inventory') {
                const invItem = item as InventoryItem
                const currentReagents = step.requiredReagents || []
                // Check if already added
                if (!currentReagents.some(r => r.id === invItem.id)) {
                    onUpdate({
                        requiredReagents: [...currentReagents, {
                            id: invItem.id,
                            name: invItem.productName,
                            quantity: "1", // Default
                            unit: invItem.unit || "unit"
                        }]
                    })
                }
            } else {
                const eqItem = item as EquipmentDevice
                const currentEq = step.requiredEquipment || []
                if (!currentEq.some(e => e.id === eqItem.id)) {
                    onUpdate({
                        requiredEquipment: [...currentEq, {
                            id: eqItem.id,
                            name: eqItem.name
                        }]
                    })
                }
            }
        }
        setShowMenu(false)
        textareaRef.current?.focus()
    }

    return (
        <div className="relative w-full">
            <Popover open={showMenu} onOpenChange={setShowMenu}>
                <PopoverTrigger asChild>
                    <div className="w-full">
                        <Textarea
                            ref={textareaRef}
                            id={id}
                            value={text}
                            onChange={handleChange}
                            placeholder={placeholder}
                            className={className}
                            onKeyDown={(e) => {
                                if (showMenu && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter')) {
                                    // Prevent default navigation in textarea when menu is open
                                    // This is tricky with standard Popover, might need custom handling
                                    // For now, let's rely on mouse selection or standard tab navigation
                                }
                            }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start" side="bottom">
                    <Command>
                        <CommandInput placeholder="Search resources..." value={query} onValueChange={setQuery} />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup heading="Inventory">
                                {inventory.map(item => (
                                    <CommandItem key={item.id} value={item.productName} onSelect={() => handleSelect(item, 'inventory')}>
                                        <Package className="mr-2 h-4 w-4" />
                                        {item.productName}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Equipment">
                                {equipment.map(item => (
                                    <CommandItem key={item.id} value={item.name} onSelect={() => handleSelect(item, 'equipment')}>
                                        <FlaskConical className="mr-2 h-4 w-4" />
                                        {item.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Helper text for duration */}
            {(step.expectedDuration || 0) > 0 && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground flex items-center gap-1 bg-white/80 px-1 rounded">
                    <Clock className="h-3 w-3" />
                    {step.expectedDuration} mins detected
                </div>
            )}
        </div>
    )
}
