"use client"

import { Task, PersonProfile } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface TaskCardProps {
  task: Task
  owner?: PersonProfile
  helpers?: PersonProfile[]
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  onClick?: (task: Task) => void
}

export function TaskCard({
  task,
  owner,
  helpers = [],
  onEdit,
  onDelete,
  onClick,
}: TaskCardProps) {
  const getStatusIcon = (status: string) => {
    if (status === "done" || status === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    } else if (status === "in-progress") {
      return <Clock className="h-4 w-4 text-blue-600" />
    } else {
      return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
      case "completed":
        return "bg-green-100 text-green-700 border-green-300"
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-300"
      case "at-risk":
        return "bg-orange-100 text-orange-700 border-orange-300"
      case "blocked":
        return "bg-red-100 text-red-700 border-red-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  const formatStatusLabel = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const isOverdue = task.end && new Date(task.end) < new Date() && task.status !== "done" && (task.status as string) !== "completed"

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {getStatusIcon(task.status || "not-started")}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium truncate">{task.name}</h4>
              <Badge className={getStatusColor(task.status || "not-started")} variant="outline">
                {formatStatusLabel(task.status || "not-started")}
              </Badge>
            </div>

            {task.notes && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.notes}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {task.end && (
                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  <span>
                    {isOverdue
                      ? `Overdue ${formatDistanceToNow(new Date(task.end), { addSuffix: true })}`
                      : `Due ${formatDistanceToNow(new Date(task.end), { addSuffix: true })}`}
                  </span>
                </div>
              )}
              {owner && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{owner.firstName} {owner.lastName}</span>
                </div>
              )}
            </div>

            {task.progress !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs font-semibold">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-1.5" />
              </div>
            )}

            {helpers && helpers.length > 0 && (
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-500">Helpers:</span>
                {helpers.slice(0, 3).map((helper) => (
                  <Badge key={helper.id} variant="secondary" className="text-xs">
                    {helper.firstName} {helper.lastName}
                  </Badge>
                ))}
                {helpers.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{helpers.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {isOverdue && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                <span>This task is overdue</span>
              </div>
            )}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(task)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(task.id)
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

