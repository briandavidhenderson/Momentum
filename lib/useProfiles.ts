"use client"

import { useState, useEffect, useRef } from "react"
import { PersonProfile } from "./types"
import { subscribeToProfiles } from "./firestoreService"
import { useAuth } from './hooks/useAuth';

/**
 * Hook to get all profiles from Firestore with real-time synchronization
 * This enables the social network - all users see each other's profiles in real-time
 */
export function useProfiles(labId: string | null) {
  const [allProfiles, setAllProfiles] = useState<PersonProfile[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (labId) {
      // Subscribe to real-time profile updates from Firestore
      const unsubscribe = subscribeToProfiles({ labId }, (profiles) => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setAllProfiles(profiles)
        }
      })

      // Cleanup subscription on unmount
      return () => {
        isMountedRef.current = false;
        unsubscribe();
      };
    }
  }, [labId]);

  return allProfiles
}
