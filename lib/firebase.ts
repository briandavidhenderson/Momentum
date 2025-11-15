import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage, connectStorageEmulator } from "firebase/storage"
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

// Lazy-initialized service instances
let authInstance: ReturnType<typeof getAuth> | null = null
let dbInstance: ReturnType<typeof getFirestore> | null = null
let storageInstance: ReturnType<typeof getStorage> | null = null
let emulatorsConnected = false

// Lazy getters for Firebase services (prevents initialization during build)
export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(app)
    connectEmulators()
  }
  return authInstance
}

export function getFirebaseDb() {
  if (!dbInstance) {
    dbInstance = getFirestore(app)
    connectEmulators()
  }
  return dbInstance
}

export function getFirebaseStorage() {
  if (!storageInstance) {
    storageInstance = getStorage(app)
    connectEmulators()
  }
  return storageInstance
}

// Connect to emulators in development (called lazily)
function connectEmulators() {
  if (emulatorsConnected) return
  emulatorsConnected = true

  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    try {
      if (authInstance) {
        connectAuthEmulator(authInstance, "http://localhost:9099", { disableWarnings: true })
      }
      if (dbInstance) {
        connectFirestoreEmulator(dbInstance, "localhost", 8080)
      }
      if (storageInstance) {
        connectStorageEmulator(storageInstance, "localhost", 9199)
      }
      logger.info("Connected to Firebase emulators")
    } catch (error) {
      logger.debug("Emulators already connected or not available")
    }
  }
}

// Legacy exports for backward compatibility (these will initialize on first access)
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get: (_, prop) => getFirebaseAuth()[prop as keyof ReturnType<typeof getAuth>]
})

export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get: (_, prop) => getFirebaseDb()[prop as keyof ReturnType<typeof getFirestore>]
})

export const storage = new Proxy({} as ReturnType<typeof getStorage>, {
  get: (_, prop) => getFirebaseStorage()[prop as keyof ReturnType<typeof getStorage>]
})

export default app


