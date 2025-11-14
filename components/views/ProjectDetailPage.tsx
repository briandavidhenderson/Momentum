"use client"

import { useState, useMemo } from "react"
import { MasterProject, Workpackage, PersonProfile, FundingAccount } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { WorkpackageDialog } from "@/components/WorkpackageDialog"
import { CommentsSection } from "@/components/CommentsSection"
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
} from "lucide-react"
import { formatCurrency } from "@/lib/constants"

interface ProjectDetailPageProps {
  project: MasterProject
  workpackages: Workpackage[]
  teamMembers: PersonProfile[]
  fundingAccounts: FundingAccount[]
  onBack: () => void
  onEdit?: () => void
  onCreateWorkpackage?: (workpackageData: Partial<Workpackage>) => void
  onUpdateWorkpackage?: (workpackageId: string, updates: Partial<Workpackage>) => void
  onDeleteWorkpackage?: (workpackageId: string) => void
}

export function ProjectDetailPage({
  project,
  workpackages,
  teamMembers,
  fundingAccounts,
  onBack,
  onEdit,
  onCreateWorkpackage,
  onUpdateWorkpackage,
  onDeleteWorkpackage,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [workpackageDialogOpen, setWorkpackageDialogOpen] = useState(false)
  const [selectedWorkpackage, setSelectedWorkpackage] = useState<Workpackage | null>(null)
  const [workpackageDialogMode, setWorkpackageDialogMode] = useState<"create" | "edit" | "view">("view")

  // Calculate project statistics
  const stats = useMemo(() => {
    const totalTasks = workpackages.reduce((sum, wp) => sum + (wp.tasks?.length || 0), 0)
    const completedTasks = workpackages.reduce(
      (sum, wp) => sum + (wp.tasks?.filter(t => t.status === "done").length || 0),
      0
    )
    const completedWorkpackages = workpackages.filter(wp => wp.status === "completed").length
    const atRiskWorkpackages = workpackages.filter(wp => wp.status === "atRisk").length

    return {
      totalWorkpackages: workpackages.length,
      completedWorkpackages,
      atRiskWorkpackages,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    }
  }, [workpackages])

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
    setSelectedWorkpackage(null)
    setWorkpackageDialogMode("create")
    setWorkpackageDialogOpen(true)
  }

  const handleViewWorkpackage = (wp: Workpackage) => {
    setSelectedWorkpackage(wp)
    setWorkpackageDialogMode("view")
    setWorkpackageDialogOpen(true)
  }

  const handleEditWorkpackage = (wp: Workpackage) => {
    setSelectedWorkpackage(wp)
    setWorkpackageDialogMode("edit")
    setWorkpackageDialogOpen(true)
  }

  const handleSaveWorkpackage = (workpackageData: Partial<Workpackage>) => {
    if (workpackageDialogMode === "create" && onCreateWorkpackage) {
      onCreateWorkpackage(workpackageData)
    } else if (workpackageDialogMode === "edit" && selectedWorkpackage && onUpdateWorkpackage) {
      onUpdateWorkpackage(selectedWorkpackage.id, workpackageData)
    }
    setWorkpackageDialogOpen(false)
  }

  const handleDeleteWorkpackage = () => {
    if (selectedWorkpackage && onDeleteWorkpackage) {
      if (confirm(`Are you sure you want to delete "${selectedWorkpackage.name}"?`)) {
        onDeleteWorkpackage(selectedWorkpackage.id)
        setWorkpackageDialogOpen(false)
      }
    }
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
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="workpackages" className="gap-2">
            <Package className="h-4 w-4" />
            Work Packages ({stats.totalWorkpackages})
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
                      Add work packages to organize your project tasks
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
                  <Card key={wp.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{wp.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {new Date(wp.start).toLocaleDateString()} - {new Date(wp.end).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              wp.status === "completed" ? "default" :
                              wp.status === "atRisk" ? "destructive" :
                              "secondary"
                            }
                          >
                            {wp.status || "planning"}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewWorkpackage(wp)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {onUpdateWorkpackage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditWorkpackage(wp)}
                                title="Edit workpackage"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">{wp.progress}%</span>
                          </div>
                          <Progress value={wp.progress} className="h-2" />
                        </div>

                        {/* Tasks Summary */}
                        {wp.tasks && wp.tasks.length > 0 && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {wp.tasks.filter(t => t.status === "done").length} / {wp.tasks.length} tasks
                            </span>
                            {wp.importance && (
                              <Badge variant="outline" className="text-xs">
                                {wp.importance}
                              </Badge>
                            )}
                          </div>
                        )}

                        {wp.notes && (
                          <p className="text-sm text-muted-foreground">{wp.notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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
      />
    </div>
  )
}
