import { MasterProject, Order } from "@/lib/types"

export interface ProjectBudgetSummary {
  projectId: string
  totalBudget: number
  spentAmount: number
  committedAmount: number
  remainingBudget: number
  utilizationPercentage: number
  currency: string
}

export function formatCurrency(value: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function getBudgetStatusColor(utilizationPercentage: number) {
  if (utilizationPercentage >= 100) return "bg-red-500"
  if (utilizationPercentage >= 85) return "bg-yellow-500"
  return "bg-green-500"
}

export function calculateBudgetsForProjects(
  projects: MasterProject[],
  orders: Order[]
): Map<string, ProjectBudgetSummary> {
  const summaries = new Map<string, ProjectBudgetSummary>()

  projects.forEach(project => {
    const projectOrders = orders.filter(order => order.masterProjectId === project.id)
    const totalBudget = project.totalBudget || 0
    const currency = project.currency || projectOrders[0]?.currency || "EUR"

    const spentAmount = projectOrders
      .filter(order => order.status === "received")
      .reduce((sum, order) => sum + (order.priceExVAT || 0), 0)

    const committedAmount = projectOrders
      .filter(order => order.status === "ordered")
      .reduce((sum, order) => sum + (order.priceExVAT || 0), 0)

    const remainingBudget = Math.max(0, totalBudget - spentAmount - committedAmount)
    const utilizationPercentage = totalBudget > 0
      ? Math.min(100, Math.round(((spentAmount + committedAmount) / totalBudget) * 100))
      : 0

    summaries.set(project.id, {
      projectId: project.id,
      totalBudget,
      spentAmount,
      committedAmount,
      remainingBudget,
      utilizationPercentage,
      currency,
    })
  })

  return summaries
}
