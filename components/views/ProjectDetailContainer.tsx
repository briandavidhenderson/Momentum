"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { LogOut } from "lucide-react"

import { NotificationBell } from "@/components/NotificationBell"
import TopModuleNavigation from "@/components/TopModuleNavigation"
import { Button } from "@/components/ui/button"
import { ProjectDetailPage } from "@/components/views/ProjectDetailPage"
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog"
import { useAppContext } from "@/lib/AppContext"
import { logger } from "@/lib/logger"
import { UserRole } from "@/lib/types"
import { calculateBudgetsForProjects } from "@/lib/utils/budgetCalculation"
import { calculateProjectHealth } from "@/lib/utils/projectHealth"

interface ProjectDetailContainerProps {
    projectId: string
    onBack: () => void
}

export function ProjectDetailContainer({ projectId, onBack }: ProjectDetailContainerProps) {
    const [showEditDialog, setShowEditDialog] = useState(false)
    const {
        currentUserProfile,
        currentUser,
        projects,
        workpackages: allWorkpackages,
        deliverables,
        orders,
        handleUpdateMasterProject,
        handleUpdateWorkpackage,
        handleCreateWorkpackage: createWorkpackage,
        handleCreateDeliverable,
        handleUpdateDeliverable,
        handleDeleteDeliverable,
        handleUpdateDeliverableTasks,
        allProfiles,
        fundingAccounts,
        handleSignOut,
    } = useAppContext()

    const project = useMemo(() => projects?.find(p => p.id === projectId), [projects, projectId])

    const projectWorkpackages = useMemo(
        () => {
            return allWorkpackages.filter(wp => project?.workpackageIds?.includes(wp.id));
        },
        [allWorkpackages, project]
    )

    const projectDeliverables = useMemo(
        () => deliverables.filter(deliverable => projectWorkpackages.some(wp => wp.id === deliverable.workpackageId)),
        [deliverables, projectWorkpackages]
    )

    const projectTeamMembers = useMemo(
        () => allProfiles.filter(profile => project?.teamMemberIds?.includes(profile.id)),
        [allProfiles, project]
    )

    const budgetSummaries = useMemo(() => {
        if (!projects || !orders) return new Map<string, any>()
        return calculateBudgetsForProjects(projects, orders)
    }, [projects, orders])

    const projectBudgetSummary = useMemo(() => {
        if (!project) return undefined
        return budgetSummaries.get(project.id)
    }, [budgetSummaries, project])

    const projectHealth = useMemo(() => {
        if (!project) return undefined
        return calculateProjectHealth(project, deliverables, allWorkpackages)
    }, [allWorkpackages, deliverables, project])

    const handleCreateWorkpackageForProject = useCallback(
        async (workpackageData: any) => {
            if (!project) return undefined
            const workpackageId = await createWorkpackage({
                ...workpackageData,
                projectId: project.id,
                createdBy: currentUser?.uid || "",
            })

            if (workpackageId) {
                await handleUpdateMasterProject(project.id, {
                    workpackageIds: [...(project.workpackageIds || []), workpackageId],
                })
            }
            return workpackageId
        },
        [createWorkpackage, currentUser?.uid, handleUpdateMasterProject, project]
    )

    const handleDeleteWorkpackageForProject = useCallback(
        async (workpackageId: string) => {
            if (!project) return
            await handleUpdateMasterProject(project.id, {
                workpackageIds: (project.workpackageIds || []).filter(id => id !== workpackageId),
            })
        },
        [handleUpdateMasterProject, project]
    )

    const handleCreateDeliverableForProject = useCallback(
        async (deliverableData: any) => {
            try {
                const deliverableId = await handleCreateDeliverable({
                    ...deliverableData,
                    createdBy: currentUser?.uid || "",
                } as any)
                return deliverableId
            } catch (error) {
                logger.error("Error creating deliverable", error)
                return undefined
            }
        },
        [currentUser?.uid, handleCreateDeliverable]
    )

    const handleUpdateDeliverableForProject = useCallback(
        async (deliverableId: string, updates: any) => {
            await handleUpdateDeliverable(deliverableId, updates)
        },
        [handleUpdateDeliverable]
    )

    const handleDeleteDeliverableForProject = useCallback(
        async (deliverableId: string) => {
            await handleDeleteDeliverable(deliverableId)
        },
        [handleDeleteDeliverable]
    )

    if (!project) {
        return (
            <div className="max-w-4xl mx-auto py-24 px-6 text-center space-y-4">
                <h1 className="text-2xl font-semibold text-slate-900">Project not found</h1>
                <p className="text-muted-foreground">The requested project does not exist or you do not have access.</p>
                <Button onClick={onBack}>
                    Back to Projects
                </Button>
            </div>
        )
    }

    return (
        <>
            <ProjectDetailPage
                project={project}
                workpackages={projectWorkpackages}
                deliverables={projectDeliverables}
                teamMembers={projectTeamMembers}
                fundingAccounts={fundingAccounts}
                health={projectHealth}
                budgetSummary={projectBudgetSummary}

                onBack={onBack}
                onEdit={() => setShowEditDialog(true)}
                onCreateWorkpackage={handleCreateWorkpackageForProject}
                onUpdateWorkpackage={async (workpackageId, updates) => {
                    await handleUpdateWorkpackage(workpackageId, updates)
                }}
                onDeleteWorkpackage={handleDeleteWorkpackageForProject}
                onCreateDeliverable={handleCreateDeliverableForProject}
                onUpdateDeliverable={handleUpdateDeliverableForProject}
                onDeleteDeliverable={handleDeleteDeliverableForProject}
                onUpdateDeliverableTasks={handleUpdateDeliverableTasks}
            />

            <ProjectCreationDialog
                open={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                onCreateRegular={() => { }} // Not used in edit mode
                onCreateMaster={() => { }} // Not used in edit mode
                onUpdate={async (updatedProject) => {
                    if (project) {
                        await handleUpdateMasterProject(project.id, updatedProject)
                        setShowEditDialog(false)
                    }
                }}
                currentUserProfileId={currentUserProfile?.id || null}
                currentUserId={currentUser?.uid || ""}
                organisationId={currentUserProfile?.organisationId}
                labId={currentUserProfile?.labId}
                project={project}
                mode="edit"
            />
        </>
    )
}
