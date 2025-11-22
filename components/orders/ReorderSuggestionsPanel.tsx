"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ReorderSuggestion, Order, MasterProject } from "@/lib/types"
import { AlertTriangle, AlertCircle, Info, ShoppingCart, CheckCircle2, X, ChevronDown, ChevronUp } from "lucide-react"

interface ReorderSuggestionsPanelProps {
  suggestions: ReorderSuggestion[]
  masterProjects: MasterProject[]
  onCreateOrder: (suggestion: ReorderSuggestion) => void
  onCreateTask: (suggestion: ReorderSuggestion) => void
  onDismiss: (suggestionId: string) => void
}

export function ReorderSuggestionsPanel({
  suggestions,
  masterProjects,
  onCreateOrder,
  onCreateTask,
  onDismiss
}: ReorderSuggestionsPanelProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())

  if (suggestions.length === 0) {
    return (
      <div className="card-monday text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          All Stocked Up!
        </h3>
        <p className="text-sm text-muted-foreground">
          No reorder suggestions at this time. All inventory levels are sufficient.
        </p>
      </div>
    )
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedSuggestions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedSuggestions(newExpanded)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'medium':
        return <Info className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return "bg-red-100 text-red-700 border-red-300"
      case 'high':
        return "bg-orange-100 text-orange-700 border-orange-300"
      case 'medium':
        return "bg-yellow-100 text-yellow-700 border-yellow-300"
      default:
        return "bg-blue-100 text-blue-700 border-blue-300"
    }
  }

  const getPriorityBarColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return "bg-red-500"
      case 'high':
        return "bg-orange-500"
      case 'medium':
        return "bg-yellow-500"
      default:
        return "bg-blue-500"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          Reorder Suggestions
          <Badge className="ml-2 bg-red-500 text-white">
            {suggestions.length}
          </Badge>
        </h2>
        <p className="text-sm text-muted-foreground">
          Based on current stock and burn rates
        </p>
      </div>

      <div className="space-y-3">
        {suggestions.map(suggestion => {
          const isExpanded = expandedSuggestions.has(suggestion.inventoryItemId)
          const stockPercentage = (suggestion.currentQty / (suggestion.minQty * 2)) * 100

          return (
            <div
              key={suggestion.inventoryItemId}
              className={`card-monday border-l-4 ${
                suggestion.priority === 'urgent' ? 'border-l-red-500' :
                suggestion.priority === 'high' ? 'border-l-orange-500' :
                suggestion.priority === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  {getPriorityIcon(suggestion.priority)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title and Priority */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground text-lg">
                        {suggestion.itemName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        CAT# {suggestion.catNum}
                      </p>
                    </div>
                    <Badge className={`${getPriorityBadgeClass(suggestion.priority)} border font-semibold uppercase text-xs`}>
                      {suggestion.priority}
                    </Badge>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Current Stock</span>
                      <span className="font-semibold">
                        {suggestion.currentQty} / {suggestion.minQty} units
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getPriorityBarColor(suggestion.priority)}`}
                        style={{ width: `${Math.min(100, stockPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Weeks Remaining</p>
                      <p className="text-lg font-bold text-foreground">
                        {suggestion.weeksTillEmpty.toFixed(1)}w
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Burn Rate</p>
                      <p className="text-lg font-bold text-foreground">
                        {suggestion.totalBurnRate}/wk
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Suggested Qty</p>
                      <p className="text-lg font-bold text-foreground">
                        {suggestion.suggestedOrderQty}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Est. Cost</p>
                      <p className="text-lg font-bold text-foreground">
                        £{suggestion.estimatedCost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Equipment Using This Item */}
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Used by equipment:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.affectedEquipment.map(equip => (
                        <Badge key={equip.id} variant="outline" className="text-xs">
                          {equip.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {/* Project Breakdown */}
                      {suggestion.chargeToAccounts.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">
                            Cost Split by Project:
                          </p>
                          <div className="space-y-2">
                            {suggestion.chargeToAccounts.map((account, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {account.projectName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {account.accountName}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-foreground">
                                    £{account.amount.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ({account.percentage}%)
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Affected Projects */}
                      {suggestion.affectedProjects.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Affects Projects:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {suggestion.affectedProjects.map(proj => (
                              <Badge key={proj.id} className="bg-brand-100 text-brand-700">
                                {proj.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      onClick={() => onCreateOrder(suggestion)}
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                      size="sm"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Create Order
                    </Button>
                    <Button
                      onClick={() => onCreateTask(suggestion)}
                      variant="outline"
                      size="sm"
                    >
                      Add to Todo
                    </Button>
                    <Button
                      onClick={() => toggleExpanded(suggestion.inventoryItemId)}
                      variant="ghost"
                      size="sm"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Details
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => onDismiss(suggestion.inventoryItemId)}
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
