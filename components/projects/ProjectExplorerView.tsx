"use client"

import { useState, useCallback } from "react"
import { useAppContext } from "@/lib/AppContext"
import { MasterProject, Workpackage, Deliverable, Task } from "@/lib/types"
import { WorkPackageList } from "./WorkPackageList"
import { DeliverableList } from "./DeliverableList"
import { TaskListView } from "./TaskListView"
import { TaskDetailsPanel } from "./TaskDetailsPanel"
import { DeliverableDetailsPanel } from "./DeliverableDetailsPanel"
import { WorkpackageDialog } from "./WorkpackageDialog"
import { DeliverableCreationDialog } from "./DeliverableCreationDialog"
import { ChevronRight } from "lucide-react"

interface ProjectExplorerViewProps {
    project: MasterProject
}

export function ProjectExplorerView({ project }: ProjectExplorerViewProps) {
    const {
        workpackages: allWorkpackages,
        deliverables: allDeliverables,
        allProfiles,
        handleUpdateWorkpackage,
        handleUpdateDeliverable,
        handleDeleteDeliverable,
        handleCreateWorkpackage,
        handleCreateDeliverable,
    } = useAppContext()

    // Selection state for 3-column navigation
    const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<string | null>(null)
    const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null)

    // Panel state for editing
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null)

    // Dialog state
    const [isWorkPackageDialogOpen, setIsWorkPackageDialogOpen] = useState(false)
    const [isDeliverableDialogOpen, setIsDeliverableDialogOpen] = useState(false)

    // Filter data based on selection
    console.log("DEBUG: ProjectExplorerView filtering", {
        projectId: project.id,
        projectWpIds: project.workpackageIds,
        allWpCount: allWorkpackages.length,
        allWps: allWorkpackages.map(wp => ({ id: wp.id, pid: wp.projectId, ppid: wp.profileProjectId }))
    });

    const projectWorkpackages = allWorkpackages.filter((wp) =>
        project.workpackageIds?.includes(wp.id)
    )

    const selectedWorkpackage = selectedWorkPackageId
        ? allWorkpackages.find((wp) => wp.id === selectedWorkPackageId)
        : null

    const workpackageDeliverables = selectedWorkPackageId
        ? allDeliverables.filter((d) => d.workpackageId === selectedWorkPackageId)
        : []

    const selectedDeliverable = selectedDeliverableId
        ? allDeliverables.find((d) => d.id === selectedDeliverableId)
        : null

    // Get tasks for selected deliverable
    // Tasks are stored in workpackage.tasks[] but should be filtered by deliverableId
    const deliverableTasks: Task[] = selectedDeliverable && selectedWorkpackage
        ? (selectedWorkpackage.tasks || []).filter((task) =>
            selectedDeliverable.projectTaskIds?.includes(task.id)
        )
        : []

    const editingTask = editingTaskId && selectedWorkpackage
        ? (selectedWorkpackage.tasks || []).find((t) => t.id === editingTaskId) || null
        : null

    const editingDeliverable = editingDeliverableId
        ? allDeliverables.find((d) => d.id === editingDeliverableId) || null
        : null

    // Handlers
    const handleWorkPackageSelect = useCallback((wpId: string) => {
        setSelectedWorkPackageId(wpId)
        setSelectedDeliverableId(null) // Clear downstream selections
    }, [])

    const handleDeliverableSelect = useCallback((delivId: string) => {
        setSelectedDeliverableId(delivId)
    }, [])

    const handleTaskClick = useCallback((task: Task) => {
        setEditingTaskId(task.id)
    }, [])

    const handleTaskSave = useCallback(
        async (taskId: string, updates: Partial<Task>) => {
            if (!selectedWorkpackage) return

            const updatedTasks = (selectedWorkpackage.tasks || []).map((task) =>
                task.id === taskId ? { ...task, ...updates } : task
            )

            await handleUpdateWorkpackage(selectedWorkpackage.id, {
                tasks: updatedTasks,
            })

            setEditingTaskId(null)
        },
        [selectedWorkpackage, handleUpdateWorkpackage]
    )

    const handleTaskDelete = useCallback(
        async (taskId: string) => {
            if (!selectedWorkpackage) return

            const updatedTasks = (selectedWorkpackage.tasks || []).filter(
                (task) => task.id !== taskId
            )

            await handleUpdateWorkpackage(selectedWorkpackage.id, {
                tasks: updatedTasks,
            })

            setEditingTaskId(null)
        },
        [selectedWorkpackage, handleUpdateWorkpackage]
    )

    const handleDeliverableClick = useCallback((deliverable: Deliverable) => {
        setEditingDeliverableId(deliverable.id)
    }, [])

    // Creation Handlers
    const onSaveWorkPackage = async (data: Partial<Workpackage>) => {
        if (!handleCreateWorkpackage) return

        try {
            // Ensure required fields for creation
            if (!data.name || !data.start || !data.end) return

            await handleCreateWorkpackage({
                projectId: project.id,
                profileProjectId: project.id, // Ensure both are set for compatibility
                labId: project.labId, // Required for permission rules
                name: data.name,
                start: data.start,
                end: data.end,
                status: data.status || 'planning',
                importance: data.importance || 'medium',
                notes: data.notes,
                ownerId: data.ownerId,
                progress: 0,
                isExpanded: true,
                tasks: [],
                deliverableIds: []
            })
            setIsWorkPackageDialogOpen(false)
        } catch (error) {
            console.error("Failed to create work package:", error)
        }
    }

    const onSaveDeliverable = async (data: Partial<Deliverable>) => {
        if (!handleCreateDeliverable || !selectedWorkPackageId) return

        try {
            // Ensure required fields
            if (!data.name || !data.dueDate) return

            await handleCreateDeliverable({
                name: data.name,
                description: data.description,
                status: data.status || 'not-started',
                importance: data.importance || 'medium',
                dueDate: data.dueDate,
                startDate: data.startDate,
                ownerId: data.ownerId,
                workpackageId: selectedWorkPackageId,
                progress: 0,
                createdBy: 'current-user-id', // Placeholder, need to fix
                tags: [],
                linkedOrderIds: [],
                linkedDayToDayTaskIds: [],
                linkedDocumentUrls: [],
                blockers: [],
                metrics: [],
                contributorIds: []
            })
            setIsDeliverableDialogOpen(false)
        } catch (error) {
            console.error("Failed to create deliverable:", error)
        }
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Breadcrumb Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{project.name}</span>
                    {selectedWorkpackage && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-medium text-foreground">
                                {selectedWorkpackage.name}
                            </span>
                        </>
                    )}
                    {selectedDeliverable && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-medium text-foreground">
                                {selectedDeliverable.name}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* 3-Column Miller Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Column 1: Work Packages */}
                <div className="w-80 border-r border-border flex-shrink-0 overflow-hidden">
                    <WorkPackageList
                        workpackages={projectWorkpackages}
                        selectedWorkPackageId={selectedWorkPackageId}
                        onSelectWorkPackage={handleWorkPackageSelect}
                        onAdd={() => setIsWorkPackageDialogOpen(true)}
                    />
                </div>

                {/* Column 2: Deliverables */}
                <div className="w-80 border-r border-border flex-shrink-0 overflow-hidden">
                    <DeliverableList
                        workPackageId={selectedWorkPackageId}
                        deliverables={workpackageDeliverables}
                        selectedDeliverableId={selectedDeliverableId}
                        onSelectDeliverable={handleDeliverableSelect}
                        onDeliverableClick={handleDeliverableClick}
                        onAdd={() => setIsDeliverableDialogOpen(true)}
                    />
                </div>

                {/* Column 3: Tasks */}
                <div className="flex-1 overflow-hidden">
                    <TaskListView
                        deliverableId={selectedDeliverableId}
                        deliverable={selectedDeliverable}
                        tasks={deliverableTasks}
                        onTaskClick={handleTaskClick}
                        workpackageId={selectedWorkPackageId}
                    />
                </div>
            </div>

            {/* Task Details Side Panel */}
            {editingTask && selectedWorkpackage && (
                <TaskDetailsPanel
                    task={editingTask}
                    workpackageId={selectedWorkpackage.id}
                    onClose={() => setEditingTaskId(null)}
                    onSave={handleTaskSave}
                    onDelete={handleTaskDelete}
                    availablePeople={allProfiles}
                />
            )}

            {/* Deliverable Details Side Panel */}
            {editingDeliverable && (
                <DeliverableDetailsPanel
                    deliverable={editingDeliverable}
                    onClose={() => setEditingDeliverableId(null)}
                    onEdit={(d) => {
                        // Open edit dialog logic here if needed
                        setEditingDeliverableId(null)
                    }}
                    onDelete={async (delivId) => {
                        await handleDeleteDeliverable(delivId)
                        setEditingDeliverableId(null)
                        if (selectedDeliverableId === delivId) {
                            setSelectedDeliverableId(null)
                        }
                    }}
                    onUpdate={async (delivId, updates) => {
                        await handleUpdateDeliverable(delivId, updates)
                    }}
                    people={allProfiles}
                />
            )}

            {/* Dialogs */}
            <WorkpackageDialog
                open={isWorkPackageDialogOpen}
                onOpenChange={setIsWorkPackageDialogOpen}
                workpackage={null}
                projectId={project.id}
                onSave={onSaveWorkPackage}
                mode="create"
                availableLeads={allProfiles}
            />

            <DeliverableCreationDialog
                open={isDeliverableDialogOpen}
                onOpenChange={setIsDeliverableDialogOpen}
                workPackageId={selectedWorkPackageId || ""}
                onCreate={onSaveDeliverable}
                availablePeople={allProfiles}
            />
        </div>
    )
}
