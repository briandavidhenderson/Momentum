"use client"

import { Deliverable, PersonProfile, HydratedDeliverable } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { User, Calendar, Target, AlertCircle, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatStatusLabel } from "@/lib/utils/statusStyles"

interface DeliverableListProps {
    workPackageId: string | null
    deliverables: Deliverable[]
    selectedDeliverableId: string | null
    onSelectDeliverable: (delivId: string) => void
    onDeliverableClick?: (deliverable: Deliverable) => void
    onAdd?: () => void
}

export function DeliverableList({
    workPackageId,
    deliverables,
    selectedDeliverableId,
    onSelectDeliverable,
    onDeliverableClick,
    onAdd,
}: DeliverableListProps) {
    const { allProfiles, workpackages } = useAppContext()

    const getOwner = (ownerId?: string): PersonProfile | undefined => {
        return allProfiles.find((p) => p.id === ownerId)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "not-started":
                return "bg-gray-100 text-gray-700"
            case "in-progress":
                return "bg-blue-100 text-blue-700"
            case "at-risk":
                return "bg-orange-100 text-orange-700"
            case "completed":
                return "bg-green-100 text-green-700"
            case "on-hold":
                return "bg-yellow-100 text-yellow-700"
            case "blocked":
                return "bg-red-100 text-red-700"
            default:
                return "bg-gray-100 text-gray-700"
        }
    }

    const getImportanceColor = (importance: string) => {
        switch (importance) {
            case "low":
                return "border-gray-300"
            case "medium":
                return "border-blue-300"
            case "high":
                return "border-orange-400"
            case "critical":
                return "border-red-500"
            default:
                return "border-gray-300"
        }
    }

    // Calculate progress from tasks
    const calculateProgress = (deliverable: Deliverable): number => {
        // Cast to HydratedDeliverable to access nested tasks
        const hydratedDeliverable = deliverable as unknown as HydratedDeliverable

        if (!hydratedDeliverable.tasks || hydratedDeliverable.tasks.length === 0) {
            return deliverable.progress || 0
        }

        const deliverableTasks = hydratedDeliverable.tasks
        const completedTasks = deliverableTasks.filter((task) => task.status === "done")

        return Math.round((completedTasks.length / deliverableTasks.length) * 100)
    }

    // Check if any tasks are blocked or at-risk
    const hasWarnings = (deliverable: Deliverable): boolean => {
        // Cast to HydratedDeliverable to access nested tasks
        const hydratedDeliverable = deliverable as unknown as HydratedDeliverable

        if (!hydratedDeliverable.tasks) return false

        return hydratedDeliverable.tasks.some(
            (task) => task.status === "blocked" || task.status === "at-risk"
        )
    }

    if (!workPackageId) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <h3 className="text-sm font-semibold mb-1">Select a Work Package</h3>
                    <p className="text-xs text-muted-foreground">
                        Choose a work package from the left to view its deliverables.
                    </p>
                </div>
            </div>
        )
    }

    if (deliverables.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <h3 className="text-sm font-semibold mb-1">No Deliverables</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        Create a deliverable to track specific outcomes and milestones.
                    </p>
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700 transition-colors"
                        >
                            Create Deliverable
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-surface-2 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">Deliverables</h2>
                    <p className="text-xs text-muted-foreground">{deliverables.length} total</p>
                </div>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="p-1 hover:bg-surface-3 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Add Deliverable"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                    {deliverables.map((deliverable) => {
                        const owner = getOwner(deliverable.ownerId)
                        const isSelected = deliverable.id === selectedDeliverableId
                        const progress = calculateProgress(deliverable)
                        const showWarning = hasWarnings(deliverable)

                        return (
                            <button
                                key={deliverable.id}
                                onClick={() => onSelectDeliverable(deliverable.id)}
                                onDoubleClick={() => onDeliverableClick?.(deliverable)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border-2 transition-all",
                                    "hover:bg-surface-2 hover:border-brand-300",
                                    "focus:outline-none focus:ring-2 focus:ring-brand-500",
                                    isSelected
                                        ? "bg-brand-50 border-brand-500 shadow-sm"
                                        : cn("bg-background", getImportanceColor(deliverable.importance))
                                )}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
                                            {deliverable.name}
                                        </h3>
                                        {showWarning && (
                                            <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <Badge className={cn("text-xs", getStatusColor(deliverable.status))}>
                                        {formatStatusLabel(deliverable.status)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {deliverable.importance}
                                    </Badge>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted-foreground">Progress</span>
                                        <span className="text-xs font-semibold text-foreground">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-1.5" />
                                </div>

                                {/* Meta Information */}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {owner && (
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="truncate">
                                                {owner.firstName} {owner.lastName}
                                            </span>
                                        </div>
                                    )}
                                    {deliverable.dueDate && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {new Date(deliverable.dueDate).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
