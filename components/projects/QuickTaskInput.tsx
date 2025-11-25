"use client"

import { useState, KeyboardEvent } from "react"
import { Deliverable, Task, ImportanceLevel } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { TaskCreationDialog } from "./TaskCreationDialog"

interface QuickTaskInputProps {
    deliverable: Deliverable
    workpackageId: string
}

export function QuickTaskInput({ deliverable, workpackageId }: QuickTaskInputProps) {
    const [taskName, setTaskName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [showFullDialog, setShowFullDialog] = useState(false)
    const { currentUser, currentUserProfile } = useAuth()
    const { workpackages, handleUpdateWorkpackage, handleUpdateDeliverable } = useAppContext()

    const workpackage = workpackages.find((wp) => wp.id === workpackageId)

    const addDays = (date: Date, days: number): Date => {
        const result = new Date(date)
        result.setDate(result.getDate() + days)
        return result
    }

    const handleQuickCreate = async () => {
        if (!taskName.trim() || !currentUser || !workpackage) return

        setIsCreating(true)

        try {
            // Smart defaults
            const now = new Date()
            const endDate = deliverable.dueDate
                ? new Date(deliverable.dueDate)
                : addDays(now, 2)

            // Build task object with only defined values (Firestore doesn't allow undefined)
            const newTask: Task = {
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: taskName.trim(),
                start: now,
                end: endDate,
                progress: 0,
                status: "not-started",
                workpackageId: workpackageId,
                importance: "medium" as ImportanceLevel,
                deliverables: [], // Legacy field
                isExpanded: false,
            }

            // Only add primaryOwner if it exists
            if (currentUserProfile?.id) {
                newTask.primaryOwner = currentUserProfile.id
            }

            // Add task to workpackage
            const updatedTasks = [...(workpackage.tasks || []), newTask]
            await handleUpdateWorkpackage(workpackageId, {
                tasks: updatedTasks,
            })

            // Link task to deliverable
            const updatedProjectTaskIds = [
                ...(deliverable.projectTaskIds || []),
                newTask.id,
            ]
            await handleUpdateDeliverable(deliverable.id, {
                projectTaskIds: updatedProjectTaskIds,
            })

            // Clear input
            setTaskName("")
        } catch (error) {
            console.error("Error creating quick task:", error)
            alert("Failed to create task. Please try again.")
        } finally {
            setIsCreating(false)
        }
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

    const handleFullDialogCreate = async (taskData: Partial<Task> & { workpackageId: string }) => {
        // This will be handled by the parent component's task creation logic
        // For now, we'll use the same quick create logic
        await handleQuickCreate()
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
                    workpackageId={workpackageId}
                    onCreateTask={handleFullDialogCreate}
                    initialTaskName={taskName}
                />
            )}
        </>
    )
}
