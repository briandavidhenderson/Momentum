
"use client"

import { useState, useEffect } from "react"
import { DayToDayTask, TaskStatus } from "@/lib/dayToDayTypes"
import { ImportanceLevel, Person } from "@/lib/types"
import type { TaskSyncStatus } from "@/lib/hooks/useOptimisticDayToDayTasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Plus, GripVertical, Trash2, Edit2, Clock, Loader2, AlertCircle, ListTodo, Calendar, CheckCircle2, User, X } from "lucide-react"
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useAppContext } from "@/lib/AppContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { notifyTaskAssigned, notifyTaskReassigned } from "@/lib/notificationUtils"
import { PersonProfile } from "@/lib/types"
import { logger } from "@/lib/logger"
import { CommentsSection } from "@/components/CommentsSection"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LabPollPanel } from "@/components/LabPollPanel"

function DroppableColumn({
  id,
  title,
  tasks,
  children,
  count
}: {
  id: string
  title: string
  tasks: DayToDayTask[]
  children: React.ReactNode
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
    data: { type: "column", status: id },
  })

  // Feature #2: Enable sortable items within column
  const taskIds = tasks.map(t => t.id)

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col h-full min-h-[400px] md:min-h-[500px] rounded-xl border-2 transition-colors"
      style={{
        borderColor: isOver ? "hsl(var(--brand-500))" : "hsl(var(--border))",
        backgroundColor: isOver ? "hsl(var(--brand-500) / 0.05)" : "hsl(var(--surface-2))",
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {children}
        </div>
      </SortableContext>
    </div>
  )
}

// Helper function to get card background colors based on importance
function getCardBackgroundColor(importance?: string) {
  const colors: Record<string, string> = {
    low: "bg-gray-50 border-gray-200",
    medium: "bg-blue-50 border-blue-200",
    high: "bg-orange-50 border-orange-200",
    critical: "bg-red-50 border-red-300",
  }
  return colors[importance || "medium"] || colors.medium
}

