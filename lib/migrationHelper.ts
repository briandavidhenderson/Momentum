import { Deliverable, Task, Workpackage, Project } from "./types"

export function ensureDeliverableDefaults(deliverable: Deliverable): Deliverable {
  return {
    ...deliverable,
    status: deliverable.status ?? "not-started",
  }
}

export function ensureTaskDefaults(task: Task): Task {
  return {
    type: task.type ?? undefined,
    dependencies: task.dependencies ?? [],
    tags: task.tags ?? [],
    ...task,
    deliverables: (task.deliverables || []).map(ensureDeliverableDefaults),
  }
}

export function ensureWorkpackageDefaults(wp: Workpackage): Workpackage {
  return {
    ...wp,
    status: wp.status ?? "active",
    colorHex: wp.colorHex ?? undefined,
    ownerId: wp.ownerId ?? undefined,
    tasks: (wp.tasks || []).map(ensureTaskDefaults),
  }
}

export function ensureProjectDefaults(project: Project): Project {
  return {
    totalBudget: project.totalBudget ?? undefined,
    health: project.health ?? "good",
    ...project,
  }
}



