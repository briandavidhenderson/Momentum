
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { ELNExperiment } from '@/lib/types';
import { subscribeToELNExperiments, createELNExperiment, updateELNExperiment, deleteELNExperiment } from '@/lib/firestoreService';

export function useELN() {
  const { currentUser } = useAuth();
  const [elnExperiments, setElnExperiments] = useState<ELNExperiment[]>([]);

  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;

    const unsubscribe = subscribeToELNExperiments(currentUser.uid, (experiments) => {
      setElnExperiments(experiments);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleExperimentsUpdate = async (updatedExperiments: ELNExperiment[]) => {
    // This is a bit tricky, as we don't know which experiment was updated.
    // We can either update all of them, or try to find the one that changed.
    // For now, let's just log it.
    console.log('handleExperimentsUpdate', updatedExperiments);
  };

  return {
    elnExperiments,
    handleExperimentsUpdate,
  };
}
