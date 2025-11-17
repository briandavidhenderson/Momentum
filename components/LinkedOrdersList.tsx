"use client"

import { Order } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Plus, ExternalLink } from "lucide-react"

interface LinkedOrdersListProps {
  orders: Order[]
  onAddOrder?: () => void
  onOrderClick?: (order: Order) => void
  showAddButton?: boolean
  emptyMessage?: string
}

export function LinkedOrdersList({
  orders,
  onAddOrder,
  onOrderClick,
  showAddButton = false,
  emptyMessage = "No orders linked",
}: LinkedOrdersListProps) {
  // Calculate total value
  const totalValue = orders.reduce(
    (sum, order) => sum + (order.priceExVAT || 0),
    0
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "to-order":
        return "bg-gray-100 text-gray-700 border-gray-300"
      case "ordered":
        return "bg-blue-100 text-blue-700 border-blue-300"
      case "received":
        return "bg-green-100 text-green-700 border-green-300"
      default:
        return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  const formatStatusLabel = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-foreground">
            Linked Orders ({orders.length})
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {totalValue > 0 && (
            <span className="text-sm font-semibold text-green-600">
              Total: £{totalValue.toFixed(2)}
            </span>
          )}
          {showAddButton && onAddOrder && (
            <Button variant="outline" size="sm" onClick={onAddOrder}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Link Order
            </Button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-white border border-gray-200 p-3 rounded-md transition-all ${
                onOrderClick
                  ? "hover:border-blue-300 hover:shadow-sm cursor-pointer"
                  : ""
              }`}
              onClick={() => onOrderClick && onOrderClick(order)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {order.productName}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {order.supplier} • Cat# {order.catNum}
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {order.currency || "GBP"} {order.priceExVAT?.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={getStatusColor(order.status || "to-order")}
                >
                  {formatStatusLabel(order.status || "to-order")}
                </Badge>

                {order.expectedDeliveryDate && (
                  <span className="text-xs text-gray-600">
                    Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {order.notes && (
                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-md border border-dashed border-gray-300">
          <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{emptyMessage}</p>
          {showAddButton && onAddOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddOrder}
              className="mt-3"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Link Your First Order
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
