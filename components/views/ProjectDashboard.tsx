"use client"

import { useState, useMemo, useCallback } from "react"
import { useAppContext } from "@/lib/AppContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog"
import { ProjectDetailPage } from "@/components/views/ProjectDetailPage"
import { ProjectImportDialog } from "@/components/projects/ProjectImportDialog"
import { DeliverableDialog } from "@/components/DeliverableDialog"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { PersonalTasksWidget } from "@/components/projects/PersonalTasksWidget"
import { TaskCreationDialog } from "@/components/projects/TaskCreationDialog"
import { TaskEditDialog } from "@/components/projects/TaskEditDialog"
import { MasterProject, Workpackage, Deliverable, PersonProfile, Task } from "@/lib/types"
import {
  Plus,
  FolderKanban,
  Loader2,
  AlertCircle,
  Upload,
  Search,
  Filter,
  DollarSign,
  Grid3x3,
  List,
  BarChart3,
} from "lucide-react"
import { logger } from "@/lib/logger"
import { calculateProjectHealth, ProjectHealth } from "@/lib/utils/projectHealth"
import { calculateBudgetsForProjects, ProjectBudgetSummary } from "@/lib/utils/budgetCalculation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ProjectDashboard() {
  const { currentUser: user, currentUserProfile: profile } = useAuth()
  const {
    projects,
    workpackages: allWorkpackages,
    deliverables,
    orders,
    handleCreateMasterProject,
    handleUpdateMasterProject,
    handleDeleteMasterProject,
    handleUpdateWorkpackage,
    handleCreateDeliverable,
    handleUpdateDeliverable,
    handleDeleteDeliverable,
    handleCreateWorkpackage: createWorkpackage,
    projectsSyncStatus,
    allProfiles,
    people,
  } = useAppContext()

  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<MasterProject | null>(null)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeliverableDialog, setShowDeliverableDialog] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [deliverableMode, setDeliverableMode] = useState<"create" | "edit" | "view">("create")
  const [deliverableParentId, setDeliverableParentId] = useState<string | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showTaskEditDialog, setShowTaskEditDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDeliverableId, setTaskDeliverableId] = useState<string>("")
  const [taskWorkpackageId, setTaskWorkpackageId] = useState<string>("")

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [fundingFilter, setFundingFilter] = useState<string>("all")
  const [healthFilter, setHealthFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Calculate budget summaries for all projects
  const budgetSummaries = useMemo(() => {
    if (!projects || !orders) return new Map<string, ProjectBudgetSummary>()
    return calculateBudgetsForProjects(projects, orders)
  }, [projects, orders])

  // Calculate health for all projects
  const projectHealths = useMemo(() => {
    if (!projects || !allWorkpackages || !deliverables) return new Map<string, ProjectHealth>()

    const healthMap = new Map<string, ProjectHealth>()
    projects.forEach(project => {
      const health = calculateProjectHealth(project, deliverables, allWorkpackages)
      healthMap.set(project.id, health)
    })
    return healthMap
  }, [projects, allWorkpackages, deliverables])

  // Filter and group projects
  const { fundedProjects, unfundedProjects } = useMemo(() => {
    if (!projects) return { fundedProjects: [], unfundedProjects: [] }

    let filtered = [...projects]

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.funderName?.toLowerCase().includes(term) ||
          p.grantName?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Filter by health
    if (healthFilter !== "all") {
      filtered = filtered.filter(p => {
        const health = projectHealths.get(p.id)
        return health?.status === healthFilter
      })
    }

    // Filter by funding type
    let funded: MasterProject[] = []
    let unfunded: MasterProject[] = []

    if (fundingFilter === "funded") {
      funded = filtered.filter(p => p.funderId && p.totalBudget && p.totalBudget > 0)
    } else if (fundingFilter === "unfunded") {
      unfunded = filtered.filter(p => !p.funderId || !p.totalBudget || p.totalBudget === 0)
    } else {
      // All projects - separate into funded and unfunded
      funded = filtered.filter(p => p.funderId && p.totalBudget && p.totalBudget > 0)
      unfunded = filtered.filter(p => !p.funderId || !p.totalBudget || p.totalBudget === 0)
    }

    // Sort by name
    funded.sort((a, b) => a.name.localeCompare(b.name))
    unfunded.sort((a, b) => a.name.localeCompare(b.name))

    return { fundedProjects: funded, unfundedProjects: unfunded }
  }, [projects, searchTerm, statusFilter, healthFilter, fundingFilter, projectHealths])

  const handleCreateTask = useCallback(async (taskData: Partial<Task> & { workpackageId: string }) => {
    try {
      const workpackage = allWorkpackages.find(wp => wp.id === taskData.workpackageId)
      if (!workpackage) {
        throw new Error("Workpackage not found")
      }

      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: taskData.name || "New Task",
        start: taskData.start || new Date(),
        end: taskData.end || new Date(),
        progress: taskData.progress || 0,
        status: taskData.status || "not-started",
        workpackageId: taskData.workpackageId,
        primaryOwner: taskData.primaryOwner,
        helpers: taskData.helpers,
        importance: taskData.importance || "medium",
        notes: taskData.notes,
        subtasks: [],
        deliverables: [],
      }

      const updatedTasks = [...(workpackage.tasks || []), newTask]
      await handleUpdateWorkpackage(workpackage.id, {
        tasks: updatedTasks,
      })

      logger.info("Task created successfully", { taskId: newTask.id, workpackageId: workpackage.id })
      setShowTaskDialog(false)
    } catch (error) {
      logger.error("Error creating task", error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateWorkpackage])

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Find the workpackage containing this task
      const workpackage = allWorkpackages.find(wp => 
        wp.tasks?.some(t => t.id === taskId)
      )
      if (!workpackage) {
        throw new Error("Workpackage not found for task")
      }

      const updatedTasks = (workpackage.tasks || []).map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )

      await handleUpdateWorkpackage(workpackage.id, {
        tasks: updatedTasks,
      })

      logger.info("Task updated successfully", { taskId, workpackageId: workpackage.id })
      setShowTaskEditDialog(false)
      setSelectedTask(null)
    } catch (error) {
      logger.error("Error updating task", error)
      alert(`Failed to update task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateWorkpackage])

  const handleDeleteTask = useCallback(async (workpackageId: string, taskId: string) => {
    try {
      const workpackage = allWorkpackages.find(wp => wp.id === workpackageId)
      if (!workpackage) {
        throw new Error("Workpackage not found")
      }

      const updatedTasks = (workpackage.tasks || []).filter(task => task.id !== taskId)

      await handleUpdateWorkpackage(workpackageId, {
        tasks: updatedTasks,
      })
    } catch (error) {
      logger.error("Error deleting task", error)
      alert(`Failed to delete task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateWorkpackage])

  const handleCreateMasterProjectFromDialog = async (projectData: any) => {
    if (!profile || !user) return

    if (!projectData.name || !projectData.name.trim()) {
      alert("Project name is required. Please enter a project name.")
      return
    }

    const mapVisibility = (vis: string): "private" | "lab" | "institute" | "organisation" => {
      switch (vis) {
        case "private":
        case "postdocs":
        case "pi-researchers":
        case "custom":
          return "private"
        case "lab":
          return "lab"
        case "institute":
          return "institute"
        case "organisation":
          return "organisation"
        default:
          return "lab"
      }
    }

    const newProject: Omit<MasterProject, "id" | "createdAt"> = {
      name: projectData.name.trim(),
      description: projectData.description || "",
      labId: profile.labId,
      labName: profile.labName,
      instituteId: profile.instituteId,
      instituteName: profile.instituteName,
      organisationId: profile.organisationId,
      organisationName: profile.organisationName,
      grantName: projectData.grantName || "",
      grantNumber: projectData.grantNumber || "",
      totalBudget: projectData.budget || 0,
      currency: "EUR",
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      funderId: projectData.funderId || "",
      funderName: "",
      accountIds: projectData.fundedBy || [],
      principalInvestigatorIds: projectData.principalInvestigatorId
        ? [projectData.principalInvestigatorId]
        : profile.id
        ? [profile.id]
        : [],
      coPIIds: [],
      teamMemberIds: projectData.principalInvestigatorId
        ? [projectData.principalInvestigatorId]
        : profile.id
        ? [profile.id]
        : [],
      teamRoles: projectData.principalInvestigatorId
        ? { [projectData.principalInvestigatorId]: "PI" }
        : profile.id
        ? { [profile.id]: "PI" }
        : {},
      status: projectData.status,
      progress: 0,
      workpackageIds: [],
      visibility: mapVisibility(projectData.visibility),
      visibleTo: projectData.visibleTo,
      tags: projectData.tags,
      notes: projectData.notes,
      createdBy: user.uid,
      isExpanded: true,
    }

    try {
      await handleCreateMasterProject(newProject)
      setShowProjectDialog(false)
    } catch (error) {
      logger.error("Error creating master project", error)
      alert(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // If a project is selected for detail view, show the detail page
  if (selectedProjectForDetail) {
    const projectWorkpackages = allWorkpackages.filter(wp =>
      selectedProjectForDetail.workpackageIds.includes(wp.id)
    )
    const projectTeamMembers = allProfiles.filter(p =>
      selectedProjectForDetail.teamMemberIds?.includes(p.id)
    )
    const projectDeliverables = deliverables.filter(d =>
      projectWorkpackages.some(wp => wp.id === d.workpackageId)
    )

    return (
      <ProjectDetailPage
        project={selectedProjectForDetail}
        workpackages={projectWorkpackages}
        deliverables={projectDeliverables}
        teamMembers={projectTeamMembers}
        fundingAccounts={[]}
        onBack={() => setSelectedProjectForDetail(null)}
        onEdit={() => {
          alert("Edit functionality coming soon")
        }}
        onCreateWorkpackage={async (workpackageData) => {
          const workpackageId = await createWorkpackage({
            ...workpackageData,
            projectId: selectedProjectForDetail.id,
            createdBy: user?.uid || "",
          } as any)

          if (workpackageId) {
            await handleUpdateMasterProject(selectedProjectForDetail.id, {
              workpackageIds: [...(selectedProjectForDetail.workpackageIds || []), workpackageId],
            })
          }
        }}
        onUpdateWorkpackage={async (workpackageId, updates) => {
          await handleUpdateWorkpackage(workpackageId, updates)
        }}
        onDeleteWorkpackage={async (workpackageId) => {
          await handleUpdateMasterProject(selectedProjectForDetail.id, {
            workpackageIds: (selectedProjectForDetail.workpackageIds || []).filter(
              id => id !== workpackageId
            ),
          })
        }}
        onCreateDeliverable={async (deliverableData) => {
          await handleCreateDeliverable({
            ...deliverableData,
            createdBy: user?.uid || "",
          } as any)
        }}
        onUpdateDeliverable={async (deliverableId, updates) => {
          await handleUpdateDeliverable(deliverableId, updates)
        }}
        onDeleteDeliverable={async (deliverableId) => {
          await handleDeleteDeliverable(deliverableId)
        }}
      />
    )
  }

  // Loading state
  if (!profile) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Projects</h3>
          <p className="text-sm text-muted-foreground">Fetching your project data...</p>
        </div>
      </div>
    )
  }

  const totalProjects = (fundedProjects.length + unfundedProjects.length)
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Portfolio</h1>
            <p className="text-sm text-muted-foreground">
              {totalProjects} project{totalProjects !== 1 ? 's' : ''} • {activeProjects} active
            </p>
          </div>
          {projectsSyncStatus === 'syncing' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing...
            </Badge>
          )}
          {projectsSyncStatus === 'error' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Sync Error
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowProjectDialog(true)} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="at-risk">At Risk</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fundingFilter} onValueChange={setFundingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Funding" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="unfunded">Unfunded</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 overflow-hidden min-h-0">
        {/* Personal Tasks Sidebar */}
        <div className="hidden lg:block overflow-hidden">
          <PersonalTasksWidget />
        </div>

        {/* Projects Grid/List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {totalProjects === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <FolderKanban className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by creating your first project or importing an existing one.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={() => setShowProjectDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                  <Button onClick={() => setShowImportDialog(true)} variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import Project
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Funded Projects Section */}
              {(fundingFilter === "all" || fundingFilter === "funded") && fundedProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">Funded Projects</h2>
                    <Badge variant="secondary">{fundedProjects.length}</Badge>
                  </div>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        : "space-y-4"
                    }
                  >
                    {fundedProjects.map(project => {
                      const budgetSummary = budgetSummaries.get(project.id)
                      const health = projectHealths.get(project.id)
                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          workpackages={allWorkpackages}
                          deliverables={deliverables}
                          people={allProfiles}
                          budgetSummary={budgetSummary}
                          health={health}
                          onViewProject={setSelectedProjectForDetail}
                          onCreateWorkpackage={async (projectId) => {
                            const workpackageId = await createWorkpackage({
                              name: "New Work Package",
                              projectId,
                              start: new Date(),
                              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                              status: "planning",
                              progress: 0,
                              tasks: [],
                              deliverableIds: [],
                              isExpanded: true,
                              importance: "medium",
                              createdBy: user?.uid || "",
                            } as any)

                            if (workpackageId) {
                              await handleUpdateMasterProject(projectId, {
                                workpackageIds: [...(project.workpackageIds || []), workpackageId],
                              })
                            }
                          }}
                          onEditWorkpackage={(workpackage) => handleUpdateWorkpackage(workpackage.id, workpackage)}
                          onDeleteWorkpackage={async (workpackageId) => {
                            await handleUpdateMasterProject(project.id, {
                              workpackageIds: (project.workpackageIds || []).filter(
                                id => id !== workpackageId
                              ),
                            })
                          }}
                          onCreateDeliverable={(workpackageId) => {
                            setDeliverableParentId(workpackageId)
                            setSelectedDeliverable(null)
                            setDeliverableMode("create")
                            setShowDeliverableDialog(true)
                          }}
                          onEditDeliverable={(deliverable) => {
                            try {
                              if (deliverable && deliverable.id) {
                                setSelectedDeliverable(deliverable)
                                setDeliverableMode("edit")
                                setShowDeliverableDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error editing deliverable", error)
                            }
                          }}
                          onDeleteDeliverable={handleDeleteDeliverable}
                          onDeliverableClick={(deliverable) => {
                            try {
                              if (deliverable && deliverable.id) {
                                setSelectedDeliverable(deliverable)
                                setDeliverableMode("view")
                                setShowDeliverableDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error opening deliverable dialog", error)
                            }
                          }}
                          onCreateTask={(deliverableId) => {
                            const deliverable = deliverables.find(d => d.id === deliverableId)
                            if (deliverable) {
                              setTaskDeliverableId(deliverableId)
                              setTaskWorkpackageId(deliverable.workpackageId)
                              setShowTaskDialog(true)
                            }
                          }}
                          onEditTask={(task) => {
                            try {
                              if (task && task.id) {
                                setSelectedTask(task)
                                setShowTaskEditDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error opening task edit dialog", error)
                            }
                          }}
                          onDeleteTask={(taskId) => {
                            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
                            if (workpackage) {
                              handleDeleteTask(workpackage.id, taskId)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Unfunded Projects Section */}
              {(fundingFilter === "all" || fundingFilter === "unfunded") && unfundedProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FolderKanban className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Internal/Unfunded Projects</h2>
                    <Badge variant="secondary">{unfundedProjects.length}</Badge>
                  </div>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        : "space-y-4"
                    }
                  >
                    {unfundedProjects.map(project => {
                      const health = projectHealths.get(project.id)
                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          workpackages={allWorkpackages}
                          deliverables={deliverables}
                          people={allProfiles}
                          health={health}
                          onViewProject={setSelectedProjectForDetail}
                          onCreateWorkpackage={async (projectId) => {
                            const workpackageId = await createWorkpackage({
                              name: "New Work Package",
                              projectId,
                              start: new Date(),
                              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                              status: "planning",
                              progress: 0,
                              tasks: [],
                              deliverableIds: [],
                              isExpanded: true,
                              importance: "medium",
                              createdBy: user?.uid || "",
                            } as any)

                            if (workpackageId) {
                              await handleUpdateMasterProject(projectId, {
                                workpackageIds: [...(project.workpackageIds || []), workpackageId],
                              })
                            }
                          }}
                          onEditWorkpackage={(workpackage) => handleUpdateWorkpackage(workpackage.id, workpackage)}
                          onDeleteWorkpackage={async (workpackageId) => {
                            await handleUpdateMasterProject(project.id, {
                              workpackageIds: (project.workpackageIds || []).filter(
                                id => id !== workpackageId
                              ),
                            })
                          }}
                          onCreateDeliverable={(workpackageId) => {
                            setDeliverableParentId(workpackageId)
                            setSelectedDeliverable(null)
                            setDeliverableMode("create")
                            setShowDeliverableDialog(true)
                          }}
                          onEditDeliverable={(deliverable) => {
                            try {
                              if (deliverable && deliverable.id) {
                                setSelectedDeliverable(deliverable)
                                setDeliverableMode("edit")
                                setShowDeliverableDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error editing deliverable", error)
                            }
                          }}
                          onDeleteDeliverable={handleDeleteDeliverable}
                          onDeliverableClick={(deliverable) => {
                            try {
                              if (deliverable && deliverable.id) {
                                setSelectedDeliverable(deliverable)
                                setDeliverableMode("view")
                                setShowDeliverableDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error opening deliverable dialog", error)
                            }
                          }}
                          onCreateTask={(deliverableId) => {
                            // Find workpackage for this deliverable
                            const deliverable = deliverables.find(d => d.id === deliverableId)
                            if (deliverable) {
                              setTaskDeliverableId(deliverableId)
                              setTaskWorkpackageId(deliverable.workpackageId)
                              setShowTaskDialog(true)
                            }
                          }}
                          onEditTask={(task) => {
                            // Find workpackage for this task
                            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === task.id))
                            if (workpackage) {
                              // For now, just log - could open edit dialog later
                              logger.info("Edit task", { taskId: task.id })
                            }
                          }}
                          onDeleteTask={(taskId) => {
                            // Find workpackage for this task
                            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
                            if (workpackage) {
                              handleDeleteTask(workpackage.id, taskId)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* No results message */}
              {totalProjects > 0 && fundedProjects.length === 0 && unfundedProjects.length === 0 && (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No projects match your filters</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={showProjectDialog}
        onClose={() => setShowProjectDialog(false)}
        onCreateRegular={() => {
          // Handle regular project creation
          setShowProjectDialog(false)
        }}
        onCreateMaster={handleCreateMasterProjectFromDialog}
        currentUserProfileId={profile?.id || null}
        currentUserId={user?.uid || ""}
        organisationId={profile?.organisationId}
      />

      {/* Import Dialog */}
      <ProjectImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportSuccess={(projectId) => {
          logger.info('Project imported successfully', { projectId })
          setShowImportDialog(false)
        }}
        labId={profile?.labId || ""}
        userId={user?.uid || ""}
      />

      {/* Deliverable Dialog */}
      <DeliverableDialog
        open={showDeliverableDialog}
        onOpenChange={setShowDeliverableDialog}
        deliverable={selectedDeliverable}
        workpackageId={deliverableParentId || selectedDeliverable?.workpackageId || ""}
        onSave={async (data) => {
          try {
            if (deliverableMode === "create") {
              await handleCreateDeliverable({
                ...data,
                createdBy: user?.uid || "",
              } as any)
            } else if (selectedDeliverable) {
              await handleUpdateDeliverable(selectedDeliverable.id, data)
            }
            setShowDeliverableDialog(false)
          } catch (error) {
            logger.error("Error saving deliverable", error)
            alert("Failed to save deliverable")
          }
        }}
        onDelete={
          selectedDeliverable
            ? async () => {
                try {
                  await handleDeleteDeliverable(selectedDeliverable.id)
                  setShowDeliverableDialog(false)
                } catch (error) {
                  logger.error("Error deleting deliverable", error)
                  alert("Failed to delete deliverable")
                }
              }
            : undefined
        }
        mode={deliverableMode}
        availableOwners={allProfiles}
      />

      {/* Task Creation Dialog */}
      <TaskCreationDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        deliverableId={taskDeliverableId}
        workpackageId={taskWorkpackageId}
        onSave={handleCreateTask}
        availablePeople={allProfiles}
      />

      {/* Task Edit Dialog */}
      {selectedTask && (
        <TaskEditDialog
          open={showTaskEditDialog}
          onOpenChange={setShowTaskEditDialog}
          task={selectedTask}
          workpackageId={selectedTask.workpackageId || ""}
          onSave={handleUpdateTask}
          onDelete={async (taskId) => {
            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
            if (workpackage) {
              await handleDeleteTask(workpackage.id, taskId)
              setShowTaskEditDialog(false)
              setSelectedTask(null)
            }
          }}
          availablePeople={allProfiles}
        />
      )}
    </div>
  )
}
