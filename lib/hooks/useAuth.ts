
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { getFirebaseAuth } from '@/lib/firebase';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!isMountedRef.current) return;
        setIsLoadingProfile(true);
        try {
          const userData = await getUser(firebaseUser.uid);
          if (!isMountedRef.current) return;

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
            if (!isMountedRef.current) return;

            if (profile) {
              setCurrentUserProfile(profile);
              setCurrentUserProfileId(profile.id);
              setAuthState('app');
            } else {
              setAuthState('setup');
            }
          } else {
            // Extract name from email safely
            const emailName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'
            const tempUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: firebaseUser.displayName || emailName,
              profileId: null,
              createdAt: Timestamp.now(),
              isAdministrator: false,
            };
            setCurrentUser(tempUser);
            setAuthState('setup');
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          logger.error('Error loading user data', error);
          setAuthState('auth');
        } finally {
          if (isMountedRef.current) {
            setIsLoadingProfile(false);
          }
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
      unsubscribe();
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
