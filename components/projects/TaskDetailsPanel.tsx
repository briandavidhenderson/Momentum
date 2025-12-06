"use client"

import { useState, useEffect } from "react"
import { Task, PersonProfile, ImportanceLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Calendar, User, Save, Trash2, AlertCircle } from "lucide-react"

interface TaskDetailsPanelProps {
    task: Task | null
    workpackageId: string
    onClose: () => void
    onSave: (taskId: string, taskData: Partial<Task>) => void
    onDelete?: (taskId: string) => void
    availablePeople?: PersonProfile[]
}

export function TaskDetailsPanel({
    task,
    workpackageId,
    onClose,
    onSave,
    onDelete,
    availablePeople = [],
}: TaskDetailsPanelProps) {
    const [name, setName] = useState("")
    const [notes, setNotes] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [status, setStatus] = useState<Task["status"]>("not-started")
    const [importance, setImportance] = useState<ImportanceLevel>("medium")
    const [primaryOwner, setPrimaryOwner] = useState<string>("")
    const [helpers, setHelpers] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (task) {
            try {
                setName(task.name || "")
                setNotes(task.notes || "")
                setStartDate(
                    task.start
                        ? new Date(task.start).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0]
                )
                setEndDate(
                    task.end
                        ? new Date(task.end).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0]
                )
                setStatus(task.status || "not-started")
                setImportance(task.importance || "medium")
                setPrimaryOwner(task.primaryOwner || "")
                setHelpers(task.helpers || [])
                setError(null)
            } catch (error) {
                console.error("Error loading task data:", error)
                setError("Error loading task data")
            }
        }
    }, [task])

    const handleSave = () => {
        if (!task || !task.id) {
            setError("Task not found")
            return
        }

        if (!name.trim()) {
            setError("Please enter a task name")
            return
        }

        if (!endDate) {
            setError("Please select an end date")
            return
        }

        const taskData: Partial<Task> = {
            name: name.trim(),
            notes: notes.trim() || undefined,
            start: new Date(startDate),
            end: new Date(endDate),
            status,
            importance,
            primaryOwner: primaryOwner || undefined,
            helpers: helpers.length > 0 ? helpers : undefined,
        }

        onSave(task.id, taskData)
    }

    const handleDelete = () => {
        if (!task || !task.id || !onDelete) return
        if (confirm(`Are you sure you want to delete the task "${task.name}"?`)) {
            onDelete(task.id)
        }
    }

    // Click outside to close handler
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!task) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={handleBackdropClick}
            />

            {/* Side Panel */}
            <div className="fixed inset-y-0 right-0 w-[700px] bg-background border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border bg-surface-2">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-foreground mb-1">Edit Task</h2>
                            <p className="text-sm text-muted-foreground">
                                Update task details, assignees, and dates
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="task-name">Task Name *</Label>
                        <Input
                            id="task-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Prepare samples for analysis"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="task-notes">Notes / Details</Label>
                        <Textarea
                            id="task-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional details about this task..."
                            className="mt-1"
                            rows={4}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="task-start">Start Date</Label>
                            <Input
                                id="task-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="task-end">Due Date *</Label>
                            <Input
                                id="task-end"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="task-status">Status</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as Task["status"])}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not-started">Not Started</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="on-hold">On Hold</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="at-risk">At Risk</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="task-importance">Importance Level</Label>
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
                        <Label htmlFor="task-owner">Primary Owner (Assignee)</Label>
                        <Select
                            value={primaryOwner || "unassigned"}
                            onValueChange={(value) => {
                                const val = value === "unassigned" ? "" : value
                                setPrimaryOwner(val)
                                // Remove from helpers if selected as primary owner
                                if (val && helpers.includes(val)) {
                                    setHelpers(helpers.filter((id) => id !== val))
                                }
                            }}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select primary owner (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">None</SelectItem>
                                {availablePeople.map((person) => (
                                    <SelectItem key={person.id} value={person.id}>
                                        {person.firstName} {person.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="mb-2 block">Helpers (Additional Assignees)</Label>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
                            {availablePeople.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No team members available
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {availablePeople.map((person) => {
                                        const isSelected = helpers.includes(person.id)
                                        const isPrimaryOwner = primaryOwner === person.id
                                        return (
                                            <div
                                                key={person.id}
                                                className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer"
                                                onClick={() => {
                                                    if (isPrimaryOwner) return
                                                    if (isSelected) {
                                                        setHelpers(helpers.filter((id) => id !== person.id))
                                                    } else {
                                                        setHelpers([...helpers, person.id])
                                                    }
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    disabled={isPrimaryOwner}
                                                    onCheckedChange={(checked) => {
                                                        if (isPrimaryOwner) return
                                                        if (checked) {
                                                            setHelpers([...helpers, person.id])
                                                        } else {
                                                            setHelpers(helpers.filter((id) => id !== person.id))
                                                        }
                                                    }}
                                                />
                                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                                    {person.firstName} {person.lastName}
                                                    {isPrimaryOwner && (
                                                        <Badge variant="secondary" className="ml-2 text-xs">
                                                            Owner
                                                        </Badge>
                                                    )}
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        {helpers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-xs text-muted-foreground">Selected:</span>
                                {helpers.map((helperId) => {
                                    const person = availablePeople.find((p) => p.id === helperId)
                                    return person ? (
                                        <Badge key={helperId} variant="secondary" className="text-xs">
                                            {person.firstName} {person.lastName}
                                        </Badge>
                                    ) : null
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-surface-2 flex items-center justify-between">
                    <div>
                        {onDelete && (
                            <Button variant="destructive" onClick={handleDelete} size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Task
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} size="sm">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-brand-500 hover:bg-brand-600 text-white"
                            size="sm"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
