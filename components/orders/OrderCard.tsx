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
import { Package, Edit, Trash2, Calendar, DollarSign, GripVertical, MoreVertical, Target, Lock, Globe, Eye, Users } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface OrderCardProps {
  order: Order
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
  deliverableName?: string
}

export function OrderCard({ order, onEdit, onDelete, deliverableName }: OrderCardProps) {
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

  const getVisibilityIcon = (visibility?: string) => {
    switch (visibility) {
      case 'private':
        return <Lock className="h-3 w-3" />
      case 'public':
        return <Globe className="h-3 w-3" />
      case 'shared':
        return <Users className="h-3 w-3" />
      case 'lab':
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  const getVisibilityLabel = (visibility?: string) => {
    switch (visibility) {
      case 'private':
        return 'Private'
      case 'public':
        return 'Public'
      case 'shared':
        return 'Shared'
      case 'lab':
      default:
        return 'Lab'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="order-card relative overflow-hidden group"
    >
      <div
        className="absolute inset-x-5 top-0 h-1 rounded-full"
        style={{ background: "var(--accent-gradient)" }}
      />
      {/* Header with Title and Menu */}
      <div className="flex items-start justify-between pb-3 mb-3 border-b border-border/70">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-accent rounded-md flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-9 w-9 rounded-xl bg-accent text-brand-700 grid place-items-center shadow-subtle flex-shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-base truncate">
              {order.productName || 'Unnamed Product'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={getStatusPillClass(order.status || 'to-order')}>
                {formatStatusLabel(order.status || 'to-order')}
              </span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal gap-1 text-muted-foreground border-border/60">
                {getVisibilityIcon(order.visibility)}
                {getVisibilityLabel(order.visibility)}
              </Badge>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ml-2 flex-shrink-0 hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
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
      <div className="space-y-4 mb-3">
        {/* Supplier and Catalog */}
        <div className="space-y-1.5 text-sm text-gray-600">
          {order.supplier && (
            <div className="flex justify-between items-center">
              <span>Supplier</span>
              <span className="font-semibold text-gray-900 truncate ml-2">{order.supplier}</span>
            </div>
          )}
          {order.catNum && (
            <div className="flex justify-between items-center">
              <span>Cat#</span>
              <span className="font-semibold text-gray-900 truncate ml-2">{order.catNum}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-1.5 text-xl font-semibold text-gray-900">
          <DollarSign className="h-5 w-5 text-brand-600" />
          <span className="tabular-nums">
            {order.currency || 'GBP'} {order.priceExVAT?.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Dates */}
        <div className="space-y-1.5 text-xs text-gray-600">
          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-brand-600" />
              <span>Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Account Info */}
        {order.accountName && (
          <div className="pt-3 border-t border-border/70 space-y-1">
            <div className="text-xs text-gray-500">Account</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{order.accountName}</div>
          </div>
        )}

        {/* Linked Deliverable */}
        {deliverableName && (
          <div className="pt-3 border-t border-border/70 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Target className="h-3 w-3 text-brand-600" />
              <span>Linked Deliverable</span>
            </div>
            <div className="text-sm font-semibold text-brand-700 truncate">{deliverableName}</div>
          </div>
        )}
      </div>
    </div>
  )
}
