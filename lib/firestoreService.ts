import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  addDoc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  Query,
} from "firebase/firestore"
import { db } from "./firebase"
import {
  PersonProfile,
  ProfileProject,
  Project,
  Workpackage,
  Order,
  InventoryItem,
  CalendarEvent,
  AuditTrail,
  LabPoll,
  EquipmentDevice,
  ELNExperiment,
  Organisation,
  Institute,
  Lab,
  Funder,
  FundingAccount,
  MasterProject,
  CalendarConnection,
  CalendarSyncLog,
  CalendarConflict,
} from "./types"

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export interface FirestoreUser {
  uid: string
  email: string
  fullName: string
  profileId: string | null
  createdAt: Timestamp
  isAdministrator: boolean
}

export async function createUser(uid: string, email: string, fullName: string): Promise<void> {
  const userRef = doc(db, "users", uid)
  await setDoc(userRef, {
    uid,
    email,
    fullName,
    profileId: null,
    createdAt: serverTimestamp(),
    isAdministrator: false,
  })
}

export async function getUser(uid: string): Promise<FirestoreUser | null> {
  const userRef = doc(db, "users", uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) return null
  return userSnap.data() as FirestoreUser
}

export async function updateUser(uid: string, updates: Partial<FirestoreUser>): Promise<void> {
  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, updates)
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

export async function createProfile(userId: string, profileData: Omit<PersonProfile, 'id'>): Promise<string> {
  // Validate required fields
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
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
  
  if (!profileData.organisation || typeof profileData.organisation !== 'string' || profileData.organisation.trim() === '') {
    throw new Error("organisation is required")
  }
  
  if (!profileData.institute || typeof profileData.institute !== 'string' || profileData.institute.trim() === '') {
    throw new Error("institute is required")
  }
  
  if (!profileData.lab || typeof profileData.lab !== 'string' || profileData.lab.trim() === '') {
    throw new Error("lab is required")
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
  
  try {
    const profileRef = doc(collection(db, "personProfiles"))
    const profileId = profileRef.id
    
    console.log("Creating profile document with ID:", profileId)
    console.log("Profile data:", profileData)
    
    await setDoc(profileRef, {
      ...profileData,
      id: profileId,
      userId,
      createdAt: serverTimestamp(),
    })
    
    console.log("Profile document created successfully")
    
    // Update user document with profileId (use setDoc with merge to ensure user doc exists)
    const userRef = doc(db, "users", userId)
    console.log("Updating user document:", userId)
    
    await setDoc(userRef, { profileId }, { merge: true })

    console.log("User document updated successfully")

    // Note: Lab membership is now tracked via PersonProfile.labId
    // No need to update lab.members array (removed in new Lab interface)
    // Lab member count will be calculated by querying profiles with matching labId

    return profileId
  } catch (error: any) {
    console.error("Error in createProfile:", error)
    console.error("Error code:", error?.code)
    console.error("Error message:", error?.message)
    throw error
  }
}

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

export async function getProfile(profileId: string): Promise<PersonProfile | null> {
  if (!profileId) {
    console.warn("getProfile called with undefined or empty profileId")
    return null
  }
  
  try {
    return await retryWithBackoff(async () => {
      const profileRef = doc(db, "personProfiles", profileId)
      const profileSnap = await getDoc(profileRef)
      if (!profileSnap.exists()) {
        console.log("Profile document does not exist:", profileId)
        return null
      }
      return profileSnap.data() as PersonProfile
    })
  } catch (error: any) {
    console.error("Error fetching profile by profileId:", error)
    // Log the specific error code to help debug permission issues
    if (error?.code === 'permission-denied') {
      console.warn("Permission denied when fetching profile - this should not happen for own profile")
    }
    return null
  }
}

export async function getProfileByUserId(userId: string): Promise<PersonProfile | null> {
  if (!userId) {
    console.warn("getProfileByUserId called with undefined or empty userId")
    return null
  }
  
  try {
    return await retryWithBackoff(async () => {
      const q = query(collection(db, "personProfiles"), where("userId", "==", userId))
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) return null
      return querySnapshot.docs[0].data() as PersonProfile
    })
  } catch (error: any) {
    console.error("Error fetching profile by userId:", error)
    // If permission denied, it might be because user doesn't have a lab yet
    // but they should still be able to read their own profile (handled by Firestore rules)
    if (error?.code === 'permission-denied') {
      console.warn("Permission denied when fetching profile by userId - this should not happen for own profile")
    }
    return null
  }
}

export async function getAllProfiles(): Promise<PersonProfile[]> {
  const querySnapshot = await getDocs(collection(db, "personProfiles"))
  return querySnapshot.docs.map(doc => doc.data() as PersonProfile)
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
        console.log("✓ Found profile by profileId:", profile.id)
        // Verify the profile's userId matches - repair if mismatch
        if (profile.userId !== userId) {
          console.warn(`Profile userId mismatch: profile.userId=${profile.userId}, expected=${userId}. Repairing...`)
          await repairUserProfileSync(userId, profile.id)
        }
        return profile
      } else {
        console.log("✗ Profile not found by profileId:", profileId)
      }
    } catch (error) {
      console.error("Error fetching profile by profileId:", error)
    }
  } else {
    console.log("No profileId in user document, trying userId lookup")
  }
  
  // If not found by profileId, try by userId
  if (!profile) {
    try {
      profile = await getProfileByUserId(userId)
      if (profile) {
        console.log("✓ Found profile by userId:", profile.id)
        // Repair: Update user document with profileId if it's missing or incorrect
        if (!profileId || profileId !== profile.id) {
          console.log(`Repairing user/profile sync: user.profileId=${profileId}, actual=${profile.id}`)
          await repairUserProfileSync(userId, profile.id)
        }
        return profile
      } else {
        console.log("✗ Profile not found by userId:", userId)
      }
    } catch (error) {
      console.error("Error fetching profile by userId:", error)
    }
  }
  
  return profile
}

/**
 * Repairs the sync between user and profile documents
 * Updates the user document's profileId to match the actual profile
 */
async function repairUserProfileSync(userId: string, profileId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, { profileId }, { merge: true })
    console.log(`✓ Repaired user/profile sync: user ${userId} -> profile ${profileId}`)
  } catch (error) {
    console.error("Error repairing user/profile sync:", error)
    // Don't throw - this is a repair operation, not critical path
  }
}

export async function updateProfile(profileId: string, updates: Partial<PersonProfile>): Promise<void> {
  const profileRef = doc(db, "personProfiles", profileId)

  // Note: Lab membership is now tracked via PersonProfile.labId
  // No need to update lab.members array (removed in new Lab interface)
  // Lab member count will be calculated by querying profiles with matching labId

  // Update the profile
  await updateDoc(profileRef, updates)
}

