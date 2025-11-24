"use client"

import { useState } from "react"
import { MasterProject, Workpackage, Deliverable, PersonProfile, Task } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkpackageCard } from "./WorkpackageCard"
import {
  FolderKanban,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Users,
  Package,
  Target,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
} from "lucide-react"
import { calculateProjectHealth, getHealthStatusColor, ProjectHealth } from "@/lib/utils/projectHealth"
import { ProjectBudgetSummary, formatCurrency, getBudgetStatusColor } from "@/lib/utils/budgetCalculation"

interface ProjectCardProps {
  project: MasterProject
  workpackages: Workpackage[]
  deliverables: Deliverable[]
  people: PersonProfile[]
  budgetSummary?: ProjectBudgetSummary
  health?: ProjectHealth
  onViewProject?: (project: MasterProject) => void
  onCreateWorkpackage?: (projectId: string) => void
  onEditWorkpackage?: (workpackage: Workpackage) => void
  onDeleteWorkpackage?: (workpackageId: string) => void
  onCreateDeliverable?: (workpackageId: string) => void
  onEditDeliverable?: (deliverable: Deliverable) => void
  onDeleteDeliverable?: (deliverableId: string) => void
  onDeliverableClick?: (deliverable: Deliverable) => void
  onCreateTask?: (deliverableId: string) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
}

export function ProjectCard({
  project,
  workpackages,
  deliverables,
  people,
  budgetSummary,
  health,
  onViewProject,
  onCreateWorkpackage,
  onEditWorkpackage,
  onDeleteWorkpackage,
  onCreateDeliverable,
  onEditDeliverable,
  onDeleteDeliverable,
  onDeliverableClick,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(project.isExpanded ?? false)

  // Get project workpackages
  const projectWorkpackages = workpackages.filter(wp => project.workpackageIds.includes(wp.id))

  // Determine if project is funded
  const isFunded = (project.type || "unfunded") === "funded"

  // Get health icon
  const getHealthIcon = () => {
    if (!health) return null
    switch (health.status) {
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'at-risk':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-700 border-blue-300"
      case "completed":
        return "bg-green-100 text-green-700 border-green-300"
      case "on-hold":
        return "bg-yellow-100 text-yellow-700 border-yellow-300"
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Expand/Collapse Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mt-1 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {/* Project Icon */}
            <FolderKanban className="h-5 w-5 text-brand-500 mt-1 flex-shrink-0" />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                <Badge
                  variant="outline"
                  className={isFunded ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-700 border-gray-300"}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {isFunded ? "Funded" : "Unfunded"}
                </Badge>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
                {health && (
                  <Badge className={getHealthStatusColor(health.status)}>
                    {getHealthIcon()}
                    <span className="ml-1 capitalize">{health.status.replace('-', ' ')}</span>
                  </Badge>
                )}
              </div>

              {/* Funding Source */}
              {isFunded && project.funderName && (
                <p className="text-sm text-muted-foreground mb-2">
                  Funded by: {project.funderName}
                  {project.grantName && ` • ${project.grantName}`}
                </p>
              )}

              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {projectWorkpackages.length} work package{projectWorkpackages.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {deliverables.filter(d => projectWorkpackages.some(wp => wp.id === d.workpackageId)).length} deliverable{deliverables.filter(d => projectWorkpackages.some(wp => wp.id === d.workpackageId)).length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {project.teamMemberIds?.length || 0} team member{(project.teamMemberIds?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onViewProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewProject(project)
                  }}
                  title="View project details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-2" />
        </div>

        {/* Budget Visualization (for funded projects) */}
        {isFunded && budgetSummary && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Utilization</span>
              <span className="text-sm font-semibold">
                {formatCurrency(budgetSummary.spentAmount + budgetSummary.committedAmount, budgetSummary.currency)} / {formatCurrency(budgetSummary.totalBudget, budgetSummary.currency)}
              </span>
            </div>
            <div className="relative">
              <Progress
                value={budgetSummary.utilizationPercentage}
                className={`h-2 ${getBudgetStatusColor(budgetSummary.utilizationPercentage)}`}
              />
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <span>Spent: {formatCurrency(budgetSummary.spentAmount, budgetSummary.currency)}</span>
                <span>Committed: {formatCurrency(budgetSummary.committedAmount, budgetSummary.currency)}</span>
                <span>Remaining: {formatCurrency(budgetSummary.remainingBudget, budgetSummary.currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Health Issues */}
        {health && health.issues.length > 0 && !isExpanded && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>{health.issues.length} issue{health.issues.length !== 1 ? 's' : ''} need attention</span>
          </div>
        )}
      </CardHeader>

      {/* Expanded Content - Work Packages */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <div className="border-t border-gray-200 mb-4" />

          {/* Health Issues (expanded view) */}
          {health && health.issues.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-900">Issues Requiring Attention</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
                {health.issues.slice(0, 5).map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
                {health.issues.length > 5 && (
                  <li className="text-red-600 font-medium">...and {health.issues.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Project Description */}
          {project.description && (
            <div className="mb-4 bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">{project.description}</p>
            </div>
          )}

          {/* Work Packages Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Work Packages</h4>
              {onCreateWorkpackage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateWorkpackage(project.id)}
                >
                  <Package className="h-3.5 w-3.5 mr-1" />
                  Add Work Package
                </Button>
              )}
            </div>

            {projectWorkpackages.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md border border-dashed border-gray-300">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No work packages yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add work packages to organize project work
                </p>
                {onCreateWorkpackage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateWorkpackage(project.id)}
                    className="mt-3"
                  >
                    <Package className="h-3.5 w-3.5 mr-1" />
                    Add First Work Package
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {projectWorkpackages.map(workpackage => {
                  const wpDeliverables = deliverables.filter(d => d.workpackageId === workpackage.id)
                  return (
                    <WorkpackageCard
                      key={workpackage.id}
                      workpackage={workpackage}
                      deliverables={wpDeliverables}
                      people={people}
                      onEditWorkpackage={onEditWorkpackage}
                      onCreateDeliverable={onCreateDeliverable}
                      onEditDeliverable={onEditDeliverable}
                      onDeleteDeliverable={onDeleteDeliverable}
                      onDeliverableClick={onDeliverableClick}
                      onCreateTask={onCreateTask}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

