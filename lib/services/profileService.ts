/**
 * Profile Service - Person profile management
 * Handles operations on the 'personProfiles' collection
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import type { PersonProfile } from "../types"

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T | null> {
  let delay = initialDelay
  let lastError: any = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      // Don't retry on permission errors or not-found errors
      if (error?.code === 'permission-denied' || error?.code === 'not-found') {
        throw error
      }
      // Retry on transient errors (network issues, etc.)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2
      }
    }
  }

  throw lastError
}

/**
 * Repairs the sync between user and profile documents
 * Updates the user document's profileId to match the actual profile
 */
async function repairUserProfileSync(userId: string, profileId: string): Promise<void> {
  const db = getFirebaseDb()
  try {
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, { profileId }, { merge: true })
    logger.info("Repaired user/profile sync", { userId, profileId })
  } catch (error) {
    logger.error("Error repairing user/profile sync", error, { userId, profileId })
    // Don't throw - this is a repair operation, not critical path
  }
}

/**
 * Create a new person profile
 */
export async function createProfile(userId: string, profileData: Omit<PersonProfile, 'id'>): Promise<string> {
  const db = getFirebaseDb()

  // Log the inputs for debugging
  logger.debug("createProfile called", {
    userId,
    userIdType: typeof userId,
    userIdLength: userId?.length,
    hasProfileData: !!profileData,
  })

  // Validate required fields
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    logger.error("Invalid userId in createProfile", {
      userId,
      userIdType: typeof userId,
      userIdValue: JSON.stringify(userId),
    })
    throw new Error("userId is required and must be a non-empty string")
  }

  if (!profileData.firstName || typeof profileData.firstName !== 'string' || profileData.firstName.trim() === '') {
    throw new Error("firstName is required")
  }

  if (!profileData.lastName || typeof profileData.lastName !== 'string' || profileData.lastName.trim() === '') {
    throw new Error("lastName is required")
  }

  if (!profileData.email || typeof profileData.email !== 'string' || profileData.email.trim() === '') {
    throw new Error("email is required")
  }

  if (!profileData.organisationId || typeof profileData.organisationId !== 'string' || profileData.organisationId.trim() === '') {
    throw new Error("organisationId is required")
  }

  if (!profileData.instituteId || typeof profileData.instituteId !== 'string' || profileData.instituteId.trim() === '') {
    throw new Error("instituteId is required")
  }

  if (!profileData.labId || typeof profileData.labId !== 'string' || profileData.labId.trim() === '') {
    throw new Error("labId is required")
  }

  // Validate array fields
  if (profileData.researchInterests && !Array.isArray(profileData.researchInterests)) {
    throw new Error("researchInterests must be an array")
  }

  if (profileData.qualifications && !Array.isArray(profileData.qualifications)) {
    throw new Error("qualifications must be an array")
  }

  if (profileData.fundedBy && !Array.isArray(profileData.fundedBy)) {
    throw new Error("fundedBy must be an array")
  }

  // Validate new dynamic membership arrays (optional fields)
  if (profileData.researchGroupIds && !Array.isArray(profileData.researchGroupIds)) {
    throw new Error("researchGroupIds must be an array")
  }

  if (profileData.workingLabIds && !Array.isArray(profileData.workingLabIds)) {
    throw new Error("workingLabIds must be an array")
  }

  try {
    // Check if user already has a profileId (e.g., from ORCID linking during onboarding)
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    const existingProfileId = userDoc.data()?.profileId

    let profileId: string
    let profileRef: any

    if (existingProfileId) {
      // Profile already exists (likely from ORCID linking), update it
      profileId = existingProfileId
      profileRef = doc(db, "personProfiles", profileId)
      logger.debug("Updating existing profile document", { profileId, profileData })

      await setDoc(profileRef, {
        ...profileData,
        id: profileId,
        userId,
        createdAt: serverTimestamp(),
      }, { merge: true })

      logger.info("Profile document updated successfully", { profileId })
    } else {
      // Create new profile
      profileRef = doc(collection(db, "personProfiles"))
      profileId = profileRef.id

      logger.debug("Creating new profile document", { profileId, profileData })

      await setDoc(profileRef, {
        ...profileData,
        id: profileId,
        userId,
        createdAt: serverTimestamp(),
      })

      logger.info("Profile document created successfully", { profileId })

      // Update user document with profileId
      logger.debug("Updating user document", { userId })
      await setDoc(userRef, { profileId }, { merge: true })
      logger.info("User document updated successfully", { userId, profileId })
    }

    // Note: Lab membership is now tracked via PersonProfile.labId
    // No need to update lab.members array (removed in new Lab interface)
    // Lab member count will be calculated by querying profiles with matching labId

    return profileId
  } catch (error: any) {
    logger.error("Error in createProfile", error, {
      code: error?.code,
      message: error?.message
    })
    throw error
  }
}