export function subscribeToProfiles(
  filters: { labId?: string } | null,
  callback: (profiles: PersonProfile[]) => void
): Unsubscribe {
  try {
    let q: Query = collection(db, "personProfiles")

    if (filters?.labId) {
      q = query(q, where("labId", "==", filters.labId))
    }

    return onSnapshot(q,
      (snapshot) => {
        const profiles = snapshot.docs.map(doc => {
          const data = doc.data()
          // Validate required fields
          if (!data.firstName || !data.lastName) {
            console.warn(`Profile ${doc.id} is missing firstName or lastName:`, data)
          }
          return data as PersonProfile
        })
        console.log(`subscribeToProfiles: Loaded ${profiles.length} profiles`)
        callback(profiles)
      },
      (error) => {
        console.error("Error in subscribeToProfiles:", error)
        console.error("Error code:", error?.code)
        console.error("Error message:", error?.message)
        // Don't throw - just log the error and return empty array
        callback([])
      }
    )
  } catch (error) {
    console.error("Error setting up profiles subscription:", error)
    // Return a no-op unsubscribe function that calls callback with empty array
    callback([])
    return () => {}
  }
}

// ============================================================================
// ORGANISATIONS, INSTITUTES, LABS (Shared Reference Data)
// ============================================================================

// Organisation, Institute, Lab interfaces are now imported from ./types
// These provide comprehensive organizational hierarchy structure

/**
 * Creates a new organisation (university, research institute, etc.)
 * @returns The ID of the newly created organisation
 */
export async function createOrganisation(orgData: Omit<Organisation, 'id' | 'createdAt'>): Promise<string> {
  console.log('[firestoreService] createOrganisation called with:', orgData)
  const orgRef = doc(collection(db, "organisations"))
  const orgId = orgRef.id
  console.log('[firestoreService] Generated orgId:', orgId)

  const docData = {
    ...orgData,
    id: orgId,
    createdAt: new Date().toISOString(),
    memberCount: 0,
    instituteCount: 0,
  }
  console.log('[firestoreService] About to save document:', docData)

  try {
    await setDoc(orgRef, docData)
    console.log('[firestoreService] Organisation saved successfully')
  } catch (error) {
    console.error('[firestoreService] Error saving organisation:', error)
    throw error
  }

  return orgId
}

export async function getOrganisations(): Promise<Organisation[]> {
  const querySnapshot = await getDocs(collection(db, "organisations"))
  return querySnapshot.docs.map(doc => doc.data() as Organisation)
}

export function subscribeToOrganisations(callback: (orgs: Organisation[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "organisations"), (snapshot) => {
    const orgs = snapshot.docs.map(doc => doc.data() as Organisation)
    callback(orgs)
  })
}

/**
 * Creates a new institute (department, school, faculty)
 * @returns The ID of the newly created institute
 */
export async function createInstitute(instituteData: Omit<Institute, 'id' | 'createdAt'>): Promise<string> {
  const instituteRef = doc(collection(db, "institutes"))
  const instituteId = instituteRef.id

  await setDoc(instituteRef, {
    ...instituteData,
    id: instituteId,
    createdAt: new Date().toISOString(),
    memberCount: 0,
    labCount: 0,
  })

  // Update organisation's institute count
  const orgRef = doc(db, "organisations", instituteData.organisationId)
  const orgSnap = await getDoc(orgRef)
  if (orgSnap.exists()) {
    const orgData = orgSnap.data() as Organisation
    await updateDoc(orgRef, {
      instituteCount: (orgData.instituteCount || 0) + 1,
    })
  }

  return instituteId
}

export async function getInstitutes(orgId?: string): Promise<Institute[]> {
  let q
  if (orgId) {
    q = query(collection(db, "institutes"), where("organisationId", "==", orgId))
  } else {
    q = collection(db, "institutes")
  }
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as Institute)
}

export function subscribeToInstitutes(orgId: string | null, callback: (institutes: Institute[]) => void): Unsubscribe {
  const q = orgId 
    ? query(collection(db, "institutes"), where("organisationId", "==", orgId))
    : collection(db, "institutes")
  
  return onSnapshot(q, (snapshot) => {
    const institutes = snapshot.docs.map(doc => doc.data() as Institute)
    callback(institutes)
  })
}

/**
 * Creates a new lab (research group/laboratory)
 * @returns The ID of the newly created lab
 */
export async function createLab(labData: Omit<Lab, 'id' | 'createdAt'>): Promise<string> {
  const labRef = doc(collection(db, "labs"))
  const labId = labRef.id

  await setDoc(labRef, {
    ...labData,
    id: labId,
    createdAt: new Date().toISOString(),
    memberCount: 0,
    activeProjectCount: 0,
  })

  // Update institute's lab count
  const instituteRef = doc(db, "institutes", labData.instituteId)
  const instituteSnap = await getDoc(instituteRef)
  if (instituteSnap.exists()) {
    const instituteData = instituteSnap.data() as Institute
    await updateDoc(instituteRef, {
      labCount: (instituteData.labCount || 0) + 1,
    })
  }

  return labId
}

export async function getLabs(instituteId?: string): Promise<Lab[]> {
  let q
  if (instituteId) {
    q = query(collection(db, "labs"), where("instituteId", "==", instituteId))
  } else {
    q = collection(db, "labs")
  }
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as Lab)
}

export function subscribeToLabs(instituteId: string | null, callback: (labs: Lab[]) => void): Unsubscribe {
  const q = instituteId
    ? query(collection(db, "labs"), where("instituteId", "==", instituteId))
    : collection(db, "labs")
  
  return onSnapshot(q, (snapshot) => {
    const labs = snapshot.docs.map(doc => doc.data() as Lab)
    callback(labs)
  })
}

// ============================================================================
// FUNDERS (Shared Reference Data)
// ============================================================================

// Funder interface is now imported from ./types

/**
 * Creates a new funder (funding body/organization)
 * @returns The ID of the newly created funder
 */
/**
 * P0-1: Create a new funder
 * Handles Date to Timestamp conversion for Firestore
 */
export async function createFunder(funderData: Omit<Funder, 'id' | 'createdAt'>): Promise<string> {
  const funderRef = doc(collection(db, "funders"))
  const funderId = funderRef.id

  const dataToSave: any = {
    ...funderData,
    id: funderId,
    createdAt: new Date().toISOString(),
  }

  // Convert Date fields to Timestamps for Firestore
  if (funderData.startDate) {
    dataToSave.startDate = Timestamp.fromDate(funderData.startDate)
  }
  if (funderData.endDate) {
    dataToSave.endDate = Timestamp.fromDate(funderData.endDate)
  }

  // Remove undefined values - Firestore doesn't allow them
  Object.keys(dataToSave).forEach(key => {
    if (dataToSave[key] === undefined) {
      delete dataToSave[key]
    }
  })

  await setDoc(funderRef, dataToSave)

  return funderId
}

