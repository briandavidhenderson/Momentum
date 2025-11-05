
import { useState, useEffect } from 'react';
import { DayToDayTask } from '@/lib/dayToDayTypes';
import { createDayToDayTask, subscribeToDayToDayTasks, updateDayToDayTask, deleteDayToDayTask } from '@/lib/firestoreService';

export function useDayToDayTasks(currentUser: any) {
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const unsubscribe = subscribeToDayToDayTasks(currentUser.id, (tasks) => {
      setDayToDayTasks(tasks);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateDayToDayTask = async (task: Omit<DayToDayTask, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    if (!currentUser) return;
    const order = dayToDayTasks.length;
    await createDayToDayTask({
      ...task,
      createdBy: currentUser.id,
      order,
    });
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
