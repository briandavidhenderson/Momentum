"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { MasterProject, Workpackage, PersonProfile, FundingAccount, Order, Deliverable, CalendarEvent, ELNExperiment, Task, ImportanceLevel } from "@/lib/types"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { logger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { WorkpackageDialog } from "@/components/projects/WorkpackageDialog"
import { DeliverableDialog } from "@/components/DeliverableDialog"
import { DeliverableDetailsPanel } from "@/components/projects/DeliverableDetailsPanel"
import { CommentsSection } from "@/components/CommentsSection"
import { ProjectExportDialog } from "@/components/ProjectExportDialog"
import { ProjectImportDialog } from "@/components/projects/ProjectImportDialog"
import { ProjectResources } from "@/components/ProjectResources"
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Activity,
  Edit,
  Plus,
  ShoppingCart,
  Download,
  FlaskConical,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Folder,
  PanelLeft,
  PanelRight,
  LayoutDashboard,
} from "lucide-react"
import { calculateProjectHealth, getHealthStatusColor, ProjectHealth } from "@/lib/utils/projectHealth"
import { formatCurrency, getBudgetStatusColor, ProjectBudgetSummary } from "@/lib/utils/budgetCalculation"
import { useAppContext } from "@/lib/AppContext"

interface ProjectDetailPageProps {
  project: MasterProject
  workpackages: Workpackage[]
  deliverables: Deliverable[]
  teamMembers: PersonProfile[]
  fundingAccounts: FundingAccount[]
  events?: CalendarEvent[]
  health?: ProjectHealth
  budgetSummary?: ProjectBudgetSummary
  onBack: () => void
  onEdit?: () => void
  onCreateWorkpackage?: (workpackageData: Partial<Workpackage>) => void
  onUpdateWorkpackage?: (workpackageId: string, updates: Partial<Workpackage>) => void
  onDeleteWorkpackage?: (workpackageId: string) => void
  onCreateDeliverable?: (deliverableData: Partial<Deliverable>) => void
  onUpdateDeliverable?: (deliverableId: string, updates: Partial<Deliverable>) => void
  onDeleteDeliverable?: (deliverableId: string) => void
  onUpdateProject?: (updates: Partial<MasterProject>) => void
  onUpdateTask?: (workpackageId: string, taskId: string, updates: any) => void
  onDeleteTask?: (workpackageId: string, taskId: string) => void
  onViewOrder?: (orderId: string) => void
  onViewExperiment?: (experimentId: string) => void
  onViewEvent?: (eventId: string) => void
}