/**
 * P0-1: Get all funders, optionally filtered by organisation
 */
export async function getFunders(orgId?: string): Promise<Funder[]> {
  const fundersRef = collection(db, "funders")

  let q = query(fundersRef)
  if (orgId) {
    q = query(fundersRef, where("organisationId", "==", orgId))
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => {
    const data = doc.data()
    // Convert Timestamps back to Dates
    return {
      ...data,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
    } as Funder
  })
}

/**
 * P0-1: Subscribe to funders with real-time updates
 */
export function subscribeToFunders(callback: (funders: Funder[]) => void, orgId?: string): Unsubscribe {
  const fundersRef = collection(db, "funders")

  let q = query(fundersRef)
  if (orgId) {
    q = query(fundersRef, where("organisationId", "==", orgId))
  }

  return onSnapshot(q, (snapshot) => {
    const funders = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
      } as Funder
    })
    callback(funders)
  })
}

// ============================================================================
// FUNDING ACCOUNTS
// ============================================================================

/**
 * Creates a new funding account linked to a master project
 * @returns The ID of the newly created account
 */
export async function createFundingAccount(accountData: Omit<FundingAccount, 'id' | 'createdAt'>): Promise<string> {
  const accountRef = doc(collection(db, "accounts"))
  const accountId = accountRef.id

  await setDoc(accountRef, {
    ...accountData,
    id: accountId,
    createdAt: new Date().toISOString(),
    spentAmount: 0,
    committedAmount: 0,
    remainingBudget: accountData.totalBudget || 0,
  })

  return accountId
}

/**
 * Gets all funding accounts, optionally filtered by project or funder
 */
export async function getFundingAccounts(filters?: {
  masterProjectId?: string
  funderId?: string
}): Promise<FundingAccount[]> {
  let q = collection(db, "accounts")

  if (filters?.masterProjectId) {
    q = query(q as any, where("masterProjectId", "==", filters.masterProjectId)) as any
  }
  if (filters?.funderId) {
    q = query(q as any, where("funderId", "==", filters.funderId)) as any
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as FundingAccount)
}

/**
 * Updates a funding account
 */
export async function updateFundingAccount(accountId: string, updates: Partial<FundingAccount>): Promise<void> {
  const accountRef = doc(db, "accounts", accountId)
  const updateData: any = { ...updates, updatedAt: new Date().toISOString() }
  await updateDoc(accountRef, updateData)
}

/**
 * Deletes a funding account
 */
export async function deleteFundingAccount(accountId: string): Promise<void> {
  await deleteDoc(doc(db, "accounts", accountId))
}

/**
 * Subscribes to funding accounts with optional filters
 */
export function subscribeToFundingAccounts(
  filters: { masterProjectId?: string; funderId?: string } | null,
  callback: (accounts: FundingAccount[]) => void
): Unsubscribe {
  let q = collection(db, "accounts")

  if (filters?.masterProjectId) {
    q = query(q as any, where("masterProjectId", "==", filters.masterProjectId)) as any
  }
  if (filters?.funderId) {
    q = query(q as any, where("funderId", "==", filters.funderId)) as any
  }

  return onSnapshot(q, (snapshot) => {
    const accounts = snapshot.docs.map(doc => doc.data() as FundingAccount)
    callback(accounts)
  })
}

// ============================================================================
// MASTER PROJECTS
// ============================================================================

/**
 * Creates a new master project (major research grant/program)
 * @returns The ID of the newly created master project
 */
export async function createMasterProject(projectData: Omit<MasterProject, 'id' | 'createdAt'>): Promise<string> {
  const projectRef = doc(collection(db, "masterProjects"))
  const projectId = projectRef.id

  await setDoc(projectRef, {
    ...projectData,
    id: projectId,
    createdAt: serverTimestamp(),
    spentAmount: 0,
    committedAmount: 0,
    remainingBudget: projectData.totalBudget || 0,
    progress: 0,
    workpackageIds: [],
  })

  // Update lab's active project count
  const labRef = doc(db, "labs", projectData.labId)
  const labSnap = await getDoc(labRef)
  if (labSnap.exists()) {
    const labData = labSnap.data() as Lab
    await updateDoc(labRef, {
      activeProjectCount: (labData.activeProjectCount || 0) + 1,
    })
  }

  return projectId
}

/**
 * Gets all master projects, optionally filtered by lab, funder, or person
 */
export async function getMasterProjects(filters?: {
  labId?: string
  funderId?: string
  personId?: string  // Returns projects where person is a team member
}): Promise<MasterProject[]> {
  let q = collection(db, "masterProjects")

  if (filters?.labId) {
    q = query(q as any, where("labId", "==", filters.labId)) as any
  }
  if (filters?.funderId) {
    q = query(q as any, where("funderId", "==", filters.funderId)) as any
  }
  if (filters?.personId) {
    // Query for projects where person is in teamMemberIds array
    q = query(q as any, where("teamMemberIds", "array-contains", filters.personId)) as any
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as MasterProject)
}

/**
 * Updates a master project
 */
export async function updateMasterProject(projectId: string, updates: Partial<MasterProject>): Promise<void> {
  const projectRef = doc(db, "masterProjects", projectId)
  const updateData: any = { ...updates, updatedAt: new Date().toISOString() }
  await updateDoc(projectRef, updateData)
}

/**
 * Deletes a master project and all associated data (accounts, workpackages, etc.)
 */
export async function deleteMasterProject(projectId: string): Promise<void> {
  const batch = writeBatch(db)

  // Delete the project
  const projectRef = doc(db, "masterProjects", projectId)
  batch.delete(projectRef)

  // Find and delete all associated accounts
  const accountsQuery = query(collection(db, "accounts"), where("masterProjectId", "==", projectId))
  const accountsSnapshot = await getDocs(accountsQuery)
  accountsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Find and delete all associated workpackages
  const workpackagesQuery = query(collection(db, "workpackages"), where("masterProjectId", "==", projectId))
  const workpackagesSnapshot = await getDocs(workpackagesQuery)
  workpackagesSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Commit the batch
  await batch.commit()
}

/**
 * Subscribes to master projects with optional filters
 */
