
import { useState, useEffect, useCallback } from 'react';
import { Project, Workpackage, Task, PersonProfile, ProfileProject } from '@/lib/types';
import { createProject, subscribeToProjects, updateProject, deleteProject as deleteProjectFromFirestore } from '@/lib/firestoreService';
import { useProfiles } from '@/lib/useProfiles';

export function useProjects(currentUser: any, currentUserProfile: PersonProfile | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const allProfiles = useProfiles();

  const syncProjectsFromProfiles = useCallback(() => {
    const syncedProjects: Project[] = [];
    const projectIdMap = new Map<string, Project>();

    allProfiles.forEach((profile) => {
      profile.projects?.forEach((profileProject) => {
        if (!projectIdMap.has(profileProject.id)) {
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'];
          const colorIndex = profileProject.id.split('-').pop() || '0';
          const randomColor = colors[parseInt(colorIndex) % colors.length];

          const project: Project = {
            id: `sync-${profileProject.id}`,
            name: profileProject.name,
            start: new Date(profileProject.startDate),
            end: new Date(profileProject.endDate),
            progress: 0,
            color: randomColor,
            importance: 'medium',
            notes: profileProject.notes || '',
            isExpanded: true,
            principalInvestigatorId: profile.id,
            profileProjectId: profileProject.id,
            fundedBy: [],
          };
          syncedProjects.push(project);
          projectIdMap.set(profileProject.id, project);
        }
      });
    });

    return syncedProjects;
  }, [allProfiles]);

  useEffect(() => {
    const storedProjects = localStorage.getItem('gantt-projects');
    let loadedProjects: Project[] = [];
    if (storedProjects) {
      const parsed = JSON.parse(storedProjects);
      loadedProjects = parsed.map((p: any) => ({
        ...p,
        start: new Date(p.start),
        end: new Date(p.end),
        tasks: p.tasks.map((t: any) => ({
          ...t,
          start: new Date(t.start),
          end: new Date(t.end),
        })),
      }));
    }

    const syncedProjects = syncProjectsFromProfiles();
    setProjects([...syncedProjects, ...loadedProjects]);
  }, [syncProjectsFromProfiles]);

  useEffect(() => {
    localStorage.setItem('gantt-projects', JSON.stringify(projects.filter(p => !p.profileProjectId)));
  }, [projects]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const unsubscribe = subscribeToProjects(currentUser.id, (firestoreProjects) => {
      const syncedProjects = syncProjectsFromProfiles();
      const firestoreProjectIds = new Set(firestoreProjects.map(p => p.id));
      const localProjects = projects.filter(p => !p.profileProjectId && !firestoreProjectIds.has(p.id));
      setProjects([...syncedProjects, ...firestoreProjects, ...localProjects]);
    });

    return () => unsubscribe();
  }, [currentUser, syncProjectsFromProfiles]);

  const handleCreateRegularProject = async () => {
    if (!currentUser) return;
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const newProjectData = {
      name: `New Project ${projects.length + 1}`,
      start: today,
      end: nextWeek,
      progress: 0,
      color: '#3b82f6',
      importance: 'medium',
      tasks: [],
      notes: '',
      isExpanded: true,
      createdBy: currentUser.id,
      labId: currentUserProfile?.lab,
    };
    await createProject(newProjectData as any);
  };

  const handleCreateMasterProject = async (masterProject: ProfileProject) => {
    // This logic should be handled in useProfiles hook
  };

  const handleProjectNameChange = (projectId: string, newName: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: newName } : p))
    );
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    if (project.profileProjectId) {
      // This logic should be handled in useProfiles hook
    } else {
      await deleteProjectFromFirestore(projectId);
    }
  };

  const handleProjectImportanceChange = (projectId: string, importance: any) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, importance } : p))
    );
  };

  const handleProjectNotesChange = (projectId: string, notes: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, notes } : p))
    );
  };

  const handleToggleProjectExpand = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p))
    );
  };

  return {
    projects,
    handleCreateRegularProject,
    handleCreateMasterProject,
    handleProjectNameChange,
    handleDeleteProject,
    handleProjectImportanceChange,
    handleProjectNotesChange,
    handleToggleProjectExpand,
  };
}