export function ProjectDetailPage({
  project,
  workpackages,
  deliverables,
  teamMembers,
  fundingAccounts,
  events = [],
  health,
  budgetSummary,
  onBack,
  onEdit,
  onCreateWorkpackage,
  onUpdateWorkpackage,
  onDeleteWorkpackage,
  onCreateDeliverable,
  onUpdateDeliverable,
  onDeleteDeliverable,
  onUpdateProject,
  onUpdateTask,
  onDeleteTask,
  onViewOrder,
  onViewExperiment,
  onViewEvent,
}: ProjectDetailPageProps) {
  const [workpackageDialogOpen, setWorkpackageDialogOpen] = useState(false)
  const [selectedWorkpackageDialog, setSelectedWorkpackageDialog] = useState<Workpackage | null>(null)
  const [workpackageDialogMode, setWorkpackageDialogMode] = useState<"create" | "edit" | "view">("view")
  const [deliverableDialogOpen, setDeliverableDialogOpen] = useState(false)
  const [selectedDeliverableDialog, setSelectedDeliverableDialog] = useState<Deliverable | null>(null)
  const [deliverableDialogMode, setDeliverableDialogMode] = useState<"create" | "edit" | "view">("view")
  const [selectedDeliverableForPanel, setSelectedDeliverableForPanel] = useState<Deliverable | null>(null)
  const [selectedWorkpackageForDeliverable, setSelectedWorkpackageForDeliverable] = useState<string | null>(null)
  const [newTaskName, setNewTaskName] = useState("")
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [draggedOwnerId, setDraggedOwnerId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [experiments, setExperiments] = useState<ELNExperiment[]>([])
  const [loadingExperiments, setLoadingExperiments] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string | null>(null)
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null)
  const [expandedWorkpackages, setExpandedWorkpackages] = useState<Record<string, boolean>>({})
  const [drawerVisibility, setDrawerVisibility] = useState({
    stats: true,
    funding: false,
    resources: false,
    files: false,
    activity: false,
  })
  const [newDeliverableNames, setNewDeliverableNames] = useState<Record<string, string>>({})

  const toggleDrawer = (drawer: keyof typeof drawerVisibility) => {
    setDrawerVisibility((current) => ({
      ...current,
      [drawer]: !current[drawer],
    }))
  }

  const toggleWorkpackageExpand = (workpackageId: string) => {
    setExpandedWorkpackages((current) => ({
      ...current,
      [workpackageId]: !current[workpackageId],
    }))
  }

  const isFundedProject = (project.type || "unfunded") === "funded"
  const hasFundingLedger = (project.accountIds?.length ?? 0) > 0 || (fundingAccounts?.length ?? 0) > 0
  const canAccessFunding = isFundedProject && hasFundingLedger

  // Get current user for import/export
  const { currentUser, currentUserProfile } = useAppContext()

  // Fetch project orders
  useEffect(() => {
    if (!canAccessFunding || !currentUser) {
      setOrders([])
      setLoadingOrders(false)
      return
    }

    const fetchProjectOrders = async () => {
      const db = getFirebaseDb()
      setLoadingOrders(true)
      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("masterProjectId", "==", project.id),
          orderBy("createdDate", "desc")
        )
        const ordersSnapshot = await getDocs(ordersQuery)
        const ordersData = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdDate: doc.data().createdDate?.toDate?.() || new Date(),
          orderedDate: doc.data().orderedDate?.toDate?.(),
          receivedDate: doc.data().receivedDate?.toDate?.(),
          expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate?.(),
        })) as Order[]
        setOrders(ordersData)
      } catch (error) {
        logger.error("Error fetching project orders", error)
      } finally {
        setLoadingOrders(false)
      }
    }

    fetchProjectOrders()
  }, [project.id, canAccessFunding, currentUser?.uid])

  // Fetch project experiments
  useEffect(() => {
    if (!currentUser) {
      setExperiments([])
      setLoadingExperiments(false)
      return
    }
    const fetchProjectExperiments = async () => {
      const db = getFirebaseDb()
      setLoadingExperiments(true)
      try {
        const experimentsQuery = query(
          collection(db, "experiments"),
          where("masterProjectId", "==", project.id),
          orderBy("createdAt", "desc")
        )
        const experimentsSnapshot = await getDocs(experimentsQuery)
        const experimentsData = experimentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date().toISOString(),
        })) as ELNExperiment[]
        setExperiments(experimentsData)
      } catch (error) {
        logger.error("Error fetching project experiments", error)
      } finally {
        setLoadingExperiments(false)
      }
    }

    fetchProjectExperiments()
  }, [project.id, currentUser?.uid])

  // Calculate project statistics
  const stats = useMemo(() => {
    const totalTasks = workpackages.reduce((sum, wp) => sum + (wp.tasks?.length || 0), 0)
    const completedTasks = workpackages.reduce(
      (sum, wp) => sum + (wp.tasks?.filter(t => t.status === "done").length || 0),
      0
    )
    const completedWorkpackages = workpackages.filter(wp => wp.status === "completed").length
    const atRiskWorkpackages = workpackages.filter(wp => wp.status === "at-risk").length

    return {
      totalWorkpackages: workpackages.length,
      completedWorkpackages,
      atRiskWorkpackages,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    }
  }, [workpackages])

  // Calculate order statistics
  const orderStats = useMemo(() => {
    const totalOrders = orders.length
    const toOrderCount = orders.filter(o => o.status === "to-order").length
    const orderedCount = orders.filter(o => o.status === "ordered").length
    const receivedCount = orders.filter(o => o.status === "received").length

    const totalSpent = orders
      .filter(o => o.status === "received")
      .reduce((sum, o) => sum + (o.priceExVAT || 0), 0)

    const totalCommitted = orders
      .filter(o => o.status === "ordered")
      .reduce((sum, o) => sum + (o.priceExVAT || 0), 0)

    return {
      totalOrders,
      toOrderCount,
      orderedCount,
      receivedCount,
      totalSpent,
      totalCommitted,
    }
  }, [orders])

  // Default selections for the execution view
  useEffect(() => {
    if (workpackages.length > 0 && !selectedWorkpackageId) {
      setSelectedWorkpackageId(workpackages[0].id)
    }
  }, [workpackages, selectedWorkpackageId])

  useEffect(() => {
    if (!selectedWorkpackageId) return
    const deliverablesForWp = deliverables.filter(d => d.workpackageId === selectedWorkpackageId)
    if (deliverablesForWp.length > 0) {
      setSelectedDeliverableId((current) => {
        if (current && deliverablesForWp.some(d => d.id === current)) return current
        return deliverablesForWp[0].id
      })
    } else {
      setSelectedDeliverableId(null)
    }
  }, [deliverables, selectedWorkpackageId])

  useEffect(() => {
    setExpandedWorkpackages((current) => {
      const next = { ...current }
      workpackages.forEach((wp) => {
        if (next[wp.id] === undefined) {
          next[wp.id] = true
        }
      })
      return next
    })
  }, [workpackages])

  const computedHealth = useMemo<ProjectHealth>(() => {
    if (health) return health
    return calculateProjectHealth(project, deliverables, workpackages)
  }, [health, project, deliverables, workpackages])

  // Get project PIs
  const principalInvestigators = teamMembers.filter(member =>
    project.principalInvestigatorIds?.includes(member.id)
  )

  // Format dates
  const startDate = new Date(project.startDate).toLocaleDateString()
  const endDate = new Date(project.endDate).toLocaleDateString()
  const daysRemaining = Math.ceil(
    (new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const timelineRange = useMemo(() => {
    const dates: Date[] = [new Date(project.startDate), new Date(project.endDate)]

    workpackages.forEach(wp => {
      dates.push(wp.start instanceof Date ? wp.start : new Date(wp.start))
      dates.push(wp.end instanceof Date ? wp.end : new Date(wp.end))
    })

    deliverables.forEach(deliverable => {
      if (deliverable.dueDate) dates.push(new Date(deliverable.dueDate))
      if (deliverable.startDate) dates.push(new Date(deliverable.startDate))
    })

    events.forEach(event => {
      if (event.start) dates.push(new Date(event.start))
      if (event.end) dates.push(new Date(event.end))
    })

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))

    return { start, end }
  }, [project.startDate, project.endDate, workpackages, deliverables, events])

  const getTimelinePosition = useCallback(
    (date: Date) => {
      const total = timelineRange.end.getTime() - timelineRange.start.getTime()
      if (total <= 0) return 0
      const offset = date.getTime() - timelineRange.start.getTime()
      return Math.min(100, Math.max(0, (offset / total) * 100))
    },
    [timelineRange.end, timelineRange.start]
  )

  const getTimelineWidth = useCallback(
    (start: Date, end: Date) => Math.max(2, getTimelinePosition(end) - getTimelinePosition(start)),
    [getTimelinePosition]
  )

  // Workpackage dialog handlers
  const handleCreateWorkpackageClick = () => {
    setSelectedWorkpackageDialog(null)
    setWorkpackageDialogMode("create")
    setWorkpackageDialogOpen(true)
  }

  const handleViewWorkpackage = (wp: Workpackage) => {
    setSelectedWorkpackageDialog(wp)
    setWorkpackageDialogMode("view")
    setWorkpackageDialogOpen(true)
  }

  const handleEditWorkpackage = (wp: Workpackage) => {
    setSelectedWorkpackageDialog(wp)
    setWorkpackageDialogMode("edit")
    setWorkpackageDialogOpen(true)
  }

  const handleSaveWorkpackage = (workpackageData: Partial<Workpackage>) => {
    if (workpackageDialogMode === "create" && onCreateWorkpackage) {
      onCreateWorkpackage(workpackageData)
    } else if (workpackageDialogMode === "edit" && selectedWorkpackageDialog && onUpdateWorkpackage) {
      onUpdateWorkpackage(selectedWorkpackageDialog.id, workpackageData)
    }
    setWorkpackageDialogOpen(false)
  }

  const handleDeleteWorkpackage = () => {
    if (selectedWorkpackageDialog && onDeleteWorkpackage) {
      if (confirm(`Are you sure you want to delete "${selectedWorkpackageDialog.name}"?`)) {
        onDeleteWorkpackage(selectedWorkpackageDialog.id)
        setWorkpackageDialogOpen(false)
      }
    }
  }

  // Deliverable dialog handlers
  const handleCreateDeliverableClick = (workpackageId: string) => {
    setSelectedWorkpackageForDeliverable(workpackageId)
    setSelectedDeliverableDialog(null)
    setDeliverableDialogMode("create")
    setDeliverableDialogOpen(true)
  }

  const handleViewDeliverable = (deliverable: Deliverable) => {
    setSelectedDeliverableForPanel(deliverable)
  }

  const handleEditDeliverable = (deliverable: Deliverable) => {
    setSelectedDeliverableDialog(deliverable)
    setSelectedWorkpackageForDeliverable(deliverable.workpackageId)
    setDeliverableDialogMode("edit")
    setDeliverableDialogOpen(true)
  }

  const handleSaveDeliverable = (deliverableData: Partial<Deliverable>) => {
    if (deliverableDialogMode === "create" && onCreateDeliverable) {
      onCreateDeliverable(deliverableData)
    } else if (deliverableDialogMode === "edit" && selectedDeliverableDialog && onUpdateDeliverable) {
      onUpdateDeliverable(selectedDeliverableDialog.id, deliverableData)
    }
    setDeliverableDialogOpen(false)
  }

  const handleDeleteDeliverable = (deliverableId: string) => {
    if (onDeleteDeliverable) {
      if (confirm("Are you sure you want to delete this deliverable?")) {
        onDeleteDeliverable(deliverableId)
        setSelectedDeliverableForPanel(null)
      }
    }
  }

  // Get deliverables for a specific workpackage
  const getWorkpackageDeliverables = (workpackageId: string): Deliverable[] => {
    return deliverables.filter(d => d.workpackageId === workpackageId)
  }

  // Handle import success
  const handleImportSuccess = (projectId: string) => {
    logger.info('Project imported successfully', { projectId })
    // Parent component should handle navigation to the new project
    // For now, just log success
    alert(`Project imported successfully! Refresh the page to see the new project.`)
  }

  const selectedWorkpackage = useMemo(
    () => workpackages.find(wp => wp.id === selectedWorkpackageId) || null,
    [selectedWorkpackageId, workpackages]
  )

  const deliverablesForSelectedWp = useMemo(
    () => deliverables.filter(d => d.workpackageId === selectedWorkpackageId),
    [deliverables, selectedWorkpackageId]
  )

  const selectedDeliverable = useMemo(
    () => deliverablesForSelectedWp.find(d => d.id === selectedDeliverableId) || null,
    [deliverablesForSelectedWp, selectedDeliverableId]
  )

  const getTaskDueDate = (task: any) => {
    if (!task) return null
    const rawDate = task.dueDate || task.end || task.due
    if (!rawDate) return null
    const due = rawDate.toDate ? rawDate.toDate() : new Date(rawDate)
    return isNaN(due.getTime()) ? null : due
  }

  const wasTaskUpdatedThisWeek = (task: any) => {
    const referenceDate = task?.updatedAt || task?.modifiedAt || task?.createdAt || task?.start
    if (!referenceDate) return false
    const date = referenceDate.toDate ? referenceDate.toDate() : new Date(referenceDate)
    if (isNaN(date.getTime())) return false
    const now = new Date()
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  }

  const hasTaskDependencies = (task: any) => Array.isArray(task?.dependencies) && task.dependencies.length > 0

  const isTaskBlocked = (task: any) => task?.status === "blocked" || task?.status === "at-risk"

  const isTaskOverdue = (task: any) => {
    const due = getTaskDueDate(task)
    if (!due) return false
    return due.getTime() < Date.now() && task?.status !== "done" && task?.status !== "completed"
  }

  const isTaskDueSoon = (task: any) => {
    const due = getTaskDueDate(task)
    if (!due) return false
    const now = new Date()
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }

  const getTasksForSelectedDeliverable = useCallback(() => {
    const tasks = Array.isArray(selectedWorkpackage?.tasks) ? selectedWorkpackage?.tasks : []
    if (!selectedDeliverable) return tasks || []

    return tasks.filter(task => task.deliverableId === selectedDeliverable.id)
  }, [selectedWorkpackage?.tasks, selectedDeliverable])

  const handleQuickAddDeliverable = (workpackageId: string) => {
    if (!onCreateDeliverable) return
    const name = newDeliverableNames[workpackageId]?.trim()
    if (!name) return

    onCreateDeliverable({
      name,
      workpackageId,
      status: "not-started",
      progress: 0,
    })

    setNewDeliverableNames((current) => ({ ...current, [workpackageId]: "" }))
  }

  const handleQuickAddTask = () => {
    if (!selectedWorkpackage || !onUpdateWorkpackage) return
    const name = newTaskName.trim()
    if (!name) return

    const generateId = () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const newTask: Task = {
      id: generateId(),
      name,
      start: new Date(),
      end: new Date(),
      progress: 0,
      primaryOwner: selectedDeliverable?.ownerId,
      helpers: [],
      workpackageId: selectedWorkpackage.id,
      importance: "medium" as ImportanceLevel,
      deliverables: selectedDeliverable ? [selectedDeliverable.id] : [],
      status: "not-started",
      notes: "",
    }

    const nextTasks = [...(selectedWorkpackage.tasks || []), newTask]
    onUpdateWorkpackage(selectedWorkpackage.id, { tasks: nextTasks })
    setNewTaskName("")
  }

  const getPersonById = (personId?: string | null) =>
    teamMembers.find(member => member.id === personId) || null

  const getTaskStatusMeta = (status?: string) => {
    switch (status) {
      case "done":
      case "completed":
        return { label: "Completed", color: "bg-green-50 text-green-700 border-green-200", bar: "bg-green-500" }
      case "in-progress":
      case "working":
        return { label: "In progress", color: "bg-blue-50 text-blue-700 border-blue-200", bar: "bg-blue-500" }
      case "blocked":
      case "at-risk":
        return { label: "Blocked", color: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500" }
      default:
        return { label: "Planned", color: "bg-muted text-slate-700 border-border", bar: "bg-muted-foreground" }
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b border-border bg-surface-2 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground truncate">{project.name}</h1>
                <Badge className={`${getHealthStatusColor(computedHealth.status)} border-0`}>
                  <span className="capitalize">{computedHealth.status.replace("-", " ")}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={isFundedProject ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-700 border-gray-300"}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {isFundedProject ? "Funded" : "Unfunded"}
                </Badge>
                <Badge variant="secondary">{project.status}</Badge>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {project.grantNumber && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {project.grantNumber}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {startDate} - {endDate}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {project.teamMemberIds?.length || 0} team members
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              title="Export project snapshot"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>
      </div>

      <div className="border-b border-border bg-background px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
          <span className="flex items-center gap-1">
            <Folder className="h-4 w-4" />
            Projects
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate">{project.name}</span>
          {selectedWorkpackage && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground truncate">{selectedWorkpackage.name}</span>
            </>
          )}
          {selectedDeliverable && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground truncate">{selectedDeliverable.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant={drawerVisibility.stats ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("stats")}
            className="gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Stats
          </Button>
          <Button
            variant={drawerVisibility.funding ? "secondary" : "ghost"}
            size="sm"
            onClick={() => canAccessFunding && toggleDrawer("funding")}
            disabled={!canAccessFunding}
            className="gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Funding
          </Button>
          <Button
            variant={drawerVisibility.resources ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("resources")}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            Resources
          </Button>
          <Button
            variant={drawerVisibility.files ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("files")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Files
          </Button>
          <Button
            variant={drawerVisibility.activity ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("activity")}
            className="gap-2"
          >
            <Activity className="h-4 w-4" />
            Activity
          </Button>
          {onCreateWorkpackage && (
            <Button onClick={handleCreateWorkpackageClick} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Work Package
            </Button>
          )}
        </div>
      </div>

      {drawerVisibility.stats && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Work Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWorkpackages}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.completedWorkpackages} completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.taskCompletionRate}% complete</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.totalBudget || 0, project.currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(project.remainingBudget || 0, project.currency)} remaining
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysRemaining} days</div>
                <p className="text-xs text-muted-foreground mt-1">remaining until project end</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {drawerVisibility.funding && (
        <div className="border-b border-border bg-surface-2 px-6 py-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.totalBudget || 0, project.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Spent</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.spentAmount || 0, project.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.remainingBudget || 0, project.currency)}
                  </p>
                </div>
              </div>
              {project.totalBudget && project.totalBudget > 0 && (
                <div className="mt-4">
                  <Progress value={((project.spentAmount || 0) / project.totalBudget) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round(((project.spentAmount || 0) / project.totalBudget) * 100)}% of budget used
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {canAccessFunding && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Project Orders
                </CardTitle>
                <CardDescription>
                  {orderStats.totalOrders} order{orderStats.totalOrders !== 1 ? "s" : ""} •{" "}
                  {formatCurrency(orderStats.totalSpent, project.currency)} spent,{" "}
                  {formatCurrency(orderStats.totalCommitted, project.currency)} committed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders linked to this project</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Orders will appear here when created through project funding accounts
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-surface-2 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{orderStats.toOrderCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">To Order</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{orderStats.orderedCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Ordered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{orderStats.receivedCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Received</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium mb-3">Recent Orders</h4>
                      {orders.slice(0, 10).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface-2 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{order.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">{order.catNum}</p>
                              {order.supplier && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <p className="text-xs text-muted-foreground">{order.supplier}</p>
                                </>
                              )}
                              {order.allocationName && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {order.allocationName}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(order.priceExVAT, order.currency)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${order.status === "received"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : order.status === "ordered"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                }`}
                            >
                              {order.status === "to-order"
                                ? "To Order"
                                : order.status === "ordered"
                                  ? "Ordered"
                                  : "Received"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {orders.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Showing 10 of {orders.length} orders
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {drawerVisibility.resources && (
        <div className="border-b border-border bg-surface-2">
          <ProjectResources
            project={project}
            orders={orders}
            events={events}
            experiments={experiments}
            onViewOrder={(order) => onViewOrder?.(order.id)}
            onViewExperiment={(experiment) => onViewExperiment?.(experiment.id)}
            onViewEvent={(event) => onViewEvent?.(event.id)}
          />
        </div>
      )}

      {drawerVisibility.files && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">File management coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload and manage project documents, deliverables, and reports
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {drawerVisibility.activity && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Activity</CardTitle>
              <CardDescription>
                Discuss progress, ask questions, and collaborate with your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommentsSection
                entityType="project"
                entityId={project.id}
                teamMembers={teamMembers.map(m => ({
                  id: m.id,
                  name: `${m.firstName} ${m.lastName}`
                }))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr_360px] h-full">
          <Card className="bg-surface-2 border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PanelLeft className="h-4 w-4" />
                Structure
              </CardTitle>
              <CardDescription>Workpackages → Deliverables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workpackages.length === 0 && (
                <p className="text-sm text-muted-foreground">No work packages yet.</p>
              )}
              {workpackages.map((wp) => {
                const deliverablesForWp = getWorkpackageDeliverables(wp.id)
                const isSelected = wp.id === selectedWorkpackageId
                const isExpanded = expandedWorkpackages[wp.id]

                return (
                  <div
                    key={wp.id}
                    className={`rounded-lg border ${isSelected ? "border-brand-500 bg-brand-50/40" : "border-border"}`}
                  >
                    <button
                      onClick={() => {
                        setSelectedWorkpackageId(wp.id)
                        setSelectedDeliverableId(deliverablesForWp[0]?.id || null)
                      }}
                      className="w-full px-3 py-2 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleWorkpackageExpand(wp.id)
                            }}
                            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{wp.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {deliverablesForWp.length} deliverable{deliverablesForWp.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={wp.status === "completed" ? "default" : "outline"} className="text-[11px]">
                          {wp.status}
                        </Badge>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-background px-3 py-2 space-y-2">
                        {deliverablesForWp.length === 0 && (
                          <p className="text-xs text-muted-foreground">No deliverables yet.</p>
                        )}
                        {deliverablesForWp.map((deliverable) => (
                          <button
                            key={deliverable.id}
                            onClick={() => {
                              setSelectedWorkpackageId(wp.id)
                              setSelectedDeliverableId(deliverable.id)
                            }}
                            className={`w-full text-left px-2 py-1 rounded-md transition-colors ${deliverable.id === selectedDeliverableId ? "bg-brand-50 text-brand-900" : "hover:bg-muted/60"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{deliverable.name}</span>
                              <Badge variant="outline" className="text-[11px]">
                                {deliverable.status}
                              </Badge>
                            </div>
                            <Progress value={deliverable.progress || 0} className="h-1 mt-2" />
                          </button>
                        ))}

                        {onCreateDeliverable && (
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              placeholder="Quick add deliverable"
                              value={newDeliverableNames[wp.id] || ""}
                              onChange={(event) =>
                                setNewDeliverableNames((prev) => ({ ...prev, [wp.id]: event.target.value }))
                              }
                              className="h-9"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleQuickAddDeliverable(wp.id)}
                              disabled={!newDeliverableNames[wp.id]?.trim()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{selectedDeliverable?.name || "Select a deliverable"}</CardTitle>
                  {selectedWorkpackage && <CardDescription>{selectedWorkpackage.name}</CardDescription>}
                </div>
                {selectedDeliverable && (
                  <Badge variant="outline" className="capitalize">
                    {selectedDeliverable.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDeliverable ? (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deliverable progress</span>
                      <span className="font-medium">{selectedDeliverable.progress || 0}%</span>
                    </div>
                    <Progress value={selectedDeliverable.progress || 0} className="h-2" />
                  </div>

                  {selectedDeliverable.description && (
                    <p className="text-sm text-muted-foreground">{selectedDeliverable.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDeliverable.importance || "unspecified"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Owner: {teamMembers.find((p) => p.id === selectedDeliverable.ownerId)?.firstName || "Unassigned"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ListTodo className="h-4 w-4" />
                      <span>Open the detailed drawer for metrics, blockers, and links.</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDeliverableForPanel(selectedDeliverable)}>
                      Open Details
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a deliverable to view details.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-surface-2 border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PanelRight className="h-4 w-4" />
                Task execution
              </CardTitle>
              <CardDescription>Tasks linked to the selected deliverable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Quick add task"
                  value={newTaskName}
                  onChange={(event) => setNewTaskName(event.target.value)}
                  className="h-9"
                />
                <Button size="sm" onClick={handleQuickAddTask} disabled={!newTaskName.trim() || !onUpdateWorkpackage}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {getTasksForSelectedDeliverable().length === 0 && (
                <p className="text-sm text-muted-foreground">No tasks yet for this selection.</p>
              )}

              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {getTasksForSelectedDeliverable().map((task: any, idx: number) => {
                  const meta = getTaskStatusMeta(task?.status)
                  const owner = getPersonById(task?.primaryOwner)
                  const progressValue = typeof task?.progress === "number" ? task.progress : 0
                  const taskProblem = isTaskBlocked(task) || isTaskOverdue(task)

                  return (
                    <div key={task?.id || idx} className="p-3 rounded-lg border bg-background space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-muted">
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <p className="font-medium truncate">{task?.name || "Untitled task"}</p>
                        </div>
                        <Badge variant="outline" className={`text-[11px] ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`${meta.bar} h-1.5 rounded-full`} style={{ width: `${progressValue || 0}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{owner ? `${owner.firstName} ${owner.lastName}` : "Unassigned"}</span>
                        {taskProblem && <span className="text-red-600 font-medium">At risk</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <WorkpackageDialog
        open={workpackageDialogOpen}
        onOpenChange={setWorkpackageDialogOpen}
        workpackage={selectedWorkpackage}
        projectId={project.id}
        onSave={handleSaveWorkpackage}
        onDelete={workpackageDialogMode === "edit" ? handleDeleteWorkpackage : undefined}
        mode={workpackageDialogMode}
        availableLeads={teamMembers}
      />

      {selectedWorkpackageForDeliverable && (
        <DeliverableDialog
          open={deliverableDialogOpen}
          onOpenChange={setDeliverableDialogOpen}
          deliverable={selectedDeliverableDialog}
          workpackageId={selectedWorkpackageForDeliverable}
          onSave={handleSaveDeliverable}
          onDelete={
            deliverableDialogMode === "edit"
              ? () => selectedDeliverableDialog && handleDeleteDeliverable(selectedDeliverableDialog.id)
              : undefined
          }
          mode={deliverableDialogMode}
          availableOwners={teamMembers}
        />
      )}

      {selectedDeliverableForPanel && (
        <DeliverableDetailsPanel
          deliverable={selectedDeliverableForPanel}
          onClose={() => setSelectedDeliverableForPanel(null)}
          onEdit={onUpdateDeliverable ? handleEditDeliverable : undefined}
          onDelete={onDeleteDeliverable ? handleDeleteDeliverable : undefined}
          onUpdate={onUpdateDeliverable}
          orders={orders}
          people={teamMembers}
        />
      )}

      <ProjectExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        projectId={project.id}
        projectName={project.name}
        userId={currentUser?.uid || ""}
      />

      <ProjectImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportSuccess={handleImportSuccess}
        labId={currentUserProfile?.labId || ""}
        userId={currentUser?.uid || ""}
      />
    </div>
  )
}
