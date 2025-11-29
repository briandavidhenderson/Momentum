"use client"

import { useState } from "react"
import { Workpackage, Deliverable, PersonProfile, ProjectTask } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DeliverableCard } from "./DeliverableCard"
import {
  Package,
  ChevronDown,
  ChevronRight,
  Plus,
  Eye,
  Edit2,
  Calendar,
  Target,
  AlertCircle,
} from "lucide-react"
import { formatStatusLabel, getStatusPillClass } from "@/lib/utils/statusStyles"

interface WorkpackageCardProps {
  workpackage: Workpackage
  deliverables: Deliverable[]
  people?: PersonProfile[]
  onViewWorkpackage?: (workpackage: Workpackage) => void
  onEditWorkpackage?: (workpackage: Workpackage) => void
  onCreateDeliverable?: (workpackageId: string) => void
  onEditDeliverable?: (deliverable: Deliverable) => void
  onDeleteDeliverable?: (deliverableId: string) => void
  onDeliverableClick?: (deliverable: Deliverable) => void
  onCreateTask?: (deliverableId: string) => void
  onEditTask?: (task: ProjectTask) => void
  onDeleteTask?: (taskId: string) => void
}

export function WorkpackageCard({
  workpackage,
  deliverables,
  people = [],
  onViewWorkpackage,
  onEditWorkpackage,
  onCreateDeliverable,
  onEditDeliverable,
  onDeleteDeliverable,
  onDeliverableClick,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}: WorkpackageCardProps) {
  const [isExpanded, setIsExpanded] = useState(workpackage.isExpanded ?? false)

  // Calculate deliverable statistics
  const completedDeliverables = deliverables.filter(d => d.status === "done").length
  const inProgressDeliverables = deliverables.filter(d => d.status === "in-progress").length
  const atRiskDeliverables = deliverables.filter(d => d.status === "at-risk" || d.status === "blocked").length

  // Find owner
  const owner = people.find(p => p.id === workpackage.ownerId)

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "at-risk":
        return "destructive"
      case "active":
        return "default"
      default:
        return "secondary"
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Expand/Collapse Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mt-1"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded()
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {/* Icon */}
            <Package className="h-5 w-5 text-gray-600 mt-1 flex-shrink-0" />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg truncate">{workpackage.name}</CardTitle>
                <span className={getStatusPillClass(workpackage.status)}>
                  {formatStatusLabel(workpackage.status || "planning")}
                </span>
              </div>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(workpackage.start).toLocaleDateString()} -{" "}
                  {new Date(workpackage.end).toLocaleDateString()}
                </span>
                {owner && (
                  <span className="flex items-center gap-1">
                    <span>Owner: {owner.firstName} {owner.lastName}</span>
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            {onViewWorkpackage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewWorkpackage(workpackage)
                }}
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEditWorkpackage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditWorkpackage(workpackage)
                }}
                title="Edit workpackage"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar - Always visible */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{workpackage.progress}%</span>
          </div>
          <Progress value={workpackage.progress} className="h-2" />
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}
          </span>
          {completedDeliverables > 0 && (
            <span className="text-green-600 font-medium">
              {completedDeliverables} completed
            </span>
          )}
          {inProgressDeliverables > 0 && (
            <span className="text-blue-600 font-medium">
              {inProgressDeliverables} in progress
            </span>
          )}
          {atRiskDeliverables > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle className="h-3 w-3" />
              {atRiskDeliverables} at risk
            </span>
          )}
        </div>

        {/* Notes (if any) */}
        {workpackage.notes && !isExpanded && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {workpackage.notes}
          </p>
        )}
      </CardHeader>

      {/* Expanded Content - Deliverables */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          {/* Divider */}
          <div className="border-t border-gray-200 mb-4" />

          {/* Notes (expanded view) */}
          {workpackage.notes && (
            <div className="mb-4 bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">{workpackage.notes}</p>
            </div>
          )}

          {/* Deliverables Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">
                Deliverables
              </h4>
              {onCreateDeliverable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateDeliverable(workpackage.id)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Deliverable
                </Button>
              )}
            </div>

            {/* Deliverables List */}
            {deliverables.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md border border-dashed border-gray-300">
                <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No deliverables yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add deliverables to track concrete outcomes
                </p>
                {onCreateDeliverable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateDeliverable(workpackage.id)}
                    className="mt-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add First Deliverable
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {deliverables.map((deliverable) => {
                  if (!deliverable || !deliverable.id) {
                    console.warn("Invalid deliverable found:", deliverable)
                    return null
                  }
                  try {
                    const deliverableOwner = people?.find(p => p?.id === deliverable.ownerId)
                    return (
                      <DeliverableCard
                        key={deliverable.id}
                        deliverable={deliverable}
                        owner={deliverableOwner}
                        onEdit={onEditDeliverable || (() => { })}
                        onDelete={onDeleteDeliverable || (() => { })}
                        onClick={onDeliverableClick}
                        onCreateTask={onCreateTask}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        enableDrag={false}
                      />
                    )
                  } catch (error) {
                    console.error("Error rendering deliverable:", error, deliverable)
                    return null
                  }
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
