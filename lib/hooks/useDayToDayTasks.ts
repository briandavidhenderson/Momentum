
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';
import { useAuth } from './useAuth';
import { useToast } from '@/lib/toast';

export function useDayToDayTasks() {
  const { currentUser, currentUserProfile: profile } = useAuth();
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);
  const { toast } = useToast();

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
      toast({
        title: "Task created",
        description: `"${task.title}" has been added to your board.`,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDayToDayTask = async (taskId: string, updates: Partial<DayToDayTask>) => {
    try {
      await updateDayToDayTask(taskId, updates);
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDayToDayTask = async (taskId: string) => {
    try {
      await deleteDayToDayTask(taskId);
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Task moved",
        description: `Task moved to ${statusNames[newStatus]}.`,
      });
    } catch (error) {
      console.error('Error moving task:', error);
      toast({
        title: "Error",
        description: "Failed to move task. Please try again.",
        variant: "destructive",
      });
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
