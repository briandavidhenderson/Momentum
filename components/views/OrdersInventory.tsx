"use client"

import { useState } from "react"
import { useAppContext } from "@/lib/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  XCircle,
  Archive
} from "lucide-react"
import { Order, InventoryItem } from "@/lib/types"

export function OrdersInventory() {
  const {
    orders,
    inventory,
    handleCreateOrder,
    handleDeleteOrder,
    handleUpdateOrderField,
  } = useAppContext()

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders')

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'to-order': return 'bg-yellow-100 text-yellow-800'
      case 'ordered': return 'bg-blue-100 text-blue-800'
      case 'received': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'to-order': return <Clock className="h-4 w-4" />
      case 'ordered': return <ShoppingCart className="h-4 w-4" />
      case 'received': return <CheckCircle className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getInventoryLevelColor = (level: InventoryItem['inventoryLevel']) => {
    switch (level) {
      case 'empty': return 'bg-red-100 text-red-800 border-red-300'
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-green-100 text-green-800 border-green-300'
      case 'full': return 'bg-purple-100 text-purple-800 border-purple-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders & Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage lab orders and track inventory levels</p>
        </div>
        <Button
          onClick={handleCreateOrder}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <Button
          onClick={() => setActiveTab('orders')}
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          className={activeTab === 'orders' ? 'bg-brand-500 text-white' : ''}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Orders ({orders?.length || 0})
        </Button>
        <Button
          onClick={() => setActiveTab('inventory')}
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          className={activeTab === 'inventory' ? 'bg-brand-500 text-white' : ''}
        >
          <Package className="h-4 w-4 mr-2" />
          Inventory ({inventory?.length || 0})
        </Button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {orders?.filter((o: Order) => o.status === 'to-order').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">To Order</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {orders?.filter((o: Order) => o.status === 'ordered').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Ordered</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {orders?.filter((o: Order) => o.status === 'received').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded">
                  <Package className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {orders?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cat. Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders && orders.length > 0 ? (
                    orders.map((order: Order) => (
                      <tr key={order.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {order.productName || 'Unnamed Product'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {order.catNum || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {order.supplier || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {order.currency} {order.priceExVAT?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${getStatusColor(order.status)} gap-1`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {order.createdDate ? new Date(order.createdDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No orders yet. Click &quot;New Order&quot; to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-4 border border-red-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.filter((i: InventoryItem) => i.inventoryLevel === 'empty').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Empty</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-orange-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.filter((i: InventoryItem) => i.inventoryLevel === 'low').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-green-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.filter((i: InventoryItem) => i.inventoryLevel === 'medium').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Medium</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded">
                  <Archive className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {inventory?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory && inventory.length > 0 ? (
              inventory.map((item: InventoryItem) => (
                <div
                  key={item.id}
                  className={`bg-card rounded-lg border-2 p-4 ${getInventoryLevelColor(item.inventoryLevel)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <h3 className="font-semibold text-foreground">{item.productName}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.inventoryLevel}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cat. Number:</span>
                      <span className="font-medium">{item.catNum || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{item.currentQuantity || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min. Qty:</span>
                      <span className="font-medium">{item.minQuantity || 0}</span>
                    </div>
                    {item.notes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Notes:</span>
                        <span className="font-medium text-xs">{item.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                No inventory items found. Items will appear here when orders are received.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
