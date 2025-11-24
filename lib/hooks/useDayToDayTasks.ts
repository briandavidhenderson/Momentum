
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';
import { useAuth } from './useAuth';
import { useToast } from '@/lib/toast';
import { logger } from '@/lib/logger';

type LabScopeStatus = 'loading' | 'ready' | 'missingLab';

export function useDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);
  const [labScopeStatus, setLabScopeStatus] = useState<LabScopeStatus>('loading');
  const { success, error } = useToast();

  useEffect(() => {
    if (!profile) {
      setLabScopeStatus('loading');
      setDayToDayTasks([]);
      return;
    }

    if (profile.labId) {
      setLabScopeStatus('ready');
      return;
    }

    setLabScopeStatus('missingLab');
    setDayToDayTasks([]);
  }, [profile]);

  useEffect(() => {
    if (labScopeStatus !== 'ready') {
      setDayToDayTasks([]);
    }
  }, [labScopeStatus]);

  useEffect(() => {
    if (labScopeStatus !== 'ready' || !profile?.labId) return;

    const unsubscribe = subscribeToDayToDayTasks({ labId: profile.labId }, (tasks) => {
      setDayToDayTasks(tasks);
    });

    return () => unsubscribe();
  }, [labScopeStatus, profile?.labId]);

  const handleCreateDayToDayTask = async (task: Omit<DayToDayTask, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'labId'>) => {
    if (!currentUser) {
      logger.error('No current user for task creation');
      return;
    }

    const labId = profile?.labId;
    if (!labId) {
      logger.error('No labId found on profile', new Error('Profile missing labId'), { profile });
      error('Cannot create task: Your profile is missing a lab assignment. Please update your profile.');
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
    } catch (err) {
      logger.error('Error creating day-to-day task', err);
      error('Failed to create task. Please try again.');
    }
  };

  const handleUpdateDayToDayTask = async (taskId: string, updates: Partial<DayToDayTask>) => {
    try {
      await updateDayToDayTask(taskId, updates);
      success("Your changes have been saved.");
    } catch (err) {
      logger.error('Error updating task', err);
      error("Failed to update task. Please try again.");
    }
  };

  const handleDeleteDayToDayTask = async (taskId: string) => {
    try {
      await deleteDayToDayTask(taskId);
      success("The task has been removed.");
    } catch (err) {
      logger.error('Error deleting task', err);
      error("Failed to delete task. Please try again.");
    }
  };

  const handleMoveDayToDayTask = async (taskId: string, newStatus: 'todo' | 'working' | 'done') => {
    try {
      logger.info(`Moving task ${taskId} to status: ${newStatus}`);
      await updateDayToDayTask(taskId, { status: newStatus });
      logger.info(`Successfully moved task ${taskId} to ${newStatus}`);
    } catch (err) {
      logger.error('Error moving day-to-day task:', err);
      error('Failed to move task. Please try again.');
      // Re-throw to allow the UI to handle it if needed
      throw err;
    }
  };

  return {
    dayToDayTasks,
    labScopeStatus,
    handleCreateDayToDayTask,
    handleUpdateDayToDayTask,
    handleDeleteDayToDayTask,
    handleMoveDayToDayTask,
  };
}
