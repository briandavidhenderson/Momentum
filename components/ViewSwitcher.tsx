"use client"

import { useState, useEffect } from "react"
import { Building2, FolderKanban, Banknote, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PersonProfile, MasterProject, Lab, Funder } from "@/lib/types"
import {
  getMasterProjects,
  getLabs,
  getFunders,
  subscribeToMasterProjects
} from "@/lib/firestoreService"

type ViewType = "lab" | "project" | "funder"

interface ViewSwitcherProps {
  currentProfile: PersonProfile
  onViewChange?: (view: ViewType) => void
}

export default function ViewSwitcher({ currentProfile, onViewChange }: ViewSwitcherProps) {
  const [currentView, setCurrentView] = useState<ViewType>("lab")
  const [lab, setLab] = useState<Lab | null>(null)
  const [labProjects, setLabProjects] = useState<MasterProject[]>([])
  const [myProjects, setMyProjects] = useState<MasterProject[]>([])
  const [allFunders, setAllFunders] = useState<Funder[]>([])
  const [loading, setLoading] = useState(true)

  // Load lab and projects data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Load lab information
        if (currentProfile.labId) {
          const labs = await getLabs()
          const userLab = labs.find(l => l.id === currentProfile.labId)
          if (userLab) setLab(userLab)

          // Load lab projects
          const projects = await getMasterProjects({ labId: currentProfile.labId })
          setLabProjects(projects)
        }

        // Load user's projects
        const userProjects = await getMasterProjects({ personId: currentProfile.id })
        setMyProjects(userProjects)

        // Load all funders
        const funders = await getFunders()
        setAllFunders(funders)
      } catch (error) {
        console.error("Error loading view data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Subscribe to real-time updates for lab projects
    let unsubscribe: (() => void) | undefined
    if (currentProfile.labId) {
      unsubscribe = subscribeToMasterProjects(
        { labId: currentProfile.labId },
        (projects) => setLabProjects(projects)
      )
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [currentProfile.id, currentProfile.labId])

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    onViewChange?.(view)
  }

  const getViewStats = () => {
    switch (currentView) {
      case "lab":
        return {
          icon: Building2,
          title: `${lab?.name || "Lab"} View`,
          subtitle: `${labProjects.length} active projects`,
          description: "View all projects and members in your lab"
        }
      case "project":
        return {
          icon: FolderKanban,
          title: "My Projects",
          subtitle: `${myProjects.length} projects`,
          description: "Manage your assigned projects and tasks"
        }
      case "funder":
        return {
          icon: Banknote,
          title: "Funding Overview",
          subtitle: `${allFunders.length} funding sources`,
          description: "View projects organized by funding source"
        }
    }
  }

  const stats = getViewStats()
  const Icon = stats.icon

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading views...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="card-monday p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{stats.title}</h2>
              <p className="text-sm text-muted-foreground">{stats.subtitle}</p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mb-4">{stats.description}</p>

        {/* View Toggle Buttons */}
        <div className="flex gap-2">
          <Button
            variant={currentView === "lab" ? "default" : "outline"}
            onClick={() => handleViewChange("lab")}
            className="flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Lab View
            {labProjects.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
                {labProjects.length}
              </span>
            )}
          </Button>

          <Button
            variant={currentView === "project" ? "default" : "outline"}
            onClick={() => handleViewChange("project")}
            className="flex items-center gap-2"
          >
            <FolderKanban className="w-4 h-4" />
            My Projects
            {myProjects.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
                {myProjects.length}
              </span>
            )}
          </Button>

          <Button
            variant={currentView === "funder" ? "default" : "outline"}
            onClick={() => handleViewChange("funder")}
            className="flex items-center gap-2"
          >
            <Banknote className="w-4 h-4" />
            Funding View
          </Button>
        </div>
      </div>

      {/* Current View Content */}
      <div className="min-h-[400px]">
        {currentView === "lab" && (
          <LabViewContent
            lab={lab}
            projects={labProjects}
            currentProfile={currentProfile}
          />
        )}
        {currentView === "project" && (
          <ProjectViewContent
            projects={myProjects}
            currentProfile={currentProfile}
          />
        )}
        {currentView === "funder" && (
          <FunderViewContent
            funders={allFunders}
            projects={labProjects}
            currentProfile={currentProfile}
          />
        )}
      </div>
    </div>
  )
}

