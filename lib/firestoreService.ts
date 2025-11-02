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
} from "firebase/firestore"
import { db } from "./firebase"
import { PersonProfile, ProfileProject, Project, Workpackage, Order, InventoryItem, CalendarEvent, AuditTrail } from "./types"

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
    
    return profileId
  } catch (error: any) {
    console.error("Error in createProfile:", error)
    console.error("Error code:", error?.code)
    console.error("Error message:", error?.message)
    throw error
  }
}

export async function getProfile(profileId: string): Promise<PersonProfile | null> {
  const profileRef = doc(db, "personProfiles", profileId)
  const profileSnap = await getDoc(profileRef)
  if (!profileSnap.exists()) return null
  return profileSnap.data() as PersonProfile
}

export async function getProfileByUserId(userId: string): Promise<PersonProfile | null> {
  const q = query(collection(db, "personProfiles"), where("userId", "==", userId))
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) return null
  return querySnapshot.docs[0].data() as PersonProfile
}

export async function getAllProfiles(): Promise<PersonProfile[]> {
  const querySnapshot = await getDocs(collection(db, "personProfiles"))
  return querySnapshot.docs.map(doc => doc.data() as PersonProfile)
}

export async function updateProfile(profileId: string, updates: Partial<PersonProfile>): Promise<void> {
  const profileRef = doc(db, "personProfiles", profileId)
  await updateDoc(profileRef, updates)
}

export function subscribeToProfiles(callback: (profiles: PersonProfile[]) => void): Unsubscribe {
  const q = collection(db, "personProfiles")
  return onSnapshot(q, (snapshot) => {
    const profiles = snapshot.docs.map(doc => doc.data() as PersonProfile)
    callback(profiles)
  })
}

// ============================================================================
// ORGANISATIONS, INSTITUTES, LABS (Shared Reference Data)
// ============================================================================

export interface Organisation {
  id: string
  name: string
  createdBy: string
  createdAt: Timestamp
  institutes: string[]
}

export interface Institute {
  id: string
  name: string
  organisationId: string
  createdBy: string
  createdAt: Timestamp
  labs: string[]
}

export interface Lab {
  id: string
  name: string
  instituteId: string
  organisationId: string
  createdBy: string
  createdAt: Timestamp
  members: string[]
}

export async function createOrganisation(name: string, userId: string): Promise<string> {
  const orgRef = doc(collection(db, "organisations"))
  const orgId = orgRef.id
  
  await setDoc(orgRef, {
    id: orgId,
    name,
    createdBy: userId,
    createdAt: serverTimestamp(),
    institutes: [],
  })
  
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

export async function createInstitute(name: string, orgId: string, userId: string): Promise<string> {
  const instituteRef = doc(collection(db, "institutes"))
  const instituteId = instituteRef.id
  
  await setDoc(instituteRef, {
    id: instituteId,
    name,
    organisationId: orgId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    labs: [],
  })
  
  // Update organisation's institutes array
  const orgRef = doc(db, "organisations", orgId)
  const orgSnap = await getDoc(orgRef)
  if (orgSnap.exists()) {
    const orgData = orgSnap.data() as Organisation
    await updateDoc(orgRef, {
      institutes: [...(orgData.institutes || []), instituteId],
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

export async function createLab(name: string, instituteId: string, organisationId: string, userId: string): Promise<string> {
  const labRef = doc(collection(db, "labs"))
  const labId = labRef.id
  
  await setDoc(labRef, {
    id: labId,
    name,
    instituteId,
    organisationId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    members: [],
  })
  
  // Update institute's labs array
  const instituteRef = doc(db, "institutes", instituteId)
  const instituteSnap = await getDoc(instituteRef)
  if (instituteSnap.exists()) {
    const instituteData = instituteSnap.data() as Institute
    await updateDoc(instituteRef, {
      labs: [...(instituteData.labs || []), labId],
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

export interface Funder {
  id: string
  name: string
  createdBy: string
  createdAt: Timestamp
}

export async function createFunder(name: string, userId: string): Promise<string> {
  const funderRef = doc(collection(db, "funders"))
  const funderId = funderRef.id
  
  await setDoc(funderRef, {
    id: funderId,
    name,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })
  
  return funderId
}

export async function getFunders(): Promise<Funder[]> {
  const querySnapshot = await getDocs(collection(db, "funders"))
  return querySnapshot.docs.map(doc => doc.data() as Funder)
}

export function subscribeToFunders(callback: (funders: Funder[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "funders"), (snapshot) => {
    const funders = snapshot.docs.map(doc => doc.data() as Funder)
    callback(funders)
  })
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

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
  createdAt: Timestamp
}

export async function createProject(projectData: Omit<Project, 'id'> & { createdBy: string }): Promise<string> {
  const projectRef = doc(collection(db, "projects"))
  const projectId = projectRef.id
  
  await setDoc(projectRef, {
    ...projectData,
    id: projectId,
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

export function subscribeToProjects(userId: string, callback: (projects: Project[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "projects"), async (snapshot) => {
    const projects = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreProject
      return {
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
      } as Project
    })
    callback(projects)
  })
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

export function subscribeToWorkpackages(profileProjectId: string, callback: (wps: Workpackage[]) => void): Unsubscribe {
  const q = query(collection(db, "workpackages"), where("profileProjectId", "==", profileProjectId))
  
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

export function subscribeToOrders(callback: (orders: Order[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "orders"), (snapshot) => {
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

export function subscribeToInventory(callback: (inventory: InventoryItem[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "inventory"), (snapshot) => {
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

export function subscribeToEvents(callback: (events: CalendarEvent[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "events"), (snapshot) => {
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

export function subscribeToAuditTrails(entityType: AuditTrail['entityType'], entityId: string, callback: (entries: AuditTrail[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "auditTrails"), (snapshot) => {
    const entries = snapshot.docs
      .map(d => d.data() as FirestoreAuditTrail)
      .filter(a => a.entityType === entityType && a.entityId === entityId)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .map(a => ({
        ...a,
        createdAt: a.createdAt.toDate(),
      }) as AuditTrail)
    callback(entries)
  })
}

