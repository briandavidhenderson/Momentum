
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

  const handleCreateExperiment = async (experimentData: Omit<ELNExperiment, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    const experimentId = await createELNExperiment({
      ...experimentData,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
    });
    return experimentId;
  };

  const handleUpdateExperiment = async (experimentId: string, updates: Partial<ELNExperiment>) => {
    await updateELNExperiment(experimentId, updates);
  };

  const handleDeleteExperiment = async (experimentId: string) => {
    await deleteELNExperiment(experimentId);
  };

  // Legacy handler for batch updates (used by ELN component)
  const handleExperimentsUpdate = async (updatedExperiments: ELNExperiment[]) => {
    // Find the experiment that changed by comparing with current state
    for (const updated of updatedExperiments) {
      const original = elnExperiments.find(e => e.id === updated.id);
      if (original && JSON.stringify(original) !== JSON.stringify(updated)) {
        await updateELNExperiment(updated.id, updated);
      } else if (!original) {
        // New experiment
        await createELNExperiment(updated);
      }
    }
  };

  return {
    elnExperiments,
    handleExperimentsUpdate,
    handleCreateExperiment,
    handleUpdateExperiment,
    handleDeleteExperiment,
  };
}
