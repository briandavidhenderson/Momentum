import { useState, useEffect, useCallback } from 'react';
import { Deliverable, PersonProfile } from '@/lib/types';
import { logger } from '@/lib/logger';
import {
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  subscribeToDeliverables,
  linkOrderToDeliverable,
  unlinkOrderFromDeliverable,
} from '@/lib/services/deliverableService';

/**
 * useDeliverables Hook
 *
 * Manages deliverable state with Firestore sync and localStorage caching
 * Provides CRUD operations for deliverables
 */
export function useDeliverables(currentUser: PersonProfile | null) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedDeliverables = localStorage.getItem('deliverables');
    if (storedDeliverables) {
      try {
        const parsed = JSON.parse(storedDeliverables);
        setDeliverables(parsed);
      } catch (error) {
        logger.error('Error parsing stored deliverables from localStorage', error);
        localStorage.removeItem('deliverables');
      }
    }
  }, []);

  // Save to localStorage whenever deliverables change
  useEffect(() => {
    if (deliverables.length > 0) {
      localStorage.setItem('deliverables', JSON.stringify(deliverables));
    }
  }, [deliverables]);

  // Subscribe to Firestore updates
  useEffect(() => {
    if (!currentUser || !currentUser.labId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to all deliverables (no filtering for now)
    // In production, you might want to filter by lab or project
    const unsubscribe = subscribeToDeliverables(
      null, // No filters for now - gets all deliverables
      (firestoreDeliverables) => {
        setDeliverables(firestoreDeliverables);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  /**
   * Create a new deliverable
   */
  const handleCreateDeliverable = useCallback(
    async (deliverableData: Omit<Deliverable, 'id' | 'createdAt'> & { createdBy: string }) => {
      try {
        setError(null);
        const newDeliverableId = await createDeliverable(deliverableData);
        logger.info('Deliverable created successfully', { id: newDeliverableId });
        return newDeliverableId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create deliverable');
        logger.error('Error creating deliverable', error);
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Update an existing deliverable
   */
  const handleUpdateDeliverable = useCallback(
    async (deliverableId: string, updates: Partial<Deliverable>) => {
      try {
        setError(null);
        await updateDeliverable(deliverableId, updates);
        logger.info('Deliverable updated successfully', { id: deliverableId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update deliverable');
        logger.error('Error updating deliverable', error);
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Delete a deliverable
   */
  const handleDeleteDeliverable = useCallback(async (deliverableId: string) => {
    try {
      setError(null);
      await deleteDeliverable(deliverableId);
      logger.info('Deliverable deleted successfully', { id: deliverableId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete deliverable');
      logger.error('Error deleting deliverable', error);
      setError(error);
      throw error;
    }
  }, []);

  /**
   * Link an order to a deliverable
   */
  const handleLinkOrderToDeliverable = useCallback(
    async (deliverableId: string, orderId: string) => {
      try {
        setError(null);
        await linkOrderToDeliverable(deliverableId, orderId);
        logger.info('Order linked to deliverable', { deliverableId, orderId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to link order');
        logger.error('Error linking order to deliverable', error);
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Unlink an order from a deliverable
   */
  const handleUnlinkOrderFromDeliverable = useCallback(
    async (deliverableId: string, orderId: string) => {
      try {
        setError(null);
        await unlinkOrderFromDeliverable(deliverableId, orderId);
        logger.info('Order unlinked from deliverable', { deliverableId, orderId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to unlink order');
        logger.error('Error unlinking order from deliverable', error);
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Get deliverables for a specific workpackage
   */
  const getDeliverablesByWorkpackage = useCallback(
    (workpackageId: string): Deliverable[] => {
      return deliverables.filter((d) => d.workpackageId === workpackageId);
    },
    [deliverables]
  );

  /**
   * Get deliverables by owner
   */
  const getDeliverablesByOwner = useCallback(
    (ownerId: string): Deliverable[] => {
      return deliverables.filter((d) => d.ownerId === ownerId);
    },
    [deliverables]
  );

  /**
   * Get a single deliverable by ID
   */
  const getDeliverableById = useCallback(
    (deliverableId: string): Deliverable | undefined => {
      return deliverables.find((d) => d.id === deliverableId);
    },
    [deliverables]
  );

  return {
    deliverables,
    isLoadingDeliverables: isLoading,
    deliverablesError: error,
    handleCreateDeliverable,
    handleUpdateDeliverable,
    handleDeleteDeliverable,
    handleLinkOrderToDeliverable,
    handleUnlinkOrderFromDeliverable,
    getDeliverablesByWorkpackage,
    getDeliverablesByOwner,
    getDeliverableById,
  };
}
