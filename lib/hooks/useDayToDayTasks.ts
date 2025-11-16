
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';
import { useAuth } from './useAuth';
import { useToast } from '@/lib/toast';
import { logger } from '@/lib/logger';

export function useDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);
  const { success, error } = useToast();

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
      logger.error('No current user for task creation');
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
    try {
      await updateDayToDayTask(taskId, updates);
      success("Your changes have been saved.");
    } catch (err) {
      console.error('Error updating task:', err);
      error("Failed to update task. Please try again.");
    }
  };

  const handleDeleteDayToDayTask = async (taskId: string) => {
    try {
      await deleteDayToDayTask(taskId);
      success("The task has been removed.");
    } catch (err) {
      console.error('Error deleting task:', err);
      error("Failed to delete task. Please try again.");
    }
  };

  const handleMoveDayToDayTask = async (taskId: string, newStatus: 'todo' | 'working' | 'done') => {
    try {
      logger.info(`Moving task ${taskId} to status: ${newStatus}`);
      await updateDayToDayTask(taskId, { status: newStatus });
      logger.info(`Successfully moved task ${taskId} to ${newStatus}`);
    } catch (error) {
      logger.error('Error moving day-to-day task:', error);
      alert('Failed to move task: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Re-throw to allow the UI to handle it if needed
      throw error;
    }
  };

  return {
    dayToDayTasks,
    handleCreateDayToDayTask,
    handleUpdateDayToDayTask,
    handleDeleteDayToDayTask,
    handleMoveDayToDayTask,
  };
}
