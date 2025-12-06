"use client"

import { useState, useEffect } from "react"
import { Deliverable, PersonProfile, ImportanceLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DeliverableCreationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workPackageId: string
    onCreate: (data: Partial<Deliverable>) => void
    availablePeople?: PersonProfile[]
}

export function DeliverableCreationDialog({
    open,
    onOpenChange,
    workPackageId,
    onCreate,
    availablePeople = [],
}: DeliverableCreationDialogProps) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [startDate, setStartDate] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [status, setStatus] = useState<Deliverable["status"]>("not-started")
    const [importance, setImportance] = useState<ImportanceLevel>("medium")
    const [ownerId, setOwnerId] = useState<string>("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setName("")
            setDescription("")
            const today = new Date()
            setStartDate(today.toISOString().split("T")[0])
            setDueDate(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
            setStatus("not-started")
            setImportance("medium")
            setOwnerId("")
            setError(null)
        }
    }, [open])

    const handleSave = () => {
        if (!name.trim()) {
            setError("Please enter a deliverable name")
            return
        }
        if (!dueDate) {
            setError("Please select a due date")
            return
        }

        const data: Partial<Deliverable> = {
            name: name.trim(),
            description: description.trim() || undefined,
            startDate: startDate || undefined,
            dueDate: dueDate,
            status,
            importance,
            workpackageId: workPackageId,
            ownerId: ownerId || undefined,
            progress: 0,
        }

        onCreate(data)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Deliverable</DialogTitle>
                    <DialogDescription>
                        Add a new deliverable to this work package
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="deliv-name">Deliverable Name *</Label>
                        <Input
                            id="deliv-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Final Report Draft"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="deliv-desc">Description</Label>
                        <Textarea
                            id="deliv-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the deliverable..."
                            className="mt-1"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="deliv-start">Start Date</Label>
                            <Input
                                id="deliv-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="deliv-due">Due Date *</Label>
                            <Input
                                id="deliv-due"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="deliv-status">Status</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as Deliverable["status"])}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not-started">Not Started</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="on-hold">On Hold</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="deliv-importance">Importance</Label>
                            <Select value={importance} onValueChange={(value) => setImportance(value as ImportanceLevel)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="deliv-owner">Owner</Label>
                        <Select value={ownerId || "unassigned"} onValueChange={(val) => setOwnerId(val === "unassigned" ? "" : val)}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select owner (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">None</SelectItem>
                                {availablePeople.filter(p => p.id).map((person) => (
                                    <SelectItem key={person.id} value={person.id}>
                                        {person.firstName} {person.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
                        Create Deliverable
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
