const statusColorMap: Record<string, string> = {
  // Workpackage + project style statuses
  planning: "bg-gray-100 text-gray-700 border-gray-300",
  active: "bg-blue-100 text-blue-700 border-blue-300",
  "at-risk": "bg-orange-100 text-orange-700 border-orange-300",
  completed: "bg-green-100 text-green-700 border-green-300",
  "on-hold": "bg-yellow-100 text-yellow-700 border-yellow-300",

  // Task / deliverable style statuses
  "not-started": "bg-gray-100 text-gray-700 border-gray-300",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-300",
  done: "bg-green-100 text-green-700 border-green-300",
  blocked: "bg-red-100 text-red-700 border-red-300",
}

const defaultStatusClasses = "bg-gray-100 text-gray-700 border-gray-300"

export const getStatusPillClass = (status?: string | null) => {
  const normalized = (status || "").toLowerCase()
  const colorClasses = statusColorMap[normalized] || defaultStatusClasses

  return `status-pill ${colorClasses}`
}

export const formatStatusLabel = (status?: string | null) => {
  if (!status) return "Not Started"

  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
