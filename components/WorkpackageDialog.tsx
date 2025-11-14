"use client"

import { useState, useEffect } from "react"
import { Workpackage, Task, ImportanceLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Plus,
  Edit2,
} from "lucide-react"

interface WorkpackageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workpackage: Workpackage | null
  projectId: string
  onSave: (workpackageData: Partial<Workpackage>) => void
  onDelete?: () => void
  mode: "create" | "edit" | "view"
}

export function WorkpackageDialog({
  open,
  onOpenChange,
  workpackage,
  projectId,
  onSave,
  onDelete,
  mode,
}: WorkpackageDialogProps) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [importance, setImportance] = useState<ImportanceLevel>("medium")
  const [status, setStatus] = useState<Workpackage["status"]>("planning")
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (workpackage && open) {
      setName(workpackage.name)
      setNotes(workpackage.notes || "")
      setStartDate(new Date(workpackage.start).toISOString().split("T")[0])
      setEndDate(new Date(workpackage.end).toISOString().split("T")[0])
      setImportance(workpackage.importance)
      setStatus(workpackage.status || "planning")
      setTasks(workpackage.tasks || [])
    } else if (!workpackage && open) {
      // Reset for new workpackage
      setName("")
      setNotes("")
      setStartDate(new Date().toISOString().split("T")[0])
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      setImportance("medium")
      setStatus("planning")
      setTasks([])
    }
  }, [workpackage, open])

  const handleSave = () => {
    if (!name.trim()) return

    const workpackageData: Partial<Workpackage> = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      start: new Date(startDate),
      end: new Date(endDate),
      importance,
      status,
      tasks,
    }

    if (!workpackage) {
      // Creating new workpackage
      workpackageData.profileProjectId = projectId
      workpackageData.progress = 0
      workpackageData.isExpanded = true
    }

    onSave(workpackageData)
    onOpenChange(false)
  }

  const handleAddTask = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: "New Task",
      start: new Date(startDate),
      end: new Date(endDate),
      progress: 0,
      workpackageId: workpackage?.id || "",
      importance: "medium",
      deliverables: [],
      subtasks: [],
    }
    setTasks([...tasks, newTask])
  }

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t))
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  const toggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const newStatus: "done" | "todo" | "in_progress" | "blocked" = t.status === "done" ? "todo" : "done"
        return { ...t, status: newStatus, progress: newStatus === "done" ? 100 : t.progress } as Task
      }
      return t
    }))
  }

  const importanceOptions: { value: ImportanceLevel; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ]

  const statusOptions = [
    { value: "planning", label: "Planning" },
    { value: "active", label: "Active" },
    { value: "atRisk", label: "At Risk" },
    { value: "completed", label: "Completed" },
    { value: "onHold", label: "On Hold" },
  ]

  const isReadOnly = mode === "view"
  const isEditing = mode === "edit"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Work Package" : isReadOnly ? "Work Package Details" : "Edit Work Package"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new work package to organize project tasks"
              : isReadOnly
              ? "View work package information and tasks"
              : "Update work package information and tasks"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="wp-name">Work Package Name *</Label>
              <Input
                id="wp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Data Collection & Analysis"
                disabled={isReadOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wp-start">Start Date</Label>
                <Input
                  id="wp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wp-end">End Date</Label>
                <Input
                  id="wp-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wp-importance">Importance</Label>
                <select
                  id="wp-importance"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importanceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="wp-status">Status</Label>
                <select
                  id="wp-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Workpackage["status"])}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wp-notes">Notes</Label>
              <Textarea
                id="wp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or description for this work package..."
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Tasks Section */}
          {(isEditing || isReadOnly) && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">Tasks</h4>
                  <p className="text-sm text-muted-foreground">
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""} • {tasks.filter(t => t.status === "done").length} completed
                  </p>
                </div>
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={handleAddTask}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                )}
              </div>

              {tasks.length > 0 && (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-surface-2"
                    >
                      <button
                        onClick={() => !isReadOnly && toggleTaskStatus(task.id)}
                        className="mt-0.5"
                        disabled={isReadOnly}
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        {isReadOnly ? (
                          <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                            {task.name}
                          </p>
                        ) : (
                          <Input
                            value={task.name}
                            onChange={(e) => handleUpdateTask(task.id, { name: e.target.value })}
                            className="text-sm font-medium h-8"
                            disabled={isReadOnly}
                          />
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.importance}
                          </Badge>
                          {task.progress > 0 && task.progress < 100 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.progress}%
                            </span>
                          )}
                        </div>
                      </div>

                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tasks.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No tasks yet. Add tasks to track work within this package.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={!name.trim()}>
                {mode === "create" ? "Create" : "Save Changes"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
