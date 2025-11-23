"use client"

import { useState, useEffect } from "react"
import { Deliverable, Order, PersonProfile } from "@/lib/types"
import { DayToDayTask } from "@/lib/dayToDayTypes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  X,
  Calendar,
  User,
  Target,
  Plus,
  Package,
  ListTodo,
  FlaskConical,
  AlertCircle,
  TrendingUp,
  FileText,
  Link as LinkIcon,
  Edit2,
  Trash2,
} from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { useAuth } from "@/lib/hooks/useAuth"

interface DeliverableDetailsPanelProps {
  deliverable: Deliverable | null
  onClose: () => void
  onEdit?: (deliverable: Deliverable) => void
  onDelete?: (deliverableId: string) => void
  onUpdate?: (deliverableId: string, updates: Partial<Deliverable>) => void
  orders?: Order[]
  dayToDayTasks?: DayToDayTask[]
  people?: PersonProfile[]
}

export function DeliverableDetailsPanel({
  deliverable,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
  orders = [],
  dayToDayTasks = [],
  people = [],
}: DeliverableDetailsPanelProps) {
  const { currentUser } = useAuth()
  const [isAddingBlocker, setIsAddingBlocker] = useState(false)
  const [newBlockerText, setNewBlockerText] = useState("")
  const [isAddingMetric, setIsAddingMetric] = useState(false)
  const [newMetricLabel, setNewMetricLabel] = useState("")
  const [newMetricValue, setNewMetricValue] = useState("")
  const [newMetricUnit, setNewMetricUnit] = useState("")
  const [newMetricTarget, setNewMetricTarget] = useState("")

  if (!deliverable) return null

  // Find owner
  const owner = people.find((p) => p.id === deliverable.ownerId)

  // Find linked entities
  const linkedOrders = orders.filter((o) =>
    deliverable.linkedOrderIds?.includes(o.id)
  )
  const linkedTasks = dayToDayTasks.filter((t) =>
    deliverable.linkedDayToDayTaskIds?.includes(t.id)
  )

  // Calculate statistics
  const totalOrderValue = linkedOrders.reduce(
    (sum, order) => sum + (order.priceExVAT || 0),
    0
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not-started":
        return "bg-gray-100 text-gray-700 border-gray-300"
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-300"
      case "at-risk":
        return "bg-orange-100 text-orange-700 border-orange-300"
      case "completed":
        return "bg-green-100 text-green-700 border-green-300"
      case "on-hold":
        return "bg-yellow-100 text-yellow-700 border-yellow-300"
      case "blocked":
        return "bg-red-100 text-red-700 border-red-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "low":
        return "bg-gray-100 text-gray-700"
      case "medium":
        return "bg-blue-100 text-blue-700"
      case "high":
        return "bg-orange-100 text-orange-700"
      case "critical":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const handleAddBlocker = () => {
    if (!newBlockerText.trim() || !onUpdate) return

    const currentBlockers = deliverable.blockers || []
    const newBlockers = [...currentBlockers, newBlockerText.trim()]

    onUpdate(deliverable.id, { blockers: newBlockers })
    setNewBlockerText("")
    setIsAddingBlocker(false)
  }

  const handleAddMetric = () => {
    if (!newMetricLabel.trim() || !onUpdate) return

    const newMetric: any = {
      id: crypto.randomUUID(),
      label: newMetricLabel.trim(),
      value: newMetricValue.trim(),
    }

    if (newMetricUnit.trim()) newMetric.unit = newMetricUnit.trim()
    if (newMetricTarget.trim()) newMetric.target = newMetricTarget.trim()

    const currentMetrics = deliverable.metrics || []
    const newMetrics = [...currentMetrics, newMetric]

    onUpdate(deliverable.id, { metrics: newMetrics })

    setNewMetricLabel("")
    setNewMetricValue("")
    setNewMetricUnit("")
    setNewMetricTarget("")
    setIsAddingMetric(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[700px] bg-background border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-surface-2">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-foreground">
                {deliverable.name}
              </h2>
            </div>
            {deliverable.description && (
              <p className="text-sm text-muted-foreground">
                {deliverable.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(deliverable)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Status and Importance */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className={getStatusColor(deliverable.status)}>
            {deliverable.status.replace("-", " ").toUpperCase()}
          </Badge>
          <Badge className={getImportanceColor(deliverable.importance)}>
            {deliverable.importance.toUpperCase()}
          </Badge>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Progress
            </span>
            <span className="text-sm font-bold text-foreground">
              {deliverable.progress}%
            </span>
          </div>
          <Progress value={deliverable.progress} className="h-3" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Key Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Key Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Owner */}
            {owner && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Owner</div>
                  <div className="font-medium">
                    {owner.firstName} {owner.lastName}
                  </div>
                </div>
              </div>
            )}

            {/* Due Date */}
            {deliverable.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-xs text-gray-500">Due Date</div>
                  <div className="font-medium">
                    {new Date(deliverable.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Start Date */}
            {deliverable.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-xs text-gray-500">Start Date</div>
                  <div className="font-medium">
                    {new Date(deliverable.startDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Contributors Count */}
            {deliverable.contributorIds && deliverable.contributorIds.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-xs text-gray-500">Contributors</div>
                  <div className="font-medium">
                    {deliverable.contributorIds.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {deliverable.notes && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Notes
            </h3>
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
              {deliverable.notes}
            </div>
          </div>
        )}

        {/* Blockers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Blockers ({deliverable.blockers?.length || 0})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingBlocker(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {deliverable.blockers && deliverable.blockers.length > 0 ? (
            <div className="space-y-2">
              {deliverable.blockers.map((blocker, index) => (
                <div
                  key={index}
                  className="bg-red-50 border border-red-200 p-3 rounded-md text-sm"
                >
                  {blocker}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No blockers</p>
          )}
          {isAddingBlocker && (
            <div className="flex gap-2">
              <Input
                placeholder="Describe the blocker..."
                value={newBlockerText}
                onChange={(e) => setNewBlockerText(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddBlocker}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingBlocker(false)
                  setNewBlockerText("")
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Metrics */}
        {deliverable.metrics && deliverable.metrics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Metrics
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingMetric(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {isAddingMetric && (
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-3">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input
                    placeholder="Label (e.g. Samples)"
                    value={newMetricLabel}
                    onChange={(e) => setNewMetricLabel(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Value (e.g. 15)"
                    value={newMetricValue}
                    onChange={(e) => setNewMetricValue(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Unit (e.g. mg)"
                    value={newMetricUnit}
                    onChange={(e) => setNewMetricUnit(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Target (e.g. 100)"
                    value={newMetricTarget}
                    onChange={(e) => setNewMetricTarget(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingMetric(false)
                      setNewMetricLabel("")
                      setNewMetricValue("")
                      setNewMetricUnit("")
                      setNewMetricTarget("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddMetric}>
                    Add Metric
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {deliverable.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="bg-blue-50 border border-blue-200 p-3 rounded-md"
                >
                  <div className="text-xs text-blue-700 font-medium">
                    {metric.label}
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {metric.value}
                    {metric.unit && (
                      <span className="text-sm ml-1">{metric.unit}</span>
                    )}
                  </div>
                  {metric.target && (
                    <div className="text-xs text-blue-600 mt-1">
                      Target: {metric.target}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked Orders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-600" />
              Linked Orders ({linkedOrders.length})
            </h3>
            {totalOrderValue > 0 && (
              <span className="text-sm font-semibold text-green-600">
                Total: £{totalOrderValue.toFixed(2)}
              </span>
            )}
          </div>
          {linkedOrders.length > 0 ? (
            <div className="space-y-2">
              {linkedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-50 border border-gray-200 p-3 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {order.productName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {order.supplier} • {order.catNum}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {order.currency} {order.priceExVAT?.toFixed(2)}
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No orders linked to this deliverable
            </p>
          )}
        </div>

        {/* Linked Day-to-Day Tasks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue-600" />
              Linked Day-to-Day Tasks ({linkedTasks.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Open create task dialog with deliverable pre-linked
                alert(`Create Task feature coming soon!\n\nThis will open the task creation dialog with deliverable "${deliverable.name}" pre-selected for linking.`)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Task
            </Button>
          </div>
          {linkedTasks.length > 0 ? (
            <div className="space-y-2">
              {linkedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-blue-50 border border-blue-200 p-3 rounded-md"
                >
                  <div className="font-medium text-sm">{task.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                    {task.importance && (
                      <Badge variant="outline" className="text-xs">
                        {task.importance}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No day-to-day tasks linked to this deliverable
            </p>
          )}
        </div>

        {/* Document Links */}
        {deliverable.linkedDocumentUrls && deliverable.linkedDocumentUrls.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Documents
            </h3>
            <div className="space-y-2">
              {deliverable.linkedDocumentUrls.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-purple-50 border border-purple-200 p-3 rounded-md hover:bg-purple-100 transition-colors"
                >
                  <LinkIcon className="h-4 w-4 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{doc.title}</div>
                    <div className="text-xs text-gray-600">{doc.provider}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {deliverable.tags && deliverable.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {deliverable.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {onDelete && (
        <div className="p-4 border-t border-border bg-surface-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(deliverable.id)}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Deliverable
          </Button>
        </div>
      )}
    </div>
  )
}
