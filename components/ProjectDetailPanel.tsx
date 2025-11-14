"use client"

import { useState, useEffect } from "react"
import { MasterProject, Person } from "@/lib/types"
import { DayToDayTask } from "@/lib/dayToDayTypes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  X,
  Calendar,
  Users,
  TrendingUp,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { ImportanceLevel } from "@/lib/types"

interface ProjectDetailPanelProps {
  project: MasterProject | null
  people: Person[]
  onClose: () => void
}

export function ProjectDetailPanel({
  project,
  people,
  onClose,
}: ProjectDetailPanelProps) {
  const {
    dayToDayTasks,
    handleCreateDayToDayTask,
    handleUpdateDayToDayTask,
    handleDeleteDayToDayTask,
  } = useAppContext()

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskImportance, setNewTaskImportance] = useState<ImportanceLevel>("medium")
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("")
  const [newTaskDueDate, setNewTaskDueDate] = useState("")

  if (!project) return null

  // Filter tasks linked to this project
  const projectTasks = (dayToDayTasks || []).filter(
    (task: DayToDayTask) => task.linkedProjectId === project.id
  )

  // Calculate task statistics
  const todoTasks = projectTasks.filter((t) => t.status === "todo")
  const workingTasks = projectTasks.filter((t) => t.status === "working")
  const doneTasks = projectTasks.filter((t) => t.status === "done")
  const completionPercentage =
    projectTasks.length > 0
      ? Math.round((doneTasks.length / projectTasks.length) * 100)
      : 0

  // Get project team members
  const teamMembers = people.filter(
    (p) =>
      project.principalInvestigatorIds?.includes(p.id) ||
      project.coPIIds?.includes(p.id) ||
      project.teamMemberIds?.includes(p.id)
  )

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return

    await handleCreateDayToDayTask({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      status: "todo",
      importance: newTaskImportance,
      assigneeId: newTaskAssigneeId || undefined,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
      linkedProjectId: project.id,
    })

    // Reset form
    setNewTaskTitle("")
    setNewTaskDescription("")
    setNewTaskImportance("medium")
    setNewTaskAssigneeId("")
    setNewTaskDueDate("")
    setIsCreateTaskDialogOpen(false)
  }

  const handleToggleTaskStatus = async (task: DayToDayTask) => {
    const nextStatus =
      task.status === "todo"
        ? "working"
        : task.status === "working"
        ? "done"
        : "todo"

    await handleUpdateDayToDayTask(task.id, { status: nextStatus })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Clock className="h-4 w-4 text-gray-500" />
      case "working":
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const importanceColors = {
    low: "bg-gray-100 text-gray-700 border-gray-300",
    medium: "bg-blue-100 text-blue-700 border-blue-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    critical: "bg-red-100 text-red-700 border-red-300",
  }

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-2">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-4"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant={
                project.status === "active"
                  ? "default"
                  : project.status === "completed"
                  ? "secondary"
                  : "outline"
              }
            >
              {project.status}
            </Badge>
            {project.health && (
              <Badge
                variant={
                  project.health === "good"
                    ? "default"
                    : project.health === "warning"
                    ? "secondary"
                    : "destructive"
                }
              >
                {project.health}
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Task Completion</span>
              <span className="font-semibold">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{doneTasks.length} done</span>
              <span>{workingTasks.length} in progress</span>
              <span>{todoTasks.length} to do</span>
            </div>
          </div>

          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {new Date(project.startDate).toLocaleDateString()} -{" "}
                {new Date(project.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Project Tasks</h3>
            <Button
              size="sm"
              onClick={() => setIsCreateTaskDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          {projectTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks yet for this project.</p>
              <p className="text-sm">Create a task to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projectTasks.map((task) => {
                const assignee = people.find((p) => p.id === task.assigneeId)
                return (
                  <div
                    key={task.id}
                    className="border border-border rounded-lg p-4 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="mt-1"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">
                            {task.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              importanceColors[task.importance]
                            }`}
                          >
                            {task.importance}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {assignee && (
                            <div className="flex items-center gap-1">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: assignee.color }}
                              >
                                {assignee.name.charAt(0)}
                              </div>
                              <span>{assignee.name}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog
        open={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Task for {project.name}</DialogTitle>
            <DialogDescription>
              Add a new task linked to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Importance</Label>
              <div className="flex gap-1 flex-wrap">
                {(["low", "medium", "high", "critical"] as ImportanceLevel[]).map(
                  (level) => {
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
                  }
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">Assignee</Label>
              <select
                id="assignee"
                value={newTaskAssigneeId}
                onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unassigned</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateTaskDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
    </>
  )
}
