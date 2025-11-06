
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { LabPoll } from '@/lib/types';
import { subscribeToLabPolls, createLabPoll, updateLabPoll, deleteLabPoll } from '@/lib/firestoreService';

export function usePolls() {
  const { currentUserProfile } = useAuth();
  const [polls, setPolls] = useState<LabPoll[]>([]);

  useEffect(() => {
    if (!currentUserProfile || !currentUserProfile.labId) return;

    const unsubscribe = subscribeToLabPolls(currentUserProfile.labId, (polls) => {
      setPolls(polls);
    });

    return () => unsubscribe();
  }, [currentUserProfile]);

  const handleCreatePoll = async (newPoll: Omit<LabPoll, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!currentUserProfile) return;
    await createLabPoll({ ...newPoll, createdBy: currentUserProfile.id, createdAt: new Date().toISOString() });
  };

  const handleRespondToPoll = async (pollId: string, optionIds: string[]) => {
    if (!currentUserProfile) return;
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    const existingResponseIndex = poll.responses?.findIndex((r) => r.userId === currentUserProfile?.id) ?? -1;
    const newResponse = {
      userId: currentUserProfile?.id || '',
      selectedOptionIds: optionIds,
      respondedAt: new Date().toISOString(),
    };

    const updatedResponses = poll.responses || [];
    if (existingResponseIndex >= 0) {
      updatedResponses[existingResponseIndex] = newResponse;
    } else {
      updatedResponses.push(newResponse);
    }

    await updateLabPoll(pollId, { responses: updatedResponses });
  };

  const handleDeletePoll = async (pollId: string) => {
    await deleteLabPoll(pollId);
  };

  return {
    polls,
    handleCreatePoll,
    handleRespondToPoll,
    handleDeletePoll,
  };
}
