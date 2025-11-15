"use client"

import { createContext, useContext, useMemo } from 'react';
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
import { useFunding } from './hooks/useFunding';
import { useProfiles } from './useProfiles';
import { personProfilesToPeople } from './personHelpers';

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
  const funding = useFunding(auth.currentUserProfile?.labId, auth.currentUser?.uid);

  // Fix Bug #3 & #4: Add profiles and convert to people for UI
  const allProfiles = useProfiles(auth.currentUserProfile?.labId || null);
  const people = useMemo(() => personProfilesToPeople(allProfiles), [allProfiles]);

  const value = {
    ...auth,
    ...projectsAndWorkpackages,
    ...orders,
    ...funding,
    ...dayToDayTasks,
    ...equipment,
    ...polls,
    ...eln,
    ...calendar,
    ...interfaceState,
    ...uiState,
    allProfiles,  // Expose profiles for components that need full profile data
    people,       // Expose people for UI components (assignee dropdowns, etc.)
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