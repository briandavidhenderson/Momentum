"use client"

import { createContext, useContext } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useOrders } from './hooks/useOrders';
import { useDayToDayTasks } from './hooks/useDayToDayTasks';
import { useEquipment } from './hooks/useEquipment';
import { usePolls } from './hooks/usePolls';
import { useELN } from './hooks/useELN';
import { useCalendar } from './hooks/useCalendar';
import { useInterface } from './hooks/useInterface';
import { useUI } from './hooks/useUI';

const AppContext = createContext<any>(null);

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const projectsAndWorkpackages = useProjects();
  const orders = useOrders();
  const dayToDayTasks = useDayToDayTasks();
  const equipment = useEquipment();
  const polls = usePolls();
  const eln = useELN();
  const calendar = useCalendar();
  const interfaceState = useInterface();
  const uiState = useUI();

  const value = {
    ...auth,
    ...projectsAndWorkpackages,
    ...orders,
    ...dayToDayTasks,
    ...equipment,
    ...polls,
    ...eln,
    ...calendar,
    ...interfaceState,
    ...uiState,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}