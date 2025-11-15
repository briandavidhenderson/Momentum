import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore"
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage"
import { logger } from "./logger"

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (avoid multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Caching for Firebase services
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let storageInstance: FirebaseStorage | null = null

// --- NEW GETTER FUNCTIONS ---

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app)
    // Connect to emulator in dev if specified
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      try {
        connectAuthEmulator(authInstance, "http://localhost:9099", { disableWarnings: true })
        logger.info("Connected to Auth emulator")
      } catch (error) {
        logger.debug("Auth emulator already connected or not available")
      }
    }
  }
  return authInstance
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(app)
    // Connect to emulator in dev if specified
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      try {
        connectFirestoreEmulator(dbInstance, "localhost", 8080)
        logger.info("Connected to Firestore emulator")
      } catch (error) {
        logger.debug("Firestore emulator already connected or not available")
      }
    }
  }
  return dbInstance
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(app)
    // Connect to emulator in dev if specified
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      try {
        connectStorageEmulator(storageInstance, "localhost", 9199)
        logger.info("Connected to Storage emulator")
      } catch (error) {
        logger.debug("Storage emulator already connected or not available")
      }
    }
  }
  return storageInstance
}

export default app
