/**
 * Global state management using Zustand
 * Centralizes all application state to avoid prop drilling and simplify state updates
 */

import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type {
  Project,
  Workpackage,
  PersonProfile,
  Person,
  CalendarEvent,
  Order,
  InventoryItem,
  EquipmentDevice,
  LabPoll,
  ELNExperiment,
} from "./types"
import type { DayToDayTask } from "./dayToDayTypes"
import type { FirestoreUser } from "./firestoreService"

// ============================================================================
// STATE TYPES
// ============================================================================

interface UserState {
  currentUser: FirestoreUser | null
  currentUserProfile: PersonProfile | null
  setCurrentUser: (user: FirestoreUser | null) => void
  setCurrentUserProfile: (profile: PersonProfile | null) => void
}

interface ProfilesState {
  profiles: PersonProfile[]
  people: Person[]
  setProfiles: (profiles: PersonProfile[]) => void
  setPeople: (people: Person[]) => void
  addProfile: (profile: PersonProfile) => void
  updateProfile: (id: string, updates: Partial<PersonProfile>) => void
  deleteProfile: (id: string) => void
}

interface ProjectsState {
  projects: Project[]
  workpackages: Workpackage[]
  setProjects: (projects: Project[]) => void
  setWorkpackages: (workpackages: Workpackage[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addWorkpackage: (workpackage: Workpackage) => void
  updateWorkpackage: (id: string, updates: Partial<Workpackage>) => void
  deleteWorkpackage: (id: string) => void
}

interface EventsState {
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
}

interface InventoryState {
  orders: Order[]
  inventory: InventoryItem[]
  equipment: EquipmentDevice[]
  setOrders: (orders: Order[]) => void
  setInventory: (inventory: InventoryItem[]) => void
  setEquipment: (equipment: EquipmentDevice[]) => void
  addOrder: (order: Order) => void
  updateOrder: (id: string, updates: Partial<Order>) => void
  deleteOrder: (id: string) => void
  addInventoryItem: (item: InventoryItem) => void
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void
  deleteInventoryItem: (id: string) => void
  addEquipment: (device: EquipmentDevice) => void
  updateEquipment: (id: string, updates: Partial<EquipmentDevice>) => void
  deleteEquipment: (id: string) => void
}

interface LabOpsState {
  polls: LabPoll[]
  elnExperiments: ELNExperiment[]
  setPolls: (polls: LabPoll[]) => void
  setELNExperiments: (experiments: ELNExperiment[]) => void
  addPoll: (poll: LabPoll) => void
  updatePoll: (id: string, updates: Partial<LabPoll>) => void
  deletePoll: (id: string) => void
  addELNExperiment: (experiment: ELNExperiment) => void
  updateELNExperiment: (id: string, updates: Partial<ELNExperiment>) => void
  deleteELNExperiment: (id: string) => void
}

interface DayToDayState {
  dayToDayTasks: DayToDayTask[]
  setDayToDayTasks: (tasks: DayToDayTask[]) => void
  addDayToDayTask: (task: DayToDayTask) => void
  updateDayToDayTask: (id: string, updates: Partial<DayToDayTask>) => void
  deleteDayToDayTask: (id: string) => void
}

interface UIState {
  activeTab: string
  isLoading: boolean
  selectedProjectIds: string[]
  selectedTaskIds: string[]
  searchQuery: string
  setActiveTab: (tab: string) => void
  setIsLoading: (loading: boolean) => void
  toggleProjectSelection: (id: string) => void
  toggleTaskSelection: (id: string) => void
  clearSelections: () => void
  setSearchQuery: (query: string) => void
}

type AppState = UserState &
  ProfilesState &
  ProjectsState &
  EventsState &
  InventoryState &
  LabOpsState &
  DayToDayState &
  UIState

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useStore = create<AppState>()(
  devtools(
    (set) => ({
      // User State
      currentUser: null,
      currentUserProfile: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentUserProfile: (profile) => set({ currentUserProfile: profile }),

      // Profiles State
      profiles: [],
      people: [],
      setProfiles: (profiles) => set({ profiles }),
      setPeople: (people) => set({ people }),
      addProfile: (profile) =>
        set((state) => ({ profiles: [...state.profiles, profile] })),
      updateProfile: (id, updates) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        })),

      // Projects State
      projects: [],
      workpackages: [],
      setProjects: (projects) => set({ projects }),
      setWorkpackages: (workpackages) => set({ workpackages }),
      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),
      addWorkpackage: (workpackage) =>
        set((state) => ({ workpackages: [...state.workpackages, workpackage] })),
      updateWorkpackage: (id, updates) =>
        set((state) => ({
          workpackages: state.workpackages.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),
      deleteWorkpackage: (id) =>
        set((state) => ({
          workpackages: state.workpackages.filter((w) => w.id !== id),
        })),

      // Events State
      events: [],
      setEvents: (events) => set({ events }),
      addEvent: (event) =>
        set((state) => ({ events: [...state.events, event] })),
      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),

      // Inventory State
      orders: [],
      inventory: [],
      equipment: [],
      setOrders: (orders) => set({ orders }),
      setInventory: (inventory) => set({ inventory }),
      setEquipment: (equipment) => set({ equipment }),
      addOrder: (order) =>
        set((state) => ({ orders: [...state.orders, order] })),
      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        })),
      deleteOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),
      addInventoryItem: (item) =>
        set((state) => ({ inventory: [...state.inventory, item] })),
      updateInventoryItem: (id, updates) =>
        set((state) => ({
          inventory: state.inventory.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),
      deleteInventoryItem: (id) =>
        set((state) => ({
          inventory: state.inventory.filter((i) => i.id !== id),
        })),
      addEquipment: (device) =>
        set((state) => ({ equipment: [...state.equipment, device] })),
      updateEquipment: (id, updates) =>
        set((state) => ({
          equipment: state.equipment.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      deleteEquipment: (id) =>
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        })),

      // Lab Ops State
      polls: [],
      elnExperiments: [],
      setPolls: (polls) => set({ polls }),
      setELNExperiments: (experiments) => set({ elnExperiments: experiments }),
      addPoll: (poll) =>
        set((state) => ({ polls: [...state.polls, poll] })),
      updatePoll: (id, updates) =>
        set((state) => ({
          polls: state.polls.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deletePoll: (id) =>
        set((state) => ({
          polls: state.polls.filter((p) => p.id !== id),
        })),
      addELNExperiment: (experiment) =>
        set((state) => ({
          elnExperiments: [...state.elnExperiments, experiment],
        })),
      updateELNExperiment: (id, updates) =>
        set((state) => ({
          elnExperiments: state.elnExperiments.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      deleteELNExperiment: (id) =>
        set((state) => ({
          elnExperiments: state.elnExperiments.filter((e) => e.id !== id),
        })),

      // Day-to-Day State
      dayToDayTasks: [],
      setDayToDayTasks: (tasks) => set({ dayToDayTasks: tasks }),
      addDayToDayTask: (task) =>
        set((state) => ({ dayToDayTasks: [...state.dayToDayTasks, task] })),
      updateDayToDayTask: (id, updates) =>
        set((state) => ({
          dayToDayTasks: state.dayToDayTasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      deleteDayToDayTask: (id) =>
        set((state) => ({
          dayToDayTasks: state.dayToDayTasks.filter((t) => t.id !== id),
        })),

      // UI State
      activeTab: "gantt",
      isLoading: false,
      selectedProjectIds: [],
      selectedTaskIds: [],
      searchQuery: "",
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      toggleProjectSelection: (id) =>
        set((state) => ({
          selectedProjectIds: state.selectedProjectIds.includes(id)
            ? state.selectedProjectIds.filter((pid) => pid !== id)
            : [...state.selectedProjectIds, id],
        })),
      toggleTaskSelection: (id) =>
        set((state) => ({
          selectedTaskIds: state.selectedTaskIds.includes(id)
            ? state.selectedTaskIds.filter((tid) => tid !== id)
            : [...state.selectedTaskIds, id],
        })),
      clearSelections: () =>
        set({ selectedProjectIds: [], selectedTaskIds: [] }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    { name: "momentum-store" }
  )
)

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

export const useCurrentUser = () => useStore((state) => state.currentUser)
export const useCurrentUserProfile = () =>
  useStore((state) => state.currentUserProfile)
export const useProfiles = () => useStore((state) => state.profiles)
export const usePeople = () => useStore((state) => state.people)
export const useProjects = () => useStore((state) => state.projects)
export const useWorkpackages = () => useStore((state) => state.workpackages)
export const useEvents = () => useStore((state) => state.events)
export const useOrders = () => useStore((state) => state.orders)
export const useInventory = () => useStore((state) => state.inventory)
export const useEquipment = () => useStore((state) => state.equipment)
export const usePolls = () => useStore((state) => state.polls)
export const useELNExperiments = () => useStore((state) => state.elnExperiments)
export const useDayToDayTasks = () => useStore((state) => state.dayToDayTasks)
export const useActiveTab = () => useStore((state) => state.activeTab)
export const useIsLoading = () => useStore((state) => state.isLoading)
export const useSearchQuery = () => useStore((state) => state.searchQuery)
export const useSelectedProjectIds = () =>
  useStore((state) => state.selectedProjectIds)
export const useSelectedTaskIds = () =>
  useStore((state) => state.selectedTaskIds)
