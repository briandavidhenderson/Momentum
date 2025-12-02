
import { useState } from 'react';
import { Order, Person, Task } from '@/lib/types';
import { DeletionImpact } from '@/lib/projectDeletion';

export function useUI() {
  const [activeDragPerson, setActiveDragPerson] = useState<Person | null>(null);
  const [activeDragOrder, setActiveDragOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [mainView, setMainView] = useState<'dashboard' | 'projects' | 'people' | 'profiles' | 'myprofile' | 'daytoday' | 'mytasks' | 'eln' | 'orders' | 'equipment' | 'bookings' | 'calendar' | 'whiteboard' | 'funding' | 'ledger' | 'privacy' | 'research' | 'explore' | 'reports' | 'safety' | 'samples' | 'mobile_home' | 'groups' | 'training' | 'bench' | 'scan' | 'settings'>('dashboard');
  const [taskDetailPanelOpen, setTaskDetailPanelOpen] = useState(false);
  const [taskDetailPanelTask, setTaskDetailPanelTask] = useState<Task | null>(null);
  const [taskDetailPanelWorkpackageId, setTaskDetailPanelWorkpackageId] = useState<string | null>(null);
  const [taskDetailPanelProjectId, setTaskDetailPanelProjectId] = useState<string | null>(null);
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [projectCreationDialogOpen, setProjectCreationDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const handleGanttContextAction = (payload: any) => {
    // This will be handled by the individual hooks
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (active.data.current?.type === 'person') {
      setActiveDragPerson(active.data.current.person);
    } else if (active.data.current?.type === 'order') {
      setActiveDragOrder(active.data.current.order);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveDragPerson(null);
    setActiveDragOrder(null);
    // This will be handled by the individual hooks
  };

  const handleOrderClick = (order: Order) => {
    setEditingOrder(order)
    setOrderDialogOpen(true)
  }

  return {
    activeDragPerson,
    activeDragOrder,
    activeTab,
    orderDialogOpen,
    editingOrder,
    mainView,
    taskDetailPanelOpen,
    taskDetailPanelTask,
    taskDetailPanelWorkpackageId,
    taskDetailPanelProjectId,
    deletionDialogOpen,
    deletionImpact,
    projectToDelete,
    showClearDialog,
    projectCreationDialogOpen,
    eventDialogOpen,
    editingEvent,
    commandPaletteOpen,
    setActiveTab,
    setOrderDialogOpen,
    setEditingOrder,
    setMainView,
    setTaskDetailPanelOpen,
    setTaskDetailPanelTask,
    setTaskDetailPanelWorkpackageId,
    setTaskDetailPanelProjectId,
    setDeletionDialogOpen,
    setDeletionImpact,
    setProjectToDelete,
    setShowClearDialog,
    setProjectCreationDialogOpen,
    setEventDialogOpen,
    setEditingEvent,
    setCommandPaletteOpen,
    handleGanttContextAction,
    handleDragStart,
    handleDragEnd,
    handleOrderClick,
  };
}
