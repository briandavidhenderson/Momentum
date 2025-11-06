
import { useState } from 'react';
import { Order, Person, Task } from '@/lib/types';
import { DeletionImpact } from '@/lib/projectDeletion';

export function useUI() {
  const [activeDragPerson, setActiveDragPerson] = useState<Person | null>(null);
  const [activeDragOrder, setActiveDragOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [mainView, setMainView] = useState<'projects' | 'people' | 'profiles' | 'myprofile' | 'daytoday' | 'eln' | 'orders' | 'equipment' | 'calendar'>('myprofile');
  const [deliverablesWidgetTask, setDeliverablesWidgetTask] = useState<Task | null>(null);
  const [taskDetailPanelOpen, setTaskDetailPanelOpen] = useState(false);
  const [taskDetailPanelTask, setTaskDetailPanelTask] = useState<Task | null>(null);
  const [taskDetailPanelWorkpackageId, setTaskDetailPanelWorkpackageId] = useState<string | null>(null);
  const [taskDetailPanelProjectId, setTaskDetailPanelProjectId] = useState<string | null>(null);
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deliverablesWidgetPosition, setDeliverablesWidgetPosition] = useState({ x: 0, y: 0 });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [projectCreationDialogOpen, setProjectCreationDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  const handleTaskClick = (task: Task) => {
    const rect = document.querySelector('.gantt-container')?.getBoundingClientRect();
    setDeliverablesWidgetPosition({
      x: (rect?.right || window.innerWidth / 2) - 450,
      y: rect?.top || 100,
    });
    setDeliverablesWidgetTask(task);
  };

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
    deliverablesWidgetTask,
    taskDetailPanelOpen,
    taskDetailPanelTask,
    taskDetailPanelWorkpackageId,
    taskDetailPanelProjectId,
    deletionDialogOpen,
    deletionImpact,
    projectToDelete,
    deliverablesWidgetPosition,
    showClearDialog,
    projectCreationDialogOpen,
    eventDialogOpen,
    editingEvent,
    setActiveTab,
    setOrderDialogOpen,
    setEditingOrder,
    setMainView,
    setDeliverablesWidgetTask,
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
    handleTaskClick,
    handleGanttContextAction,
    handleDragStart,
    handleDragEnd,
    handleOrderClick,
  };
}
