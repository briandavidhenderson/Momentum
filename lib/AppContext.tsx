"use client"

import { createContext, useContext } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useWorkpackages } from './hooks/useWorkpackages';
import { useOrders } from './hooks/useOrders';
import { useDayToDayTasks } from './hooks/useDayToDayTasks';
import { useEquipment } from './hooks/useEquipment';
import { usePolls } from './hooks/usePolls';
import { useELN } from './hooks/useELN';
import { useEvents } from './hooks/useEvents';
import { useUI } from './hooks/useUI';

const AppContext = createContext<any>(null);

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const projects = useProjects(auth.currentUser, auth.currentUserProfile);
  const workpackages = useWorkpackages(auth.currentUser);
  const orders = useOrders(auth.currentUserProfile);
  const dayToDayTasks = useDayToDayTasks(auth.currentUser);
  const equipment = useEquipment(auth.currentUserProfile);
  const polls = usePolls(auth.currentUserProfile);
  const eln = useELN(auth.currentUser);
  const events = useEvents(projects.projects, workpackages.workpackages, auth.currentUser);
  const ui = useUI();

  const value = {
    ...auth,
    ...projects,
    ...workpackages,
    ...orders,
    ...dayToDayTasks,
    ...equipment,
    ...polls,
    ...eln,
    ...events,
    ...ui,
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
