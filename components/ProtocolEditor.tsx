import { useState } from "react"
import { Protocol, ProtocolStep } from "@/lib/types/protocol.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, X, ArrowUp, ArrowDown, Clock } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'

interface ProtocolEditorProps {
    protocol?: Protocol
    onSave: (protocol: Protocol) => void
    onCancel: () => void
}

export function ProtocolEditor({ protocol: initialProtocol, onSave, onCancel }: ProtocolEditorProps) {
    const [title, setTitle] = useState(initialProtocol?.title || "")
    const [description, setDescription] = useState(initialProtocol?.description || "")
    const [steps, setSteps] = useState<ProtocolStep[]>(initialProtocol?.steps || [])

    const handleAddStep = () => {
        const newStep: ProtocolStep = {
            id: uuidv4(),
            order: steps.length + 1,
            instruction: "",
            phaseType: 'active',
            expectedDuration: 15,
            requiredReagents: []
        }
        setSteps([...steps, newStep])
    }

    const updateStep = (id: string, updates: Partial<ProtocolStep>) => {
        setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s))
    }

    const deleteStep = (id: string) => {
        setSteps(steps.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })))
    }

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === steps.length - 1) return

        const newSteps = [...steps]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const temp = newSteps[index]
        newSteps[index] = newSteps[targetIndex]
        newSteps[targetIndex] = temp

        // Re-assign orders
        newSteps.forEach((s, i) => s.order = i + 1)
        setSteps(newSteps)
    }

    const handleSave = () => {
        if (!title.trim()) return

        const protocol: Protocol = {
            id: initialProtocol?.id || uuidv4(),
            title,
            description,
            steps,
            ownerId: initialProtocol?.ownerId || "current-user",
            createdBy: initialProtocol?.createdBy || "current-user",
            createdAt: initialProtocol?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: (initialProtocol?.version || 0) + 1,
            tags: initialProtocol?.tags || []
        }
        onSave(protocol)
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-lg font-bold">{initialProtocol ? 'Edit Protocol' : 'New Protocol'}</h2>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!title.trim()}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Protocol
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Protocol Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Protocol Title" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Steps</h3>
                        <Button onClick={handleAddStep} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Step
                        </Button>
                    </div>

                    {steps.map((step, index) => (
                        <Card key={step.id} className="relative group">
                            <CardContent className="p-4 pt-6 space-y-4">
                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteStep(step.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-none flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                            {step.order}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Instruction</Label>
                                            <Textarea
                                                value={step.instruction}
                                                onChange={e => updateStep(step.id, { instruction: e.target.value })}
                                                placeholder="Describe the step..."
                                                className="min-h-[80px]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Phase Type</Label>
                                                <Select
                                                    value={step.phaseType || 'active'}
                                                    onValueChange={(v: 'active' | 'passive') => updateStep(step.id, { phaseType: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Active (Hands-on)</SelectItem>
                                                        <SelectItem value="passive">Passive (Incubation/Wait)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Duration (minutes)</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={step.expectedDuration || 0}
                                                        onChange={e => updateStep(step.id, { expectedDuration: parseInt(e.target.value) || 0 })}
                                                        className="pl-9"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Safety Notes (Optional)</Label>
                                            <Input
                                                value={step.safetyNotes || ""}
                                                onChange={e => updateStep(step.id, { safetyNotes: e.target.value })}
                                                placeholder="e.g. Wear gloves, Fume hood required"
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