// Lab View Component
function LabViewContent({
  lab,
  projects,
  currentProfile
}: {
  lab: Lab | null
  projects: MasterProject[]
  currentProfile: PersonProfile
}) {
  if (!lab) {
    return (
      <div className="card-monday p-8 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Lab Assigned</h3>
        <p className="text-muted-foreground">
          You need to be assigned to a lab to view lab projects
        </p>
      </div>
    )
  }

  const activeProjects = projects.filter(p => p.status === "active")
  const planningProjects = projects.filter(p => p.status === "planning")
  const completedProjects = projects.filter(p => p.status === "completed")

  return (
    <div className="space-y-6">
      {/* Lab Info Card */}
      <div className="card-monday p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">{lab.name}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium">Institute:</span> {lab.instituteName}</p>
              <p><span className="font-medium">Organisation:</span> {lab.organisationName}</p>
              <p><span className="font-medium">Members:</span> {lab.memberCount || 0}</p>
              <p><span className="font-medium">Active Projects:</span> {lab.activeProjectCount || 0}</p>
            </div>
          </div>
          {lab.principalInvestigators && lab.principalInvestigators.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground mb-1">Principal Investigators</p>
              <div className="space-y-1">
                {lab.principalInvestigators.map((pi, idx) => (
                  <p key={idx} className="text-sm">{pi}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-monday p-4">
          <p className="text-sm text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeProjects.length}</p>
        </div>
        <div className="card-monday p-4">
          <p className="text-sm text-muted-foreground mb-1">Planning</p>
          <p className="text-2xl font-bold text-blue-600">{planningProjects.length}</p>
        </div>
        <div className="card-monday p-4">
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-bold text-gray-600">{completedProjects.length}</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Lab Projects</h3>
        {projects.length === 0 ? (
          <div className="card-monday p-8 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No projects in this lab yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                currentProfile={currentProfile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Project View Component
function ProjectViewContent({
  projects,
  currentProfile
}: {
  projects: MasterProject[]
  currentProfile: PersonProfile
}) {
  const myActiveProjects = projects.filter(p => p.status === "active")
  const isPIProjects = projects.filter(p =>
    p.principalInvestigatorIds?.includes(currentProfile.id)
  )

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-monday p-6">
          <div className="flex items-center gap-3 mb-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
          </div>
          <p className="text-3xl font-bold">{myActiveProjects.length}</p>
        </div>
        <div className="card-monday p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">As PI</p>
          </div>
          <p className="text-3xl font-bold">{isPIProjects.length}</p>
        </div>
      </div>

      {/* My Projects List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">My Projects</h3>
        {projects.length === 0 ? (
          <div className="card-monday p-8 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven&apos;t been assigned to any projects yet
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                currentProfile={currentProfile}
                showRole
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Funder View Component
function FunderViewContent({
  funders,
  projects,
  currentProfile
}: {
  funders: Funder[]
  projects: MasterProject[]
  currentProfile: PersonProfile
}) {
  const projectsByFunder = funders.map(funder => ({
    funder,
    projects: projects.filter(p => p.funderId === funder.id)
  })).filter(item => item.projects.length > 0)

  return (
    <div className="space-y-6">
      {/* Funding Overview */}
      <div className="card-monday p-6">
        <h3 className="text-lg font-semibold mb-4">Funding Sources</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Funders</p>
            <p className="text-2xl font-bold">{funders.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Active Funding</p>
            <p className="text-2xl font-bold">{projectsByFunder.length}</p>
          </div>
        </div>
      </div>

      {/* Projects by Funder */}
      <div className="space-y-6">
        {projectsByFunder.length === 0 ? (
          <div className="card-monday p-8 text-center">
            <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No funded projects in your lab</p>
          </div>
        ) : (
          projectsByFunder.map(({ funder, projects }) => (
            <div key={funder.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-semibold">{funder.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {funder.country} • {projects.length} project{projects.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    currentProfile={currentProfile}
                    showBudget
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Reusable Project Card Component
function ProjectCard({
  project,
  currentProfile,
  showRole = false,
  showBudget = false
}: {
  project: MasterProject
  currentProfile: PersonProfile
  showRole?: boolean
  showBudget?: boolean
}) {
  const isPI = project.principalInvestigatorIds?.includes(currentProfile.id)
  const userRole = project.teamRoles?.[currentProfile.id]

  const statusColors: Record<string, string> = {
    planning: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    on_hold: "bg-yellow-100 text-yellow-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700"
  }

  return (
    <div className="card-monday p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            {isPI && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                PI
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Grant</p>
          <p className="font-medium">{project.grantName || "N/A"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Funder</p>
          <p className="font-medium">{project.funderName || "N/A"}</p>
        </div>
      </div>

      {showBudget && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-bold">
              {project.currency} {project.totalBudget?.toLocaleString() || "0"}
            </span>
          </div>
          {project.remainingBudget !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Remaining</span>
                <span>{project.currency} {project.remainingBudget.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${project.totalBudget ? (project.remainingBudget / project.totalBudget * 100) : 0}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {showRole && userRole && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">Your Role</p>
          <p className="font-medium">{userRole}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {project.teamMemberIds?.length || 0} members
        </span>
        {project.startDate && (
          <span>
            {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}
