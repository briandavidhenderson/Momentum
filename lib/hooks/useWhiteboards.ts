import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
    WhiteboardData,
    subscribeToWhiteboards,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard
} from '@/lib/whiteboardService';
import { logger } from '@/lib/logger';

export function useWhiteboards() {
    const { currentUser, currentUserProfile: profile } = useAuth();
    const [whiteboards, setWhiteboards] = useState<WhiteboardData[]>([]);

    useEffect(() => {
        if (!profile?.labId) {
            // User not logged in or profile not loaded yet - silently return
            return;
        }

        logger.debug('Subscribing to whiteboards', { labId: profile.labId });
        const unsubscribe = subscribeToWhiteboards(profile.labId, (whiteboardsData) => {
            logger.debug('Received whiteboards', { count: whiteboardsData.length });
            setWhiteboards(whiteboardsData);
        });

        return () => unsubscribe();
    }, [profile?.labId]);

    const handleCreateWhiteboard = async (whiteboardData: Omit<WhiteboardData, 'id' | 'createdAt' | 'updatedAt' | 'labId' | 'createdBy'>) => {
        if (!currentUser || !profile?.labId) {
            logger.error('Cannot create whiteboard - missing user or labId');
            throw new Error('User or lab information not available');
        }
        logger.debug('Creating whiteboard', { name: whiteboardData.name });
        const whiteboardId = await createWhiteboard({
            ...whiteboardData,
            createdBy: currentUser.uid,
            labId: profile.labId,
        });
        logger.info('Whiteboard created', { whiteboardId });
        return whiteboardId;
    };

    const handleUpdateWhiteboard = async (whiteboardId: string, updates: Partial<WhiteboardData>) => {
        await updateWhiteboard(whiteboardId, updates);
    };

    const handleDeleteWhiteboard = async (whiteboardId: string) => {
        await deleteWhiteboard(whiteboardId);
    };

    return {
        whiteboards,
        handleCreateWhiteboard,
        handleUpdateWhiteboard,
        handleDeleteWhiteboard,
    };
}
