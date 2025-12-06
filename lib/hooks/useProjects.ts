import { useState, useEffect, useCallback } from 'react';
import {
  MasterProject,
  Workpackage,
  Task,
  PersonProfile,
  ImportanceLevel,
} from '@/lib/types';
import {
  createMasterProject as createMasterProjectInFirestore,
  subscribeToMasterProjects,
  updateMasterProject,
  deleteMasterProject as deleteMasterProjectFromFirestore,
  createWorkpackage as createWorkpackageInFirestore,
  updateWorkpackage,
  deleteWorkpackage as deleteWorkpackageFromFirestore,
  getWorkpackages,
} from '@/lib/firestoreService';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export function useProjects(labId?: string) { // Accept labId prop
  const { currentUser: user, currentUserProfile: profile } = useAuth(); // Keep for create/update usage 
  // Actually, let's keep internal useAuth for userId/auth actions, but use passed labId for fetching.
  // Better yet, pass everything to avoid duplicate listeners.

  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [workpackages, setWorkpackages] = useState<Workpackage[]>([]);
  const [workpackagesMap, setWorkpackagesMap] = useState<Map<string, Workpackage>>(new Map());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (labId) {
      const unsubscribe = subscribeToMasterProjects(
        { labId: labId },
        async (newProjects) => {
          setProjects(newProjects);

          // Fetch workpackages for all new projects
          const map = new Map<string, Workpackage>();
          const allWps: Workpackage[] = [];

          for (const project of newProjects) {
            try {
              const wps = await getWorkpackages(project.id);
              wps.forEach(wp => {
                map.set(wp.id, wp);
                allWps.push(wp);
              });
            } catch (error) {
              logger.error('Error loading workpackages for project', error, { projectId: project.id });
            }
          }
          setWorkpackagesMap(map);
          setWorkpackages(allWps);
        }
      );
      return () => unsubscribe();
    }
  }, [profile]);

  const handleCreateMasterProject = async (
    projectData: Omit<MasterProject, 'id' | 'createdAt'>
  ) => {
    if (!profile) return;
    const projectId = await createMasterProjectInFirestore(projectData);
    return projectId;
  };

  const handleUpdateMasterProject = async (
    projectId: string,
    updates: Partial<MasterProject>
  ) => {
    await updateMasterProject(projectId, updates);
  };

  const handleDeleteMasterProject = async (projectId: string) => {
    await deleteMasterProjectFromFirestore(projectId);
  };

  const handleCreateWorkpackage = async (
    workpackageData: Omit<Workpackage, 'id'>
  ) => {
    if (!user) return;

    // DEBUG: Check for labId
    if (!workpackageData.labId) {
      console.error("Missing labId in workpackageData", workpackageData);
      throw new Error("Missing labId in workpackageData. Keys: " + Object.keys(workpackageData).join(", "));
    }

    const workpackageId = await createWorkpackageInFirestore({
      ...workpackageData,
      createdBy: user.uid,
    });
    return workpackageId;
  };

  const handleUpdateWorkpackage = async (
    workpackageId: string,
    updates: Partial<Workpackage>
  ) => {
    await updateWorkpackage(workpackageId, updates);
  };

  const handleDeleteWorkpackage = async (workpackageId: string) => {
    await deleteWorkpackageFromFirestore(workpackageId);
  };

  const handleUpdateDeliverableTasks = async (deliverableId: string, tasks: any[]) => {
    console.log("DEBUG: handleUpdateDeliverableTasks called", { deliverableId, tasksCount: tasks?.length });
    try {
      const { updateDeliverableTasks } = await import('@/lib/services/projectService');
      await updateDeliverableTasks(deliverableId, tasks);
      console.log("DEBUG: updateDeliverableTasks completed");
    } catch (error) {
      console.error("DEBUG: Error in handleUpdateDeliverableTasks", error);
      throw error;
    }
  };

  return {
    projects,
    workpackages,
    workpackagesMap,
    activeProjectId,
    setActiveProjectId,
    handleCreateMasterProject,
    handleUpdateMasterProject,
    handleDeleteMasterProject,
    handleCreateWorkpackage,
    handleUpdateWorkpackage,
    handleDeleteWorkpackage,
    handleUpdateDeliverableTasks,
  };
}