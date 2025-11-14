
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';
import { useAuth } from './useAuth';

export function useDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);

  useEffect(() => {
    // Get labId with fallback to legacy lab field
    const labId = profile?.labId || profile?.lab;
    if (!labId) return;

    const unsubscribe = subscribeToDayToDayTasks({ labId }, (tasks) => {
      setDayToDayTasks(tasks);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCreateDayToDayTask = async (task: Omit<DayToDayTask, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'labId'>) => {
    if (!currentUser) {
      console.error('No current user for task creation');
      return;
    }

    // Get labId with fallback to legacy lab field
    const labId = profile?.labId || profile?.lab;
    if (!labId) {
      console.error('No labId found on profile:', profile);
      alert('Cannot create task: Your profile is missing a lab assignment. Please update your profile.');
      return;
    }

    try {
      const order = dayToDayTasks.length;
      await createDayToDayTask({
        ...task,
        createdBy: currentUser.uid,
        order,
        labId,
      });
    } catch (error) {
      console.error('Error creating day-to-day task:', error);
      alert('Failed to create task: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateDayToDayTask = async (taskId: string, updates: Partial<DayToDayTask>) => {
    await updateDayToDayTask(taskId, updates);
  };

  const handleDeleteDayToDayTask = async (taskId: string) => {
    await deleteDayToDayTask(taskId);
  };

  const handleMoveDayToDayTask = async (taskId: string, newStatus: 'todo' | 'working' | 'done') => {
    await updateDayToDayTask(taskId, { status: newStatus });
  };

  return {
    dayToDayTasks,
    handleCreateDayToDayTask,
    handleUpdateDayToDayTask,
    handleDeleteDayToDayTask,
    handleMoveDayToDayTask,
  };
}
