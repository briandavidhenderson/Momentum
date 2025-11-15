
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';
import { useAuth } from './useAuth';

export function useDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);

  useEffect(() => {
    if (!profile?.labId) return;

    const unsubscribe = subscribeToDayToDayTasks({ labId: profile.labId }, (tasks) => {
      setDayToDayTasks(tasks);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCreateDayToDayTask = async (task: Omit<DayToDayTask, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'labId'>) => {
    if (!currentUser || !profile?.labId) return;
    const order = dayToDayTasks.length;
    await createDayToDayTask({
      ...task,
      createdBy: currentUser.uid,
      order,
      labId: profile.labId,
    });
  };

  const handleUpdateDayToDayTask = async (taskId: string, updates: Partial<DayToDayTask>, optimistic: boolean = false) => {
    if (optimistic) {
      // Optimistic update: immediately update local state
      const previousTasks = [...dayToDayTasks];
      setDayToDayTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ));

      // Update backend in background
      try {
        await updateDayToDayTask(taskId, updates);
      } catch (error) {
        console.error('Failed to update task, rolling back:', error);
        // Rollback on error
        setDayToDayTasks(previousTasks);
      }
    } else {
      // Traditional update: wait for backend
      await updateDayToDayTask(taskId, updates);
    }
  };

  const handleDeleteDayToDayTask = async (taskId: string) => {
    await deleteDayToDayTask(taskId);
  };

  const handleMoveDayToDayTask = async (taskId: string, newStatus: 'todo' | 'working' | 'done', optimistic: boolean = true) => {
    if (optimistic) {
      // Optimistic update: immediately move task in local state
      const previousTasks = [...dayToDayTasks];
      setDayToDayTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      // Update backend in background
      try {
        await updateDayToDayTask(taskId, { status: newStatus });
      } catch (error) {
        console.error('Failed to move task, rolling back:', error);
        // Rollback on error
        setDayToDayTasks(previousTasks);
      }
    } else {
      // Traditional update: wait for backend
      await updateDayToDayTask(taskId, { status: newStatus });
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