// Helper function to format due date with days and hours countdown
function formatDueDate(dueDate?: Date) {
  if (!dueDate) return null

  const date = new Date(dueDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  const isOverdue = diffMs < 0
  const isDueSoon = diffMs >= 0 && diffMs <= 3 * 24 * 60 * 60 * 1000 // 3 days

  let timeText = ""
  if (isOverdue) {
    const absDays = Math.abs(diffDays)
    const absHours = Math.abs(diffHours)
    timeText = `Overdue ${absDays}d ${absHours}h`
  } else if (isDueSoon) {
    timeText = `Due in ${diffDays}d ${diffHours}h`
  } else {
    timeText = date.toLocaleDateString()
  }

  return (
    <div className="flex items-center gap-1">
      <Calendar className="h-3 w-3" />
      <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : isDueSoon ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
        {timeText}
      </span>
    </div>
  )
}

function DraggableTaskCard({
  task,
  people,
  projects,
  currentUserId,
  onEdit,
  onDelete,
  onVerify,
}: {
  task: DayToDayTask
  people: Person[]
  projects: any[]
  currentUserId?: string
  onEdit: () => void
  onDelete: () => void
  onVerify?: () => void
}) {
  // Feature #2: Use useSortable for both column switching and reordering
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Support both old single assignee and new multiple assignees
  const assigneeIdsList = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])
  const assignees = (people || []).filter((p) => assigneeIdsList.includes(p.id))
  const linkedProject = (projects || []).find((p: any) => p.id === task.linkedProjectId)

  const completedByPerson = task.completedBy ? (people || []).find((p) => p.id === task.completedBy) : null
  const verifiedByPerson = task.verifiedBy ? (people || []).find((p) => p.id === task.verifiedBy) : null

  const importanceColors = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move ${getCardBackgroundColor(task.importance)}`}
    >
      <div className="flex items-start gap-3">
        <div {...listeners} {...attributes} className="mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status === "done" && onVerify && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVerify()
                  }}
                  title="Verify completion"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onEdit}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${importanceColors[task.importance]}`}>
              {task.importance}
            </Badge>

            {linkedProject && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                📁 {linkedProject.name}
              </Badge>
            )}

            {task.dueDate && formatDueDate(task.dueDate)}

            {assignees.length > 0 && (
              <div className="flex items-center gap-1">
                {assignees.slice(0, 3).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white border-2 border-white"
                    style={{ backgroundColor: assignee.color }}
                    title={assignee.name}
                  >
                    {assignee.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <Badge variant="secondary" className="text-xs h-6 px-1.5">
                    +{assignees.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* History metadata - show completion and verification info */}
          {task.status === "history" && (completedByPerson || verifiedByPerson) && (
            <div className="mt-2 pt-2 border-t border-border space-y-1">
              {completedByPerson && task.completedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Completed by {completedByPerson.name}</span>
                  <span className="text-xs">({new Date(task.completedAt).toLocaleDateString()})</span>
                </div>
              )}
              {verifiedByPerson && task.verifiedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                  <span>Verified by {verifiedByPerson.name}</span>
                  <span className="text-xs">({new Date(task.verifiedAt).toLocaleDateString()})</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DayToDayTaskEditDialog({
  open,
  onOpenChange,
  task,
  people,
  allProfiles,
  currentUserProfile,
  projects,
  workpackages,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: DayToDayTask | null
  people: Person[]
  allProfiles: PersonProfile[]
  currentUserProfile: PersonProfile | null
  projects: any[]
  workpackages: any[]
  onSave: (taskId: string, updates: Partial<DayToDayTask>) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [importance, setImportance] = useState<ImportanceLevel>("medium")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState("")
  const [linkedProjectId, setLinkedProjectId] = useState<string>("")
  const [linkedTaskId, setLinkedTaskId] = useState<string>("")

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setImportance(task.importance)
      // Support both old single assignee and new multiple assignees
      const currentAssignees = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])
      setAssigneeIds(currentAssignees)
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
      setLinkedProjectId(task.linkedProjectId || "")
      setLinkedTaskId(task.linkedTaskId || "")
    } else {
      setTitle("")
      setDescription("")
      setImportance("medium")
      setAssigneeIds([])
      setDueDate("")
      setLinkedProjectId("")
      setLinkedTaskId("")
    }
  }, [task, open])

  const handleSave = async () => {
    if (!task || !title.trim()) return

    const updates: Partial<DayToDayTask> = {
      title: title.trim(),
      description: description.trim() || undefined,
      importance,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      linkedProjectId: linkedProjectId || undefined,
      linkedTaskId: linkedTaskId || undefined,
    }

    onSave(task.id, updates)

    // PHASE 4: Trigger task assignment notifications for new assignees
    if (currentUserProfile && allProfiles) {
      try {
        const oldAssigneeIdsList = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : [])
        const newAssigneeIdsList = assigneeIds

        // Check for newly added assignees
        const addedAssignees = newAssigneeIdsList.filter(id => !oldAssigneeIdsList.includes(id))

        // Notify newly added assignees
        for (const assigneeId of addedAssignees) {
          if (assigneeId !== currentUserProfile.id) {
            const newAssignee = allProfiles.find(p => p.id === assigneeId)
            if (newAssignee) {
              await notifyTaskAssigned({ ...task, ...updates }, newAssignee, currentUserProfile)
            }
          }
        }

      } catch (error) {
        logger.error('Error sending task assignment notification', error)
        // Don't block the UI on notification failure
      }
    }

    onOpenChange(false)
  }

  // Get tasks from selected project's workpackages
  const availableTasks = linkedProjectId
    ? workpackages
        .filter((wp: any) => wp.projectId === linkedProjectId)
        .flatMap((wp: any) => wp.tasks || [])
    : []

  const importanceOptions: { value: ImportanceLevel; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ]

  const importanceColors: Record<ImportanceLevel, string> = {
    low: "bg-gray-600 hover:bg-gray-700",
    medium: "bg-blue-500 hover:bg-blue-600",
    high: "bg-orange-500 hover:bg-orange-600",
    critical: "bg-red-500 hover:bg-red-600",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update your task details below.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4">
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="taskTitle">Task Title</Label>
            <Input
              id="taskTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Importance</Label>
            <div className="flex gap-1 flex-wrap">
              {importanceOptions.map((option) => {
                const isSelected = importance === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setImportance(option.value)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      isSelected
                        ? `${importanceColors[option.value]} text-white shadow-md`
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="taskAssignees">Assignees (multiple allowed)</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 p-2 min-h-[40px] rounded-md border border-input bg-background">
                {assigneeIds.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No assignees</span>
                ) : (
                  assigneeIds.map((assigneeId) => {
                    const assignee = people.find((p) => p.id === assigneeId)
                    return assignee ? (
                      <Badge key={assigneeId} variant="secondary" className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: assignee.color }}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                        {assignee.name}
                        <button
                          type="button"
                          onClick={() => setAssigneeIds(assigneeIds.filter((id) => id !== assigneeId))}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null
                  })
                )}
              </div>
              <select
                id="taskAssignees"
                value=""
                onChange={(e) => {
                  const selectedId = e.target.value
                  if (selectedId && !assigneeIds.includes(selectedId)) {
                    setAssigneeIds([...assigneeIds, selectedId])
                  }
                  e.target.value = "" // Reset select
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">+ Add assignee</option>
                {(people || [])
                  .filter((person) => !assigneeIds.includes(person.id))
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="taskDueDate">Due Date</Label>
            <Input
              id="taskDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="linkedProject">Linked Project</Label>
            <select
              id="linkedProject"
              value={linkedProjectId}
              onChange={(e) => {
                setLinkedProjectId(e.target.value)
                setLinkedTaskId("") // Reset task selection when project changes
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">None</option>
              {(projects || []).map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {linkedProjectId && (
              <p className="text-xs text-muted-foreground">
                This task will appear in the project&apos;s activity feed
              </p>
            )}
          </div>
          {linkedProjectId && availableTasks.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="linkedTask">Linked Task/Workpackage</Label>
              <select
                id="linkedTask"
                value={linkedTaskId}
                onChange={(e) => setLinkedTaskId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">None</option>
                {availableTasks.map((task: any) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
              {linkedTaskId && (
                <p className="text-xs text-muted-foreground">
                  This day-to-day task is related to a project task
                </p>
              )}
            </div>
          )}
        </div>
          </TabsContent>
          <TabsContent value="comments" className="space-y-4 py-4">
            {task && (
              <CommentsSection
                entityType="dayToDayTask"
                entityId={task.id}
                teamMembers={people.map(p => ({ id: p.id, name: p.name }))}
              />
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Bulk Task Form Component ---

interface PendingTask {
  title: string
  importance: ImportanceLevel
  assigneeIds: string[]
  linkedProjectId: string
  dueDate: string
  description: string
}

function BulkTaskForm({
  people,
  projects,
  onCreateTask,
  currentUserId,
}: {
  people: Person[]
  projects: any[]
  onCreateTask: (task: {
    title: string
    status: TaskStatus
    importance: ImportanceLevel
    createdBy: string
    description?: string
    assigneeIds?: string[]
    linkedProjectId?: string
    dueDate?: Date
  }) => void | Promise<void>
  currentUserId?: string
}) {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([
    { title: '', importance: 'medium', assigneeIds: [], linkedProjectId: '', dueDate: '', description: '' }
  ])

  const handleAddRow = () => {
    setPendingTasks([...pendingTasks, { title: '', importance: 'medium', assigneeIds: [], linkedProjectId: '', dueDate: '', description: '' }])
  }

  const handleRemoveRow = (index: number) => {
    if (pendingTasks.length > 1) {
      setPendingTasks(pendingTasks.filter((_, i) => i !== index))
    } else {
      // If deleting the last row, just clear it
      setPendingTasks([{ title: '', importance: 'medium', assigneeIds: [], linkedProjectId: '', dueDate: '', description: '' }])
    }
  }

  const handleChange = (index: number, field: keyof PendingTask, value: any) => {
    const updated = [...pendingTasks]
    updated[index] = { ...updated[index], [field]: value }
    setPendingTasks(updated)
  }

  const handleAssigneeChange = (index: number, assigneeId: string, checked: boolean) => {
    const updated = [...pendingTasks]
    if (checked) {
      if (!updated[index].assigneeIds.includes(assigneeId)) {
        updated[index].assigneeIds = [...updated[index].assigneeIds, assigneeId]
      }
    } else {
      updated[index].assigneeIds = updated[index].assigneeIds.filter(id => id !== assigneeId)
    }
    setPendingTasks(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Filter out empty rows (at least need a title)
    const tasksToSave = pendingTasks.filter(t => t.title.trim() !== '')
    if (tasksToSave.length === 0) return

    // Add all valid tasks
    for (const task of tasksToSave) {
      onCreateTask({
        title: task.title.trim(),
        description: task.description.trim() || undefined,
        importance: task.importance,
        assigneeIds: task.assigneeIds.length > 0 ? task.assigneeIds : undefined,
        linkedProjectId: task.linkedProjectId || undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        status: 'todo',
        createdBy: currentUserId || '',
      })
    }

    // Reset to one empty row
    setPendingTasks([{ title: '', importance: 'medium', assigneeIds: [], linkedProjectId: '', dueDate: '', description: '' }])
  }

  const importanceOptions: { value: ImportanceLevel; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ]

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4" /> Bulk Create Tasks
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Row (Hidden on mobile, visible on desktop) */}
        <div className="hidden md:grid md:grid-cols-12 gap-3 px-1 mb-2">
          <div className="col-span-3 text-xs font-medium text-gray-500">Task Name</div>
          <div className="col-span-1 text-xs font-medium text-gray-500">Importance</div>
          <div className="col-span-2 text-xs font-medium text-gray-500">Assignees</div>
          <div className="col-span-2 text-xs font-medium text-gray-500">Project</div>
          <div className="col-span-2 text-xs font-medium text-gray-500">Due Date</div>
          <div className="col-span-2 text-xs font-medium text-gray-500">Description</div>
        </div>

        {/* Input Rows */}
        <div className="space-y-3">
          {pendingTasks.map((task, index) => (
            <div
              key={index}
              className="flex flex-col md:grid md:grid-cols-12 gap-3 items-start relative bg-white md:bg-transparent p-4 md:p-0 rounded-lg shadow-sm md:shadow-none border md:border-none border-gray-200"
            >
              {/* Task Title */}
              <label className="md:hidden text-xs font-semibold text-gray-500 mb-1">Task Name</label>
              <div className="col-span-3 w-full">
                <Input
                  type="text"
                  placeholder="What needs to be done?"
                  className="w-full"
                  value={task.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  autoFocus={index === pendingTasks.length - 1 && index > 0}
                />
              </div>

              {/* Importance */}
              <div className="col-span-1 w-full">
                <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Importance</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={task.importance}
                  onChange={(e) => handleChange(index, 'importance', e.target.value as ImportanceLevel)}
                >
                  {importanceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignees */}
              <div className="col-span-2 w-full">
                <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Assignees</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 p-2 min-h-[40px] rounded-md border border-input bg-background">
                    {task.assigneeIds.length === 0 ? (
                      <span className="text-sm text-muted-foreground text-xs">None</span>
                    ) : (
                      task.assigneeIds.map((assigneeId) => {
                        const assignee = people.find((p) => p.id === assigneeId)
                        return assignee ? (
                          <Badge key={assigneeId} variant="secondary" className="flex items-center gap-1 text-xs">
                            <div
                              className="w-3 h-3 rounded-full flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: assignee.color }}
                            >
                              {assignee.name.charAt(0).toUpperCase()}
                            </div>
                            {assignee.name}
                            <button
                              type="button"
                              onClick={() => handleAssigneeChange(index, assigneeId, false)}
                              className="ml-1 hover:text-destructive text-xs"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null
                      })
                    )}
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value
                      if (selectedId && !task.assigneeIds.includes(selectedId)) {
                        handleAssigneeChange(index, selectedId, true)
                      }
                      e.target.value = ''
                    }}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">+ Add assignee</option>
                    {people
                      .filter((person) => !task.assigneeIds.includes(person.id))
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Project */}
              <div className="col-span-2 w-full">
                <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Project</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={task.linkedProjectId}
                  onChange={(e) => handleChange(index, 'linkedProjectId', e.target.value)}
                >
                  <option value="">None</option>
                  {projects.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div className="col-span-2 w-full">
                <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Due Date</label>
                <Input
                  type="date"
                  className="w-full"
                  value={task.dueDate}
                  onChange={(e) => handleChange(index, 'dueDate', e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="col-span-2 w-full relative">
                <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Optional description..."
                    className="w-full min-h-[40px] text-sm"
                    value={task.description}
                    onChange={(e) => handleChange(index, 'description', e.target.value)}
                    rows={2}
                  />
                  {/* Delete Row Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
                    title="Remove row"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add another task
          </button>

          <Button type="submit" className="bg-brand-600 hover:bg-brand-700">
            <Plus className="w-4 h-4 mr-2" /> Add Tasks
          </Button>
        </div>
      </form>
    </div>
  )
}

export function DayToDayBoard() {
  const { currentUser, currentUserProfile } = useAuth()
  // Get state and handlers from context
  const {
    dayToDayTasks,
    people,
    allProfiles,
    projects,
    workpackages,
    polls,
    handleCreateDayToDayTask: onCreateTask,
    handleUpdateDayToDayTask: onUpdateTask,
    handleDeleteDayToDayTask: onDeleteTask,
    handleMoveDayToDayTask: onMoveTask,
    handleReorderDayToDayTask: onReorderTask,
    handleCreatePoll,
    handleRespondToPoll,
    handleDeletePoll,
    syncStatus,
  } = useAppContext()

  // Explicitly type syncStatus to work around AppContext type intersection issue
  // Use a helper function to prevent TypeScript control flow narrowing
  const getSyncStatus = (): TaskSyncStatus => syncStatus as TaskSyncStatus
  const tasks = (dayToDayTasks || []) as DayToDayTask[]
  const allProjects = (projects || [])
  const allWorkpackages = (workpackages || [])

  // Loading state
  const isLoading = !currentUserProfile

  const [activeTask, setActiveTask] = useState<DayToDayTask | null>(null)
  const [editingTask, setEditingTask] = useState<DayToDayTask | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickAssignee, setQuickAssignee] = useState<string>("")
  const [quickDue, setQuickDue] = useState<string>("")
  const [quickProject, setQuickProject] = useState<string>("")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group tasks by status and sort by importance and order
  const todoTasks = tasks
    .filter((t) => t.status === "todo")
    .sort((a, b) => {
      // Sort by importance first (critical > high > medium > low)
      const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance]
      if (importanceDiff !== 0) return importanceDiff
      // Then by order
      return a.order - b.order
    })

  const workingTasks = tasks
    .filter((t) => t.status === "working")
    .sort((a, b) => a.order - b.order)

  const doneTasks = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // Most recently completed first

  const historyTasks = tasks
    .filter((t) => t.status === "history")
    .sort((a, b) => (b.verifiedAt?.getTime() || b.updatedAt.getTime()) - (a.verifiedAt?.getTime() || a.updatedAt.getTime())) // Most recently verified first

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as DayToDayTask | undefined
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeTask = active.data.current?.task as DayToDayTask | undefined
    const overData = over.data.current
    const overTask = overData?.task as DayToDayTask | undefined

    if (!activeTask) return

    // Feature #2: Handle reordering within same column (optimistic)
    if (overTask && activeTask.status === overTask.status) {
      // Reordering within same column
      const tasksInColumn = tasks.filter(t => t.status === activeTask.status)
      const oldIndex = tasksInColumn.findIndex(t => t.id === activeTask.id)
      const newIndex = tasksInColumn.findIndex(t => t.id === overTask.id)

      if (oldIndex !== newIndex) {
        // Use optimistic reorder function
        onReorderTask(activeTask.id, newIndex)
      }
      return
    }

    // Handle moving to different column (optimistic)
    if (overData?.type === "column") {
      const newStatus = overData.status as TaskStatus
      if (activeTask.status !== newStatus) {
        // Don't allow drag-and-drop to history - must use verify button
        if (newStatus === "history") {
          return
        }

        // Track completion when moving to "done"
        if (newStatus === "done" && currentUser?.uid) {
          onUpdateTask(activeTask.id, {
            status: newStatus,
            completedBy: currentUser.uid,
            completedAt: new Date(),
          })
        } else {
          // For todo/working status changes, use the move function
          onMoveTask(activeTask.id, newStatus as "todo" | "working" | "done")
        }
      }
    }
  }

  const handleVerifyTask = (taskId: string) => {
    if (!currentUser?.uid) return

    // Move task to history with verification metadata
    onUpdateTask(taskId, {
      status: "history",
      verifiedBy: currentUser.uid,
      verifiedAt: new Date(),
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Day-to-Day Tasks</h3>
          <p className="text-sm text-muted-foreground">
            Fetching your tasks...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (getSyncStatus() === 'error') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Tasks</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was an error loading your day-to-day tasks. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()} className="bg-brand-500 hover:bg-brand-600">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold">Day to Day</h2>
            <p className="text-sm text-muted-foreground">
              Manage your daily tasks and priorities
            </p>
          </div>
          {getSyncStatus() === 'syncing' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing...
            </Badge>
          )}
          {getSyncStatus() === 'error' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Sync Error
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="polls">Team Polls</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="flex-1 flex flex-col">
          {/* Bulk Task Creation Form */}
          <BulkTaskForm
            people={people || []}
            projects={allProjects}
            onCreateTask={(task) => onCreateTask(task as any)}
            currentUserId={currentUser?.uid}
          />

          {/* Quick add */}
          <div className="p-4 border rounded-lg bg-surface-2 flex flex-col md:flex-row gap-3 md:items-end mb-4">
            <div className="flex-1">
              <Label className="text-xs">Quick add task</Label>
              <Input
                placeholder="Task title"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Label className="text-xs">Assignee</Label>
              <select
                className="w-full border rounded h-10 px-2 text-sm"
                value={quickAssignee}
                onChange={(e) => setQuickAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {(people || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-56">
              <Label className="text-xs">Link to project (optional)</Label>
              <select
                className="w-full border rounded h-10 px-2 text-sm"
                value={quickProject}
                onChange={(e) => setQuickProject(e.target.value)}
              >
                <option value="">No project link</option>
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-44">
              <Label className="text-xs">Due date (optional)</Label>
              <Input
                type="date"
                value={quickDue}
                onChange={(e) => setQuickDue(e.target.value)}
              />
            </div>
            <Button
              onClick={async () => {
                if (!quickTitle.trim()) return
                const due = quickDue ? new Date(quickDue) : (() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 7)
                  return d
                })()
                await onCreateTask({
                  title: quickTitle.trim(),
                  description: '',
                  status: 'todo',
                  importance: 'medium',
                  assigneeId: quickAssignee || undefined,
                  assigneeIds: quickAssignee ? [quickAssignee] : [],
                  dueDate: due,
                  linkedProjectId: quickProject || undefined,
                  createdBy: currentUser?.uid || '',
                } as any)
                setQuickTitle("")
                setQuickAssignee("")
                setQuickDue("")
                setQuickProject("")
              }}
              disabled={!quickTitle.trim()}
            >
              Add
            </Button>
          </div>

      {/* Empty state - when no tasks exist */}
      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <ListTodo className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No Tasks Yet</h3>
            <p className="text-muted-foreground">
              Use the bulk task creation form above to add your first tasks.
            </p>
          </div>
        </div>
      )}

      {/* Task board - only show when tasks exist */}
      {tasks.length > 0 && (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 flex-1">
          <DroppableColumn
            id="todo"
            title="To Do"
            tasks={todoTasks}
            count={todoTasks.length}
          >
            {todoTasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                people={people}
                projects={allProjects}
                currentUserId={currentUser?.uid}
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
                onVerify={() => handleVerifyTask(task.id)}
              />
            ))}
            {todoTasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No tasks yet. Create one to get started!
              </div>
            )}
          </DroppableColumn>

          <DroppableColumn
            id="working"
            title="Working On It"
            tasks={workingTasks}
            count={workingTasks.length}
          >
            {workingTasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                people={people}
                projects={allProjects}
                currentUserId={currentUser?.uid}
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
                onVerify={() => handleVerifyTask(task.id)}
              />
            ))}
            {workingTasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Drag tasks here when you start working on them
              </div>
            )}
          </DroppableColumn>

          <DroppableColumn
            id="done"
            title="Done"
            tasks={doneTasks}
            count={doneTasks.length}
          >
            {doneTasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                people={people}
                projects={allProjects}
                currentUserId={currentUser?.uid}
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
                onVerify={() => handleVerifyTask(task.id)}
              />
            ))}
            {doneTasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Completed tasks will appear here
              </div>
            )}
          </DroppableColumn>

          <DroppableColumn
            id="history"
            title="History"
            tasks={historyTasks}
            count={historyTasks.length}
          >
            {historyTasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                people={people}
                projects={allProjects}
                currentUserId={currentUser?.uid}
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
                onVerify={() => handleVerifyTask(task.id)}
              />
            ))}
            {historyTasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Verified tasks will appear here
              </div>
            )}
          </DroppableColumn>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-card rounded-lg border-2 border-brand-500 p-4 shadow-lg opacity-90">
              <div className="flex items-start gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{activeTask.title}</h4>
                  {activeTask.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeTask.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      )}
        </TabsContent>

        <TabsContent value="polls" className="flex-1">
          <LabPollPanel
            polls={polls || []}
            currentUserProfile={currentUserProfile}
            people={people || []}
            onCreatePoll={handleCreatePoll}
            onRespondToPoll={handleRespondToPoll}
            onDeletePoll={handleDeletePoll}
          />
        </TabsContent>
      </Tabs>

      <DayToDayTaskEditDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingTask(null)
        }}
        task={editingTask}
        people={people}
        allProfiles={allProfiles || []}
        currentUserProfile={currentUserProfile}
        projects={allProjects}
        workpackages={allWorkpackages}
        onSave={onUpdateTask}
      />
    </div>
  )
}
