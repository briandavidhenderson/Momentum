"use client"

import { Order } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Package, Edit, Trash2, Calendar, DollarSign, User, GripVertical, MoreVertical } from "lucide-react"
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

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'to-order':
        return 'status-pill status-pill-to-order'
      case 'ordered':
        return 'status-pill status-pill-ordered'
      case 'received':
        return 'status-pill status-pill-received'
      default:
        return 'status-pill'
    }
  }

  const formatStatusLabel = (status: string) => {
    return status.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header with Title and Menu */}
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
          <span className={getStatusPillClass(order.status)}>
            {formatStatusLabel(order.status)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ml-2 flex-shrink-0 hover:bg-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit(order)
              }}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(order.id)
              }}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metadata Section - Cleaner grouped layout */}
      <div className="space-y-3 mb-3">
        {/* Supplier and Catalog */}
        <div className="space-y-1.5 text-sm">
          {order.supplier && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Supplier</span>
              <span className="font-medium text-gray-900 truncate ml-2">{order.supplier}</span>
            </div>
          )}
          {order.catNum && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Cat#</span>
              <span className="font-medium text-gray-900 truncate ml-2">{order.catNum}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
          <DollarSign className="h-4 w-4 text-gray-500" />
          {order.currency} {order.priceExVAT?.toFixed(2) || '0.00'}
        </div>

        {/* Dates */}
        <div className="space-y-1.5 text-xs text-gray-600">
          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-blue-500" />
              <span>Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Account Info */}
        {order.accountName && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Account</div>
            <div className="text-sm font-medium text-gray-700 truncate">{order.accountName}</div>
          </div>
        )}
      </div>
    </div>
  )
}
