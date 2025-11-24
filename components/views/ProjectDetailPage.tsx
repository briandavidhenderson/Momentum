"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { MasterProject, Workpackage, PersonProfile, FundingAccount, Order, Deliverable, CalendarEvent, ELNExperiment, Task, ImportanceLevel } from "@/lib/types"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { logger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { WorkpackageDialog } from "@/components/projects/WorkpackageDialog"
import { WorkpackageCard } from "@/components/projects/WorkpackageCard"
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
  Package,
  Activity,
  Edit,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Edit2,
  Sparkles,
  CalendarClock,
  Flame,
  X,
  ShoppingCart,
  Download,
  Upload,
  FlaskConical,
  ListTodo,
} from "lucide-react"
import { formatCurrency } from "@/lib/constants"
import { useAppContext } from "@/lib/AppContext"

interface ProjectDetailPageProps {
  project: MasterProject
  workpackages: Workpackage[]
  deliverables: Deliverable[]
  teamMembers: PersonProfile[]
  fundingAccounts: FundingAccount[]
  events?: CalendarEvent[]
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
  const [activeTab, setActiveTab] = useState("execution")
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

  // Get current user for import/export
  const { currentUser, currentUserProfile } = useAppContext()

  // Fetch project orders
  useEffect(() => {
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
  }, [project.id])

  // Fetch project experiments
  useEffect(() => {
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
  }, [project.id])

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

  // Get project health status
  const getHealthStatus = () => {
    if (stats.atRiskWorkpackages > 0) return { label: "At Risk", color: "text-red-600", bg: "bg-red-50" }
    if (project.progress >= 75) return { label: "On Track", color: "text-green-600", bg: "bg-green-50" }
    if (project.progress >= 50) return { label: "Good", color: "text-blue-600", bg: "bg-blue-50" }
    return { label: "Starting", color: "text-gray-600", bg: "bg-gray-50" }
  }

  const healthStatus = getHealthStatus()

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

  const getTasksForSelectedDeliverable = useCallback(() => {
    const tasks = Array.isArray(selectedWorkpackage?.tasks) ? selectedWorkpackage?.tasks : []
    if (!selectedDeliverable) return tasks || []

    return (tasks || []).filter((task: any) => {
      if (task?.deliverables && Array.isArray(task.deliverables)) {
        return task.deliverables.some((d: any) => d === selectedDeliverable.id || d?.id === selectedDeliverable.id)
      }
      if (task?.deliverableId) return task.deliverableId === selectedDeliverable.id
      // If no explicit mapping, include all tasks for the workpackage so users still see activity
      return true
    })
  }, [selectedWorkpackage, selectedDeliverable])

  const getTaskStatusMeta = (status?: string) => {
    switch (status) {
      case "completed":
      case "done":
        return { label: "Completed", color: "bg-green-100 text-green-800 border-green-200", bar: "bg-green-500" }
      case "in-progress":
      case "active":
        return { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", bar: "bg-blue-500" }
      case "at-risk":
      case "blocked":
        return { label: "Blocked", color: "bg-red-100 text-red-800 border-red-200", bar: "bg-red-500" }
      case "on-hold":
        return { label: "On Hold", color: "bg-yellow-100 text-yellow-800 border-yellow-200", bar: "bg-yellow-500" }
      default:
        return { label: "Not Started", color: "bg-gray-100 text-gray-800 border-gray-200", bar: "bg-gray-300" }
    }
  }

  const taskProblem = useMemo(() => {
    const tasks = getTasksForSelectedDeliverable()
    return tasks.some((t: any) => t?.status === "blocked" || t?.status === "at-risk")
  }, [getTasksForSelectedDeliverable])

  const getPersonById = (id?: string) => teamMembers.find(p => p.id === id)
  const getInitials = (person?: PersonProfile, fallback = "?") => {
    if (!person) return fallback
    return `${person.firstName?.[0] || ""}${person.lastName?.[0] || ""}`.toUpperCase() || fallback
  }

  const selectedWorkpackageTasks = useMemo(() => (
    Array.isArray(selectedWorkpackage?.tasks) ? selectedWorkpackage?.tasks : []
  ), [selectedWorkpackage])

  const addTaskTemplates = [
    "Draft experiment protocol",
    "Schedule kickoff review",
    "Validate latest dataset",
  ]

  const handleInlineTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    if (!selectedWorkpackage || !onUpdateWorkpackage) return

    const updatedTasks = selectedWorkpackageTasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    )

