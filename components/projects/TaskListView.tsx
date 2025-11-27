"use client"

import { Task, Deliverable, PersonProfile } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ListTodo, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuickTaskInput } from "./QuickTaskInput"

interface TaskListViewProps {
    deliverableId: string | null
    deliverable: Deliverable | null | undefined
    tasks: Task[]
    onTaskClick: (task: Task) => void
    workpackageId: string | null
}

export function TaskListView({
    deliverableId,
    deliverable,
    tasks,
    onTaskClick,
    workpackageId,
}: TaskListViewProps) {
    const { allProfiles, handleUpdateWorkpackage } = useAppContext()

    const getOwner = (ownerId?: string): PersonProfile | undefined => {
        return allProfiles.find((p) => p.id === ownerId)
    }

    const getInitials = (profile: PersonProfile): string => {
        return `${profile.firstName[0] || ""}${profile.lastName[0] || ""}`.toUpperCase()
    }

    const handleToggleComplete = async (task: Task, completed: boolean) => {
        if (!workpackageId) return

        await handleUpdateWorkpackage(workpackageId, {
            tasks: tasks.map((t) =>
                t.id === task.id
                    ? {
                        ...t,
                        status: completed ? "done" : "not-started",
                        progress: completed ? 100 : 0,
                    }
                    : t
            ),
        })
    }

    const isOverdue = (endDate: Date): boolean => {
        return new Date(endDate) < new Date()
    }

    const isDueSoon = (endDate: Date): boolean => {
        const daysUntilDue = Math.ceil(
            (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysUntilDue >= 0 && daysUntilDue <= 3
    }

    if (!deliverableId) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <ListTodo className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <h3 className="text-sm font-semibold mb-1">Select a Deliverable</h3>
                    <p className="text-xs text-muted-foreground">
                        Choose a deliverable from the middle column to view its tasks.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-surface-2">
                <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
                <p className="text-xs text-muted-foreground">
                    {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center max-w-xs">
                            <ListTodo className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground">
                                No tasks yet. Add one below to get started.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {tasks.map((task) => {
                            const owner = getOwner(task.primaryOwner)
                            const isCompleted = task.status === "done"
                            const isTaskOverdue = isOverdue(task.end)
                            const isTaskDueSoon = isDueSoon(task.end)

                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-all",
                                        "hover:bg-surface-2 hover:border-brand-300",
                                        "focus:outline-none focus:ring-2 focus:ring-brand-500",
                                        "bg-background border-border",
                                        "flex items-center gap-3"
                                    )}
                                >
                                    {/* Checkbox */}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={isCompleted}
                                            onCheckedChange={(checked) =>
                                                handleToggleComplete(task, checked as boolean)
                                            }
                                            className="border-2"
                                        />
                                    </div>

                                    {/* Task Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className={cn(
                                                "text-sm font-medium mb-1",
                                                isCompleted
                                                    ? "line-through text-muted-foreground"
                                                    : "text-foreground"
                                            )}
                                        >
                                            {task.name}
                                        </h3>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Due Date Badge */}
                                            {task.end && (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs flex items-center gap-1",
                                                        isTaskOverdue && !isCompleted && "bg-red-50 border-red-300 text-red-700",
                                                        isTaskDueSoon && !isCompleted && !isTaskOverdue && "bg-yellow-50 border-yellow-300 text-yellow-700"
                                                    )}
                                                >
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(task.end).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </Badge>
                                            )}

                                            {/* Status Badge for non-standard statuses */}
                                            {task.status && task.status !== "done" && task.status !== "not-started" && (
                                                <Badge variant="outline" className="text-xs">
                                                    {task.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Owner Avatar */}
                                    {owner && (
                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                            <AvatarFallback className="text-xs bg-brand-100 text-brand-700">
                                                {getInitials(owner)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Quick Task Input */}
            {deliverableId && deliverable && workpackageId && (
                <div className="border-t border-border p-3 bg-surface-2">
                    <QuickTaskInput
                        deliverable={deliverable}
                        workpackageId={workpackageId}
                        availableOwners={allProfiles}
                    />
                </div>
            )}
        </div>
    )
}
