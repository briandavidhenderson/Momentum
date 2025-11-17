import { Project, Workpackage, Task, Subtask } from "./types"

export interface DeletionImpact {
  projectName: string
  projectType: "master" | "regular"
  workpackagesCount: number
  tasksCount: number
  subtasksCount: number
  deliverablesCount: number
}

/**
 * Calculate the impact of deleting a project
 */
export function calculateDeletionImpact(
  project: Project,
  workpackages: Workpackage[]
): DeletionImpact {
  // All projects use the workpackages structure now
  let workpackagesCount = 0
  let tasksCount = 0
  let subtasksCount = 0
  let deliverablesCount = 0

  // Count workpackages associated with this project
  const associatedWorkpackages = workpackages.filter(
    (wp) => wp.projectId === project.id
  )
  workpackagesCount = associatedWorkpackages.length

  // Count tasks and subtasks in workpackages
  associatedWorkpackages.forEach((wp) => {
    tasksCount += (wp.tasks || []).length
    ;(wp.tasks || []).forEach((task) => {
      deliverablesCount += (task.deliverables || []).length
      if (task.subtasks) {
        subtasksCount += task.subtasks.length
        task.subtasks.forEach((subtask: Subtask) => {
          if (subtask.deliverables) {
            deliverablesCount += subtask.deliverables.length
          }
        })
      }
    })
  })

  return {
    projectName: project.name,
    projectType: "master", // All projects are master projects now
    workpackagesCount,
    tasksCount,
    subtasksCount,
    deliverablesCount,
  }
}

/**
 * Delete a project and all associated workpackages
 */
export function deleteMasterProject(
  projectId: string,
  projects: Project[],
  workpackages: Workpackage[]
): { projects: Project[]; workpackages: Workpackage[] } {
  const project = projects.find((p) => p.id === projectId)
  if (!project) {
    return { projects, workpackages }
  }

  // Remove the project
  const newProjects = projects.filter((p) => p.id !== projectId)

  // Remove all associated workpackages
  const newWorkpackages = workpackages.filter(
    (wp) => wp.projectId !== projectId
  )

  return {
    projects: newProjects,
    workpackages: newWorkpackages,
  }
}

/**
 * Delete a regular project
 */
export function deleteRegularProject(
  projectId: string,
  projects: Project[]
): { projects: Project[] } {
  return {
    projects: projects.filter((p) => p.id !== projectId),
  }
}

/**
 * Delete a workpackage and all its tasks
 */
export function deleteWorkpackage(
  workpackageId: string,
  workpackages: Workpackage[]
): { workpackages: Workpackage[] } {
  return {
    workpackages: workpackages.filter((wp) => wp.id !== workpackageId),
  }
}

/**
 * Calculate the impact of deleting a workpackage
 */
export function calculateWorkpackageDeletionImpact(
  workpackage: Workpackage
): Omit<DeletionImpact, "projectName" | "projectType"> & { workpackageName: string } {
  let tasksCount = (workpackage.tasks || []).length
  let subtasksCount = 0
  let deliverablesCount = 0

  ;(workpackage.tasks || []).forEach((task) => {
    deliverablesCount += (task.deliverables || []).length
    if (task.subtasks) {
      subtasksCount += task.subtasks.length
      task.subtasks.forEach((subtask: Subtask) => {
        if (subtask.deliverables) {
          deliverablesCount += subtask.deliverables.length
        }
      })
    }
  })

  return {
    workpackageName: workpackage.name,
    workpackagesCount: 1,
    tasksCount,
    subtasksCount,
    deliverablesCount,
  }
}
