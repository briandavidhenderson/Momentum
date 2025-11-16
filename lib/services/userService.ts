/**
 * User Service - User authentication and management
 * Handles operations on the 'users' collection
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"

export interface FirestoreUser {
  uid: string
  email: string
  fullName: string
  profileId: string | null
  createdAt: Timestamp
  isAdministrator: boolean
}

/**
 * Create a new user document
 */
export async function createUser(uid: string, email: string, fullName: string): Promise<void> {
  const db = getFirebaseDb()
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

/**
 * Get a user by UID
 */
export async function getUser(uid: string): Promise<FirestoreUser | null> {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) return null
  return userSnap.data() as FirestoreUser
}

/**
 * Update a user document
 */
export async function updateUser(uid: string, updates: Partial<FirestoreUser>): Promise<void> {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, updates)
}
