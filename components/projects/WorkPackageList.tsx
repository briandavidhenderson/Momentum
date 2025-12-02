"use client"

import { Workpackage, PersonProfile } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { User, Calendar, Package, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatStatusLabel } from "@/lib/utils/statusStyles"

interface WorkPackageListProps {
    workpackages: Workpackage[]
    selectedWorkPackageId: string | null
    onSelectWorkPackage: (wpId: string) => void
    onAdd?: () => void
}

export function WorkPackageList({
    workpackages,
    selectedWorkPackageId,
    onSelectWorkPackage,
    onAdd,
}: WorkPackageListProps) {
    const { allProfiles } = useAppContext()

    const getOwner = (ownerId?: string): PersonProfile | undefined => {
        return allProfiles.find((p) => p.id === ownerId)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "planning":
                return "bg-gray-100 text-gray-700"
            case "active":
                return "bg-blue-100 text-blue-700"
            case "at-risk":
                return "bg-orange-100 text-orange-700"
            case "completed":
                return "bg-green-100 text-green-700"
            case "on-hold":
                return "bg-yellow-100 text-yellow-700"
            default:
                return "bg-gray-100 text-gray-700"
        }
    }

    if (workpackages.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <h3 className="text-sm font-semibold mb-1">No Work Packages</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        Create a work package to organize deliverables and tasks.
                    </p>
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700 transition-colors"
                        >
                            Create Work Package
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
                    <h2 className="text-sm font-semibold text-foreground">Work Packages</h2>
                    <p className="text-xs text-muted-foreground">{workpackages.length} total</p>
                </div>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="p-1 hover:bg-surface-3 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Add Work Package"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                    {workpackages.map((wp) => {
                        const owner = getOwner(wp.ownerId)
                        const isSelected = wp.id === selectedWorkPackageId

                        return (
                            <button
                                key={wp.id}
                                onClick={() => onSelectWorkPackage(wp.id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-all",
                                    "hover:bg-surface-2 hover:border-brand-300",
                                    "focus:outline-none focus:ring-2 focus:ring-brand-500",
                                    isSelected
                                        ? "bg-brand-50 border-brand-500 shadow-sm"
                                        : "bg-background border-border"
                                )}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                                        {wp.name}
                                    </h3>
                                    <Badge className={cn("text-xs ml-2 flex-shrink-0", getStatusColor(wp.status))}>
                                        {formatStatusLabel(wp.status)}
                                    </Badge>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted-foreground">Progress</span>
                                        <span className="text-xs font-semibold text-foreground">
                                            {wp.progress}%
                                        </span>
                                    </div>
                                    <Progress value={wp.progress} className="h-1.5" />
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
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {(() => {
                                                try {
                                                    const date = wp.end instanceof Date
                                                        ? wp.end
                                                        : (wp.end as any)?.toDate
                                                            ? (wp.end as any).toDate()
                                                            : new Date(wp.end);

                                                    return isNaN(date.getTime())
                                                        ? 'No date'
                                                        : date.toLocaleDateString(undefined, {
                                                            month: "short",
                                                            day: "numeric",
                                                        });
                                                } catch (e) {
                                                    return 'Invalid date';
                                                }
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
