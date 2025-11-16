/**
 * Delete Service - Cascading delete operations
 * Handles complex deletion scenarios to maintain data integrity
 * Ensures no orphaned records exist after deletions
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import type { PersonProfile } from "../types"

export interface FirestoreUser {
  uid: string
  email: string
  fullName: string
  profileId: string | null
  createdAt: any
  isAdministrator: boolean
}

/**
 * Deletes a user and their associated profile
 * Ensures consistency: no user without a profile, no profile without a user
 * Also removes user from lab's members array if applicable
 *
 * @param userId - The ID of the user to delete
 * @throws Error if deletion fails
 */
export async function deleteUserCascade(userId: string): Promise<void> {
  const db = getFirebaseDb()
  const batch = writeBatch(db)

  try {
    // Get user document
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      logger.warn("User not found - nothing to delete", { userId })
      return
    }

    const userData = userSnap.data() as FirestoreUser
    const profileId = userData.profileId

    // Get profile if it exists
    if (profileId) {
      const profileRef = doc(db, "personProfiles", profileId)
      const profileSnap = await getDoc(profileRef)

      if (profileSnap.exists()) {
        // Note: Lab membership is now tracked via PersonProfile.labId
        // No need to update lab.members array (removed in new Lab interface)

        // Delete profile
        batch.delete(profileRef)
      }
    }

    // Delete user
    batch.delete(userRef)

    // Commit the batch - this is atomic, so either all succeed or all fail
    await batch.commit()

    // Verify deletions succeeded (batch commit is atomic, but verify for logging)
    try {
      const verifyUserSnap = await getDoc(userRef)
      const verifyProfileSnap = profileId ? await getDoc(doc(db, "personProfiles", profileId)) : null

      if (verifyUserSnap.exists()) {
        logger.warn("User still exists after batch commit", { userId })
        throw new Error(`Failed to delete user ${userId}`)
      }

      if (profileId && verifyProfileSnap?.exists()) {
        logger.warn("Profile still exists after batch commit", { profileId })
        throw new Error(`Failed to delete profile ${profileId}`)
      }

      logger.info("Successfully deleted user and associated profile", { userId, profileId })
    } catch (verifyError: any) {
      // If verification fails, log error but don't throw (batch already committed)
      if (verifyError?.message?.includes('Failed to delete')) {
        logger.error("Deletion verification failed", verifyError)
        throw verifyError
      }
      // Other verification errors (permission, network) are non-fatal
      logger.warn("Deletion verification incomplete (non-fatal)", { error: verifyError })
    }
  } catch (error) {
    logger.error("Error in deleteUserCascade", error, { userId })
    throw error
  }
}

/**
 * Deletes a profile and its associated user
 * Ensures consistency: no user without a profile, no profile without a user
 *
 * @param profileId - The ID of the profile to delete
 * @throws Error if profileId is invalid or deletion fails
 */
export async function deleteProfileCascade(profileId: string): Promise<void> {
  const db = getFirebaseDb()
  // Validate input
  if (!profileId || typeof profileId !== 'string' || profileId.trim() === '') {
    throw new Error("profileId is required and must be a non-empty string")
  }

  const batch = writeBatch(db)

  try {
    // Get profile document
    const profileRef = doc(db, "personProfiles", profileId)
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) {
      logger.warn("Profile not found - nothing to delete", { profileId })
      return
    }

    const profileData = profileSnap.data() as PersonProfile
    const userId = profileData.userId

    // Note: Lab membership is now tracked via PersonProfile.labId
    // No need to update lab.members array (removed in new Lab interface)

    // Delete profile
    batch.delete(profileRef)

    // Get and delete user if it exists
    if (userId) {
      const userRef = doc(db, "users", userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        batch.delete(userRef)
      }
    }

    // Commit the batch - this is atomic, so either all succeed or all fail
    await batch.commit()

    // Verify deletions succeeded
    try {
      const verifyProfileSnap = await getDoc(profileRef)
      const verifyUserSnap = userId ? await getDoc(doc(db, "users", userId)) : null

      if (verifyProfileSnap.exists()) {
        logger.warn("Profile still exists after batch commit", { profileId })
        throw new Error(`Failed to delete profile ${profileId}`)
      }

      if (userId && verifyUserSnap?.exists()) {
        logger.warn("User still exists after batch commit", { userId })
        throw new Error(`Failed to delete user ${userId}`)
      }

      logger.info("Successfully deleted profile and associated user", { profileId, userId })
    } catch (verifyError: any) {
      // If verification fails, log error but don't throw (batch already committed)
      if (verifyError?.message?.includes('Failed to delete')) {
        logger.error("Deletion verification failed", verifyError)
        throw verifyError
      }
      // Other verification errors (permission, network) are non-fatal
      logger.warn("Deletion verification incomplete (non-fatal)", { error: verifyError })
    }
  } catch (error) {
    logger.error("Error in deleteProfileCascade", error, { profileId })
    throw error
  }
}

/**
 * Deletes a profile project and all associated workpackages
 * Uses batched writes for atomicity
 *
 * @param projectId - The ID of the profile project to delete
 * @throws Error if deletion fails
 */
export async function deleteProfileProjectCascade(projectId: string): Promise<void> {
  const db = getFirebaseDb()
  const batch = writeBatch(db)

  // Delete the project
  const projectRef = doc(db, "profileProjects", projectId)
  batch.delete(projectRef)

  // Find and delete all associated workpackages
  const workpackagesQuery = query(
    collection(db, "workpackages"),
    where("profileProjectId", "==", projectId)
  )
  const workpackagesSnapshot = await getDocs(workpackagesQuery)

  workpackagesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Commit the batch
  await batch.commit()
}

/**
 * Deletes a single workpackage
 * This is used by the cascading delete function
 *
 * @param workpackageId - The ID of the workpackage to delete
 * @throws Error if deletion fails
 */
export async function deleteWorkpackageCascade(workpackageId: string): Promise<void> {
  const db = getFirebaseDb()
  const workpackageRef = doc(db, "workpackages", workpackageId)
  await deleteDoc(workpackageRef)
}

/**
 * Deletes multiple entities in a batch
 * Useful for bulk delete operations
 *
 * @param collectionName - The name of the collection
 * @param ids - Array of document IDs to delete
 * @throws Error if deletion fails
 */
export async function batchDelete(
  collectionName: string,
  ids: string[]
): Promise<void> {
  const db = getFirebaseDb()
  if (ids.length === 0) return

  const batch = writeBatch(db)
  ids.forEach((id) => {
    const docRef = doc(db, collectionName, id)
    batch.delete(docRef)
  })
  await batch.commit()
}
