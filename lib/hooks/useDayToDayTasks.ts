
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';
import { useAuth } from './useAuth';
import { useToast } from '@/lib/toast';

export function useDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);
  const { success, error } = useToast();

  useEffect(() => {
    if (!profile?.labId) return;

    const unsubscribe = subscribeToDayToDayTasks({ labId: profile.labId }, (tasks) => {
      setDayToDayTasks(tasks);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCreateDayToDayTask = async (task: Omit<DayToDayTask, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'labId'>) => {
    if (!currentUser || !profile?.labId) return;
    try {
      const order = dayToDayTasks.length;
      await createDayToDayTask({
        ...task,
        createdBy: currentUser.uid,
        order,
        labId: profile.labId,
      });
      success(`"${task.title}" has been added to your board.`);
    } catch (err) {
      console.error('Error creating task:', err);
      error("Failed to create task. Please try again.");
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
      await updateDayToDayTask(taskId, { status: newStatus });
      const statusNames = {
        'todo': 'To Do',
        'working': 'Working On It',
        'done': 'Done'
      };
      success(`Task moved to ${statusNames[newStatus]}.`);
    } catch (err) {
      console.error('Error moving task:', err);
      error("Failed to move task. Please try again.");
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
