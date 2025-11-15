
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { ELNExperiment } from '@/lib/types';
import { subscribeToELNExperiments, createELNExperiment, updateELNExperiment, deleteELNExperiment } from '@/lib/firestoreService';
import { logger } from '@/lib/logger';

export function useELN() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [elnExperiments, setElnExperiments] = useState<ELNExperiment[]>([]);

  useEffect(() => {
    if (!profile?.labId) {
      // User not logged in or profile not loaded yet - silently return
      return;
    }

    logger.debug('Subscribing to ELN experiments', { labId: profile.labId });
    const unsubscribe = subscribeToELNExperiments({ labId: profile.labId }, (experiments) => {
      logger.debug('Received ELN experiments', { count: experiments.length });
      setElnExperiments(experiments);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCreateExperiment = async (experimentData: Omit<ELNExperiment, 'id' | 'createdAt' | 'labId' | 'createdBy'>) => {
    if (!currentUser || !profile?.labId) {
      logger.error('Cannot create experiment - missing user or labId');
      throw new Error('User or lab information not available');
    }
    logger.debug('Creating ELN experiment', { title: experimentData.title });
    const experimentId = await createELNExperiment({
      ...experimentData,
      createdBy: currentUser.uid,
      labId: profile.labId,
      createdAt: new Date().toISOString(),
    });
    logger.info('ELN experiment created', { experimentId });
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
