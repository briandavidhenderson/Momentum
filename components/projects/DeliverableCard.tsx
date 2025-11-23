"use client"

import { useState } from "react"
import { Deliverable, PersonProfile, Task } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskCard } from "./TaskCard"
import {
  Target,
  Edit,
  Trash2,
  Calendar,
  User,
  MoreVertical,
  Package,
  ListTodo,
  FlaskConical,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react"
import { formatStatusLabel, getStatusPillClass } from "@/lib/utils/statusStyles"

interface DeliverableCardProps {
  deliverable: Deliverable
  owner?: PersonProfile
  tasks?: Task[] // Legacy tasks from workpackage
  allPeople?: PersonProfile[] // For displaying task owners/helpers
  onEdit: (deliverable: Deliverable) => void
  onDelete: (deliverableId: string) => void
  onClick?: (deliverable: Deliverable) => void
  onCreateTask?: (deliverableId: string) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
  enableDrag?: boolean // Make drag optional
}

export function DeliverableCard({
  deliverable,
  owner,
  tasks = [],
  allPeople = [],
  onEdit,
  onDelete,
  onClick,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  enableDrag = false,
}: DeliverableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter tasks that might be related to this deliverable
  // In legacy structure, tasks are in workpackages, so we show all tasks if provided
  const deliverableTasks = Array.isArray(tasks) 
    ? tasks.filter(task => task && task.id && typeof task.id === 'string')
    : []
  
  // Get people for task owners/helpers
  const getPersonById = (id?: string): PersonProfile | undefined => {
    if (!id || !allPeople || allPeople.length === 0) return undefined
    return allPeople.find(p => p?.id === id)
  }

  const getImportanceBadgeColor = (importance: string) => {
    switch (importance) {
      case "low":
        return "bg-gray-100 text-gray-700 border-gray-300"
      case "medium":
        return "bg-blue-100 text-blue-700 border-blue-300"
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-300"
      case "critical":
        return "bg-red-100 text-red-700 border-red-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons or dropdown
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="menuitem"]')) {
      return
    }
    try {
      if (onClick) {
        onClick(deliverable)
      }
    } catch (error) {
      console.error("Error handling deliverable click:", error)
    }
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // Calculate linked entity counts
  const linkedOrdersCount = deliverable.linkedOrderIds?.length || 0
  const linkedTasksCount = deliverable.linkedDayToDayTaskIds?.length || 0
  const linkedExperimentsCount = deliverable.linkedELNExperimentIds?.length || 0
  const projectTasksCount = deliverable.projectTaskIds?.length || 0
  const blockersCount = deliverable.blockers?.length || 0

  // Safety check - ensure deliverable is valid
  if (!deliverable || !deliverable.id) {
    console.warn("Invalid deliverable passed to DeliverableCard:", deliverable)
    return null
  }

  return (
    <div
      className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
    >
      {/* Header with Title, Status, and Menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand/Collapse for tasks */}
          {deliverableTasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={handleExpandClick}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-foreground text-sm truncate cursor-pointer"
              onClick={handleCardClick}
            >
              {deliverable.name || "Unnamed Deliverable"}
            </h3>
            {deliverable.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {deliverable.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={getStatusPillClass(deliverable.status || "not-started")}>
            {formatStatusLabel(deliverable.status || "not-started")}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  try {
                    onEdit(deliverable)
                  } catch (error) {
                    console.error("Error editing deliverable:", error)
                  }
                }}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  try {
                    if (deliverable?.id) {
                      onDelete(deliverable.id)
                    }
                  } catch (error) {
                    console.error("Error deleting deliverable:", error)
                  }
                }}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs font-semibold text-gray-700">
            {deliverable.progress || 0}%
          </span>
        </div>
        <Progress value={deliverable.progress || 0} className="h-2" />
      </div>

      {/* Metadata Section */}
      <div className="space-y-2 mb-3 text-sm">
        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-900 truncate">
              {owner.firstName} {owner.lastName}
            </span>
          </div>
        )}

        {/* Due Date */}
        {deliverable.dueDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-gray-700">
              Due: {(() => {
                try {
                  const date = new Date(deliverable.dueDate)
                  if (isNaN(date.getTime())) return "Invalid date"
                  return date.toLocaleDateString()
                } catch {
                  return "Invalid date"
                }
              })()}
            </span>
          </div>
        )}

        {/* Importance Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={getImportanceBadgeColor(deliverable.importance || "medium")}
          >
            {(deliverable.importance || "medium").toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Linked Entities Summary */}
      <div className="flex items-center gap-3 text-xs text-gray-600 pt-3 border-t border-gray-200">
        {linkedOrdersCount > 0 && (
          <div className="flex items-center gap-1" title="Linked Orders">
            <Package className="h-3.5 w-3.5" />
            <span>{linkedOrdersCount}</span>
          </div>
        )}
        {projectTasksCount > 0 && (
          <div className="flex items-center gap-1" title="Project Tasks">
            <ListTodo className="h-3.5 w-3.5" />
            <span>{projectTasksCount}</span>
          </div>
        )}
        {linkedTasksCount > 0 && (
          <div className="flex items-center gap-1" title="Day-to-Day Tasks">
            <ListTodo className="h-3.5 w-3.5 text-blue-500" />
            <span>{linkedTasksCount}</span>
          </div>
        )}
        {linkedExperimentsCount > 0 && (
          <div className="flex items-center gap-1" title="ELN Experiments">
            <FlaskConical className="h-3.5 w-3.5 text-purple-500" />
            <span>{linkedExperimentsCount}</span>
          </div>
        )}
        {blockersCount > 0 && (
          <div className="flex items-center gap-1 text-red-600" title="Blockers">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{blockersCount}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {deliverable.tags && deliverable.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {deliverable.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
              {tag}
            </Badge>
          ))}
          {deliverable.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              +{deliverable.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Expanded Tasks Section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-foreground">Tasks</h4>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {deliverableTasks.length}
              </Badge>
              {onCreateTask && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    try {
                      if (onCreateTask && deliverable?.id) {
                        onCreateTask(deliverable.id)
                      }
                    } catch (error) {
                      console.error("Error creating task:", error)
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
          {deliverableTasks.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-md border border-dashed border-gray-300">
              <ListTodo className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No tasks yet</p>
              {onCreateTask && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    try {
                      if (onCreateTask && deliverable?.id) {
                        onCreateTask(deliverable.id)
                      }
                    } catch (error) {
                      console.error("Error creating task:", error)
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add First Task
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {deliverableTasks.map((task) => {
                if (!task || !task.id) {
                  console.warn("Invalid task found:", task)
                  return null
                }
                try {
                  const taskOwner = task.primaryOwner ? getPersonById(task.primaryOwner) : undefined
                  const taskHelpers = task.helpers?.map(id => getPersonById(id)).filter((p): p is PersonProfile => p !== undefined) || []
                  return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    owner={taskOwner}
                    helpers={taskHelpers}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onClick={onEditTask}
                  />
                  )
                } catch (error) {
                  console.error("Error rendering task:", error, task)
                  return null
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
