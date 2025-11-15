
import { useState, useEffect } from 'react';
import { Workpackage, Task, PersonProfile } from '@/lib/types';
import { createWorkpackage, subscribeToWorkpackages, updateWorkpackage, deleteWorkpackage } from '@/lib/firestoreService';

export function useWorkpackages(currentUser: PersonProfile | null) {
  const [workpackages, setWorkpackages] = useState<Workpackage[]>([]);

  useEffect(() => {
    const storedWorkpackages = localStorage.getItem('gantt-workpackages');
    if (storedWorkpackages) {
      try {
        const parsed = JSON.parse(storedWorkpackages);
        const workpackagesWithDates = parsed.map((wp: any) => {
          const start = new Date(wp.start);
          const end = new Date(wp.end);

          // Validate workpackage dates
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.error('Invalid date found in stored workpackage:', wp);
            return null;
          }

          return {
            ...wp,
            start,
            end,
            tasks: (wp.tasks || []).map((task: any) => {
              const taskStart = new Date(task.start);
              const taskEnd = new Date(task.end);

              // Validate task dates
              if (isNaN(taskStart.getTime()) || isNaN(taskEnd.getTime())) {
                console.error('Invalid date found in stored task:', task);
                return null;
              }

              return {
                ...task,
                start: taskStart,
                end: taskEnd,
              };
            }).filter(Boolean), // Remove null entries from invalid dates
          };
        }).filter(Boolean); // Remove null entries from invalid dates

        setWorkpackages(workpackagesWithDates);
      } catch (error) {
        console.error('Error parsing stored workpackages from localStorage:', error);
        // Clear invalid data
        localStorage.removeItem('gantt-workpackages');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gantt-workpackages', JSON.stringify(workpackages));
  }, [workpackages]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const unsubscribe = subscribeToWorkpackages(null, (firestoreWorkpackages) => {
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