    await onUpdateWorkpackage(selectedWorkpackage.id, { tasks: updatedTasks })
  }

  const handleAddInlineTask = async (nameOverride?: string) => {
    const taskName = (nameOverride ?? newTaskName).trim()
    if (!selectedWorkpackage || !onUpdateWorkpackage || !taskName) return

    const newTask: Task = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name: taskName,
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      progress: 0,
      primaryOwner: undefined,
      helpers: [],
      workpackageId: selectedWorkpackage.id,
      importance: "medium",
      notes: "",
      deliverables: selectedDeliverable ? [selectedDeliverable.id] : [],
      status: "not-started",
      subtasks: [],
    }

    await onUpdateWorkpackage(selectedWorkpackage.id, {
      tasks: [newTask, ...selectedWorkpackageTasks],
    })
    setNewTaskName("")
  }

  const handleTaskInputChange = (value: string) => {
    if (value.startsWith("/task")) {
      const cleaned = value.replace("/task", "").trimStart()
      setNewTaskName(cleaned)
      return
    }
    setNewTaskName(value)
  }

  const cyclePriority = (current?: ImportanceLevel) => {
    const order: ImportanceLevel[] = ["low", "medium", "high", "critical"]
    const currentIndex = order.indexOf(current || "medium")
    const nextIndex = (currentIndex + 1) % order.length
    return order[nextIndex]
  }

  const toggleDueDate = (task: Task) => {
    const hasDueDate = !!task.end
    if (!hasDueDate) return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const cleared = new Date(task.end)
    if (!isNaN(cleared.getTime())) return undefined
    return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  }

  const handleAssigneeDrop = async (task: Task, ownerId?: string | null) => {
    if (!selectedWorkpackage || !onUpdateWorkpackage) return
    const nextOwner = ownerId === task.primaryOwner ? undefined : ownerId
    await handleInlineTaskUpdate(task.id, { primaryOwner: nextOwner || undefined })
  }

  const formatDueDateLabel = (task: Task) => {
    if (!task.end) return "Set due date"
    const endDate = new Date(task.end)
    if (isNaN(endDate.getTime())) return "Set due date"
    return endDate.toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
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
                <Badge variant="outline" className={`${healthStatus.bg} ${healthStatus.color} border-0`}>
                  {healthStatus.label}
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

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-6 bg-surface-2 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger value="execution" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Execution Board
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="workpackages" className="gap-2">
            <Package className="h-4 w-4" />
            Work Packages ({stats.totalWorkpackages})
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="funding" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Funding
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Execution Board Tab */}
          <TabsContent value="execution" className="p-6 m-0">
            <div className="grid gap-4 lg:grid-cols-[230px_260px_1fr] min-h-[420px]">
              {/* Workpackage list */}
              <Card className="bg-surface-2 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Work Packages</CardTitle>
                  <CardDescription>Pick a package to see its deliverables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workpackages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No work packages yet.</p>
                  )}
                  {workpackages.map((wp) => {
                    const isSelected = wp.id === selectedWorkpackageId
                    return (
                      <button
                        key={wp.id}
                        onClick={() => setSelectedWorkpackageId(wp.id)}
                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${isSelected ? "border-brand-500 bg-brand-50 text-brand-900" : "border-border hover:bg-muted/50"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{wp.name}</span>
                          <Badge variant={wp.status === "completed" ? "default" : "outline"} className="text-[11px]">
                            {wp.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {deliverables.filter(d => d.workpackageId === wp.id).length} deliverable{deliverables.filter(d => d.workpackageId === wp.id).length !== 1 ? "s" : ""}
                        </p>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Deliverable list */}
              <Card className="bg-surface-2 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deliverables</CardTitle>
                  <CardDescription>Choose a deliverable to view its tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deliverablesForSelectedWp.length === 0 && (
                    <p className="text-sm text-muted-foreground">No deliverables for this work package.</p>
                  )}
                  {deliverablesForSelectedWp.map((deliverable) => {
                    const isSelected = deliverable.id === selectedDeliverableId
                    return (
                      <button
                        key={deliverable.id}
                        onClick={() => setSelectedDeliverableId(deliverable.id)}
                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${isSelected ? "border-brand-500 bg-brand-50 text-brand-900" : "border-border hover:bg-muted/50"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{deliverable.name}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {deliverable.status}
                          </Badge>
                        </div>
                        <Progress value={deliverable.progress || 0} className="h-1.5 mt-2" />
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Deliverable detail + tasks */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">
                        {selectedDeliverable?.name || "Select a deliverable"}
                      </CardTitle>
                      {selectedWorkpackage && (
                        <CardDescription>{selectedWorkpackage.name}</CardDescription>
                      )}
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
                        <p className="text-sm text-muted-foreground">
                          {selectedDeliverable.description}
                        </p>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ListTodo className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold">To-do list</h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedOwnerId(member.id)
                                e.dataTransfer.setData("ownerId", member.id)
                              }}
                              onDragEnd={() => setDraggedOwnerId(null)}
                              className="flex items-center gap-2 px-2 py-1 rounded-full border text-xs hover:border-brand-500 hover:bg-brand-50 transition-colors"
                              title={`Drag to assign ${member.firstName} ${member.lastName}`}
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[11px] bg-muted">{getInitials(member, "")}</AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground">{member.firstName}</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Add task"
                            value={newTaskName}
                            onChange={(e) => handleTaskInputChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleAddInlineTask()
                              }
                            }}
                          />
                          <Button size="sm" onClick={handleAddInlineTask} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add task
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => {
                              const template = addTaskTemplates[0]
                              setNewTaskName(template)
                            }}
                            title="Use a starter template"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {addTaskTemplates.map(template => (
                          <Button
                            key={template}
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleAddInlineTask(template)}
                          >
                            {template}
                          </Button>
                        ))}
                      </div>

                        {getTasksForSelectedDeliverable().length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No tasks captured yet. Add tasks to track progress on this deliverable.
                          </p>
                        )}

                        <div className="space-y-2">
                          {getTasksForSelectedDeliverable().map((task: any, idx: number) => {
                            const meta = getTaskStatusMeta(task?.status)
                            const owner = getPersonById(task?.primaryOwner)
                            const progressValue = typeof task?.progress === "number" ? task.progress : 0
                            const dueDateLabel = formatDueDateLabel(task)
                            const isHovered = hoveredTaskId === task?.id
                            return (
                              <div
                                key={task?.id || idx}
                                className={`flex items-center gap-3 rounded-md border px-3 py-2 bg-surface-2 transition-all ${isHovered ? "ring-2 ring-brand-500 bg-brand-50" : ""}`}
                                onDragOver={(e) => {
                                  if (draggedOwnerId) {
                                    e.preventDefault()
                                  }
                                  setHoveredTaskId(task?.id || null)
                                }}
                                onDragLeave={() => setHoveredTaskId(null)}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  const ownerId = e.dataTransfer.getData("ownerId") || draggedOwnerId
                                  setHoveredTaskId(null)
                                  handleAssigneeDrop(task, ownerId)
                                }}
                              >
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                  {(idx + 1).toString().padStart(2, "0")}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{task?.name || "Untitled task"}</span>
                                    <Badge variant="outline" className={`text-[11px] ${meta.color}`}>
                                      {meta.label}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleInlineTaskUpdate(task.id, { importance: cyclePriority(task.importance as ImportanceLevel) })}
                                    >
                                      <Flame className="h-3 w-3 mr-1" />
                                      {task?.importance || "medium"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleInlineTaskUpdate(task.id, { end: toggleDueDate(task) })}
                                    >
                                      <CalendarClock className="h-3 w-3 mr-1" />
                                      {dueDateLabel}
                                    </Button>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`${meta.bar} h-1.5 rounded-full`}
                                      style={{ width: `${progressValue || 0}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className="text-xs bg-muted">
                                      {getInitials(owner, "??")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Unassign owner"
                                    onClick={() => handleAssigneeDrop(task, null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Overall status</span>
                          <span className="text-muted-foreground">auto-updates from tasks</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
                            <div
                              className="h-2 bg-green-500"
                              style={{ width: `${Math.max(5, selectedDeliverable.progress || 0)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{selectedDeliverable.progress || 0}%</span>
                        </div>
                        {taskProblem && (
                          <p className="text-sm text-red-600 mt-2">Problem detected in tasks �?� check blockers.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a deliverable to view its details and to-do list.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Work Packages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalWorkpackages}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.completedWorkpackages} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTasks}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.taskCompletionRate}% complete
                  </p>
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
                  <div className="text-2xl font-bold">{daysRemaining}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    days remaining
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Project Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Grant Name</label>
                    <p className="text-sm mt-1">{project.grantName || "N/A"}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Funder</label>
                    <p className="text-sm mt-1">{project.funderName || "N/A"}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Research Area</label>
                    <p className="text-sm mt-1">{project.researchArea || "N/A"}</p>
                  </div>

                  {project.tags && project.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {project.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Notes</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{project.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                  <CardDescription>
                    {project.teamMemberIds?.length || 0} members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {principalInvestigators.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Principal Investigators</label>
                        <div className="space-y-2 mt-2">
                          {principalInvestigators.map((pi) => (
                            <div key={pi.id} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-semibold">
                                {pi.firstName?.charAt(0)}{pi.lastName?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{pi.firstName} {pi.lastName}</p>
                                <p className="text-xs text-muted-foreground">{pi.position || "PI"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teamMembers.filter(m => !project.principalInvestigatorIds?.includes(m.id)).length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Team Members</label>
                        <div className="space-y-2 mt-2">
                          {teamMembers
                            .filter(m => !project.principalInvestigatorIds?.includes(m.id))
                            .map((member) => (
                              <div key={member.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center text-sm font-semibold">
                                  {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {project.teamRoles?.[member.id] || "Team Member"}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Work Packages Tab */}
          <TabsContent value="workpackages" className="p-6 m-0">
            {onCreateWorkpackage && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Work Packages</h3>
                  <p className="text-sm text-muted-foreground">
                    Organize project tasks into work packages
                  </p>
                </div>
                <Button onClick={handleCreateWorkpackageClick} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Work Package
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {workpackages.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No work packages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add work packages to organize your project deliverables
                    </p>
                    {onCreateWorkpackage && (
                      <Button onClick={handleCreateWorkpackageClick} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Work Package
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                workpackages.map((wp) => (
                  <WorkpackageCard
                    key={wp.id}
                    workpackage={wp}
                    deliverables={getWorkpackageDeliverables(wp.id)}
                    people={teamMembers}
                    onViewWorkpackage={handleViewWorkpackage}
                    onEditWorkpackage={onUpdateWorkpackage ? handleEditWorkpackage : undefined}
                    onCreateDeliverable={onCreateDeliverable ? handleCreateDeliverableClick : undefined}
                    onEditDeliverable={onUpdateDeliverable ? handleEditDeliverable : undefined}
                    onDeleteDeliverable={onDeleteDeliverable ? handleDeleteDeliverable : undefined}
                    onDeliverableClick={handleViewDeliverable}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="p-0 m-0">
            <ProjectResources
              project={project}
              orders={orders}
              events={events}
              experiments={experiments}
              onViewOrder={(order) => onViewOrder?.(order.id)}
              onViewExperiment={(experiment) => onViewExperiment?.(experiment.id)}
              onViewEvent={(event) => onViewEvent?.(event.id)}
            />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="p-6 m-0">
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">File management coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload and manage project documents, deliverables, and reports
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funding Tab */}
          <TabsContent value="funding" className="p-6 m-0">
            <div className="space-y-6">
              {/* Budget Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Budget</label>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(project.totalBudget || 0, project.currency)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Spent</label>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(project.spentAmount || 0, project.currency)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Remaining</label>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(project.remainingBudget || 0, project.currency)}
                      </p>
                    </div>
                  </div>

                  {project.totalBudget && project.totalBudget > 0 && (
                    <div className="mt-4">
                      <Progress
                        value={((project.spentAmount || 0) / project.totalBudget) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {Math.round(((project.spentAmount || 0) / project.totalBudget) * 100)}% of budget used
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Funding Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle>Funding Accounts</CardTitle>
                  <CardDescription>
                    {fundingAccounts.length} account{fundingAccounts.length !== 1 ? 's' : ''} linked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fundingAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No funding accounts linked</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Link funding accounts to track project expenses
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fundingAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{account.accountName}</p>
                            <p className="text-sm text-muted-foreground">
                              {account.accountNumber} • {account.funderName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(account.totalBudget || 0, account.currency)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {account.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Project Orders
                  </CardTitle>
                  <CardDescription>
                    {orderStats.totalOrders} order{orderStats.totalOrders !== 1 ? 's' : ''} • {formatCurrency(orderStats.totalSpent, project.currency)} spent, {formatCurrency(orderStats.totalCommitted, project.currency)} committed
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
                      {/* Order Statistics */}
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

                      {/* Recent Orders List */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium mb-3">Recent Orders</h4>
                        {orders.slice(0, 10).map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface-2 transition-colors">
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
                                className={`text-xs ${order.status === 'received' ? 'bg-green-50 text-green-700 border-green-200' :
                                  order.status === 'ordered' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}
                              >
                                {order.status === 'to-order' ? 'To Order' :
                                  order.status === 'ordered' ? 'Ordered' :
                                    'Received'}
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
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="p-6 m-0">
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
          </TabsContent>
        </div>
      </Tabs>

      {/* Workpackage Dialog */}
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

      {/* Deliverable Dialog */}
      {selectedWorkpackageForDeliverable && (
        <DeliverableDialog
          open={deliverableDialogOpen}
          onOpenChange={setDeliverableDialogOpen}
          deliverable={selectedDeliverableDialog}
          workpackageId={selectedWorkpackageForDeliverable}
          onSave={handleSaveDeliverable}
          onDelete={deliverableDialogMode === "edit" ? () => selectedDeliverableDialog && handleDeleteDeliverable(selectedDeliverableDialog.id) : undefined}
          mode={deliverableDialogMode}
          availableOwners={teamMembers}
        />
      )}

      {/* Deliverable Details Panel */}
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

      {/* Export Dialog */}
      <ProjectExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        projectId={project.id}
        projectName={project.name}
        userId={currentUser?.uid || ''}
      />

      {/* Import Dialog */}
      <ProjectImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportSuccess={handleImportSuccess}
        labId={currentUserProfile?.labId || ''}
        userId={currentUser?.uid || ''}
      />
    </div>
  )
}
