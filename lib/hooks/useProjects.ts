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

export function useProjects() {
  const { currentUser: user, currentUserProfile: profile } = useAuth();
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [workpackages, setWorkpackages] = useState<Workpackage[]>([]);
  const [workpackagesMap, setWorkpackagesMap] = useState<Map<string, Workpackage>>(new Map());

  useEffect(() => {
    if (profile?.labId) {
      const unsubscribe = subscribeToMasterProjects(
        { labId: profile.labId },
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

  return {
    projects,
    workpackages,
    workpackagesMap,
    handleCreateMasterProject,
    handleUpdateMasterProject,
    handleDeleteMasterProject,
    handleCreateWorkpackage,
    handleUpdateWorkpackage,
    handleDeleteWorkpackage,
  };
}