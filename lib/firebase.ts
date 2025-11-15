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

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Initialize Firebase app (this is safe on server)
const app = isBrowser && getApps().length === 0 ? initializeApp(firebaseConfig) : isBrowser ? getApp() : null

// Lazy-initialized service instances (client-side only)
let authInstance: ReturnType<typeof getAuth> | null = null
let dbInstance: ReturnType<typeof getFirestore> | null = null
let storageInstance: ReturnType<typeof getStorage> | null = null
let emulatorsConnected = false

// Lazy getters for Firebase services (client-side only)
export function getFirebaseAuth() {
  if (!isBrowser) {
    throw new Error('Firebase Auth cannot be used on the server side')
  }
  if (!authInstance && app) {
    authInstance = getAuth(app)
    connectEmulators()
  }
  return authInstance!
}

export function getFirebaseDb() {
  if (!isBrowser) {
    throw new Error('Firebase Firestore cannot be used on the server side')
  }
  if (!dbInstance && app) {
    dbInstance = getFirestore(app)
    connectEmulators()
  }
  return dbInstance!
}

export function getFirebaseStorage() {
  if (!isBrowser) {
    throw new Error('Firebase Storage cannot be used on the server side')
  }
  if (!storageInstance && app) {
    storageInstance = getStorage(app)
    connectEmulators()
  }
  return storageInstance!
}

// Connect to emulators in development (called lazily, client-side only)
function connectEmulators() {
  if (emulatorsConnected || !isBrowser) return
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

// Create safe server-side fallback objects
const createServerSafeFallback = (serviceName: string) => {
  return new Proxy({} as any, {
    get: () => {
      if (!isBrowser) {
        // Return a no-op function or empty object for server-side access
        return () => {}
      }
      throw new Error(`${serviceName} accessed before initialization`)
    }
  })
}

// Legacy exports with server-side safety
export const auth = isBrowser
  ? new Proxy({} as ReturnType<typeof getAuth>, {
      get: (_, prop) => getFirebaseAuth()[prop as keyof ReturnType<typeof getAuth>]
    })
  : createServerSafeFallback('Firebase Auth')

export const db = isBrowser
  ? new Proxy({} as ReturnType<typeof getFirestore>, {
      get: (_, prop) => getFirebaseDb()[prop as keyof ReturnType<typeof getFirestore>]
    })
  : createServerSafeFallback('Firebase Firestore')

export const storage = isBrowser
  ? new Proxy({} as ReturnType<typeof getStorage>, {
      get: (_, prop) => getFirebaseStorage()[prop as keyof ReturnType<typeof getStorage>]
    })
  : createServerSafeFallback('Firebase Storage')

export default app


