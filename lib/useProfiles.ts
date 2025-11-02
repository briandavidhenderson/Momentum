"use client"

import { useState, useEffect } from "react"
import { PersonProfile } from "./types"
import { subscribeToProfiles } from "./firestoreService"

/**
 * Hook to get all profiles from Firestore with real-time synchronization
 * This enables the social network - all users see each other's profiles in real-time
 */
export function useProfiles(): PersonProfile[] {
  const [allProfiles, setAllProfiles] = useState<PersonProfile[]>([])

  useEffect(() => {
    // Subscribe to real-time profile updates from Firestore
    const unsubscribe = subscribeToProfiles((profiles) => {
      setAllProfiles(profiles)
    })
    
    // Clean up subscription on unmount
    return () => unsubscribe()
  }, [])

  return allProfiles
}

/**
 * Get profiles for server components or initial render
 * Returns empty array since we load from Firestore client-side
 */
export function getAllProfiles(): PersonProfile[] {
  if (typeof window === "undefined") {
    return []
  }

  // For client-side, use the useProfiles hook instead
  return []
}

