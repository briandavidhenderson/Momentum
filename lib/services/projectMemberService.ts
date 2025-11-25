import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { logger } from '../logger';
import type { ProjectRole } from '../types';

export interface AddMemberInput {
  projectId: string;
  profileId: string;
  role: ProjectRole;
}

export interface RemoveMemberInput {
  projectId: string;
  profileId: string;
}

/**
 * Add a member to a project with a specific role
 * @param input - Project ID, profile ID, and role for the new member
 * @throws Error if update fails
 */
export async function addProjectMember(input: AddMemberInput): Promise<void> {
  const { projectId, profileId, role } = input;
  const db = getFirebaseDb();
  const projectRef = doc(db, 'masterProjects', projectId);

  try {
    // Determine which arrays to update based on role
    const updates: any = {
      teamMemberIds: arrayUnion(profileId),
      [`teamRoles.${profileId}`]: role,
    };

    if (role === 'PI') {
      updates.principalInvestigatorIds = arrayUnion(profileId);
    } else if (role === 'Co-PI') {
      updates.coPIIds = arrayUnion(profileId);
    }

    await updateDoc(projectRef, updates);
    logger.info('Added project member', { projectId, profileId, role });
  } catch (error) {
    logger.error('Error adding project member', error);
    throw error;
  }
}

/**
 * Remove a member from a project
 * @param input - Project ID and profile ID to remove
 * @throws Error if project not found or update fails
 */
export async function removeProjectMember(input: RemoveMemberInput): Promise<void> {
  const { projectId, profileId } = input;
  const db = getFirebaseDb();
  const projectRef = doc(db, 'masterProjects', projectId);

  try {
    // Get current project to check role
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectSnap.data();
    const currentRole = projectData.teamRoles?.[profileId];

    // Remove from appropriate arrays
    const updates: any = {
      teamMemberIds: arrayRemove(profileId),
      [`teamRoles.${profileId}`]: null, // Remove role mapping
    };

    if (currentRole === 'PI') {
      updates.principalInvestigatorIds = arrayRemove(profileId);
    } else if (currentRole === 'Co-PI') {
      updates.coPIIds = arrayRemove(profileId);
    }

    await updateDoc(projectRef, updates);
    logger.info('Removed project member', { projectId, profileId });
  } catch (error) {
    logger.error('Error removing project member', error);
    throw error;
  }
}

/**
 * Update a member's role in a project
 * @param projectId - Project ID
 * @param profileId - Profile ID of the member
 * @param newRole - New role to assign
 * @throws Error if update fails
 */
export async function updateProjectMemberRole(
  projectId: string,
  profileId: string,
  newRole: ProjectRole
): Promise<void> {
  // Remove and re-add with new role
  await removeProjectMember({ projectId, profileId });
  await addProjectMember({ projectId, profileId, role: newRole });

  logger.info('Updated project member role', { projectId, profileId, newRole });
}
