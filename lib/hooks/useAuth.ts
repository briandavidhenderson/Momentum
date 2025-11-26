
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { getUser, findUserProfile, FirestoreUser as User } from '@/lib/firestoreService';
import { PersonProfile } from '@/lib/types';
import { logger } from '@/lib/logger';

export type AuthState = 'auth' | 'setup' | 'app';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<PersonProfile | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>('auth');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    setMounted(true);
    isMountedRef.current = true;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!isMountedRef.current) return;
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
                  } else if (isMountedRef.current) {
                    // Profile ID exists on user but doc missing? Fallback to setup
                    setAuthState('setup');
                    setIsLoadingProfile(false);
                  }
                }, (error) => {
                  logger.error("Error subscribing to profile", error);
                  if (isMountedRef.current) setIsLoadingProfile(false);
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
                    if (currentUser && !currentUser.profileId) {
                      setCurrentUser({ ...currentUser, profileId: profile.id });
                    }

                    setAuthState('app');
                    setIsLoadingProfile(false);
                  } else if (isMountedRef.current) {
                    setAuthState('setup');
                    setIsLoadingProfile(false);
                  }
                }, (error) => {
                  logger.error("Error subscribing to profile query", error);
                  if (isMountedRef.current) setIsLoadingProfile(false);
                });
              }
            };

            await setupProfileSubscription();

            // Cleanup profile sub when auth state changes or component unmounts
            // Note: This is a bit tricky inside the auth listener. 
            // Ideally we'd store this unsubscribe somewhere, but for now this handles the immediate flow.
            // A more robust refactor might separate the profile subscription into its own effect.

          } else {
            // New user (no user doc yet)
            const tempUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: firebaseUser.displayName || '',
              profileId: null,
              createdAt: Timestamp.now(),
              isAdministrator: false,
            };
            if (isMountedRef.current) {
              setCurrentUser(tempUser);
              setAuthState('setup');
              setIsLoadingProfile(false);
            }
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          logger.error('Error loading user data', error);
          setAuthState('auth');
          setIsLoadingProfile(false);
        }
      } else {
        if (isMountedRef.current) {
          setCurrentUser(null);
          setCurrentUserProfile(null);
          setCurrentUserProfileId(null);
          setAuthState('auth');
          setIsLoadingProfile(false);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribeAuth();
    };
  }, []);

  const handleLogin = async (uid: string) => {
    // Re-check user data on login to ensure it's fresh
    try {
      const userData = await getUser(uid);
      if (userData) {
        const user: User = {
          uid: userData.uid,
          email: userData.email,
          fullName: userData.fullName,
          profileId: userData.profileId,
          createdAt: userData.createdAt,
          isAdministrator: userData.isAdministrator,
        };
        setCurrentUser(user);

        const profile = await findUserProfile(userData.uid, userData.profileId);
        if (profile) {
          setCurrentUserProfile(profile);
          setCurrentUserProfileId(profile.id);
          setAuthState('app');
        } else {
          setAuthState('setup');
        }
      } else {
        // Fallback if user data isn't found immediately after login
        setAuthState('setup');
      }
    } catch (error) {
      logger.error('Error fetching user data on login', error);
      setAuthState('auth');
    }
  };

  const handleSignup = async (uid: string, email: string, fullName: string) => {
    // Logic is handled by onAuthStateChanged after email verification
  };

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    try {
      await signOut(auth);
    } catch (error) {
      logger.error('Sign out error', error);
      alert('Error signing out. Please try again.');
    }
  };

  const handleProfileSetupComplete = (profile: PersonProfile) => {
    setCurrentUserProfile(profile);
    setCurrentUserProfileId(profile.id);
    if (currentUser) {
      const updatedUser = { ...currentUser, profileId: profile.id };
      setCurrentUser(updatedUser);
    }
    setAuthState('app');
    window.dispatchEvent(new CustomEvent('profiles-updated'));
  };

  return {
    currentUser,
    currentUserProfile,
    currentUserProfileId,
    authState,
    isLoadingProfile,
    mounted,
    handleLogin,
    handleSignup,
    handleSignOut,
    handleProfileSetupComplete,
  };
}