export function subscribeToMasterProjects(
  filters: { labId?: string; funderId?: string; personId?: string } | null,
  callback: (projects: MasterProject[]) => void
): Unsubscribe {
  let q: Query = collection(db, "masterProjects")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }
  if (filters?.funderId) {
    q = query(q, where("funderId", "==", filters.funderId))
  }
  if (filters?.personId) {
    q = query(q, where("teamMemberIds", "array-contains", filters.personId))
  }

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => doc.data() as MasterProject)
    callback(projects)
  })
}

// ============================================================================
// PROJECT MANAGEMENT (LEGACY)
// ============================================================================

// NOTE: The following Project/ProfileProject functions are kept for backward compatibility
// New code should use MasterProject functions above

export interface FirestoreProject {
  id: string
  name: string
  start: Timestamp
  end: Timestamp
  progress: number
  color: string
  importance: string
  notes: string
  principalInvestigatorId?: string
  profileProjectId?: string
  fundedBy?: string[]
  visibility?: string
  createdBy: string
  labId?: string
  createdAt: Timestamp
}

export async function createProject(projectData: Omit<Project, 'id'> & { createdBy: string; labId?: string }): Promise<string> {
  const projectRef = doc(collection(db, "projects"))
  const projectId = projectRef.id
  
  // Get labId from user's profile if not provided
  let labId: string | undefined = projectData.labId
  if (!labId) {
    const profile = await getProfileByUserId(projectData.createdBy)
    labId = profile?.lab || undefined
  }
  
  await setDoc(projectRef, {
    ...projectData,
    id: projectId,
    labId: labId,
    start: Timestamp.fromDate(projectData.start),
    end: Timestamp.fromDate(projectData.end),
    createdAt: serverTimestamp(),
  })
  
  return projectId
}

export async function getProjects(userId: string): Promise<Project[]> {
  // Get user's profile to determine visible projects
  const profile = await getProfileByUserId(userId)
  if (!profile) return []
  
  const querySnapshot = await getDocs(collection(db, "projects"))
  const allProjects = querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreProject
    return {
      ...data,
      start: data.start.toDate(),
      end: data.end.toDate(),
    } as Project
  })
  
  // Filter based on visibility (implement visibility logic here)
  return allProjects
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
  const projectRef = doc(db, "projects", projectId)
  const updateData: any = { ...updates }
  
  // Convert Date objects to Timestamps
  if (updates.start) updateData.start = Timestamp.fromDate(updates.start)
  if (updates.end) updateData.end = Timestamp.fromDate(updates.end)
  
  await updateDoc(projectRef, updateData)
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId))
}

export function subscribeToProjects(
  filters: { labId?: string; userId?: string } | null,
  callback: (projects: Project[]) => void
): Unsubscribe {
  if (!filters?.userId) {
    console.warn("subscribeToProjects called with undefined or empty userId")
    // Return a no-op unsubscribe function
    return () => {}
  }
  
  try {
    let q: Query = collection(db, "projects")

    if (filters?.labId) {
      q = query(q, where("labId", "==", filters.labId))
    }

    return onSnapshot(
      q,
      async (snapshot) => {
        const projects = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreProject
          return {
            ...data,
            start: data.start.toDate(),
            end: data.end.toDate(),
          } as Project
        })
        callback(projects)
      },
      (error) => {
        console.error("Error in subscribeToProjects:", error)
        // Don't throw - just log the error and return empty array
        callback([])
      }
    )
  } catch (error) {
    console.error("Error setting up projects subscription:", error)
    // Return a no-op unsubscribe function
    return () => {}
  }
}

// ============================================================================
// WORKPACKAGE MANAGEMENT
// ============================================================================

export interface FirestoreWorkpackage {
  id: string
  name: string
  profileProjectId: string
  start: Timestamp
  end: Timestamp
  progress: number
  importance: string
  notes?: string
  tasks: any[]
  createdBy: string
  createdAt: Timestamp
}

export async function createWorkpackage(workpackageData: Omit<Workpackage, 'id'> & { createdBy: string }): Promise<string> {
  const wpRef = doc(collection(db, "workpackages"))
  const wpId = wpRef.id
  
  await setDoc(wpRef, {
    ...workpackageData,
    id: wpId,
    start: Timestamp.fromDate(workpackageData.start),
    end: Timestamp.fromDate(workpackageData.end),
    tasks: workpackageData.tasks.map(task => ({
      ...task,
      start: Timestamp.fromDate(task.start),
      end: Timestamp.fromDate(task.end),
    })),
    createdAt: serverTimestamp(),
  })
  
  return wpId
}

export async function getWorkpackages(profileProjectId: string): Promise<Workpackage[]> {
  const q = query(collection(db, "workpackages"), where("profileProjectId", "==", profileProjectId))
  const querySnapshot = await getDocs(q)
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreWorkpackage
    return {
      ...data,
      start: data.start.toDate(),
      end: data.end.toDate(),
      tasks: data.tasks.map(task => ({
        ...task,
        start: task.start.toDate(),
        end: task.end.toDate(),
      })),
    } as Workpackage
  })
}

export async function updateWorkpackage(wpId: string, updates: Partial<Workpackage>): Promise<void> {
  const wpRef = doc(db, "workpackages", wpId)
  const updateData: any = { ...updates }
  
  if (updates.start) updateData.start = Timestamp.fromDate(updates.start)
  if (updates.end) updateData.end = Timestamp.fromDate(updates.end)
  if (updates.tasks) {
    updateData.tasks = updates.tasks.map(task => ({
      ...task,
      start: Timestamp.fromDate(task.start),
      end: Timestamp.fromDate(task.end),
    }))
  }
  
  await updateDoc(wpRef, updateData)
}

export async function deleteWorkpackage(wpId: string): Promise<void> {
  await deleteDoc(doc(db, "workpackages", wpId))
}

export function subscribeToWorkpackages(
  filters: { profileProjectId?: string } | null,
  callback: (wps: Workpackage[]) => void
): Unsubscribe {
  let q: Query = collection(db, "workpackages")

  if (filters?.profileProjectId) {
    q = query(q, where("profileProjectId", "==", filters.profileProjectId))
  }

  return onSnapshot(q, (snapshot) => {
    const wps = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreWorkpackage
      return {
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
        tasks: data.tasks.map(task => ({
          ...task,
          start: task.start.toDate(),
          end: task.end.toDate(),
        })),
      } as Workpackage
    })
    callback(wps)
  })
}

// ============================================================================
// TODO MANAGEMENT (for Task Subtasks)
// ============================================================================

/**
 * Update a workpackage with recalculated progress after todo changes
 * This updates the entire workpackage including nested tasks, subtasks, and todos
 */