/**
 * Get a profile by ID
 */
export async function getProfile(profileId: string): Promise<PersonProfile | null> {
  const db = getFirebaseDb()
  if (!profileId) {
    logger.warn("getProfile called with undefined or empty profileId")
    return null
  }

  try {
    return await retryWithBackoff(async () => {
      const profileRef = doc(db, "personProfiles", profileId)
      const profileSnap = await getDoc(profileRef)
      if (!profileSnap.exists()) {
        logger.debug("Profile document does not exist", { profileId })
        return null
      }
      return profileSnap.data() as PersonProfile
    })
  } catch (error: any) {
    logger.error("Error fetching profile by profileId", error, { profileId })
    // Log the specific error code to help debug permission issues
    if (error?.code === 'permission-denied') {
      logger.warn("Permission denied when fetching profile - this should not happen for own profile", { profileId })
    }
    return null
  }
}

/**
 * Get a profile by user ID
 */
export async function getProfileByUserId(userId: string): Promise<PersonProfile | null> {
  const db = getFirebaseDb()
  if (!userId) {
    logger.warn("getProfileByUserId called with undefined or empty userId")
    return null
  }

  try {
    return await retryWithBackoff(async () => {
      const q = query(collection(db, "personProfiles"), where("userId", "==", userId))
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty || !querySnapshot.docs[0]) {
        return null
      }
      return querySnapshot.docs[0].data() as PersonProfile
    })
  } catch (error: any) {
    logger.error("Error fetching profile by userId", error, { userId })
    // If permission denied, it might be because user doesn't have a lab yet
    // but they should still be able to read their own profile (handled by Firestore rules)
    if (error?.code === 'permission-denied') {
      logger.warn("Permission denied when fetching profile by userId - this should not happen for own profile", { userId })
    }
    return null
  }
}

/**
 * Helper function to find a user's profile by trying multiple methods
 * Tries profileId first (from user document), then userId query
 * Also repairs user/profile sync if there's a mismatch
 * Returns null if no profile is found
 */
export async function findUserProfile(userId: string, profileId: string | null | undefined): Promise<PersonProfile | null> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    // Silently return null if no userId (user not logged in yet)
    return null
  }

  let profile: PersonProfile | null = null

  // First, try to get profile by profileId if it exists in user document
  if (profileId) {
    try {
      profile = await getProfile(profileId)
      if (profile) {
        logger.debug("Found profile by profileId", { profileId: profile.id })
        // Verify the profile's userId matches - repair if mismatch
        if (profile.userId !== userId) {
          logger.warn("Profile userId mismatch - repairing", {
            profileUserId: profile.userId,
            expectedUserId: userId
          })
          await repairUserProfileSync(userId, profile.id)
        }
        return profile
      } else {
        logger.debug("Profile not found by profileId", { profileId })
      }
    } catch (error) {
      logger.error("Error fetching profile by profileId", error, { profileId })
    }
  } else {
    logger.debug("No profileId in user document, trying userId lookup", { userId })
  }

  // If not found by profileId, try by userId
  if (!profile) {
    try {
      profile = await getProfileByUserId(userId)
      if (profile) {
        logger.debug("Found profile by userId", { profileId: profile.id })
        // Repair: Update user document with profileId if it's missing or incorrect
        if (!profileId || profileId !== profile.id) {
          logger.info("Repairing user/profile sync", {
            userId,
            oldProfileId: profileId,
            newProfileId: profile.id
          })
          await repairUserProfileSync(userId, profile.id)
        }
        return profile
      } else {
        logger.debug("Profile not found by userId", { userId })
      }
    } catch (error) {
      logger.error("Error fetching profile by userId", error, { userId })
    }
  }

  return profile
}

/**
 * Update a profile
 */
export async function updateProfile(profileId: string, updates: Partial<PersonProfile>): Promise<void> {
  const db = getFirebaseDb()
  const profileRef = doc(db, "personProfiles", profileId)

  // Note: Lab membership is now tracked via PersonProfile.labId
  // No need to update lab.members array (removed in new Lab interface)
  // Lab member count will be calculated by querying profiles with matching labId

  // Update the profile
  await updateDoc(profileRef, updates)
}

/**
 * Subscribe to profiles with optional lab filter
 */
