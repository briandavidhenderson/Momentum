
"use client"

import { useState, useEffect } from "react"
import { DayToDayTask, TaskStatus } from "@/lib/dayToDayTypes"
import { ImportanceLevel, Person } from "@/lib/types"
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
import { Plus, GripVertical, Trash2, Edit2, Clock } from "lucide-react"
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { useAppContext } from "@/lib/AppContext"

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
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function DraggableTaskCard({
  task,
  people,
  onEdit,
  onDelete,
}: {
  task: DayToDayTask
  people: Person[]
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const assignee = (people || []).find((p) => p.id === task.assigneeId)

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
      className="group relative bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move"
    >
      <div className="flex items-start gap-3">
        <div {...listeners} {...attributes} className="mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}

            {assignee && (
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: assignee.color }}
                title={assignee.name}
              >
                {assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
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
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: DayToDayTask | null
  people: Person[]
  onSave: (taskId: string, updates: Partial<DayToDayTask>) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [importance, setImportance] = useState<ImportanceLevel>("medium")
  const [assigneeId, setAssigneeId] = useState<string>("")
  const [dueDate, setDueDate] = useState("")

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setImportance(task.importance)
      setAssigneeId(task.assigneeId || "")
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
    } else {
      setTitle("")
      setDescription("")
      setImportance("medium")
      setAssigneeId("")
      setDueDate("")
    }
  }, [task, open])

  const handleSave = () => {
    if (!task || !title.trim()) return

    onSave(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      importance,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })

    onOpenChange(false)
  }

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update your task details below.
          </DialogDescription>
        </DialogHeader>
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
            <Label htmlFor="taskAssignee">Assignee</Label>
            <select
              id="taskAssignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Unassigned</option>
              {(people || []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
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
        </div>
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

export function DayToDayBoard() {
  // Get state and handlers from context
  const {
    dayToDayTasks,
    people,
    handleCreateDayToDayTask: onCreateTask,
    handleUpdateDayToDayTask: onUpdateTask,
    handleDeleteDayToDayTask: onDeleteTask,
    handleMoveDayToDayTask: onMoveTask,
  } = useAppContext()

  const tasks = (dayToDayTasks || []) as DayToDayTask[]

  const [activeTask, setActiveTask] = useState<DayToDayTask | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskImportance, setNewTaskImportance] = useState<ImportanceLevel>("medium")
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [editingTask, setEditingTask] = useState<DayToDayTask | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as DayToDayTask | undefined
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const task = active.data.current?.task as DayToDayTask | undefined
    const overData = over.data.current

    if (!task || !overData) return

    if (overData.type === "column") {
      const newStatus = overData.status as TaskStatus
      if (task.status !== newStatus) {
        try {
          await onMoveTask(task.id, newStatus)
        } catch (error) {
          console.error('Failed to move task:', error)
          // Error is already shown by the hook, just log here
        }
      }
    }
  }

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return

    onCreateTask({
      title: newTaskTitle,
      status: "todo",
      importance: newTaskImportance,
    })

    setNewTaskTitle("")
    setNewTaskImportance("medium")
    setShowNewTaskInput(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Day to Day</h2>
          <p className="text-sm text-muted-foreground">
            Manage your daily tasks and priorities
          </p>
        </div>
        <Button onClick={() => setShowNewTaskInput(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {showNewTaskInput && (
        <div className="mb-4 p-4 bg-card rounded-lg border border-border">
          <Input
            placeholder="Task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTask()
              if (e.key === "Escape") {
                setShowNewTaskInput(false)
                setNewTaskTitle("")
                setNewTaskImportance("medium")
              }
            }}
            autoFocus
            className="mb-3"
          />
          <div className="mb-3">
            <label className="text-sm font-medium mb-2 block">Importance</label>
            <div className="flex gap-1 flex-wrap">
              {(["low", "medium", "high", "critical"] as ImportanceLevel[]).map((level) => {
                const colors: Record<ImportanceLevel, string> = {
                  low: "bg-gray-600 hover:bg-gray-700",
                  medium: "bg-blue-500 hover:bg-blue-600",
                  high: "bg-orange-500 hover:bg-orange-600",
                  critical: "bg-red-500 hover:bg-red-600",
                }
                const isSelected = newTaskImportance === level
                return (
                  <button
                    key={level}
                    onClick={() => setNewTaskImportance(level)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      isSelected
                        ? `${colors[level]} text-white shadow-md`
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateTask}>
              Create
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewTaskInput(false)
                setNewTaskTitle("")
                setNewTaskImportance("medium")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 flex-1">
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
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
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
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
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
                onEdit={() => {
                  setEditingTask(task)
                  setIsEditDialogOpen(true)
                }}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
            {doneTasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Completed tasks will appear here
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

      <DayToDayTaskEditDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingTask(null)
        }}
        task={editingTask}
        people={people}
        onSave={onUpdateTask}
      />
    </div>
  )
}
