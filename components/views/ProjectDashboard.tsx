"use client"

import { useState, useCallback } from "react";
import { useAppContext } from "@/lib/AppContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GanttChart } from "@/components/GanttChart";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog";
import { DependencyPickerDialog } from "@/components/DependencyPickerDialog";
import { ProjectDetailPage } from "@/components/views/ProjectDetailPage";
import { ProjectImportDialog } from "@/components/ProjectImportDialog";
import { MasterProject, Task, Workpackage, Project, Person, ProfileProject, Subtask } from "@/lib/types";
import { Plus, FolderKanban, PackagePlus, Trash2, Loader2, AlertCircle, Upload } from "lucide-react";
import { Task as GanttTask } from "gantt-task-react";
import { updateWorkpackageWithProgress } from "@/lib/firestoreService";
import { toggleTodoAndRecalculate, addTodoAndRecalculate, deleteTodoAndRecalculate, updateWorkpackageWithTaskProgress } from "@/lib/progressCalculation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { notifyProjectTaskAssigned, notifyWorkpackageOwnerAssigned } from "@/lib/notificationUtils";

export function ProjectDashboard() {
  const { currentUser: user, currentUserProfile: profile } = useAuth();
  const {
    projects,
    workpackages: allWorkpackages,
    workpackagesMap,
    deliverables,
    handleCreateMasterProject,
    handleUpdateMasterProject,
    handleDeleteMasterProject,
    handleUpdateWorkpackage,
    handleCreateDeliverable,
    handleUpdateDeliverable,
    handleDeleteDeliverable,
    handleUpdateTaskHelpers,
    handleUpdateTaskDates,
    handleCreateWorkpackage: createWorkpackage,
    projectsSyncStatus,
    allProfiles,
    people,
  } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<MasterProject | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [dependencyDialog, setDependencyDialog] = useState<{
    item: Task | Subtask;
    itemType: "task" | "subtask";
    workpackageId: string;
  } | null>(null);

  // Helper to get workpackages for a project
  const getProjectWorkpackages = useCallback((project: MasterProject): Workpackage[] => {
    return project.workpackageIds
      .map(wpId => workpackagesMap.get(wpId))
      .filter((wp): wp is Workpackage => wp !== undefined);
  }, [workpackagesMap]);

  const handleCreateProjectClick = () => {
    setShowProjectDialog(true);
  };

  const handleImportSuccess = (projectId: string) => {
    logger.info('Project imported successfully', { projectId })
    setShowImportDialog(false)
    // Refresh will show the new project due to Firestore real-time sync
    alert('Project imported successfully! The new project should appear in the list shortly.')
  };

  const handleCreateRegularProject = () => {
    if (!profile) return;

    // Create a simple project with minimal defaults
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
      currency: "EUR",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      funderId: "",
      funderName: "",
      accountIds: [],
      principalInvestigatorIds: profile.id ? [profile.id] : [],
      coPIIds: [],
      teamMemberIds: profile.id ? [profile.id] : [],
      teamRoles: profile.id ? { [profile.id]: "PI" } : {},
      status: "planning",
      progress: 0,
      workpackageIds: [],
      visibility: "lab",
      createdBy: user?.uid || "",
      isExpanded: true,
    };

    handleCreateMasterProject(newProject);
    setShowProjectDialog(false);
  };

  const handleCreateMasterProjectFromDialog = async (projectData: ProfileProject & { funderId?: string }) => {
    if (!profile || !user) return;

    // Fix Bug #1: Validate project name before creation
    if (!projectData.name || !projectData.name.trim()) {
      alert("Project name is required. Please enter a project name.");
      return;
    }

    // Map ProjectVisibility to MasterProject visibility
    const mapVisibility = (vis: typeof projectData.visibility): "private" | "lab" | "institute" | "organisation" => {
      switch (vis) {
        case "private":
        case "postdocs":
        case "pi-researchers":
        case "custom":
          return "private";
        case "lab":
          return "lab";
        case "institute":
          return "institute";
        case "organisation":
          return "organisation";
        default:
          return "lab";
      }
    };

    // Convert ProfileProject to MasterProject format
    const newProject: Omit<MasterProject, "id" | "createdAt"> = {
      name: projectData.name.trim(), // Fix Bug #1: Ensure name is trimmed
      description: projectData.description || "",
      labId: profile.labId,
      labName: profile.labName,
      instituteId: profile.instituteId,
      instituteName: profile.instituteName,
      organisationId: profile.organisationId,
      organisationName: profile.organisationName,
      grantName: projectData.grantName || "",
      grantNumber: projectData.grantNumber || "",
      totalBudget: projectData.budget || 0,
      currency: "EUR",
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      funderId: projectData.funderId || "",
      funderName: "", // Will be populated by backend or fetched separately
      accountIds: projectData.fundedBy || [],
      principalInvestigatorIds: projectData.principalInvestigatorId ? [projectData.principalInvestigatorId] : (profile.id ? [profile.id] : []),
      coPIIds: [],
      teamMemberIds: projectData.principalInvestigatorId ? [projectData.principalInvestigatorId] : (profile.id ? [profile.id] : []),
      teamRoles: projectData.principalInvestigatorId ? { [projectData.principalInvestigatorId]: "PI" } : (profile.id ? { [profile.id]: "PI" } : {}),
      status: projectData.status,
      progress: 0,
      workpackageIds: [],
      visibility: mapVisibility(projectData.visibility),
      visibleTo: projectData.visibleTo,
      tags: projectData.tags,
      notes: projectData.notes,
      createdBy: user.uid,
      isExpanded: true,
    };

    try {
      await handleCreateMasterProject(newProject);
    } catch (error) {
      logger.error("Error creating master project", error);
      alert(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDeleteProject = () => {
    if (!selectedProjectForDetail) return;

    if (confirm(`Are you sure you want to delete the project "${selectedProjectForDetail.name}"? This action cannot be undone.`)) {
      handleDeleteMasterProject(selectedProjectForDetail.id);
      setSelectedProjectForDetail(null);
    }
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
              // Optimistic update - no await needed
              handleUpdateTaskDates(workpackage.id, task.id, ganttTask.start, ganttTask.end);
              return;
            }

            // Check subtasks
            for (const subtask of task.subtasks || []) {
              if (ganttTask.id === subtask.id) {
                const updatedTasks = (workpackage.tasks || []).map(t =>
                  t.id === task.id
                    ? {
                        ...t,
                        subtasks: t.subtasks?.map((st: Subtask) =>
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
      logger.error("Error updating task dates", error);
      alert("Failed to update task dates. Please try again.");
    }
  }, [projects, handleUpdateMasterProject, handleUpdateWorkpackage, handleUpdateTaskDates, workpackagesMap]);

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
              const updatedTasks = (wp.tasks || []).map(t =>
                t.id === id ? { ...t, isExpanded: !t.isExpanded } : t
              );
              await handleUpdateWorkpackage(wp.id, {
                tasks: updatedTasks,
              });
              return;
            }

            // Check if it's a subtask
            for (const task of wp.tasks || []) {
              const subtask = task.subtasks?.find((st: Subtask) => st.id === id);
              if (subtask) {
                const updatedTasks = (wp.tasks || []).map(t =>
                  t.id === task.id
                    ? {
                        ...t,
                        subtasks: t.subtasks?.map((st: Subtask) =>
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
      logger.error("Error toggling expand/collapse", error);
      alert("Failed to toggle expand/collapse. Please try again.");
    }
  }, [projects, handleUpdateMasterProject, handleUpdateWorkpackage, workpackagesMap, getProjectWorkpackages]);

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
          // Check if it's a project
          if (action.targetType === "project") {
            const project = projects.find(p => p.id === action.targetId);
            if (project) {
              setSelectedProjectForDetail(project);
              return;
            }
          }

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
        case "open-project-details":
          // Open project detail panel
          const project = projects.find(p => p.id === action.targetId);
          if (project) {
            setSelectedProjectForDetail(project);
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
                if (task && wp.tasks) {
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
            if (context && context.workpackage.tasks) {
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
                const updatedTask = updatedWorkpackage.tasks?.find(t => t.id === action.targetId);
                if (updatedTask) {
                  setSelectedTask(updatedTask);
                }
              }
            }
          }
          break;
        case "add-dependency":
          {
            // Find the task or subtask
            const context = findTaskContext(action.targetId);
            if (!context) break;

            // Check if it's a task or subtask
            const task = context.workpackage.tasks?.find(t => t.id === action.targetId);
            if (task) {
              setDependencyDialog({
                item: task,
                itemType: "task",
                workpackageId: context.workpackage.id,
              });
            } else {
              // Check subtasks
              for (const t of context.workpackage.tasks || []) {
                const subtask = t.subtasks?.find((st: Subtask) => st.id === action.targetId);
                if (subtask) {
                  setDependencyDialog({
                    item: subtask,
                    itemType: "subtask",
                    workpackageId: context.workpackage.id,
                  });
                  break;
                }
              }
            }
          }
          break;
      }
    } catch (error) {
      logger.error("Error handling context action", error);
      alert("Failed to perform action. Please try again.");
    }
  }, [projects, handleUpdateWorkpackage, findTaskContext, selectedTask, workpackagesMap, getProjectWorkpackages]);

  const handleSaveDependencies = useCallback(async (dependencyIds: string[]) => {
    if (!dependencyDialog) return;

    try {
      const { item, itemType, workpackageId } = dependencyDialog;
      const workpackage = workpackagesMap.get(workpackageId);
      if (!workpackage) return;

      if (itemType === "task") {
        const updatedTasks = workpackage.tasks?.map(t =>
          t.id === item.id
            ? { ...t, dependencies: dependencyIds }
            : t
        );
        await handleUpdateWorkpackage(workpackageId, {
          tasks: updatedTasks,
        });
      } else {
        // Subtask
        const updatedTasks = workpackage.tasks?.map(t => ({
          ...t,
          subtasks: t.subtasks?.map((st: Subtask) =>
            st.id === item.id
              ? { ...st, dependencies: dependencyIds }
              : st
          ),
        }));
        await handleUpdateWorkpackage(workpackageId, {
          tasks: updatedTasks,
        });
      }

      setDependencyDialog(null);
    } catch (error) {
      logger.error("Error saving dependencies", error);
      alert("Failed to save dependencies. Please try again.");
    }
  }, [dependencyDialog, workpackagesMap, handleUpdateWorkpackage]);

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
              const newHelpers = [...currentHelpers, personId];

              // Optimistic update - no await needed
              handleUpdateTaskHelpers(context.workpackage.id, taskOrProjectId, newHelpers);

              // Update selected task if it's the one being modified
              if (selectedTask?.id === taskOrProjectId) {
                setSelectedTask({ ...task, helpers: newHelpers });
              }

              // Send notification in background (non-blocking)
              if (profile && allProfiles) {
                const assignee = allProfiles.find(p => p.id === personId);
                if (assignee && assignee.id !== profile.id) {
                  notifyProjectTaskAssigned(
                    task,
                    assignee,
                    profile,
                    context.project.name
                  ).catch(error => {
                    logger.error('Error sending task assignment notification', error);
                  });
                }
              }
            }
          } else {
            // It's a workpackage - assign as owner
            if (context.workpackage.ownerId !== personId) {
              await handleUpdateWorkpackage(context.workpackage.id, {
                ownerId: personId,
              });

              // Send notification in background (non-blocking)
              if (profile && allProfiles) {
                const assignee = allProfiles.find(p => p.id === personId);
                if (assignee && assignee.id !== profile.id) {
                  notifyWorkpackageOwnerAssigned(
                    context.workpackage,
                    assignee,
                    profile,
                    context.project.name
                  ).catch(error => {
                    logger.error('Error sending workpackage assignment notification', error);
                  });
                }
              }
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

              // Send notification to newly assigned workpackage owner
              if (profile && allProfiles) {
                const assignee = allProfiles.find(p => p.id === personId);
                if (assignee && assignee.id !== profile.id) {
                  // Find the project for this workpackage
                  const project = projects.find(p => {
                    const wpIds = getProjectWorkpackages(p).map(wp => wp.id);
                    return wpIds.includes(workpackage.id);
                  });
                  if (project) {
                    // Send notification in background (non-blocking)
                    notifyWorkpackageOwnerAssigned(
                      workpackage,
                      assignee,
                      profile,
                      project.name
                    ).catch(error => {
                      logger.error('Error sending workpackage assignment notification', error);
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error("Error assigning person", error);
      alert("Failed to assign person. Please try again.");
    }
  }, [projects, findTaskContext, selectedTask, handleUpdateMasterProject, handleUpdateWorkpackage, handleUpdateTaskHelpers, workpackagesMap, profile, allProfiles, getProjectWorkpackages]);

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
      ) as any;

      // Get the updated workpackage
      const updatedWorkpackage = updatedProject.workpackages?.find((wp: Workpackage) => wp.id === context.workpackage.id);
      if (!updatedWorkpackage) {
        throw new Error("Updated workpackage not found");
      }

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks?.find((t: Task) => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      logger.error("Error toggling todo", error);
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
      ) as any;

      // Get the updated workpackage
      const updatedWorkpackage = updatedProject.workpackages?.find((wp: Workpackage) => wp.id === context.workpackage.id);
      if (!updatedWorkpackage) {
        throw new Error("Updated workpackage not found");
      }

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks?.find((t: Task) => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      logger.error("Error adding todo", error);
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
      ) as any;

      // Get the updated workpackage
      const updatedWorkpackage = updatedProject.workpackages?.find((wp: Workpackage) => wp.id === context.workpackage.id);
      if (!updatedWorkpackage) {
        throw new Error("Updated workpackage not found");
      }

      // Update in Firestore
      await updateWorkpackageWithProgress(context.workpackage.id, updatedWorkpackage);

      // Update selected task to reflect changes
      const updatedTask = updatedWorkpackage.tasks?.find((t: Task) => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      logger.error("Error deleting todo", error);
      alert("Failed to delete todo. Please try again.");
    }
  }, [selectedTask, findTaskContext, getProjectWorkpackages]);

  const handleAddSubtask = useCallback(async (name: string) => {
    if (!selectedTask || !name.trim()) return;

    try {
      const context = findTaskContext(selectedTask.id);
      if (!context || !context.workpackage.tasks) {
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
      const updatedTask = updatedWorkpackage.tasks?.find((t: Task) => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      logger.error("Error adding subtask", error);
      alert("Failed to add subtask. Please try again.");
    }
  }, [selectedTask, findTaskContext]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showWorkpackageDialog, setShowWorkpackageDialog] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [workpackageForm, setWorkpackageForm] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleCreateWorkpackage = async () => {
    if (!selectedProjectId || !profile) return;

    if (!workpackageForm.name.trim()) {
      alert("Please enter a workpackage name");
      return;
    }

    const newWorkpackage: Omit<Workpackage, "id"> = {
      name: workpackageForm.name.trim(),
      start: new Date(workpackageForm.startDate),
      end: new Date(workpackageForm.endDate),
      projectId: selectedProjectId,
      status: "planning",
      progress: 0,
      tasks: [],
      isExpanded: true,
      importance: "medium",
    };

    try {
      // Create workpackage and get its ID
      const workpackageId = await createWorkpackage(newWorkpackage);

      // Add workpackage ID to project
      if (selectedProject && workpackageId) {
        await handleUpdateMasterProject(selectedProjectId, {
          workpackageIds: [...(selectedProject.workpackageIds || []), workpackageId],
        });
      }

      setShowWorkpackageDialog(false);
      setWorkpackageForm({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
    } catch (error) {
      logger.error("Error creating workpackage", error);
      alert("Failed to create workpackage. Please try again.");
    }
  };

  // If a project is selected for detail view, show the detail page
  if (selectedProjectForDetail) {
    const projectWorkpackages = getProjectWorkpackages(selectedProjectForDetail)
    const projectTeamMembers = allProfiles.filter(p =>
      selectedProjectForDetail.teamMemberIds?.includes(p.id)
    )

    // Get deliverables for this project (filter by workpackages)
    const projectDeliverables = deliverables.filter(d =>
      projectWorkpackages.some(wp => wp.id === d.workpackageId)
    )

    return (
      <ProjectDetailPage
        project={selectedProjectForDetail}
        workpackages={projectWorkpackages}
        deliverables={projectDeliverables}
        teamMembers={projectTeamMembers}
        fundingAccounts={[]} // TODO: Add funding accounts fetch
        onBack={() => setSelectedProjectForDetail(null)}
        onEdit={() => {
          // TODO: Open project edit dialog
          alert("Edit functionality coming soon")
        }}
        onCreateWorkpackage={async (workpackageData) => {
          // Create workpackage and link it to the project
          const workpackageId = await createWorkpackage({
            ...workpackageData,
            projectId: selectedProjectForDetail.id,
            createdBy: user?.uid || "",
          } as any)

          if (workpackageId) {
            await handleUpdateMasterProject(selectedProjectForDetail.id, {
              workpackageIds: [...(selectedProjectForDetail.workpackageIds || []), workpackageId],
            })
          }
        }}
        onUpdateWorkpackage={async (workpackageId, updates) => {
          await handleUpdateWorkpackage(workpackageId, updates)
        }}
        onDeleteWorkpackage={async (workpackageId) => {
          // Remove from project's workpackageIds
          await handleUpdateMasterProject(selectedProjectForDetail.id, {
            workpackageIds: (selectedProjectForDetail.workpackageIds || []).filter(id => id !== workpackageId),
          })
          // Note: The actual workpackage document deletion should be handled by the backend or here
          // For now, we just remove the reference
        }}
        onCreateDeliverable={async (deliverableData) => {
          await handleCreateDeliverable({
            ...deliverableData,
            createdBy: user?.uid || "",
          } as any)
        }}
        onUpdateDeliverable={async (deliverableId, updates) => {
          await handleUpdateDeliverable(deliverableId, updates)
        }}
        onDeleteDeliverable={async (deliverableId) => {
          await handleDeleteDeliverable(deliverableId)
        }}
      />
    )
  }

  // Loading state
  if (!profile) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Projects</h3>
          <p className="text-sm text-muted-foreground">
            Fetching your project data...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-4 overflow-hidden">
      {/* Header with Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-foreground">Project Dashboard</h1>
          {projectsSyncStatus === 'syncing' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing...
            </Badge>
          )}
          {projectsSyncStatus === 'error' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Sync Error
            </Badge>
          )}
          <div className="text-sm text-muted-foreground">
            {people.length > 0 ? `${people.length} people` : 'Loading people...'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Selector */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}

          {selectedProjectId && (
            <>
              <Button
                onClick={() => setShowWorkpackageDialog(true)}
                variant="outline"
                className="gap-2"
              >
                <PackagePlus className="h-4 w-4" />
                Add Workpackage
              </Button>
              <Button
                onClick={handleDeleteProject}
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete Project
              </Button>
            </>
          )}

          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Project
          </Button>

          <Button onClick={handleCreateProjectClick} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Instructions Banner */}
      {projects.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-blue-900 mb-2">Getting Started:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Click &ldquo;New Project&rdquo; to create a project</li>
            <li>Select the project and click &ldquo;Add Workpackage&rdquo;</li>
            <li>Right-click workpackages to add tasks</li>
            <li>Drag people from the sidebar onto tasks to assign them</li>
            <li>Click any task to view todos and subtasks</li>
          </ol>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 overflow-hidden min-h-0">
        {/* Personnel Sidebar - Always visible on larger screens */}
        <div className="card-monday flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h2 className="text-lg font-bold text-foreground">Lab Personnel</h2>
            <span className="text-xs text-muted-foreground">Drag to assign</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {people.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                <p className="mb-2">No lab members found</p>
                <p className="text-xs">Add people in the People tab</p>
              </div>
            ) : (
              <PersonnelList people={people} />
            )}
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="card-monday overflow-hidden flex flex-col">
          <GanttChart
            projects={selectedProjectId ? projects.filter(p => p.id === selectedProjectId) : projects}
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

      {/* Task Detail Slide-out Panel */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>
                View and manage task details, subtasks, and to-do items
              </DialogDescription>
            </DialogHeader>
            <TaskDetailPanel
              task={selectedTask}
              profiles={allProfiles}
              onToggleTodo={handleToggleTodo}
              onAddTodo={handleAddTodo}
              onDeleteTodo={handleDeleteTodo}
              onAddSubtask={handleAddSubtask}
              readOnly={false}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Workpackage Creation Dialog */}
      <Dialog open={showWorkpackageDialog} onOpenChange={setShowWorkpackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workpackage</DialogTitle>
            <DialogDescription>
              Add a new workpackage to {selectedProject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wp-name">Workpackage Name *</Label>
              <Input
                id="wp-name"
                value={workpackageForm.name}
                onChange={(e) => setWorkpackageForm({ ...workpackageForm, name: e.target.value })}
                placeholder="e.g., Data Collection & Analysis"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wp-start">Start Date</Label>
                <Input
                  id="wp-start"
                  type="date"
                  value={workpackageForm.startDate}
                  onChange={(e) => setWorkpackageForm({ ...workpackageForm, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="wp-end">End Date</Label>
                <Input
                  id="wp-end"
                  type="date"
                  value={workpackageForm.endDate}
                  onChange={(e) => setWorkpackageForm({ ...workpackageForm, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWorkpackageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkpackage} className="bg-brand-500 hover:bg-brand-600 text-white">
                Create Workpackage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={showProjectDialog}
        onClose={() => setShowProjectDialog(false)}
        onCreateRegular={handleCreateRegularProject}
        onCreateMaster={handleCreateMasterProjectFromDialog}
        currentUserProfileId={profile?.id || null}
        currentUserId={user?.uid || ""}
        organisationId={profile?.organisationId}
      />

      {/* Dependency Picker Dialog */}
      {dependencyDialog && (
        <DependencyPickerDialog
          open={true}
          onClose={() => setDependencyDialog(null)}
          onConfirm={handleSaveDependencies}
          currentItem={dependencyDialog.item}
          currentItemType={dependencyDialog.itemType}
          projects={projects}
          workpackagesMap={workpackagesMap}
          currentWorkpackageId={dependencyDialog.workpackageId}
        />
      )}

      {/* Import Project Dialog */}
      <ProjectImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportSuccess={handleImportSuccess}
        labId={profile?.labId || ''}
        userId={user?.uid || ''}
      />
    </div>
  );
}

function PersonnelList({ people }: { people: Person[] }) {
  return (
    <div className="space-y-2">
      {people.map((person) => (
        <div key={person.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: person.color }}
          >
            {person.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-foreground">{person.name}</span>
        </div>
      ))}
    </div>
  );
}