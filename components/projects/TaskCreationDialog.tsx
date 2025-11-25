"use client"

import { useState, useEffect } from "react"
import { Task, PersonProfile, ImportanceLevel } from "@/lib/types"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, User, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TaskCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliverableId?: string
  workpackageId: string
  onCreateTask: (taskData: Partial<Task> & { workpackageId: string }) => void
  availablePeople?: PersonProfile[]
  initialTaskName?: string
}

export function TaskCreationDialog({
  open,
  onOpenChange,
  deliverableId,
  workpackageId,
  onCreateTask,
  availablePeople = [],
  initialTaskName = "",
}: TaskCreationDialogProps) {
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
    if (open) {
      // Reset form
      setName(initialTaskName || "")
      setNotes("")
      const today = new Date()
      setStartDate(today.toISOString().split("T")[0])
      setEndDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      setStatus("not-started")
      setImportance("medium")
      setPrimaryOwner("")
      setHelpers([])
      setError(null)
    }
  }, [open, initialTaskName])

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a task name")
      return
    }

    if (!endDate) {
      setError("Please select an end date")
      return
    }

    const taskData: Partial<Task> & { workpackageId: string } = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      start: new Date(startDate),
      end: new Date(endDate),
      status,
      importance,
      progress: 0,
      workpackageId,
      primaryOwner: primaryOwner || undefined,
      helpers: helpers.length > 0 ? helpers : undefined,
      subtasks: [],
    }

    onCreateTask(taskData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to this deliverable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
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
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this task..."
              className="mt-1"
              rows={3}
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
              <Label htmlFor="task-end">End Date *</Label>
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-importance">Importance</Label>
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
            <Select value={primaryOwner} onValueChange={setPrimaryOwner}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select primary owner (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
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
                          if (isPrimaryOwner) return // Can't be helper if already primary owner
                          if (isSelected) {
                            setHelpers(helpers.filter(id => id !== person.id))
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
                              setHelpers(helpers.filter(id => id !== person.id))
                            }
                          }}
                        />
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                          {person.firstName} {person.lastName}
                          {isPrimaryOwner && (
                            <Badge variant="secondary" className="ml-2 text-xs">Owner</Badge>
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
                  const person = availablePeople.find(p => p.id === helperId)
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

