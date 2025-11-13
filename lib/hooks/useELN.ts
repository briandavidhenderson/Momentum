
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { ELNExperiment } from '@/lib/types';
import { subscribeToELNExperiments, createELNExperiment, updateELNExperiment, deleteELNExperiment } from '@/lib/firestoreService';

export function useELN() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [elnExperiments, setElnExperiments] = useState<ELNExperiment[]>([]);

  useEffect(() => {
    if (!profile?.labId) {
      // User not logged in or profile not loaded yet - silently return
      return;
    }

    console.log('[useELN] Subscribing to experiments for labId:', profile.labId);
    const unsubscribe = subscribeToELNExperiments({ labId: profile.labId }, (experiments) => {
      console.log('[useELN] Received experiments:', experiments.length);
      setElnExperiments(experiments);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCreateExperiment = async (experimentData: Omit<ELNExperiment, 'id' | 'createdAt' | 'labId' | 'createdBy'>) => {
    if (!currentUser || !profile?.labId) {
      console.error('[useELN] Cannot create experiment - missing user or labId');
      throw new Error('User or lab information not available');
    }
    console.log('[useELN] Creating experiment:', experimentData.title);
    const experimentId = await createELNExperiment({
      ...experimentData,
      createdBy: currentUser.uid,
      labId: profile.labId,
      createdAt: new Date().toISOString(),
    });
    console.log('[useELN] Experiment created with ID:', experimentId);
    return experimentId;
  };

  const handleUpdateExperiment = async (experimentId: string, updates: Partial<ELNExperiment>) => {
    await updateELNExperiment(experimentId, updates);
  };

  const handleDeleteExperiment = async (experimentId: string) => {
    await deleteELNExperiment(experimentId);
  };

  return {
    elnExperiments,
    handleCreateExperiment,
    handleUpdateExperiment,
    handleDeleteExperiment,
  };
}