export async function updateWorkpackageWithProgress(wpId: string, workpackage: Workpackage): Promise<void> {
  const wpRef = doc(db, "workpackages", wpId)

  // Convert dates to Timestamps
  const updateData: any = {
    ...workpackage,
    start: Timestamp.fromDate(workpackage.start),
    end: Timestamp.fromDate(workpackage.end),
    tasks: workpackage.tasks.map(task => ({
      ...task,
      start: Timestamp.fromDate(task.start),
      end: Timestamp.fromDate(task.end),
      subtasks: task.subtasks?.map(subtask => ({
        ...subtask,
        start: Timestamp.fromDate(subtask.start),
        end: Timestamp.fromDate(subtask.end),
      })),
    })),
  }

  await updateDoc(wpRef, updateData)
}

/**
 * Update a project with recalculated progress after todo changes
 * For legacy projects without workpackages (tasks directly in project)
 */
export async function updateProjectWithProgress(projectId: string, project: Project): Promise<void> {
  const projectRef = doc(db, "projects", projectId)

  // Convert dates to Timestamps
  const updateData: any = {
    ...project,
    start: Timestamp.fromDate(project.start),
    end: Timestamp.fromDate(project.end),
  }

  if (project.tasks) {
    updateData.tasks = project.tasks.map(task => ({
      ...task,
      start: Timestamp.fromDate(task.start),
      end: Timestamp.fromDate(task.end),
      subtasks: task.subtasks?.map(subtask => ({
        ...subtask,
        start: Timestamp.fromDate(subtask.start),
        end: Timestamp.fromDate(subtask.end),
      })),
    }))
  }

  if (project.workpackages) {
    updateData.workpackages = project.workpackages.map(wp => ({
      ...wp,
      start: Timestamp.fromDate(wp.start),
      end: Timestamp.fromDate(wp.end),
      tasks: wp.tasks.map(task => ({
        ...task,
        start: Timestamp.fromDate(task.start),
        end: Timestamp.fromDate(task.end),
        subtasks: task.subtasks?.map(subtask => ({
          ...subtask,
          start: Timestamp.fromDate(subtask.start),
          end: Timestamp.fromDate(subtask.end),
        })),
      })),
    }))
  }

  await updateDoc(projectRef, updateData)
}

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

export interface FirestoreOrder {
  id: string
  productName: string
  catNum: string
  status: string
  orderedBy?: string
  orderedDate?: Timestamp | null
  receivedDate?: Timestamp | null
  createdBy: string
  createdDate: Timestamp
  chargeToAccount?: string
  category?: string
  subcategory?: string
  priceExVAT?: number
}

export async function createOrder(orderData: Omit<Order, 'id'> & { createdBy: string }): Promise<string> {
  const orderRef = doc(collection(db, "orders"))
  const orderId = orderRef.id
  
  await setDoc(orderRef, {
    ...orderData,
    id: orderId,
    orderedDate: orderData.orderedDate ? Timestamp.fromDate(orderData.orderedDate) : null,
    receivedDate: orderData.receivedDate ? Timestamp.fromDate(orderData.receivedDate) : null,
    createdDate: Timestamp.fromDate(orderData.createdDate),
    createdAt: serverTimestamp(),
  })
  
  return orderId
}

export async function getOrders(): Promise<Order[]> {
  const querySnapshot = await getDocs(collection(db, "orders"))
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreOrder
    return {
      ...data,
      orderedDate: data.orderedDate ? data.orderedDate.toDate() : undefined,
      receivedDate: data.receivedDate ? data.receivedDate.toDate() : undefined,
      createdDate: data.createdDate.toDate(),
    } as Order
  })
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
  const orderRef = doc(db, "orders", orderId)
  const updateData: any = { ...updates }
  
  if (updates.orderedDate) updateData.orderedDate = Timestamp.fromDate(updates.orderedDate)
  if (updates.receivedDate) updateData.receivedDate = Timestamp.fromDate(updates.receivedDate)
  if (updates.createdDate) updateData.createdDate = Timestamp.fromDate(updates.createdDate)
  
  await updateDoc(orderRef, updateData)
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, "orders", orderId))
}

export function subscribeToOrders(
  filters: { labId?: string } | null,
  callback: (orders: Order[]) => void
): Unsubscribe {
  let q: Query = collection(db, "orders")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreOrder
      return {
        ...data,
        orderedDate: data.orderedDate ? data.orderedDate.toDate() : undefined,
        receivedDate: data.receivedDate ? data.receivedDate.toDate() : undefined,
        createdDate: data.createdDate.toDate(),
      } as Order
    })
    callback(orders)
  })
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

export interface FirestoreInventoryItem {
  id: string
  productName: string
  catNum: string
  inventoryLevel: string
  receivedDate: Timestamp
  lastOrderedDate?: Timestamp | null
  chargeToAccount?: string
  notes?: string
  category?: string
  subcategory?: string
  priceExVAT?: number
  createdBy: string
  createdAt: Timestamp
}

export async function createInventoryItem(itemData: Omit<InventoryItem, 'id'> & { createdBy: string }): Promise<string> {
  const itemRef = doc(collection(db, "inventory"))
  const itemId = itemRef.id
  
  await setDoc(itemRef, {
    ...itemData,
    id: itemId,
    receivedDate: Timestamp.fromDate(itemData.receivedDate),
    lastOrderedDate: itemData.lastOrderedDate ? Timestamp.fromDate(itemData.lastOrderedDate) : null,
    createdAt: serverTimestamp(),
  })
  
  return itemId
}

export async function getInventory(): Promise<InventoryItem[]> {
  const querySnapshot = await getDocs(collection(db, "inventory"))
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreInventoryItem
    return {
      ...data,
      receivedDate: data.receivedDate.toDate(),
      lastOrderedDate: data.lastOrderedDate ? data.lastOrderedDate.toDate() : undefined,
    } as InventoryItem
  })
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<void> {
  const itemRef = doc(db, "inventory", itemId)
  const updateData: any = { ...updates }
  
  if (updates.receivedDate) updateData.receivedDate = Timestamp.fromDate(updates.receivedDate)
  if (updates.lastOrderedDate) updateData.lastOrderedDate = Timestamp.fromDate(updates.lastOrderedDate)
  
  await updateDoc(itemRef, updateData)
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, "inventory", itemId))
}

export function subscribeToInventory(
  filters: { labId?: string } | null,
  callback: (inventory: InventoryItem[]) => void
): Unsubscribe {
  let q: Query = collection(db, "inventory")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const inventory = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreInventoryItem
      return {
        ...data,
        receivedDate: data.receivedDate.toDate(),
        lastOrderedDate: data.lastOrderedDate ? data.lastOrderedDate.toDate() : undefined,
      } as InventoryItem
    })
    callback(inventory)
  })
}

