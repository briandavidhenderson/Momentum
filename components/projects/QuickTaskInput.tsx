import { useState, KeyboardEvent } from "react"
import { Deliverable, ProjectTask, ImportanceLevel, PersonProfile } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { TaskCreationDialog } from "./TaskCreationDialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface QuickTaskInputProps {
    deliverable: Deliverable
    workpackageId: string
    availableOwners?: PersonProfile[]
}

export function QuickTaskInput({ deliverable, workpackageId, availableOwners = [] }: QuickTaskInputProps) {
    const { toast } = useToast()
    const [taskName, setTaskName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [showFullDialog, setShowFullDialog] = useState(false)
    const [assigneeId, setAssigneeId] = useState<string>("")
    const [dueDate, setDueDate] = useState<string>("")
    const { currentUser, currentUserProfile } = useAuth()
    const { handleUpdateDeliverableTasks, workpackages, handleUpdateWorkpackage, handleUpdateDeliverable } = useAppContext()

    // Global debug logger removed


    const addDays = (date: Date, days: number): Date => {
        const result = new Date(date)
        result.setDate(result.getDate() + days)
        return result
    }

    const createTask = async (data: Partial<ProjectTask>) => {
        if (!currentUser) {
            return;
        }

        setIsCreating(true)

        try {
            // Smart defaults
            const now = new Date()
            const endDate = data.end || (dueDate
                ? new Date(dueDate)
                : deliverable.dueDate
                    ? new Date(deliverable.dueDate)
                    : addDays(now, 2))

            // Build task object
            const newTask: any = {
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: data.name || taskName.trim(),
                start: data.start || now,
                end: endDate,
                progress: data.progress || 0,
                status: data.status || "not-started",
                deliverableId: deliverable.id,
                workpackageId: workpackageId, // Added workpackageId
                importance: data.importance || "medium",
                notes: data.notes || "",
                primaryOwner: data.primaryOwner || assigneeId || (currentUserProfile?.id ? currentUserProfile.id : undefined),
                helpers: data.helpers || [],
                todos: [],
                dependencies: []
            }

            // Update Workpackage (Legacy/Current View Model)
            const workpackage = workpackages.find(wp => wp.id === workpackageId)
            if (workpackage && handleUpdateWorkpackage) {
                const currentWpTasks = workpackage.tasks || []
                await handleUpdateWorkpackage(workpackageId, {
                    tasks: [...currentWpTasks, newTask]
                })
            }

            // Update Deliverable (Linkage)
            if (handleUpdateDeliverable) {
                const currentDelivTaskIds = deliverable.projectTaskIds || []
                await handleUpdateDeliverable(deliverable.id, {
                    projectTaskIds: [...currentDelivTaskIds, newTask.id]
                })
            }

            // Also try the original method just in case, but catch error
            if (handleUpdateDeliverableTasks) {
                try {
                    const currentTasks = (deliverable as any).tasks || []
                    await handleUpdateDeliverableTasks(deliverable.id, [...currentTasks, newTask])
                } catch (e) {
                    console.warn("Legacy update failed, ignoring", e)
                }
            }

            // Clear input
            setTaskName("")
        } catch (error) {
            console.error("Error creating task:", error)
            toast({
                title: "Creation Failed",
                description: "Failed to create task. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleQuickCreate = async () => {
        if (!taskName.trim()) return
        await createTask({
            name: taskName.trim(),
            primaryOwner: assigneeId || undefined,
            end: dueDate ? new Date(dueDate) : undefined,
        })
        setAssigneeId("")
        setDueDate("")
    }



    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (e.shiftKey) {
                // Shift+Enter: Open full dialog
                e.preventDefault()
                setShowFullDialog(true)
            } else {
                // Enter: Quick create
                e.preventDefault()
                handleQuickCreate()
            }
        }
    }

    const handleFullDialogCreate = async (taskData: Partial<ProjectTask> & { deliverableId: string }) => {

        await createTask(taskData)
        setShowFullDialog(false)
    }

    return (
        <div className="space-y-3">
            {/* DEBUG OVERLAY REMOVED */}

            <div className="flex items-center gap-2 w-full">
                <Input
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a task..."
                    className="flex-1 text-sm h-9"
                    disabled={isCreating}
                />
                <select
                    className="h-9 border rounded px-2 text-sm"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                >
                    <option value="">Assignee</option>
                    {availableOwners.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.firstName} {p.lastName}
                        </option>
                    ))}
                </select>
                <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 w-36"
                />
                <Button
                    size="sm"
                    onClick={handleQuickCreate}
                    disabled={!taskName.trim() || isCreating}
                    className="h-9 px-3 bg-brand-500 hover:bg-brand-600 text-white"
                >
                    {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {showFullDialog && (
                <TaskCreationDialog
                    open={showFullDialog}
                    onOpenChange={setShowFullDialog}
                    deliverableId={deliverable.id}
                    onCreateTask={handleFullDialogCreate}
                    initialTaskName={taskName}
                    availablePeople={availableOwners}
                />
            )}
        </div>
    )
}
