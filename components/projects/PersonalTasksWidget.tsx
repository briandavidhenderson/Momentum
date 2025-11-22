"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAppContext } from "@/lib/AppContext"
import { MasterProject, Workpackage, Task, Subtask } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ListTodo,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  FolderKanban,
  ChevronRight,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface PersonalTask {
  id: string
  title: string
  projectName: string
  workpackageName?: string
  dueDate?: Date
  status: string
  progress?: number
  type: 'task' | 'subtask'
  taskId: string
  workpackageId: string
  projectId: string
}

export function PersonalTasksWidget() {
  const { currentUserProfile } = useAuth()
  const { projects, workpackages: allWorkpackages } = useAppContext()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")

  // Extract all tasks assigned to current user
  const personalTasks = useMemo((): PersonalTask[] => {
    if (!currentUserProfile || !projects || !allWorkpackages) return []

    const tasks: PersonalTask[] = []

    projects.forEach(project => {
      const projectWorkpackages = allWorkpackages.filter(wp => wp.projectId === project.id)

      projectWorkpackages.forEach(workpackage => {
        // Check legacy tasks structure
        if (workpackage.tasks && Array.isArray(workpackage.tasks)) {
          workpackage.tasks.forEach((task: Task) => {
            const isHelper = task.helpers?.includes(currentUserProfile.id)
            const isOwner = task.primaryOwner === currentUserProfile.id

            if (isHelper || isOwner) {
              tasks.push({
                id: `task-${task.id}`,
                title: task.name,
                projectName: project.name,
                workpackageName: workpackage.name,
                dueDate: task.end ? new Date(task.end) : undefined,
                status: task.status || 'not-started',
                progress: task.progress,
                type: 'task',
                taskId: task.id,
                workpackageId: workpackage.id,
                projectId: project.id,
              })
            }

            // Check subtasks
            if (task.subtasks) {
              task.subtasks.forEach((subtask: Subtask) => {
                const isSubtaskHelper = subtask.helpers?.includes(currentUserProfile.id)
                const isSubtaskOwner = subtask.ownerId === currentUserProfile.id

                if (isSubtaskHelper || isSubtaskOwner) {
                  tasks.push({
                    id: `subtask-${subtask.id}`,
                    title: `${task.name} → ${subtask.name}`,
                    projectName: project.name,
                    workpackageName: workpackage.name,
                    dueDate: subtask.end ? new Date(subtask.end) : undefined,
                    status: subtask.status || 'not-started',
                    progress: subtask.progress,
                    type: 'subtask',
                    taskId: task.id,
                    workpackageId: workpackage.id,
                    projectId: project.id,
                  })
                }
              })
            }
          })
        }
      })
    })

    return tasks
  }, [currentUserProfile, projects, allWorkpackages])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = personalTasks

    // Filter by project
    if (projectFilter !== "all") {
      filtered = filtered.filter(task => task.projectId === projectFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => {
        if (statusFilter === "active") {
          return task.status !== "done" && task.status !== "completed"
        } else if (statusFilter === "completed") {
          return task.status === "done" || task.status === "completed"
        } else if (statusFilter === "overdue") {
          const now = new Date()
          return (
            task.dueDate &&
            task.dueDate < now &&
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
        task =>
          task.title.toLowerCase().includes(term) ||
          task.projectName.toLowerCase().includes(term) ||
          task.workpackageName?.toLowerCase().includes(term)
      )
    }

    // Sort by due date (overdue first, then by date)
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1

      const now = new Date()
      const aOverdue = a.dueDate < now && a.status !== "done" && a.status !== "completed"
      const bOverdue = b.dueDate < now && b.status !== "done" && b.status !== "completed"

      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1

      return a.dueDate.getTime() - b.dueDate.getTime()
    })
  }, [personalTasks, projectFilter, statusFilter, searchTerm])

  const activeCount = personalTasks.filter(
    t => t.status !== "done" && t.status !== "completed"
  ).length
  const overdueCount = personalTasks.filter(
    t =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== "done" &&
      t.status !== "completed"
  ).length

  const getStatusIcon = (status: string) => {
    if (status === "done" || status === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    } else if (status === "in-progress") {
      return <Clock className="h-4 w-4 text-blue-600" />
    } else {
      return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const formatDueDate = (dueDate?: Date) => {
    if (!dueDate) return null

    const now = new Date()
    const isOverdue = dueDate < now

    return (
      <div className="flex items-center gap-1 text-xs">
        <Calendar className="h-3 w-3" />
        <span className={isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
          {isOverdue
            ? `Overdue ${formatDistanceToNow(dueDate, { addSuffix: true })}`
            : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`}
        </span>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          My Tasks
        </CardTitle>
        <CardDescription>
          Tasks assigned to you across all projects
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{activeCount}</div>
            <div className="text-xs text-blue-600">Active</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-700">{overdueCount}</div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2 mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.slice(0, 10).map(task => (
                <div
                  key={task.id}
                  className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.type === 'subtask' && (
                          <Badge variant="outline" className="text-xs">Subtask</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <FolderKanban className="h-3 w-3" />
                        <span className="truncate">
                          {task.projectName}
                          {task.workpackageName && ` › ${task.workpackageName}`}
                        </span>
                      </div>
                      {formatDueDate(task.dueDate)}
                      {task.progress !== undefined && (
                        <div className="mt-1">
                          <Progress value={task.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Showing 10 of {filteredTasks.length} tasks
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