// ============================================================================
// EVENTS (Calendar)
// ============================================================================

export interface FirestoreCalendarEvent {
  id: string
  title: string
  start: Timestamp
  end: Timestamp
  ownerId?: string
  relatedIds?: { projectId?: string; workpackageId?: string; taskId?: string; deliverableId?: string }
  type?: string
  notes?: string
  createdBy: string
  createdAt: Timestamp
}

export async function createEvent(eventData: Omit<CalendarEvent, 'id'>): Promise<string> {
  const eventRef = doc(collection(db, "events"))
  const eventId = eventRef.id
  await setDoc(eventRef, {
    ...eventData,
    id: eventId,
    start: Timestamp.fromDate(eventData.start),
    end: Timestamp.fromDate(eventData.end),
    createdAt: serverTimestamp(),
  })
  return eventId
}

export async function updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
  const ref = doc(db, "events", eventId)
  const updateData: any = { ...updates }
  if (updates.start) updateData.start = Timestamp.fromDate(updates.start)
  if (updates.end) updateData.end = Timestamp.fromDate(updates.end)
  await updateDoc(ref, updateData)
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, "events", eventId))
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const snap = await getDocs(collection(db, "events"))
  return snap.docs.map(d => {
    const data = d.data() as FirestoreCalendarEvent
    return {
      ...data,
      start: data.start.toDate(),
      end: data.end.toDate(),
      createdAt: (data.createdAt && (data.createdAt as any).toDate) ? (data.createdAt as any).toDate() : new Date(),
    } as CalendarEvent
  })
}

export function subscribeToEvents(
  filters: { labId?: string } | null,
  callback: (events: CalendarEvent[]) => void
): Unsubscribe {
  let q: Query = collection(db, "events")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  }

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(d => {
      const data = d.data() as FirestoreCalendarEvent
      return {
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
        createdAt: (data.createdAt && (data.createdAt as any).toDate) ? (data.createdAt as any).toDate() : new Date(),
      } as CalendarEvent
    })
    callback(events)
  })
}

// ============================================================================
// CALENDAR CONNECTIONS (Phase 1)
// ============================================================================

/**
 * Creates a new calendar connection
 * Note: OAuth tokens are stored server-side in Google Secret Manager, not here
 */
export async function createCalendarConnection(
  connectionData: Omit<CalendarConnection, 'id' | 'createdAt'>
): Promise<string> {
  const connectionRef = doc(collection(db, "calendarConnections"))
  const connectionId = connectionRef.id

  await setDoc(connectionRef, {
    ...connectionData,
    id: connectionId,
    createdAt: new Date().toISOString(),
  })

  return connectionId
}

/**
 * Gets calendar connections for a specific user
 */
export async function getCalendarConnections(userId: string): Promise<CalendarConnection[]> {
  const q = query(
    collection(db, "calendarConnections"),
    where("userId", "==", userId)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as CalendarConnection)
}

/**
 * Gets a single calendar connection by ID
 */
export async function getCalendarConnection(connectionId: string): Promise<CalendarConnection | null> {
  const connectionRef = doc(db, "calendarConnections", connectionId)
  const connectionSnap = await getDoc(connectionRef)
  if (!connectionSnap.exists()) return null
  return connectionSnap.data() as CalendarConnection
}

/**
 * Updates a calendar connection
 */
export async function updateCalendarConnection(
  connectionId: string,
  updates: Partial<CalendarConnection>
): Promise<void> {
  const connectionRef = doc(db, "calendarConnections", connectionId)
  const updateData: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  await updateDoc(connectionRef, updateData)
}

/**
 * Deletes a calendar connection
 */
export async function deleteCalendarConnection(connectionId: string): Promise<void> {
  // Also delete associated sync conflicts and logs
  const batch = writeBatch(db)

  // Delete the connection
  const connectionRef = doc(db, "calendarConnections", connectionId)
  batch.delete(connectionRef)

  // Delete associated conflicts
  const conflictsQuery = query(
    collection(db, "calendarSyncConflicts"),
    where("connectionId", "==", connectionId)
  )
  const conflictsSnapshot = await getDocs(conflictsQuery)
  conflictsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Delete associated logs
  const logsQuery = query(
    collection(db, "calendarSyncLogs"),
    where("connectionId", "==", connectionId)
  )
  const logsSnapshot = await getDocs(logsQuery)
  logsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()
}

/**
 * Subscribes to calendar connections for a user with real-time updates
 */
export function subscribeToCalendarConnections(
  userId: string,
  callback: (connections: CalendarConnection[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "calendarConnections"),
    where("userId", "==", userId)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const connections = snapshot.docs.map(doc => doc.data() as CalendarConnection)
      callback(connections)
    },
    (error) => {
      console.error("Error in subscribeToCalendarConnections:", error)
      callback([])
    }
  )
}

// ============================================================================
// CALENDAR SYNC CONFLICTS
// ============================================================================

/**
 * Creates a new sync conflict
 */
export async function createSyncConflict(
  conflictData: Omit<CalendarSyncConflict, 'id'>
): Promise<string> {
  const conflictRef = doc(collection(db, "calendarSyncConflicts"))
  const conflictId = conflictRef.id

  await setDoc(conflictRef, {
    ...conflictData,
    id: conflictId,
  })

  return conflictId
}

/**
 * Gets unresolved conflicts for a connection
 */
export async function getUnresolvedConflicts(connectionId: string): Promise<CalendarSyncConflict[]> {
  const q = query(
    collection(db, "calendarSyncConflicts"),
    where("connectionId", "==", connectionId),
    where("resolved", "==", false)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as CalendarSyncConflict)
}

/**
 * Resolves a sync conflict
 */
export async function resolveSyncConflict(
  conflictId: string,
  resolution: "keep_momentum" | "keep_external" | "merge" | "manual",
  resolvedBy: string
): Promise<void> {
  const conflictRef = doc(db, "calendarSyncConflicts", conflictId)
  await updateDoc(conflictRef, {
    resolved: true,
    resolvedAt: new Date().toISOString(),
    resolution,
    resolvedBy,
  })
}

/**
 * Subscribes to unresolved conflicts for a user
 */
export function subscribeToUnresolvedConflicts(
  connectionId: string,
  callback: (conflicts: CalendarSyncConflict[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "calendarSyncConflicts"),
    where("connectionId", "==", connectionId),
    where("resolved", "==", false)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const conflicts = snapshot.docs.map(doc => doc.data() as CalendarSyncConflict)
      callback(conflicts)
    },
    (error) => {
      console.error("Error in subscribeToUnresolvedConflicts:", error)
      callback([])
    }
  )
}

