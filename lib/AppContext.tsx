"use client"

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useOptimisticProjects } from './hooks/useOptimisticProjects';
import { useOrders } from './hooks/useOrders';
import { useOptimisticDayToDayTasks } from './hooks/useOptimisticDayToDayTasks';
import { useEquipment } from './hooks/useEquipment';
import { usePolls } from './hooks/usePolls';
import { useELN } from './hooks/useELN';
import { useCalendar } from './hooks/useCalendar';
import { useInterface } from './hooks/useInterface';
import { useUI } from './hooks/useUI';
import { useFunding } from './hooks/useFunding';
import { useProfiles } from './useProfiles';
import { personProfilesToPeople } from './personHelpers';
import { PersonProfile, Person } from './types';

/**
 * AppContext Type Definition
 * Combines all hook return types for proper type safety
 */
type AppContextType = ReturnType<typeof useAuth> &
  ReturnType<typeof useOptimisticProjects> &
  ReturnType<typeof useOrders> &
  ReturnType<typeof useOptimisticDayToDayTasks> &
  ReturnType<typeof useEquipment> &
  ReturnType<typeof usePolls> &
  ReturnType<typeof useELN> &
  ReturnType<typeof useCalendar> &
  ReturnType<typeof useInterface> &
  ReturnType<typeof useUI> &
  Omit<ReturnType<typeof useFunding>, never> & {
    allProfiles: PersonProfile[]
    people: Person[]
  }

const AppContext = createContext<AppContextType | null>(null);

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const projectsAndWorkpackages = useOptimisticProjects();
  const orders = useOrders();
  const dayToDayTasks = useOptimisticDayToDayTasks();
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

/**
 * Hook to access AppContext with type safety
 * Throws error if used outside AppWrapper provider
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      'useAppContext must be used within an AppWrapper. ' +
      'Ensure your component is wrapped with <AppWrapper>.'
    );
  }

  return context;
}