"use client"

import { Order } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Edit, Trash2, Calendar, DollarSign, User, GripVertical } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface OrderCardProps {
  order: Order
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
}

export function OrderCard({ order, onEdit, onDelete }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to-order':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'ordered':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'received':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded flex-shrink-0"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          <Package className="h-5 w-5 text-gray-500 flex-shrink-0" />
          <h3 className="font-semibold text-foreground text-sm truncate">
            {order.productName}
          </h3>
        </div>
        <Badge className={`${getStatusColor(order.status)} text-xs ml-2 flex-shrink-0`}>
          {order.status}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">Cat#:</span>
          <span className="truncate">{order.catNum || '-'}</span>
        </div>
        {order.supplier && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Supplier:</span>
            <span className="truncate">{order.supplier}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <DollarSign className="h-3 w-3" />
          <span className="font-semibold text-foreground">
            {order.currency} {order.priceExVAT?.toFixed(2) || '0.00'}
          </span>
        </div>
        {order.createdDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{new Date(order.createdDate).toLocaleDateString()}</span>
          </div>
        )}
        {order.expectedDeliveryDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-blue-500" />
            <span className="text-blue-600">
              Expected: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Funding Info */}
      {order.accountName && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
          <div className="font-medium text-gray-700">Account</div>
          <div className="text-gray-600 truncate">{order.accountName}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(order)
          }}
          className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(order.id)
          }}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