// ============================================================================
// CALENDAR SYNC LOGS
// ============================================================================

/**
 * Creates a new sync log entry
 */
export async function createSyncLog(
  logData: Omit<CalendarSyncLog, 'id'>
): Promise<string> {
  const logRef = doc(collection(db, "calendarSyncLogs"))
  const logId = logRef.id

  await setDoc(logRef, {
    ...logData,
    id: logId,
  })

  return logId
}

/**
 * Gets recent sync logs for a connection
 */
export async function getSyncLogs(
  connectionId: string,
  limit: number = 50
): Promise<CalendarSyncLog[]> {
  const q = query(
    collection(db, "calendarSyncLogs"),
    where("connectionId", "==", connectionId),
    orderBy("syncStartedAt", "desc")
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs
    .slice(0, limit)
    .map(doc => doc.data() as CalendarSyncLog)
}

/**
 * Updates a sync log entry (e.g., when sync completes)
 */
export async function updateSyncLog(
  logId: string,
  updates: Partial<CalendarSyncLog>
): Promise<void> {
  const logRef = doc(db, "calendarSyncLogs", logId)
  await updateDoc(logRef, updates)
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface FirestoreAuditTrail {
  id: string
  entityType: string
  entityId: string
  change: string
  before?: any
  after?: any
  authorId: string
  createdAt: Timestamp
}

export async function appendAuditTrail(entry: Omit<AuditTrail, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(collection(db, "auditTrails"))
  const id = ref.id
  await setDoc(ref, {
    ...entry,
    id,
    createdAt: serverTimestamp(),
  })
  return id
}

export async function getAuditTrails(entityType: AuditTrail['entityType'], entityId: string, limitCount = 20): Promise<AuditTrail[]> {
  // simple fetch; could add where/orderBy
  const snap = await getDocs(collection(db, "auditTrails"))
  return snap.docs
    .map(d => d.data() as FirestoreAuditTrail)
    .filter(a => a.entityType === entityType && a.entityId === entityId)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, limitCount)
    .map(a => ({
      ...a,
      createdAt: a.createdAt.toDate(),
    }) as AuditTrail)
}

export function subscribeToAuditTrails(
  filters: { entityType: string; entityId: string } | null,
  callback: (entries: AuditTrail[]) => void
): Unsubscribe {
  let q: Query = collection(db, "auditTrails")

  if (filters?.entityType && filters?.entityId) {
    q = query(q, where("entityType", "==", filters.entityType), where("entityId", "==", filters.entityId))
  }

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs
      .map(d => d.data() as FirestoreAuditTrail)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .map(a => ({
        ...a,
        createdAt: a.createdAt.toDate(),
      }) as AuditTrail)
    callback(entries)
  })
}

// ============================================================================
// CASCADING DELETES
// ============================================================================

/**
 * Deletes a user and their associated profile
 * Ensures consistency: no user without a profile, no profile without a user
 * Also removes user from lab's members array if applicable
 */
export async function deleteUserCascade(userId: string): Promise<void> {
  const batch = writeBatch(db)
  
  try {
    // Get user document
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      console.warn(`User ${userId} not found. Nothing to delete.`)
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
        console.warn(`Warning: User ${userId} still exists after batch commit`)
        throw new Error(`Failed to delete user ${userId}`)
      }
      
      if (profileId && verifyProfileSnap?.exists()) {
        console.warn(`Warning: Profile ${profileId} still exists after batch commit`)
        throw new Error(`Failed to delete profile ${profileId}`)
      }
      
      console.log(`Successfully deleted user ${userId} and associated profile`)
    } catch (verifyError: any) {
      // If verification fails, log error but don't throw (batch already committed)
      if (verifyError?.message?.includes('Failed to delete')) {
        console.error("Deletion verification failed:", verifyError)
        throw verifyError
      }
      // Other verification errors (permission, network) are non-fatal
      console.warn("Deletion verification incomplete (non-fatal):", verifyError)
    }
  } catch (error) {
    console.error("Error in deleteUserCascade:", error)
    throw error
  }
}

/**
 * Deletes a profile and its associated user
 * Ensures consistency: no user without a profile, no profile without a user
 */
export async function deleteProfileCascade(profileId: string): Promise<void> {
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
      console.warn(`Profile ${profileId} not found. Nothing to delete.`)
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
        console.warn(`Warning: Profile ${profileId} still exists after batch commit`)
        throw new Error(`Failed to delete profile ${profileId}`)
      }
      
      if (userId && verifyUserSnap?.exists()) {
        console.warn(`Warning: User ${userId} still exists after batch commit`)
        throw new Error(`Failed to delete user ${userId}`)
      }
      
      console.log(`Successfully deleted profile ${profileId} and associated user`)
    } catch (verifyError: any) {
      // If verification fails, log error but don't throw (batch already committed)
      if (verifyError?.message?.includes('Failed to delete')) {
        console.error("Deletion verification failed:", verifyError)
        throw verifyError
      }
      // Other verification errors (permission, network) are non-fatal
      console.warn("Deletion verification incomplete (non-fatal):", verifyError)
    }
  } catch (error) {
    console.error("Error in deleteProfileCascade:", error)
    throw error
  }
}

/**
 * Deletes a profile project and all associated workpackages
 * Uses batched writes for atomicity
 */
export async function deleteProfileProjectCascade(projectId: string): Promise<void> {
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
 * Deletes a single workpackage (alias for deleteWorkpackage above)
 * This is used by the cascading delete function
 */
export async function deleteWorkpackageCascade(workpackageId: string): Promise<void> {
  const workpackageRef = doc(db, "workpackages", workpackageId)
  await deleteDoc(workpackageRef)
}

/**
 * Deletes multiple entities in a batch
 */
export async function batchDelete(
  collection: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return

  const batch = writeBatch(db)
  ids.forEach((id) => {
    const docRef = doc(db, collection, id)
    batch.delete(docRef)
  })
  await batch.commit()
}

// ============================================================================
// DAY-TO-DAY TASKS
// ============================================================================

export interface FirestoreDayToDayTask {
  id: string
  title: string
  description?: string
  status: "todo" | "working" | "done"
  importance: string
  assigneeId?: string
  dueDate?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  tags?: string[]
  linkedProjectId?: string
  linkedTaskId?: string
  order: number
}

export async function createDayToDayTask(taskData: Omit<any, 'id'>): Promise<string> {
  const taskRef = doc(collection(db, "dayToDayTasks"))
  const taskId = taskRef.id
  
  await setDoc(taskRef, {
    ...taskData,
    id: taskId,
    dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  return taskId
}

export async function updateDayToDayTask(taskId: string, updates: Partial<any>): Promise<void> {
  const taskRef = doc(db, "dayToDayTasks", taskId)
  const updateData: any = { ...updates, updatedAt: serverTimestamp() }
  
  if (updates.dueDate) {
    updateData.dueDate = Timestamp.fromDate(updates.dueDate)
  }
  
  await updateDoc(taskRef, updateData)
}

export async function deleteDayToDayTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, "dayToDayTasks", taskId))
}

