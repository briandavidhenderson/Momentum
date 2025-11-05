
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { getUser, findUserProfile, FirestoreUser as User } from '@/lib/firestoreService';
import { PersonProfile } from '@/lib/types';

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
            const tempUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              profileId: null,
              createdAt: Timestamp.now(),
              isAdministrator: false,
            };
            setCurrentUser(tempUser);
            setAuthState('setup');
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          console.error('Error loading user data:', error);
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

  const handleLogin = async (uid: string, email: string, fullName: string) => {
    // Logic is handled by onAuthStateChanged
  };

  const handleSignup = async (uid: string, email: string, fullName: string) => {
    // Logic is handled by onAuthStateChanged
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
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
