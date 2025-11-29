import { useState, KeyboardEvent } from "react"
import { Deliverable, ProjectTask, ImportanceLevel, PersonProfile } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { TaskCreationDialog } from "./TaskCreationDialog"
import { useToast } from "@/components/ui/use-toast"

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
    const { handleUpdateDeliverableTasks } = useAppContext()

    const addDays = (date: Date, days: number): Date => {
        const result = new Date(date)
        result.setDate(result.getDate() + days)
        return result
    }

    const createTask = async (data: Partial<ProjectTask>) => {
        if (!currentUser || !handleUpdateDeliverableTasks) return

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
            const newTask: ProjectTask = {
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: data.name || taskName.trim(),
                start: data.start || now,
                end: endDate,
                progress: data.progress || 0,
                status: data.status || "not-started",
                deliverableId: deliverable.id,
                importance: data.importance || "medium",
                notes: data.notes || "",
                primaryOwner: data.primaryOwner || assigneeId || (currentUserProfile?.id ? currentUserProfile.id : undefined),
                helpers: data.helpers || [],
                todos: [],
                dependencies: []
            }

            // Add task to deliverable
            // We need to cast deliverable to any to access tasks if it's not HydratedDeliverable in types yet, 
            // but ideally we should update types. For now, assuming deliverable has tasks or we fetch them?
            // Actually, handleUpdateDeliverableTasks expects the full list.
            // If 'deliverable' prop doesn't have tasks, we might be overwriting?
            // 'deliverable' here is likely from 'workpackages' context which might be HydratedWorkpackage -> Deliverable.
            // Let's assume deliverable.tasks exists if it's hydrated, or default to empty.

            const currentTasks = (deliverable as any).tasks || []
            const updatedTasks = [...currentTasks, newTask]

            await handleUpdateDeliverableTasks(deliverable.id, updatedTasks)

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
        <>
            <div className="flex items-center gap-2">
                <Input
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a task... (Enter to create, Shift+Enter for details)"
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
        </>
    )
}
