
import { useState, useEffect } from 'react';
import { Workpackage, Task } from '@/lib/types';
import { createWorkpackage, subscribeToWorkpackages, updateWorkpackage, deleteWorkpackage } from '@/lib/firestoreService';

export function useWorkpackages(currentUser: any) {
  const [workpackages, setWorkpackages] = useState<Workpackage[]>([]);

  useEffect(() => {
    const storedWorkpackages = localStorage.getItem('gantt-workpackages');
    if (storedWorkpackages) {
      const parsed = JSON.parse(storedWorkpackages);
      const workpackagesWithDates = parsed.map((wp: any) => ({
        ...wp,
        start: new Date(wp.start),
        end: new Date(wp.end),
        tasks: (wp.tasks || []).map((task: any) => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
        })),
      }));
      setWorkpackages(workpackagesWithDates);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gantt-workpackages', JSON.stringify(workpackages));
  }, [workpackages]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const unsubscribe = subscribeToWorkpackages(currentUser.id, (firestoreWorkpackages) => {
      setWorkpackages(firestoreWorkpackages);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAddTaskToWorkpackage = (workpackageId: string) => {
    const workpackage = workpackages.find((w) => w.id === workpackageId);
    if (!workpackage) return;

    const taskStart = new Date(workpackage.start);
    const taskEnd = new Date(workpackage.start);
    taskEnd.setDate(taskStart.getDate() + 7);

    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: `Task ${workpackage.tasks.length + 1}`,
      start: taskStart,
      end: taskEnd,
      progress: 0,
      primaryOwner: undefined,
      helpers: [],
      workpackageId: workpackageId,
      importance: 'medium',
      notes: '',
      deliverables: [],
      isExpanded: false,
    };

    setWorkpackages((prev) =>
      prev.map((wp) =>
        wp.id === workpackageId
          ? { ...wp, tasks: [...wp.tasks, newTask] }
          : wp
      )
    );
  };

  const handleWorkpackageNameChange = (workpackageId: string, newName: string) => {
    setWorkpackages((prev) =>
      prev.map((wp) =>
        wp.id === workpackageId ? { ...wp, name: newName } : wp
      )
    );
  };

  const handleToggleWorkpackageExpand = (wpId: string) => {
    setWorkpackages((prev) =>
      prev.map((wp) => (wp.id === wpId ? { ...wp, isExpanded: !wp.isExpanded } : wp))
    );
  };

  return {
    workpackages,
    handleAddTaskToWorkpackage,
    handleWorkpackageNameChange,
    handleToggleWorkpackageExpand,
  };
}
