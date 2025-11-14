
import { useState, useEffect } from 'react';
import { Order, InventoryItem, InventoryLevel } from '@/lib/types';
import { useAuth } from './useAuth';
import { useToast } from '@/lib/toast';
import {
  createOrder,
  subscribeToOrders,
  updateOrder,
  deleteOrder,
  subscribeToInventory,
  updateInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
} from '@/lib/firestoreService';

export function useOrders() {
  const { currentUserProfile: profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!profile?.labId) return;

    const unsubscribeOrders = subscribeToOrders({ labId: profile.labId }, setOrders);
    const unsubscribeInventory = subscribeToInventory({ labId: profile.labId }, setInventory);

    return () => {
      unsubscribeOrders();
      unsubscribeInventory();
    };
  }, [profile]);

  const handleCreateOrder = async (orderData: Partial<Omit<Order, 'id' | 'createdBy' | 'orderedBy'>>) => {
    if (!profile) return;
    try {
      const newOrder: Omit<Order, 'id'> = {
        productName: orderData.productName || 'New Order',
        catNum: orderData.catNum || '',
        supplier: orderData.supplier || '',
        priceExVAT: orderData.priceExVAT || 0,
        currency: orderData.currency || 'GBP',
        status: orderData.status || 'to-order',
        orderedBy: profile.id,
        createdBy: profile.id,
        labId: profile.labId,
        createdDate: new Date(),
        funderId: orderData.funderId || '',
        funderName: orderData.funderName || '',
        accountName: orderData.accountName || '',
        masterProjectId: orderData.masterProjectId || '',
        masterProjectName: orderData.masterProjectName || '',
        accountId: orderData.accountId || '',
      };
      await createOrder(newOrder);
      toast({
        title: "Order created",
        description: `"${newOrder.productName}" has been added to orders.`,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      toast({
        title: "Order deleted",
        description: "The order has been removed.",
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      await updateOrder(orderId, updates);
      if (updates.status) {
        const statusNames = {
          'to-order': 'To Order',
          'ordered': 'Ordered',
          'received': 'Received'
        };
        toast({
          title: "Order updated",
          description: `Order moved to ${statusNames[updates.status]}.`,
        });
      } else {
        toast({
          title: "Order updated",
          description: "Your changes have been saved.",
        });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrderField = (orderId: string, field: keyof Order, value: any) => {
    handleUpdateOrder(orderId, { [field]: value });
  };
  
  const handleReorder = async (item: InventoryItem) => {
    if (!profile) return;
    try {
      const newOrder: Omit<Order, 'id'> = {
        productName: item.productName,
        catNum: item.catNum,
        supplier: '',
        accountId: item.chargeToAccount || '',
        accountName: '',
        funderId: '',
        funderName: '',
        masterProjectId: '',
        masterProjectName: '',
        priceExVAT: item.priceExVAT || 0,
        currency: 'GBP',
        status: 'to-order',
        orderedBy: profile.id,
        createdBy: profile.id,
        labId: profile.labId,
        category: item.category,
        subcategory: item.subcategory,
        chargeToAccount: item.chargeToAccount,
        createdDate: new Date(),
      };
      await createOrder(newOrder);
      await updateInventoryItem(item.id, { inventoryLevel: 'empty', lastOrderedDate: new Date() });
      toast({
        title: "Reorder created",
        description: `Order created for "${item.productName}".`,
      });
    } catch (error) {
      console.error('Error creating reorder:', error);
      toast({
        title: "Error",
        description: "Failed to create reorder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInventoryLevel = async (itemId: string, level: InventoryLevel) => {
    await updateInventoryItem(itemId, { inventoryLevel: level });
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    await deleteInventoryItem(itemId);
  };

  const handleUpdateInventoryNotes = async (itemId: string, notes: string) => {
    await updateInventoryItem(itemId, { notes });
  };

  return {
    orders,
    inventory,
    handleCreateOrder,
    handleDeleteOrder,
    handleUpdateOrder,
    handleUpdateOrderField,
    handleReorder,
    handleUpdateInventoryLevel,
    handleDeleteInventoryItem,
    handleUpdateInventoryNotes,
  };
}
