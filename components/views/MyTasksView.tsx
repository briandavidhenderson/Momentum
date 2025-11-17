"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useProjects } from "@/lib/hooks/useProjects"
import { useAppContext } from "@/lib/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Calendar, CheckCircle2, Circle, Clock, ListTodo, FolderKanban, Loader2 } from "lucide-react"
import { Task, Workpackage, MasterProject } from "@/lib/types"
import { DayToDayTask, TaskStatus } from "@/lib/dayToDayTypes"

type TaskSource = "daytoday" | "project" | "all"
type TaskFilter = "all" | "active" | "completed" | "overdue"

interface UnifiedTask {
  id: string
  title: string
  description?: string
  dueDate?: Date
  status: string
  importance?: string
  source: "daytoday" | "project"
  projectName?: string
  workpackageName?: string
  progress?: number
  helpers?: string[]
  primaryOwner?: string
}

export function MyTasksView() {
  const { currentUserProfile } = useAuth()
  const { projects, workpackages: allWorkpackages } = useProjects()
  const { dayToDayTasks } = useAppContext()

  const [searchTerm, setSearchTerm] = useState("")
  const [sourceFilter, setSourceFilter] = useState<TaskSource>("all")
  const [statusFilter, setStatusFilter] = useState<TaskFilter>("active")

  // Simple loading check - if we have no profile yet, still loading
  const isLoading = !currentUserProfile

  // Combine all tasks from both sources
  const allTasks = useMemo((): UnifiedTask[] => {
    const tasks: UnifiedTask[] = []

    // Add day-to-day tasks
    if (dayToDayTasks && currentUserProfile) {
      const myDayToDayTasks = dayToDayTasks.filter(
        (task) => task.assigneeId === currentUserProfile.id
      )

      myDayToDayTasks.forEach((task) => {
        tasks.push({
          id: `dt-${task.id}`,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          importance: task.importance,
          source: "daytoday",
        })
      })
    }

    // Add project tasks
    if (projects && allWorkpackages && currentUserProfile) {
      projects.forEach((project) => {
        const projectWorkpackages = allWorkpackages.filter(
          (wp) => wp.projectId === project.id
        )

        projectWorkpackages.forEach((workpackage) => {
          if (workpackage.tasks) {
            workpackage.tasks.forEach((task) => {
              // Check if user is assigned as helper or primary owner
              const isHelper = task.helpers?.includes(currentUserProfile.id)
              const isOwner = task.primaryOwner === currentUserProfile.id

              if (isHelper || isOwner) {
                tasks.push({
                  id: `pt-${task.id}`,
                  title: task.name,
                  description: task.notes,
                  dueDate: task.end,
                  status: task.status || "not-started",
                  importance: task.importance,
                  source: "project",
                  projectName: project.name,
                  workpackageName: workpackage.name,
                  progress: task.progress,
                  helpers: task.helpers,
                  primaryOwner: task.primaryOwner,
                })
              }

              // Check subtasks
              if (task.subtasks) {
                task.subtasks.forEach((subtask) => {
                  const isSubtaskHelper = subtask.helpers?.includes(currentUserProfile.id)
                  const isSubtaskOwner = subtask.ownerId === currentUserProfile.id

                  if (isSubtaskHelper || isSubtaskOwner) {
                    tasks.push({
                      id: `st-${subtask.id}`,
                      title: `${task.name} → ${subtask.name}`,
                      description: subtask.notes,
                      dueDate: subtask.end,
                      status: subtask.status,
                      importance: task.importance, // Subtasks inherit importance from parent task
                      source: "project",
                      projectName: project.name,
                      workpackageName: workpackage.name,
                      progress: subtask.progress,
                      helpers: subtask.helpers,
                      primaryOwner: subtask.ownerId,
                    })
                  }
                })
              }
            })
          }
        })
      })
    }

    return tasks
  }, [dayToDayTasks, projects, allWorkpackages, currentUserProfile])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = allTasks

    // Filter by source
    if (sourceFilter !== "all") {
      filtered = filtered.filter((task) => task.source === sourceFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter((task) => {
        if (statusFilter === "active") {
          return task.status !== "done" && task.status !== "completed"
        } else if (statusFilter === "completed") {
          return task.status === "done" || task.status === "completed"
        } else if (statusFilter === "overdue") {
          return (
            task.dueDate &&
            new Date(task.dueDate) < now &&
            task.status !== "done" &&
            task.status !== "completed"
          )
        }
        return true
      })
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(term) ||
          task.description?.toLowerCase().includes(term) ||
          task.projectName?.toLowerCase().includes(term) ||
          task.workpackageName?.toLowerCase().includes(term)
      )
    }

    // Sort by due date (tasks without due dates at the end)
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [allTasks, sourceFilter, statusFilter, searchTerm])

  const getStatusIcon = (status: string) => {
    if (status === "done" || status === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    } else if (status === "in-progress") {
      return <Clock className="h-4 w-4 text-blue-600" />
    } else {
      return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getImportanceBadge = (importance?: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    }

    if (!importance) return null

    return (
      <Badge className={`text-xs ${colors[importance] || colors.medium}`} variant="secondary">
        {importance.charAt(0).toUpperCase() + importance.slice(1)}
      </Badge>
    )
  }

  const formatDueDate = (dueDate?: Date) => {
    if (!dueDate) return null

    const date = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const isOverdue = diffDays < 0
    const isDueSoon = diffDays >= 0 && diffDays <= 3

    return (
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : isDueSoon ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
          {isOverdue
            ? `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`
            : isDueSoon
            ? `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`
            : date.toLocaleDateString()}
        </span>
      </div>
    )
  }

  const activeCount = allTasks.filter((t) => t.status !== "done" && t.status !== "completed").length
  const completedCount = allTasks.filter((t) => t.status === "done" || t.status === "completed").length
  const overdueCount = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "completed"
  ).length

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Your Tasks</h3>
          <p className="text-sm text-muted-foreground">
            Gathering tasks from projects and day-to-day work...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            My Tasks
          </CardTitle>
          <CardDescription>
            All tasks assigned to you from day-to-day and project work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{activeCount}</div>
              <div className="text-xs text-blue-600">Active Tasks</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{completedCount}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
              <div className="text-xs text-red-600">Overdue</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Source:</span>
              </div>
              <Button
                variant={sourceFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("all")}
                className={sourceFilter === "all" ? "bg-brand-500 text-white" : ""}
              >
                All
              </Button>
              <Button
                variant={sourceFilter === "daytoday" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("daytoday")}
                className={sourceFilter === "daytoday" ? "bg-brand-500 text-white" : ""}
              >
                Day-to-Day
              </Button>
              <Button
                variant={sourceFilter === "project" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("project")}
                className={sourceFilter === "project" ? "bg-brand-500 text-white" : ""}
              >
                Projects
              </Button>

              <div className="border-l mx-2" />

              <span className="text-sm font-medium">Status:</span>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={statusFilter === "all" ? "bg-brand-500 text-white" : ""}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className={statusFilter === "active" ? "bg-brand-500 text-white" : ""}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
                className={statusFilter === "completed" ? "bg-brand-500 text-white" : ""}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === "overdue" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("overdue")}
                className={statusFilter === "overdue" ? "bg-brand-500 text-white" : ""}
              >
                Overdue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ListTodo className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search or filters"
                  : statusFilter === "active"
                  ? "You have no active tasks assigned"
                  : statusFilter === "completed"
                  ? "You have no completed tasks"
                  : statusFilter === "overdue"
                  ? "You have no overdue tasks"
                  : "You have no tasks assigned"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{task.title}</h3>
                        {task.source === "project" ? (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            Project
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Day-to-Day
                          </Badge>
                        )}
                        {getImportanceBadge(task.importance)}
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.projectName && (
                          <div className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            <span>
                              {task.projectName}
                              {task.workpackageName && ` › ${task.workpackageName}`}
                            </span>
                          </div>
                        )}
                        {formatDueDate(task.dueDate)}
                        {task.progress !== undefined && (
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span>{task.progress}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredTasks.length > 0 && (
        <div className="text-center text-sm text-muted-foreground py-4">
          Showing {filteredTasks.length} of {allTasks.length} task{allTasks.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  )
}
