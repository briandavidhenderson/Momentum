
import { useState, useEffect } from 'react';
import { ELNExperiment } from '@/lib/types';
import { subscribeToELNExperiments, createELNExperiment, updateELNExperiment, deleteELNExperiment } from '@/lib/firestoreService';

export function useELN(currentUser: any) {
  const [elnExperiments, setElnExperiments] = useState<ELNExperiment[]>([]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const unsubscribe = subscribeToELNExperiments(currentUser.id, (experiments) => {
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
