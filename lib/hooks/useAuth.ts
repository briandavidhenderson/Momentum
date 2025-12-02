import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { getUser, findUserProfile, FirestoreUser as User } from '@/lib/firestoreService';
import { PersonProfile } from '@/lib/types';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';

export type AuthState = 'auth' | 'setup' | 'app';

export function useAuth() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<PersonProfile | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>('auth');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    // Ensure sessions persist across reload/back navigation
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      logger.error('Failed to set auth persistence', err);
    });
    setMounted(true);
    isMountedRef.current = true;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!isMountedRef.current) return;
        setAuthUser(firebaseUser); // Store the raw Firebase user
        setIsLoadingProfile(true);

        try {
          // 1. Get User Document
          const userData = await getUser(firebaseUser.uid);

          if (userData) {
            const user: User = {
              uid: userData.uid,
              email: userData.email,
              fullName: userData.fullName,
              profileId: userData.profileId,
              createdAt: userData.createdAt,
              isAdministrator: userData.isAdministrator,
            };

            if (isMountedRef.current) {
              setCurrentUser(user);
            }

            // 2. Subscribe to Profile Changes
            let profileUnsubscribe: () => void = () => { };

            const setupProfileSubscription = async () => {
              const db = getFirebaseDb();
              const { doc, onSnapshot, collection, query, where } = await import("firebase/firestore");

              // Determine how to find the profile
              let profileRef;

              if (userData.profileId) {
                // Direct reference if we have the ID
                profileRef = doc(db, "personProfiles", userData.profileId);

                profileUnsubscribe = onSnapshot(profileRef, (docSnap) => {
                  if (docSnap.exists() && isMountedRef.current) {
                    const profile = docSnap.data() as PersonProfile;
                    setCurrentUserProfile(profile);
                    setCurrentUserProfileId(profile.id);
                    setAuthState('app');
                    setIsLoadingProfile(false);
                    setIsAuthCheckComplete(true);
                  } else if (isMountedRef.current) {
                    // Profile ID exists on user but doc missing? Fallback to setup
                    setAuthState('setup');
                    setIsLoadingProfile(false);
                    setIsAuthCheckComplete(true);
                  }
                }, (error) => {
                  logger.error("Error subscribing to profile", error);
                  if (isMountedRef.current) {
                    setIsLoadingProfile(false);
                    setIsAuthCheckComplete(true);
                  }
                });
              } else {
                // Query by userId if no profileId yet
                const q = query(collection(db, "personProfiles"), where("userId", "==", firebaseUser.uid));

                profileUnsubscribe = onSnapshot(q, (querySnap) => {
                  if (!querySnap.empty && isMountedRef.current) {
                    const profile = querySnap.docs[0].data() as PersonProfile;
                    setCurrentUserProfile(profile);
                    setCurrentUserProfileId(profile.id);

                    // If we found a profile but user doc didn't have ID, we should probably update user doc
                    // But for now just update local state
                    setCurrentUser((prev) => {
                      if (prev && !prev.profileId) {
                        return { ...prev, profileId: profile.id };
                      }
                      return prev;
                    });
                    setAuthState('app');
                    setIsLoadingProfile(false);
                    setIsAuthCheckComplete(true);
                  } else if (isMountedRef.current) {
                    setAuthState('setup');
                    setIsLoadingProfile(false);
                    setIsAuthCheckComplete(true);
                  }
                }, (error) => {
                  logger.error("Error subscribing to profile", error);
                  if (isMountedRef.current) {
                    setIsLoadingProfile(false);
                    setIsAuthCheckComplete(true);
                  }
                });
              }
            };

            setupProfileSubscription();

          } else {
            // User authenticated but no user doc? Should not happen in normal flow
            // Maybe new user?
            setAuthState('setup');
            setIsLoadingProfile(false);
            setIsAuthCheckComplete(true);
          }
        } catch (error) {
          logger.error('Error fetching user data', error);
          setIsLoadingProfile(false);
          setIsAuthCheckComplete(true);
        }
      } else {
        if (isMountedRef.current) {
          setAuthUser(null);
          setCurrentUser(null);
          setCurrentUserProfile(null);
          setCurrentUserProfileId(null);
          setAuthState('auth');
          setIsLoadingProfile(false);
          setIsAuthCheckComplete(true);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribeAuth();
    };
  }, []);

  const handleLogin = () => {
    // Logic handled by UI (e.g. redirect to login page or show modal)
    // This might be a placeholder or used to trigger state change
  };

  const handleSignup = () => {
    // Logic handled by UI
  };

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setAuthUser(null);
      setCurrentUser(null);
      setCurrentUserProfile(null);
      setCurrentUserProfileId(null);
      setAuthState('auth');
    } catch (error) {
      logger.error('Error signing out', error);
      toast({
        title: "Sign Out Error",
        description: "Error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProfileSetupComplete = (profile: PersonProfile) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, profileId: profile.id };
      setCurrentUser(updatedUser);
    }
    setCurrentUserProfile(profile);
    setCurrentUserProfileId(profile.id);
    setAuthState('app');
    window.dispatchEvent(new CustomEvent('profiles-updated'));
  };

  return {
    authUser, // Expose raw Firebase user
    currentUser,
    currentUserProfile,
    currentUserProfileId,
    authState,
    isLoadingProfile,
    isAuthCheckComplete,
    mounted,
    handleLogin,
    handleSignup,
    handleSignOut,
    handleProfileSetupComplete,
  };
}
