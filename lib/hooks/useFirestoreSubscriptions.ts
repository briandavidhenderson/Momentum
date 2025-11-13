/**
 * Custom hooks for Firestore real-time subscriptions
 * Manages subscription lifecycle and integrates with Zustand store
 * Prevents memory leaks by properly cleaning up subscriptions
 */

import { useEffect, useRef } from "react"
import { useStore } from "../store"
import {
  subscribeToProfiles,
  subscribeToProjects,
  subscribeToWorkpackages,
  subscribeToEvents,
  subscribeToOrders,
  subscribeToInventory,
  subscribeToEquipment,
  subscribeToLabPolls,
  subscribeToELNExperiments,
  subscribeToDayToDayTasks,
} from "../firestoreService"
import { personProfilesToPeople } from "../personHelpers"
import type { Unsubscribe } from "firebase/firestore"

/**
 * Hook to subscribe to all person profiles
 * Automatically converts PersonProfiles to People for UI display
 */
export function useProfilesSubscription(labId: string | null) {
  const setProfiles = useStore((state) => state.setProfiles)
  const setPeople = useStore((state) => state.setPeople)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (labId) {
      unsubscribeRef.current = subscribeToProfiles({ labId }, (profiles) => {
        setProfiles(profiles)
        const people = personProfilesToPeople(profiles)
        setPeople(people)
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [setProfiles, setPeople, labId])
}

/**
 * Hook to subscribe to projects for a specific user
 * @param userId - The user ID to filter projects by
 */
export function useProjectsSubscription(userId: string | null) {
  const setProjects = useStore((state) => state.setProjects)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!userId) {
      setProjects([])
      return
    }

    unsubscribeRef.current = subscribeToProjects({ userId }, (projects) => {
      setProjects(projects)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userId, setProjects])
}

/**
 * Hook to subscribe to workpackages for a specific profile project
 * @param profileProjectId - The profile project ID to filter workpackages by
 */
export function useWorkpackagesSubscription(profileProjectId: string | null) {
  const setWorkpackages = useStore((state) => state.setWorkpackages)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!profileProjectId) {
      setWorkpackages([])
      return
    }

    unsubscribeRef.current = subscribeToWorkpackages(
      { profileProjectId },
      (workpackages) => {
        setWorkpackages(workpackages)
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [profileProjectId, setWorkpackages])
}

/**
 * Hook to subscribe to calendar events
 */
export function useEventsSubscription(labId: string | null) {
  const setEvents = useStore((state) => state.setEvents)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (labId) {
      unsubscribeRef.current = subscribeToEvents({ labId }, (events) => {
        setEvents(events)
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [setEvents, labId])
}

/**
 * Hook to subscribe to orders
 */
export function useOrdersSubscription(labId: string | null) {
  const setOrders = useStore((state) => state.setOrders)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (labId) {
      unsubscribeRef.current = subscribeToOrders({ labId }, (orders) => {
        setOrders(orders)
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [setOrders, labId])
}

/**
 * Hook to subscribe to inventory items
 */
export function useInventorySubscription(labId: string | null) {
  const setInventory = useStore((state) => state.setInventory)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (labId) {
      unsubscribeRef.current = subscribeToInventory({ labId }, (inventory) => {
        setInventory(inventory)
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [setInventory, labId])
}

/**
 * Hook to subscribe to equipment devices
 * @param labId - The lab ID to filter equipment by
 */
export function useEquipmentSubscription(labId: string | null) {
  const setEquipment = useStore((state) => state.setEquipment)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!labId) {
      setEquipment([])
      return
    }

    unsubscribeRef.current = subscribeToEquipment(labId, (equipment) => {
      setEquipment(equipment)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [labId, setEquipment])
}

/**
 * Hook to subscribe to lab polls
 * @param labId - The lab ID to filter polls by
 */
export function useLabPollsSubscription(labId: string | null) {
  const setPolls = useStore((state) => state.setPolls)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!labId) {
      setPolls([])
      return
    }

    unsubscribeRef.current = subscribeToLabPolls({ labId }, (polls) => {
      setPolls(polls)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [labId, setPolls])
}

/**
 * Hook to subscribe to ELN experiments
 * @param labId - The lab ID to filter experiments by
 */
export function useELNExperimentsSubscription(labId: string | null) {
  const setELNExperiments = useStore((state) => state.setELNExperiments)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!labId) {
      setELNExperiments([])
      return
    }

    unsubscribeRef.current = subscribeToELNExperiments({ labId }, (experiments) => {
      setELNExperiments(experiments)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [labId, setELNExperiments])
}

/**
 * Hook to subscribe to day-to-day tasks
 * @param userId - The user ID to filter tasks by
 */
export function useDayToDayTasksSubscription(userId: string | null) {
  const setDayToDayTasks = useStore((state) => state.setDayToDayTasks)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!userId) {
      setDayToDayTasks([])
      return
    }

    unsubscribeRef.current = subscribeToDayToDayTasks({ userId }, (tasks) => {
      setDayToDayTasks(tasks)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userId, setDayToDayTasks])
}

/**
 * Master hook that subscribes to all data for the current user
 * Use this in the main app component to initialize all subscriptions
 * @param userId - Current user ID
 * @param labId - Current user's lab ID
 */
export function useAllSubscriptions(
  userId: string | null,
  labId: string | null
) {
  useProfilesSubscription(labId)
  useProjectsSubscription(userId)
  useEventsSubscription(labId)
  useOrdersSubscription(labId)
  useInventorySubscription(labId)
  useEquipmentSubscription(labId)
  useLabPollsSubscription(labId)
  useELNExperimentsSubscription(labId)
  useDayToDayTasksSubscription(userId)
}
