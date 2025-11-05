"use client"

import { useState, useCallback, useEffect } from "react";
import { useProjects } from "@/lib/hooks/useProjects";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProfiles } from "@/lib/useProfiles";
import { Button } from "@/components/ui/button";
import { GanttChart } from "@/components/GanttChart";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { MasterProject, Task, Workpackage, Project } from "@/lib/types";
import { Plus } from "lucide-react";
import { personProfilesToPeople } from "@/lib/personHelpers";
import { Task as GanttTask } from "gantt-task-react";
import { updateWorkpackage, updateMasterProject, updateWorkpackageWithProgress, getWorkpackages } from "@/lib/firestoreService";
import { toggleTodoAndRecalculate, addTodoAndRecalculate, deleteTodoAndRecalculate, updateWorkpackageWithTaskProgress } from "@/lib/progressCalculation";

export function ProjectDashboard() {
  const { currentUser: user, currentUserProfile: profile } = useAuth();
  const { projects, handleCreateMasterProject, handleUpdateMasterProject, handleUpdateWorkpackage } = useProjects();
  const allProfiles = useProfiles();
  const people = personProfilesToPeople(allProfiles);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workpackagesMap, setWorkpackagesMap] = useState<Map<string, Workpackage>>(new Map());
  
  const [allWorkpackages, setAllWorkpackages] = useState<Workpackage[]>([]);
  
  // Load workpackages for all projects
  useEffect(() => {
    const loadWorkpackages = async () => {
      const map = new Map<string, Workpackage>();
      const allWps: Workpackage[] = [];
      
      for (const project of projects) {
        try {
          const wps = await getWorkpackages(project.id);
          wps.forEach(wp => {
            if (wp.profileProjectId === project.id) {
              map.set(wp.id, wp);
              allWps.push(wp);
            }
          });
        } catch (error) {
          console.error(`Error loading workpackages for project ${project.id}:`, error);
        }
      }
      
      setWorkpackagesMap(map);
      setAllWorkpackages(allWps);
    };
    
    if (projects.length > 0) {
      loadWorkpackages();
    }
  }, [projects]);
  
  // Helper to get workpackages for a project
  const getProjectWorkpackages = useCallback((project: MasterProject): Workpackage[] => {
    return project.workpackageIds
      .map(wpId => workpackagesMap.get(wpId))
      .filter((wp): wp is Workpackage => wp !== undefined);
  }, [workpackagesMap]);

  const handleCreateProject = () => {
    if (!profile) return;

    const newProject: Omit<MasterProject, "id" | "createdAt"> = {
      name: `New Project ${projects.length + 1}`,
      description: "",
      labId: profile.labId,
      labName: profile.labName,
      instituteId: profile.instituteId,
      instituteName: profile.instituteName,
      organisationId: profile.organisationId,
      organisationName: profile.organisationName,
      grantName: "",
      grantNumber: "",
      totalBudget: 0,
      currency: "GBP",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      funderId: "",
      funderName: "",
      accountIds: [],
      principalInvestigatorIds: [],
      coPIIds: [],
      teamMemberIds: [],
      teamRoles: {},
      status: "planning",
      progress: 0,
      workpackageIds: [],
      visibility: "lab",
      createdBy: user?.uid || "",
    };

    handleCreateMasterProject(newProject);
  };

  const handleDateChange = useCallback(async (ganttTask: GanttTask) => {
    try {
      // Find the project/workpackage/task that matches this gantt task
      for (const project of projects) {
        // Check if it's the project itself
        if (ganttTask.id === project.id) {
          await handleUpdateMasterProject(project.id, {
            startDate: ganttTask.start.toISOString(),
            endDate: ganttTask.end.toISOString(),
          });
          return;
        }

        // Check workpackages
        for (const wpId of project.workpackageIds) {
          const workpackage = workpackagesMap.get(wpId);
          if (!workpackage) continue;

          if (ganttTask.id === workpackage.id) {
            await handleUpdateWorkpackage(workpackage.id, {
              start: ganttTask.start,
              end: ganttTask.end,
            });
            return;
          }

          // Check tasks
          for (const task of workpackage.tasks || []) {
            if (ganttTask.id === task.id) {
              const updatedTasks = workpackage.tasks.map(t =>
                t.id === task.id
                  ? { ...t, start: ganttTask.start, end: ganttTask.end }
                  : t
              );
              await handleUpdateWorkpackage(workpackage.id, {
                tasks: updatedTasks,
              });
              return;
            }

            // Check subtasks
            for (const subtask of task.subtasks || []) {
              if (ganttTask.id === subtask.id) {
                const updatedTasks = workpackage.tasks.map(t =>
                  t.id === task.id
                    ? {
                        ...t,
                        subtasks: t.subtasks?.map(st =>
                          st.id === subtask.id
                            ? { ...st, start: ganttTask.start, end: ganttTask.end }
                            : st
                        ),
                      }
                    : t
                );
                await handleUpdateWorkpackage(workpackage.id, {
                  tasks: updatedTasks,
                });
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating task dates:", error);
      alert("Failed to update task dates. Please try again.");
    }
  }, [projects, handleUpdateMasterProject, handleUpdateWorkpackage, workpackagesMap]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleToggleExpand = useCallback(async (id: string, isProject: boolean) => {
    try {
      if (isProject) {
        // Toggle project expansion
        const project = projects.find(p => p.id === id);
        if (project) {
          await handleUpdateMasterProject(project.id, {
            isExpanded: !project.isExpanded,
          });
        }
      } else {
          // Toggle workpackage expansion
        for (const project of projects) {
          const workpackage = workpackagesMap.get(id);
          if (workpackage) {
            await handleUpdateWorkpackage(workpackage.id, {
              isExpanded: !workpackage.isExpanded,
            });
            return;
          }

          // Check if it's a task
          for (const wp of getProjectWorkpackages(project)) {
            const task = wp.tasks?.find(t => t.id === id);
            if (task) {
              const updatedTasks = wp.tasks.map(t =>
                t.id === id ? { ...t, isExpanded: !t.isExpanded } : t
              );
              await handleUpdateWorkpackage(wp.id, {
                tasks: updatedTasks,
              });
              return;
            }

            // Check if it's a subtask
            for (const task of wp.tasks || []) {
              const subtask = task.subtasks?.find(st => st.id === id);
              if (subtask) {
                const updatedTasks = wp.tasks.map(t =>
                  t.id === task.id
                    ? {
                        ...t,
                        subtasks: t.subtasks?.map(st =>
                          st.id === id ? { ...st, isExpanded: !st.isExpanded } : st
                        ),
                      }
                    : t
                );
                await handleUpdateWorkpackage(wp.id, {
                  tasks: updatedTasks,
                });
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error toggling expand/collapse:", error);
      alert("Failed to toggle expand/collapse. Please try again.");
    }
  }, [projects, handleUpdateMasterProject, handleUpdateWorkpackage, workpackagesMap]);

  // Helper to find the parent project and workpackage for a task
  const findTaskContext = useCallback((taskId: string): { project: MasterProject; workpackage: Workpackage; task: Task } | null => {
    for (const project of projects) {
      for (const wpId of project.workpackageIds) {
        const workpackage = workpackagesMap.get(wpId);
        if (!workpackage) continue;

        const task = workpackage.tasks?.find(t => t.id === taskId);
        if (task) {
          return { project, workpackage, task };
        }
      }
    }
      return null;
  }, [projects, workpackagesMap]);

  const handleContextAction = useCallback(async (action: { action: string; targetId: string; targetType: string }) => {
    try {
      switch (action.action) {
        case "open-details":
          // Find and open the task details
          for (const project of projects) {
            for (const wp of getProjectWorkpackages(project)) {
              const task = wp.tasks?.find(t => t.id === action.targetId);
              if (task) {
                setSelectedTask(task);
                return;
              }
            }
          }
          break;
        case "mark-complete":
          // Mark task/workpackage as complete
          if (action.targetType === "workpackage") {
            const workpackage = workpackagesMap.get(action.targetId);
            if (workpackage) {
              await handleUpdateWorkpackage(workpackage.id, {
                status: "completed",
              });
            }
          } else if (action.targetType === "task") {
            for (const project of projects) {
              for (const wp of getProjectWorkpackages(project)) {
                const task = wp.tasks?.find(t => t.id === action.targetId);
                if (task) {
                  const updatedTasks = wp.tasks.map(t =>
                    t.id === action.targetId ? { ...t, status: "done" as const } : t
                  );
                  await handleUpdateWorkpackage(wp.id, {
                    tasks: updatedTasks,
                  });
                  return;
                }
              }
            }
          }
          break;
        case "add-child":
          // Add a child task or subtask based on target type
          if (action.targetType === "workpackage") {
            // Add a new task to the workpackage
            const workpackage = workpackagesMap.get(action.targetId);
            if (workpackage) {
              const newTask: Task = {
                id: `task-${Date.now()}`,
                name: "New Task",
                start: new Date(),
                end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                progress: 0,
                workpackageId: workpackage.id,
                importance: "medium",
                deliverables: [],
                subtasks: [],
              };
              
              const updatedTasks = [...(workpackage.tasks || []), newTask];
              await handleUpdateWorkpackage(workpackage.id, {
                tasks: updatedTasks,
              });
            }
          } else if (action.targetType === "task") {
            // Add a new subtask to the task
            const context = findTaskContext(action.targetId);
            if (context) {
              const newSubtask = {
                id: `subtask-${Date.now()}`,
                name: "New Subtask",
                start: new Date(),
                end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                progress: 0,
                status: "not-started" as const,
                todos: [],
              };
              
              const updatedTasks = context.workpackage.tasks.map(t =>
                t.id === action.targetId
                  ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
                  : t
              );
              
              const updatedWorkpackage = updateWorkpackageWithTaskProgress({
                ...context.workpackage,
                tasks: updatedTasks,
              });
              
              await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);
              
              // If this task is selected, update it
              if (selectedTask?.id === action.targetId) {
                const updatedTask = updatedWorkpackage.tasks.find(t => t.id === action.targetId);
                if (updatedTask) {
                  setSelectedTask(updatedTask);
                }
              }
            }
          }
          break;
        case "add-dependency":
          // TODO: Implement dependency management UI
          alert("Dependency management will be implemented in a future update. For now, you can add dependencies manually in the task details.");
          break;
      }
    } catch (error) {
      console.error("Error handling context action:", error);
      alert("Failed to perform action. Please try again.");
    }
  }, [projects, handleUpdateWorkpackage, findTaskContext, selectedTask, workpackagesMap, getProjectWorkpackages]);

  const handlePersonDropOnBar = useCallback(async (
    taskOrProjectId: string,
    personId: string,
    isProject: boolean
  ) => {
    try {
      if (isProject) {
        // Assign person to project (as team member)
        const project = projects.find(p => p.id === taskOrProjectId);
        if (project) {
          const currentTeamMembers = project.teamMemberIds || [];
          if (!currentTeamMembers.includes(personId)) {
            await handleUpdateMasterProject(project.id, {
              teamMemberIds: [...currentTeamMembers, personId],
            });
          }
        }
      } else {
        // Assign person to task or workpackage
        const context = findTaskContext(taskOrProjectId);
        if (context) {
          // Check if it's a task
          const task = context.workpackage.tasks?.find(t => t.id === taskOrProjectId);
          if (task) {
            const currentHelpers = task.helpers || [];
            if (!currentHelpers.includes(personId) && task.primaryOwner !== personId) {
              const updatedTasks = context.workpackage.tasks.map(t =>
                t.id === taskOrProjectId
                  ? { ...t, helpers: [...currentHelpers, personId] }
                  : t
              );
              await handleUpdateWorkpackage(context.workpackage.id, {
                tasks: updatedTasks,
              });
              
              // Update selected task if it's the one being modified
              if (selectedTask?.id === taskOrProjectId) {
                const updatedTask = updatedTasks.find(t => t.id === taskOrProjectId);
                if (updatedTask) {
                  setSelectedTask(updatedTask);
                }
              }
            }
          } else {
            // It's a workpackage - assign as owner
            if (context.workpackage.ownerId !== personId) {
              await handleUpdateWorkpackage(context.workpackage.id, {
                ownerId: personId,
              });
            }
          }
        } else {
          // Try to find workpackage directly
          const workpackage = workpackagesMap.get(taskOrProjectId);
          if (workpackage) {
            if (workpackage.ownerId !== personId) {
              await handleUpdateWorkpackage(workpackage.id, {
                ownerId: personId,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error assigning person:", error);
      alert("Failed to assign person. Please try again.");
    }
  }, [projects, findTaskContext, selectedTask, handleUpdateMasterProject, handleUpdateWorkpackage, workpackagesMap]);

  const handleToggleTodo = useCallback(async (subtaskId: string, todoId: string) => {
    if (!selectedTask) return;

    try {
      const context = findTaskContext(selectedTask.id);
      if (!context) {
        alert("Could not find task context. Please refresh the page.");
        return;
      }

      // Convert MasterProject to Project format for progress calculation
      const projectWorkpackages = getProjectWorkpackages(context.project);
      const projectForCalc: Project = {
        ...context.project as any,
        workpackages: projectWorkpackages,
      };

      // Toggle todo and recalculate progress
      const updatedProject = toggleTodoAndRecalculate(
        projectForCalc,
        context.workpackage.id,
        selectedTask.id,
        subtaskId,
        todoId
      );

      // Get the updated workpackage
      const updatedWorkpackage = updatedProject.workpackages?.find(wp => wp.id === context.workpackage.id);
      if (!updatedWorkpackage) {
        throw new Error("Updated workpackage not found");
      }

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
      alert("Failed to toggle todo. Please try again.");
    }
  }, [selectedTask, findTaskContext, getProjectWorkpackages]);

  const handleAddTodo = useCallback(async (subtaskId: string, text: string) => {
    if (!selectedTask || !text.trim()) return;

    try {
      const context = findTaskContext(selectedTask.id);
      if (!context) {
        alert("Could not find task context. Please refresh the page.");
        return;
      }

      // Convert MasterProject to Project format for progress calculation
      const projectWorkpackages = getProjectWorkpackages(context.project);
      const projectForCalc: Project = {
        ...context.project as any,
        workpackages: projectWorkpackages,
      };

      // Add todo and recalculate progress
      const updatedProject = addTodoAndRecalculate(
        projectForCalc,
        context.workpackage.id,
        selectedTask.id,
        subtaskId,
        text.trim()
      );

      // Get the updated workpackage
      const updatedWorkpackage = updatedProject.workpackages?.find(wp => wp.id === context.workpackage.id);
      if (!updatedWorkpackage) {
        throw new Error("Updated workpackage not found");
      }

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error("Error adding todo:", error);
      alert("Failed to add todo. Please try again.");
    }
  }, [selectedTask, findTaskContext, getProjectWorkpackages]);

  const handleDeleteTodo = useCallback(async (subtaskId: string, todoId: string) => {
    if (!selectedTask) return;

    try {
      const context = findTaskContext(selectedTask.id);
      if (!context) {
        alert("Could not find task context. Please refresh the page.");
        return;
      }

      // Convert MasterProject to Project format for progress calculation
      const projectWorkpackages = getProjectWorkpackages(context.project);
      const projectForCalc: Project = {
        ...context.project as any,
        workpackages: projectWorkpackages,
      };

      // Delete todo and recalculate progress
      const updatedProject = deleteTodoAndRecalculate(
        projectForCalc,
        context.workpackage.id,
        selectedTask.id,
        subtaskId,
        todoId
      );

      // Get the updated workpackage
      const updatedWorkpackage = updatedProject.workpackages?.find(wp => wp.id === context.workpackage.id);
      if (!updatedWorkpackage) {
        throw new Error("Updated workpackage not found");
      }

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
      alert("Failed to delete todo. Please try again.");
    }
  }, [selectedTask, findTaskContext, getProjectWorkpackages]);

  const handleAddSubtask = useCallback(async (name: string) => {
    if (!selectedTask || !name.trim()) return;

    try {
      const context = findTaskContext(selectedTask.id);
      if (!context) {
        alert("Could not find task context. Please refresh the page.");
        return;
      }

      const newSubtask = {
        id: `subtask-${Date.now()}`,
        name: name.trim(),
        start: new Date(),
        end: new Date(),
        progress: 0,
        status: "not-started" as const,
        todos: [],
      };

      // Update task with new subtask
      const updatedTasks = context.workpackage.tasks.map(t =>
        t.id === selectedTask.id
          ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
          : t
      );

      // Recalculate progress
      const updatedWorkpackage = updateWorkpackageWithTaskProgress({
        ...context.workpackage,
        tasks: updatedTasks,
      });

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error("Error adding subtask:", error);
      alert("Failed to add subtask. Please try again.");
    }
  }, [selectedTask, findTaskContext, getProjectWorkpackages]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Button onClick={handleCreateProject}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <div className="card-monday hidden xl:block">
          <h2 className="text-lg font-bold text-foreground mb-3">Lab Personnel</h2>
        </div>
        <div className="card-monday">
          <GanttChart
            projects={projects}
            workpackages={allWorkpackages}
            people={people}
            onDateChange={handleDateChange}
            onTaskClick={handleTaskClick}
            onPersonDropOnBar={handlePersonDropOnBar}
            onToggleExpand={handleToggleExpand}
            onContextAction={handleContextAction}
          />
        </div>
      </div>
      {selectedTask && (
        <div className="mt-4">
          <TaskDetailPanel
            task={selectedTask}
            profiles={allProfiles}
            onToggleTodo={handleToggleTodo}
            onAddTodo={handleAddTodo}
            onDeleteTodo={handleDeleteTodo}
            onAddSubtask={handleAddSubtask}
            readOnly={false}
          />
          <Button
            variant="outline"
            onClick={() => setSelectedTask(null)}
            className="mt-4"
          >
            Close Task Details
          </Button>
        </div>
      )}
    </>
  );
}