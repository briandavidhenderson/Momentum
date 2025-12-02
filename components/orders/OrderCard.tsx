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
      {...listeners}
      className="order-card relative overflow-hidden group bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-all p-3 cursor-grab active:cursor-grabbing"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "var(--accent-gradient)" }}
      />

      {/* Header with Title and Menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-accent text-brand-700 grid place-items-center shadow-subtle flex-shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-sm truncate leading-tight">
              {order.productName || 'Unnamed Product'}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`${getStatusPillClass(order.status || 'to-order')} text-[10px] px-1.5 py-0.5 h-auto`}>
                {formatStatusLabel(order.status || 'to-order')}
              </span>
              <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal gap-1 text-muted-foreground border-border/60">
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
              className="h-6 w-6 p-0 ml-1 flex-shrink-0 hover:bg-secondary transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3 text-gray-500" />
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

      {/* Metadata Section - Compact */}
      <div className="space-y-1.5">
        {/* Price & Supplier Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 font-semibold text-gray-900">
            <DollarSign className="h-3 w-3 text-brand-600" />
            <span>
              {order.currency || 'GBP'} {order.priceExVAT?.toFixed(2) || '0.00'}
            </span>
          </div>
          {order.supplier && (
            <span className="text-gray-500 truncate max-w-[100px]">{order.supplier}</span>
          )}
        </div>

        {/* Cat# & Date Row */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          {order.catNum && (
            <span className="font-mono bg-slate-50 px-1 rounded border border-slate-100">{order.catNum}</span>
          )}
          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-brand-600" />
              <span>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Account Info */}
        {order.accountName && (
          <div className="pt-1.5 border-t border-border/50 flex items-center gap-1 text-[10px] text-gray-500">
            <span className="font-medium text-gray-700 truncate">{order.accountName}</span>
          </div>
        )}
      </div>
    </div>
  )
}
