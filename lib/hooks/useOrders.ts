
import { useState, useEffect } from 'react';
import { Order, InventoryItem, InventoryLevel } from '@/lib/types';
import { useAuth } from './useAuth';

export function useOrders() {
  const { currentUserProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const storedOrders = localStorage.getItem('gantt-orders');
    if (storedOrders) {
      const parsed = JSON.parse(storedOrders);
      const ordersWithDates = parsed.map((o: any) => ({
        ...o,
        createdDate: new Date(o.createdDate),
        orderedDate: o.orderedDate ? new Date(o.orderedDate) : undefined,
        receivedDate: o.receivedDate ? new Date(o.receivedDate) : undefined,
      }));
      setOrders(ordersWithDates);
    }

    const storedInventory = localStorage.getItem('gantt-inventory');
    if (storedInventory) {
      const parsed = JSON.parse(storedInventory);
      const inventoryWithDates = parsed.map((i: any) => ({
        ...i,
        receivedDate: new Date(i.receivedDate),
        lastOrderedDate: i.lastOrderedDate ? new Date(i.lastOrderedDate) : undefined,
      }));
      setInventory(inventoryWithDates);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gantt-orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('gantt-inventory', JSON.stringify(inventory));
  }, [inventory]);

  const handleCreateOrder = () => {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      productName: '',
      catNum: '',
      supplier: '',
      accountId: 'temp_account_placeholder',
      accountName: 'Select Account',
      funderId: 'temp_funder_placeholder',
      funderName: 'Select Funder',
      masterProjectId: 'temp_project_placeholder',
      masterProjectName: 'Select Project',
      priceExVAT: 0,
      currency: 'GBP',
      status: 'to-order',
      orderedBy: currentUserProfile?.id || '',
      createdBy: currentUserProfile?.id || '',
      createdDate: new Date(),
    };
    setOrders((prev) => [...prev, newOrder]);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleUpdateOrderField = (orderId: string, field: 'productName' | 'catNum', value: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o))
    );
  };

  const handleUpdateChargeToAccount = (orderId: string, accountId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, chargeToAccount: accountId } : o))
    );
  };

  const handleUpdateCategory = (orderId: string, categoryId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, category: categoryId } : o))
    );
  };

  const handleUpdateSubcategory = (orderId: string, subcategory: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, subcategory: subcategory } : o))
    );
  };

  const handleUpdateOrderPrice = (orderId: string, price: number) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, priceExVAT: price } : o))
    );
  };

  const handleSaveOrder = (updatedOrder: Order) => {
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id);
      if (existingIndex >= 0) {
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      } else {
        return [...prev, updatedOrder];
      }
    });
  };

  const handleReorder = (item: InventoryItem) => {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      productName: item.productName,
      catNum: item.catNum,
      supplier: '',
      accountId: item.chargeToAccount || 'temp_account_placeholder',
      accountName: 'Select Account',
      funderId: 'temp_funder_placeholder',
      funderName: 'Select Funder',
      masterProjectId: 'temp_project_placeholder',
      masterProjectName: 'Select Project',
      priceExVAT: item.priceExVAT || 0,
      currency: 'GBP',
      status: 'to-order',
      orderedBy: currentUserProfile?.id || '',
      createdBy: currentUserProfile?.id || '',
      createdDate: new Date(),
      category: item.category,
      subcategory: item.subcategory,
      chargeToAccount: item.chargeToAccount,
    };
    setOrders((prev) => [...prev, newOrder]);
    setInventory((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, inventoryLevel: 'empty' as InventoryLevel, lastOrderedDate: new Date() } : i
      )
    );
  };

  const handleUpdateInventoryLevel = (itemId: string, level: InventoryLevel) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, inventoryLevel: level } : i))
    );
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleUpdateInventoryNotes = (itemId: string, notes: string) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, notes } : i))
    );
  };

  const removeDuplicateInventory = () => {
    setInventory((prev) => {
      const seen = new Map<string, InventoryItem>();
      return prev.filter((item) => {
        const key = `${item.productName}-${item.catNum}`;
        if (seen.has(key)) {
          return false;
        }
        seen.set(key, item);
        return true;
      });
    });
  };

  return {
    orders,
    inventory,
    handleCreateOrder,
    handleDeleteOrder,
    handleUpdateOrderField,
    handleUpdateChargeToAccount,
    handleUpdateCategory,
    handleUpdateSubcategory,
    handleUpdateOrderPrice,
    handleSaveOrder,
    handleReorder,
    handleUpdateInventoryLevel,
    handleDeleteInventoryItem,
    handleUpdateInventoryNotes,
    removeDuplicateInventory,
  };
}
