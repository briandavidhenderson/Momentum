"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { AuthPage } from "@/components/AuthPage"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { NotificationBell } from "@/components/NotificationBell"
import OnboardingFlow from "@/components/OnboardingFlow"
import TopModuleNavigation from "@/components/TopModuleNavigation"
import { Button } from "@/components/ui/button"
import { ProjectDetailPage } from "@/components/views/ProjectDetailPage"
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog"
import { useAppContext } from "@/lib/AppContext"
import { logger } from "@/lib/logger"
import { UserRole } from "@/lib/types"
import { calculateBudgetsForProjects } from "@/lib/utils/budgetCalculation"
import { calculateProjectHealth } from "@/lib/utils/projectHealth"

export default function ProjectDetailRoute() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = useMemo(() => params?.id?.toString() || "", [params])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const {
    currentUserProfile,
    currentUser,
    authState,
    mounted,
    handleLogin,
    handleSignup,
    handleSignOut,
    handleProfileSetupComplete,
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
    mainView,
    setMainView,
  } = useAppContext()

  useEffect(() => {
    if (mainView !== "projects") {
      setMainView("projects")
    }
  }, [mainView, setMainView])

  const project = useMemo(() => projects?.find(p => p.id === projectId), [projects, projectId])

  const projectWorkpackages = useMemo(
    () => {
      console.log("DEBUG: ProjectDetailRoute filtering WPs", {
        projectId: project?.id,
        projectWpIds: project?.workpackageIds,
        allWpCount: allWorkpackages.length,
        allWps: allWorkpackages.map(wp => ({ id: wp.id, pid: wp.projectId, ppid: wp.profileProjectId }))
      });
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

  const isAdmin = currentUserProfile?.isAdministrator || currentUser?.isAdministrator || false
  const hasRoleRestriction =
    currentUserProfile?.userRole === UserRole.PI ||
    currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
    currentUserProfile?.userRole === UserRole.LAB_MANAGER

  const handleNavigationSelect = (moduleId: string) => {
    if (moduleId === "projects") return

    setMainView(moduleId as typeof mainView)
    router.push("/")
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="h1 text-foreground mb-2">Momentum Lab Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (authState === "auth") {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
  }

  if (authState === "setup" && currentUser) {
    return (
      <OnboardingFlow
        user={currentUser}
        onComplete={handleProfileSetupComplete}
        onCancel={handleSignOut}
      />
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto py-24 px-6 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Project not found</h1>
          <p className="text-muted-foreground">The requested project does not exist or you do not have access.</p>
          <Button onClick={() => {
            setMainView("projects")
            router.push("/")
          }}>
            Back to Projects
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[2000px] mx-auto">
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div onClick={() => {
                  setMainView("dashboard")
                  router.push("/")
                }} className="text-2xl font-bold text-slate-900 tracking-tight cursor-pointer">
                  Momentum {currentUserProfile?.position || currentUser?.email}
                </div>
              </div>
              <NotificationBell />
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                aria-label="Sign out of your account"
              >
                <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Sign Out
              </Button>
            </div>
          </div>

          <TopModuleNavigation
            activeModule={mainView}
            onSelect={handleNavigationSelect}
            isAdmin={isAdmin}
            hasRoleRestriction={hasRoleRestriction}
          />
        </div>

        <div className="p-6">
          <ProjectDetailPage
            project={project}
            workpackages={projectWorkpackages}
            deliverables={projectDeliverables}
            teamMembers={projectTeamMembers}
            fundingAccounts={fundingAccounts}
            health={projectHealth}
            budgetSummary={projectBudgetSummary}

            onBack={() => {
              setMainView("projects")
              router.push("/")
            }}
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
        </div>
      </div>


      {
        project && (
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
        )
      }

      <CookieConsentBanner />
    </main >
  )
}

export async function generateStaticParams() {
  return []
}
