"use client"

import { Deliverable, PersonProfile } from "@/lib/types"
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
  Target,
  Edit,
  Trash2,
  Calendar,
  User,
  GripVertical,
  MoreVertical,
  Package,
  ListTodo,
  FlaskConical,
  AlertCircle,
} from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface DeliverableCardProps {
  deliverable: Deliverable
  owner?: PersonProfile
  onEdit: (deliverable: Deliverable) => void
  onDelete: (deliverableId: string) => void
  onClick?: (deliverable: Deliverable) => void
}

export function DeliverableCard({
  deliverable,
  owner,
  onEdit,
  onDelete,
  onClick,
}: DeliverableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deliverable.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case "not-started":
        return "status-pill bg-gray-100 text-gray-700 border-gray-300"
      case "in-progress":
        return "status-pill bg-blue-100 text-blue-700 border-blue-300"
      case "at-risk":
        return "status-pill bg-orange-100 text-orange-700 border-orange-300"
      case "completed":
        return "status-pill bg-green-100 text-green-700 border-green-300"
      case "on-hold":
        return "status-pill bg-yellow-100 text-yellow-700 border-yellow-300"
      case "blocked":
        return "status-pill bg-red-100 text-red-700 border-red-300"
      default:
        return "status-pill"
    }
  }

  const formatStatusLabel = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
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

  const handleCardClick = () => {
    if (onClick) {
      onClick(deliverable)
    }
  }

  // Calculate linked entity counts
  const linkedOrdersCount = deliverable.linkedOrderIds?.length || 0
  const linkedTasksCount = deliverable.linkedDayToDayTaskIds?.length || 0
  const linkedExperimentsCount = deliverable.linkedELNExperimentIds?.length || 0
  const projectTasksCount = deliverable.projectTaskIds?.length || 0
  const blockersCount = deliverable.blockers?.length || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
      onClick={handleCardClick}
    >
      {/* Header with Title, Status, and Menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {deliverable.name}
            </h3>
            {deliverable.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {deliverable.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={getStatusPillClass(deliverable.status)}>
            {formatStatusLabel(deliverable.status)}
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
                  onEdit(deliverable)
                }}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(deliverable.id)
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
            {deliverable.progress}%
          </span>
        </div>
        <Progress value={deliverable.progress} className="h-2" />
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
              Due: {new Date(deliverable.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Importance Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={getImportanceBadgeColor(deliverable.importance)}
          >
            {deliverable.importance.toUpperCase()}
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
    </div>
  )
}
