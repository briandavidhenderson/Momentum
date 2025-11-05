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
} from '@/lib/firestoreService';
import { useAuth } from './useAuth';

export function useProjects() {
  const { currentUser: user, currentUserProfile: profile } = useAuth();
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [workpackages, setWorkpackages] = useState<Workpackage[]>([]);

  useEffect(() => {
    if (profile?.labId) {
      const unsubscribe = subscribeToMasterProjects(
        { labId: profile.labId },
        (newProjects) => {
          setProjects(newProjects);
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
    handleCreateMasterProject,
    handleUpdateMasterProject,
    handleDeleteMasterProject,
    handleCreateWorkpackage,
    handleUpdateWorkpackage,
    handleDeleteWorkpackage,
  };
}