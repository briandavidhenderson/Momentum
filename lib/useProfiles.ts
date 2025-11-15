"use client"

import { useState, useEffect, useRef } from "react"
import { PersonProfile } from "./types"
import { subscribeToProfiles } from "./firestoreService"
import { useAuth } from './hooks/useAuth';

/**
 * Hook to get all profiles from Firestore with real-time synchronization
 * This enables the social network - all users see each other's profiles in real-time
 * @param labId - Optional lab ID to filter by. Pass null to get all profiles.
 */
export function useProfiles(labId: string | null = null) {
  const [allProfiles, setAllProfiles] = useState<PersonProfile[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to real-time profile updates from Firestore
    // If labId is null, fetch all profiles
    const unsubscribe = subscribeToProfiles(
      labId ? { labId } : null,
      (profiles) => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setAllProfiles(profiles)
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [labId]);

  return allProfiles
}