export function subscribeToDayToDayTasks(
  filters: { labId?: string; userId?: string } | null,
  callback: (tasks: any[]) => void
): Unsubscribe {
  let q: Query = collection(db, "dayToDayTasks")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  } else if (filters?.userId) {
    q = query(q, where("createdBy", "==", filters.userId))
  }

  try {
    return onSnapshot(q,
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreDayToDayTask
          return {
            ...data,
            dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          }
        })
        callback(tasks)
      },
      (error) => {
        console.error("Error in subscribeToDayToDayTasks:", error)
        // Don't throw - just log the error and return empty array
        callback([])
      }
    )
  } catch (error) {
    console.error("Error setting up day-to-day tasks subscription:", error)
    // Return a no-op unsubscribe function
    return () => {}
  }
}

// ============================================================================
// LAB POLLS
// ============================================================================

export async function createLabPoll(pollData: Omit<LabPoll, 'id'>): Promise<string> {
  const pollRef = doc(collection(db, "labPolls"))
  const pollId = pollRef.id
  
  await setDoc(pollRef, {
    ...pollData,
    id: pollId,
    createdAt: serverTimestamp(),
  })
  
  return pollId
}

export async function updateLabPoll(pollId: string, updates: Partial<LabPoll>): Promise<void> {
  const pollRef = doc(db, "labPolls", pollId)
  await updateDoc(pollRef, updates)
}

export async function deleteLabPoll(pollId: string): Promise<void> {
  await deleteDoc(doc(db, "labPolls", pollId))
}

export function subscribeToLabPolls(
  filters: { labId?: string } | null,
  callback: (polls: LabPoll[]) => void
): Unsubscribe {
  if (!filters?.labId) {
    console.warn("subscribeToLabPolls called with undefined or empty labId")
    callback([])
    return () => {}
  }

  try {
    let q: Query = collection(db, "labPolls")

    if (filters?.labId) {
      q = query(q, where("labId", "==", filters.labId), orderBy("createdAt", "desc"))
    }

    return onSnapshot(q,
      (snapshot) => {
        const polls = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          } as LabPoll
        })
        callback(polls)
      },
      (error) => {
        console.error("Error in subscribeToLabPolls:", error)
        callback([])
      }
    )
  } catch (error) {
    console.error("Error setting up lab polls subscription:", error)
    return () => {}
  }
}

// ============================================================================
// EQUIPMENT
// ============================================================================

export async function createEquipment(equipmentData: Omit<EquipmentDevice, 'id'>): Promise<string> {
  const equipmentRef = doc(collection(db, "equipment"))
  const equipmentId = equipmentRef.id
  
  await setDoc(equipmentRef, {
    ...equipmentData,
    id: equipmentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  return equipmentId
}

export async function updateEquipment(equipmentId: string, updates: Partial<EquipmentDevice>): Promise<void> {
  const equipmentRef = doc(db, "equipment", equipmentId)
  const updateData: any = { ...updates, updatedAt: serverTimestamp() }
  await updateDoc(equipmentRef, updateData)
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  await deleteDoc(doc(db, "equipment", equipmentId))
}

export function subscribeToEquipment(labId: string | null, callback: (equipment: EquipmentDevice[]) => void): Unsubscribe {
  if (!labId) {
    console.warn("subscribeToEquipment called with undefined or empty labId")
    callback([])
    return () => {}
  }
  
  try {
    const q = query(
      collection(db, "equipment"),
      where("labId", "==", labId),
      orderBy("name", "asc")
    )
    
    return onSnapshot(q, 
      (snapshot) => {
        const equipment = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
          } as EquipmentDevice
        })
        callback(equipment)
      },
      (error) => {
        console.error("Error in subscribeToEquipment:", error)
        callback([])
      }
    )
  } catch (error) {
    console.error("Error setting up equipment subscription:", error)
    return () => {}
  }
}

// ============================================================================
// ELECTRONIC LAB NOTEBOOK (ELN)
// ============================================================================

export async function createELNExperiment(experimentData: Omit<ELNExperiment, 'id'>): Promise<string> {
  const experimentRef = doc(collection(db, "elnExperiments"))
  const experimentId = experimentRef.id

  // Remove undefined values from experimentData
  const cleanData: any = {}
  Object.entries(experimentData).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value
    }
  })

  await setDoc(experimentRef, {
    ...cleanData,
    id: experimentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return experimentId
}

export async function updateELNExperiment(experimentId: string, updates: Partial<ELNExperiment>): Promise<void> {
  const experimentRef = doc(db, "elnExperiments", experimentId)

  // Deep clean function to remove undefined values and handle nested objects
  function deepClean(obj: any): any {
    if (obj === null || obj === undefined) {
      return null
    }

    if (Array.isArray(obj)) {
      return obj.map(item => deepClean(item)).filter(item => item !== null && item !== undefined)
    }

    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = deepClean(value)
        }
      }
      return cleaned
    }

    return obj
  }

  const cleanUpdates = deepClean(updates)
  const updateData: any = { ...cleanUpdates, updatedAt: serverTimestamp() }

  await setDoc(experimentRef, updateData, { merge: true })
}

export async function deleteELNExperiment(experimentId: string): Promise<void> {
  await deleteDoc(doc(db, "elnExperiments", experimentId))
}

export function subscribeToELNExperiments(
  filters: { labId?: string; userId?: string } | null,
  callback: (experiments: ELNExperiment[]) => void
): Unsubscribe {
  let q: Query = collection(db, "elnExperiments")

  if (filters?.labId) {
    q = query(q, where("labId", "==", filters.labId))
  } else if (filters?.userId) {
    q = query(q, where("createdBy", "==", filters.userId), orderBy("createdAt", "desc"))
  }

  try {
    return onSnapshot(q,
      (snapshot) => {
        const experiments = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
          } as ELNExperiment
        })
        callback(experiments)
      },
      (error) => {
        console.error("Error in subscribeToELNExperiments:", error)
        callback([])
      }
    )
  } catch (error) {
    console.error("Error setting up ELN experiments subscription:", error)
    return () => {}
  }
}

