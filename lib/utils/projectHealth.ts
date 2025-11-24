import { Deliverable, MasterProject, Workpackage } from "@/lib/types"

export type ProjectHealthStatus = "good" | "warning" | "at-risk"

export interface ProjectHealth {
  status: ProjectHealthStatus
  issues: string[]
  score: number
}

const HEALTH_COLOR_MAP: Record<ProjectHealthStatus, string> = {
  good: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "at-risk": "bg-red-100 text-red-700 border-red-200",
}

const now = () => new Date()

export function getHealthStatusColor(status: ProjectHealthStatus): string {
  return HEALTH_COLOR_MAP[status]
}

export function calculateProjectHealth(
  project: MasterProject,
  deliverables: Deliverable[],
  workpackages: Workpackage[]
): ProjectHealth {
  const projectWorkpackages = workpackages.filter(wp => project.workpackageIds?.includes(wp.id))
  const projectDeliverables = deliverables.filter(deliverable =>
    projectWorkpackages.some(wp => wp.id === deliverable.workpackageId)
  )

  const issues: string[] = []
  let score = 0
  const today = now()

  // Track workpackage risk signals
  const atRiskWorkpackages = projectWorkpackages.filter(wp => wp.status === "at-risk")
  if (atRiskWorkpackages.length > 0) {
    score += atRiskWorkpackages.length
    issues.push(`${atRiskWorkpackages.length} workpackage${atRiskWorkpackages.length === 1 ? "" : "s"} flagged at risk`)
  }

  // Overdue deliverables
  const overdueDeliverables = projectDeliverables.filter(deliverable => {
    if (!deliverable.dueDate) return false
    const dueDate = new Date(deliverable.dueDate)
    return dueDate < today && deliverable.status !== "completed"
  })
  if (overdueDeliverables.length > 0) {
    score += Math.min(3, overdueDeliverables.length)
    issues.push(`${overdueDeliverables.length} deliverable${overdueDeliverables.length === 1 ? "" : "s"} overdue`)
  }

  // Progress vs timeline
  const projectStart = new Date(project.startDate)
  const projectEnd = new Date(project.endDate)
  const totalDuration = projectEnd.getTime() - projectStart.getTime()
  if (totalDuration > 0) {
    const elapsed = today.getTime() - projectStart.getTime()
    const expectedProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
    const currentProgress = project.progress || 0
    if (currentProgress + 10 < expectedProgress) {
      score += 1
      issues.push("Progress is trailing expected schedule")
    }
  }

  // Status warnings
  if (project.status === "on-hold" || project.status === "cancelled") {
    score += 2
    issues.push(`Project is currently ${project.status}`)
  }

  const status: ProjectHealthStatus = score >= 3 ? "at-risk" : score > 0 ? "warning" : "good"

  return { status, issues, score }
}