export function subscribeToProfiles(
  filters: { labId?: string } | null,
  callback: (profiles: PersonProfile[]) => void
): Unsubscribe {
  const db = getFirebaseDb()
  try {
    let q: Query = collection(db, "personProfiles")

    if (filters?.labId && filters.labId !== undefined && filters.labId !== null && filters.labId !== "") {
      q = query(q, where("labId", "==", filters.labId))
    }

    return onSnapshot(q,
      (snapshot) => {
        const profiles = snapshot.docs.map(doc => {
          const data = doc.data()
          // Validate required fields
          if (!data.firstName || !data.lastName) {
            logger.warn("Profile is missing required fields", {
              profileId: doc.id,
              hasFirstName: !!data.firstName,
              hasLastName: !!data.lastName
            })
          }
          return data as PersonProfile
        })
        logger.debug("subscribeToProfiles: Loaded profiles", { count: profiles.length })
        callback(profiles)
      },
      (error) => {
        logger.error("Error in subscribeToProfiles", error, {
          code: error?.code,
          message: error?.message
        })
        // Don't throw - just log the error and return empty array
        callback([])
      }
    )
  } catch (error) {
    logger.error("Error setting up profiles subscription", error)
    // Return a no-op unsubscribe function that calls callback with empty array
    callback([])
    return () => {}
  }
}

// ============================================================================
// DYNAMIC GROUP MEMBERSHIP HELPERS
// ============================================================================

/**
 * Add a research group to a person's profile
 * Updates the researchGroupIds array in the profile
 */
export async function addResearchGroupToProfile(
  profileId: string,
  researchGroupId: string
): Promise<void> {
  const db = getFirebaseDb()
  const profileRef = doc(db, "personProfiles", profileId)

  try {
    // Get current profile
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) {
      throw new Error(`Profile ${profileId} not found`)
    }

    const profile = profileSnap.data() as PersonProfile
    const currentGroups = profile.researchGroupIds || []

    // Check if already a member
    if (currentGroups.includes(researchGroupId)) {
      logger.warn("Profile is already a member of this research group", { profileId, researchGroupId })
      return
    }

    // Add the research group
    await updateDoc(profileRef, {
      researchGroupIds: [...currentGroups, researchGroupId],
      updatedAt: new Date().toISOString(),
    })

    logger.info("Research group added to profile", { profileId, researchGroupId })
  } catch (error) {
    logger.error("Error adding research group to profile", error, { profileId, researchGroupId })
    throw error
  }
}

/**
 * Remove a research group from a person's profile
 * Updates the researchGroupIds array in the profile
 */
export async function removeResearchGroupFromProfile(
  profileId: string,
  researchGroupId: string
): Promise<void> {
  const db = getFirebaseDb()
  const profileRef = doc(db, "personProfiles", profileId)

  try {
    // Get current profile
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) {
      throw new Error(`Profile ${profileId} not found`)
    }

    const profile = profileSnap.data() as PersonProfile
    const currentGroups = profile.researchGroupIds || []

    // Remove the research group
    const updatedGroups = currentGroups.filter(id => id !== researchGroupId)

    await updateDoc(profileRef, {
      researchGroupIds: updatedGroups,
      updatedAt: new Date().toISOString(),
    })

    logger.info("Research group removed from profile", { profileId, researchGroupId })
  } catch (error) {
    logger.error("Error removing research group from profile", error, { profileId, researchGroupId })
    throw error
  }
}

/**
 * Add a working lab to a person's profile
 * Updates the workingLabIds array in the profile
 */
export async function addWorkingLabToProfile(
  profileId: string,
  workingLabId: string
): Promise<void> {
  const db = getFirebaseDb()
  const profileRef = doc(db, "personProfiles", profileId)

  try {
    // Get current profile
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) {
      throw new Error(`Profile ${profileId} not found`)
    }

    const profile = profileSnap.data() as PersonProfile
    const currentLabs = profile.workingLabIds || []

    // Check if already a member
    if (currentLabs.includes(workingLabId)) {
      logger.warn("Profile is already a member of this working lab", { profileId, workingLabId })
      return
    }

    // Add the working lab
    await updateDoc(profileRef, {
      workingLabIds: [...currentLabs, workingLabId],
      updatedAt: new Date().toISOString(),
    })

    logger.info("Working lab added to profile", { profileId, workingLabId })
  } catch (error) {
    logger.error("Error adding working lab to profile", error, { profileId, workingLabId })
    throw error
  }
}

/**
 * Remove a working lab from a person's profile
 * Updates the workingLabIds array in the profile
 */
export async function removeWorkingLabFromProfile(
  profileId: string,
  workingLabId: string
): Promise<void> {
  const db = getFirebaseDb()
  const profileRef = doc(db, "personProfiles", profileId)

  try {
    // Get current profile
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) {
      throw new Error(`Profile ${profileId} not found`)
    }

    const profile = profileSnap.data() as PersonProfile
    const currentLabs = profile.workingLabIds || []

    // Remove the working lab
    const updatedLabs = currentLabs.filter(id => id !== workingLabId)

    await updateDoc(profileRef, {
      workingLabIds: updatedLabs,
      updatedAt: new Date().toISOString(),
    })

    logger.info("Working lab removed from profile", { profileId, workingLabId })
  } catch (error) {
    logger.error("Error removing working lab from profile", error, { profileId, workingLabId })
    throw error
  }
}
