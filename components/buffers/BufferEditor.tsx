import { useState } from "react"
import { Buffer, BufferComponent } from "@/lib/protocol/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Save, X, FlaskConical } from "lucide-react"
import { InventoryPicker } from "@/components/pickers/InventoryPicker"
import { v4 as uuidv4 } from 'uuid'

interface BufferEditorProps {
    buffer?: Buffer
    onSave: (buffer: Omit<Buffer, "id" | "createdAt" | "updatedAt" | "createdBy" | "labId">) => void
    onCancel: () => void
    labId: string
}

export function BufferEditor({ buffer: initialBuffer, onSave, onCancel, labId }: BufferEditorProps) {
    const [name, setName] = useState(initialBuffer?.name || "")
    const [description, setDescription] = useState(initialBuffer?.description || "")
    const [components, setComponents] = useState<BufferComponent[]>(initialBuffer?.components || [])
    const [finalVolume, setFinalVolume] = useState(initialBuffer?.finalVolume || "")
    const [finalVolumeUnit, setFinalVolumeUnit] = useState(initialBuffer?.finalVolumeUnit || "ml")
    const [pH, setPH] = useState<number | undefined>(initialBuffer?.pH)
    const [storage, setStorage] = useState(initialBuffer?.storage || "")

    const handleSave = () => {
        if (!name.trim()) return

        onSave({
            name,
            description,
            components,
            finalVolume,
            finalVolumeUnit,
            pH,
            storage
        })
    }

    const addComponent = (inventoryItem?: any) => {
        const newComponent: BufferComponent = {
            name: inventoryItem?.productName || "",
            inventoryId: inventoryItem?.id,
            catalogNumber: inventoryItem?.catalogNumber,
            amount: "",
            unit: inventoryItem?.unit || "g",
            concentration: ""
        }
        setComponents([...components, newComponent])
    }

    const updateComponent = (index: number, updates: Partial<BufferComponent>) => {
        const newComponents = [...components]
        newComponents[index] = { ...newComponents[index], ...updates }
        setComponents(newComponents)
    }

    const removeComponent = (index: number) => {
        setComponents(components.filter((_, i) => i !== index))
    }

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{initialBuffer ? 'Edit Buffer Recipe' : 'Create New Buffer Recipe'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PBS 10x" />
                    </div>
                    <div className="space-y-2">
                        <Label>Storage Condition</Label>
                        <Input value={storage} onChange={e => setStorage(e.target.value)} placeholder="e.g. Room Temp, 4°C" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Preparation instructions..." />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Final Volume</Label>
                        <Input value={finalVolume} onChange={e => setFinalVolume(e.target.value)} placeholder="1" />
                    </div>
                    <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input value={finalVolumeUnit} onChange={e => setFinalVolumeUnit(e.target.value)} placeholder="L" />
                    </div>
                    <div className="space-y-2">
                        <Label>pH</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={pH || ""}
                            onChange={e => setPH(parseFloat(e.target.value))}
                            placeholder="7.4"
                        />
                    </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <FlaskConical className="h-4 w-4" />
                            Ingredients
                        </Label>
                        <InventoryPicker
                            onSelect={(item) => addComponent(item)}
                            placeholder="Add Ingredient from Inventory..."
                            labId={labId}
                            trigger={
                                <Button size="sm" variant="outline">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Ingredient
                                </Button>
                            }
                        />
                    </div>

                    <div className="space-y-3">
                        {components.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No ingredients added yet.
                            </div>
                        )}
                        {components.map((comp, idx) => (
                            <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">{comp.name}</div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeComponent(idx)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Amount</Label>
                                        <Input
                                            value={comp.amount}
                                            onChange={e => updateComponent(idx, { amount: e.target.value })}
                                            placeholder="e.g. 80"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Unit</Label>
                                        <Input
                                            value={comp.unit}
                                            onChange={e => updateComponent(idx, { unit: e.target.value })}
                                            placeholder="e.g. g"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Conc. (Final)</Label>
                                        <Input
                                            value={comp.concentration}
                                            onChange={e => updateComponent(idx, { concentration: e.target.value })}
                                            placeholder="e.g. 137 mM"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={!name.trim()}>Save Recipe</Button>
            </DialogFooter>
        </DialogContent>
    )
}
