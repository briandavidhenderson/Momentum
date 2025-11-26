"use client"

import { useState } from "react"
import { MasterProject, Workpackage, Deliverable, PersonProfile, Task } from "@/lib/types"
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    useDroppable,
    useDraggable,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { Badge } from "@/components/ui/badge"
import { ProjectBudgetSummary } from "@/lib/utils/budgetCalculation"
import { ProjectHealth } from "@/lib/utils/projectHealth"

// --- Draggable Project Card Wrapper ---
function DraggableProjectCard({
    project,
    workpackages,
    deliverables,
    people,
    budgetSummary,
    health,
}: {
    project: MasterProject
    workpackages: Workpackage[]
    deliverables: Deliverable[]
    people: PersonProfile[]
    budgetSummary?: ProjectBudgetSummary
    health?: ProjectHealth
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: project.id,
        data: { project },
    })

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
    } : undefined

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
            <ProjectCard
                project={project}
                workpackages={workpackages}
                deliverables={deliverables}
                people={people}
                budgetSummary={budgetSummary}
                health={health}
            // Disable interactive elements in card while dragging/in kanban to prevent issues
            // or keep them enabled if we want full functionality in kanban
            />
        </div>
    )
}

// --- Droppable Column ---
function KanbanColumn({
    id,
    title,
    projects,
    workpackages,
    deliverables,
    people,
    budgetSummaries,
    projectHealths,
}: {
    id: string
    title: string
    projects: MasterProject[]
    workpackages: Workpackage[]
    deliverables: Deliverable[]
    people: PersonProfile[]
    budgetSummaries: Map<string, ProjectBudgetSummary>
    projectHealths: Map<string, ProjectHealth>
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    })

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col h-full min-h-[500px] rounded-xl border-2 transition-colors p-4 gap-4 ${isOver ? "border-brand-500 bg-brand-50/50" : "border-border bg-muted/20"
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{title}</h3>
                <Badge variant="secondary">{projects.length}</Badge>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
                {projects.map((project) => (
                    <DraggableProjectCard
                        key={project.id}
                        project={project}
                        workpackages={workpackages}
                        deliverables={deliverables}
                        people={people}
                        budgetSummary={budgetSummaries.get(project.id)}
                        health={projectHealths.get(project.id)}
                    />
                ))}
            </div>
        </div>
    )
}

type ProjectStatus = "planning" | "active" | "completed" | "on-hold" | "cancelled"

interface ProjectKanbanBoardProps {
    projects: MasterProject[]
    workpackages: Workpackage[]
    deliverables: Deliverable[]
    people: PersonProfile[]
    budgetSummaries: Map<string, ProjectBudgetSummary>
    projectHealths: Map<string, ProjectHealth>
    onProjectStatusChange: (projectId: string, newStatus: ProjectStatus) => void
}

export function ProjectKanbanBoard({
    projects,
    workpackages,
    deliverables,
    people,
    budgetSummaries,
    projectHealths,
    onProjectStatusChange,
}: ProjectKanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeProject, setActiveProject] = useState<MasterProject | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const columns: { id: ProjectStatus; title: string }[] = [
        { id: "planning", title: "Planning" },
        { id: "active", title: "Active" },
        { id: "on-hold", title: "On Hold" },
        { id: "completed", title: "Completed" },
        { id: "cancelled", title: "Cancelled" },
    ]

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)
        setActiveProject(active.data.current?.project as MasterProject)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            // If dropped over a column (which has the status ID)
            const newStatus = over.id as ProjectStatus

            // Check if it's a valid status column
            if (columns.some(col => col.id === newStatus)) {
                onProjectStatusChange(active.id as string, newStatus)
            }
        }

        setActiveId(null)
        setActiveProject(null)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full overflow-x-auto">
                <div className="flex gap-6 min-w-max h-full pb-4">
                    {columns.map((col) => (
                        <div key={col.id} className="w-[350px] flex-shrink-0">
                            <KanbanColumn
                                id={col.id}
                                title={col.title}
                                projects={projects.filter((p) => p.status === col.id)}
                                workpackages={workpackages}
                                deliverables={deliverables}
                                people={people}
                                budgetSummaries={budgetSummaries}
                                projectHealths={projectHealths}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <DragOverlay>
                {activeProject ? (
                    <div className="w-[350px]">
                        <ProjectCard
                            project={activeProject}
                            workpackages={workpackages}
                            deliverables={deliverables}
                            people={people}
                            budgetSummary={budgetSummaries.get(activeProject.id)}
                            health={projectHealths.get(activeProject.id)}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
