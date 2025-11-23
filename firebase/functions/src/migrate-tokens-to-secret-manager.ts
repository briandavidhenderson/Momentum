/**
 * Token Migration - Firestore to Google Secret Manager
 * One-time migration function for Phase 1 Foundation
 * Admin-only operation with comprehensive logging
 */

import * as functions from "firebase-functions/v1"
import * as admin from "firebase-admin"
import {
  storeTokens,
  tokensExist,
  TokenData,
} from "./calendar-token-service"

const db = admin.firestore()

/**
 * Migration result for a single connection
 */
interface MigrationResult {
  connectionId: string
  userId: string
  provider: string
  status: "success" | "failed" | "skipped"
  reason?: string
  error?: string
}

/**
 * Overall migration summary
 */
interface MigrationSummary {
  startTime: string
  endTime: string
  totalConnections: number
  totalTokens: number
  migrated: number
  failed: number
  skipped: number
  results: MigrationResult[]
  errors: string[]
}

/**
 * Migrate OAuth tokens from Firestore to Google Secret Manager
 * This is a one-time operation that should be run during Phase 1 deployment
 *
 * Process:
 * 1. Get all calendar connections from Firestore
 * 2. For each connection, get tokens from _calendarTokens collection
 * 3. Store tokens in Secret Manager
 * 4. Verify storage
 * 5. Mark as migrated (don't delete from Firestore yet)
 *
 * IMPORTANT: This does NOT delete tokens from Firestore
 * Deletion happens in a separate step after verification
 */
export const migrateTokensToSecretManager = functions.https.onCall(
  async (data, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in to run migration"
      )
    }

    // Admin check
    const userDoc = await db.collection("users").doc(context.auth.uid).get()
    if (!userDoc.exists || !userDoc.data()?.isAdministrator) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can run token migration"
      )
    }

    const startTime = new Date().toISOString()
    const results: MigrationResult[] = []
    const errors: string[] = []

    try {
      console.log({
        action: "MIGRATION_STARTED",
        startedBy: context.auth.uid,
        timestamp: startTime,
      })

      // Get all calendar connections
      const connectionsSnapshot = await db
        .collection("calendarConnections")
        .get()

      const totalConnections = connectionsSnapshot.size

      // Get all tokens from Firestore
      const tokensSnapshot = await db.collection("_calendarTokens").get()

      const totalTokens = tokensSnapshot.size

      console.log({
        action: "MIGRATION_COUNTS",
        totalConnections,
        totalTokens,
        timestamp: new Date().toISOString(),
      })

      // Create a map of tokens by connection ID
      const firestoreTokens = new Map<string, any>()
      tokensSnapshot.docs.forEach((doc) => {
        firestoreTokens.set(doc.id, doc.data())
      })

      // Migrate each connection's tokens
      for (const connectionDoc of connectionsSnapshot.docs) {
        const connectionId = connectionDoc.id
        const connectionData = connectionDoc.data()
        const userId = connectionData.userId
        const provider = connectionData.provider

        try {
          // Check if token exists in Firestore
          const firestoreToken = firestoreTokens.get(connectionId)

          if (!firestoreToken) {
            results.push({
              connectionId,
              userId,
              provider,
              status: "skipped",
              reason: "No token found in Firestore",
            })
            continue
          }

          // Check if already migrated to Secret Manager
          const alreadyMigrated = await tokensExist(connectionId)

          if (alreadyMigrated) {
            results.push({
              connectionId,
              userId,
              provider,
              status: "skipped",
              reason: "Already migrated to Secret Manager",
            })
            continue
          }

          // Prepare token data for Secret Manager
          const tokenData: Omit<TokenData, "connectionId"> = {
            accessToken: firestoreToken.accessToken,
            refreshToken: firestoreToken.refreshToken,
            expiresAt: firestoreToken.expiresAt || Date.now() + 3600000, // Default 1 hour
            provider: provider as "google" | "microsoft",
            userId,
            email: connectionData.email || "unknown",
            createdAt:
              firestoreToken.createdAt ||
              connectionData.createdAt ||
              new Date().toISOString(),
            lastRefreshedAt:
              firestoreToken.updatedAt ||
              firestoreToken.lastRefreshedAt ||
              new Date().toISOString(),
          }

          // Store in Secret Manager
          await storeTokens(connectionId, tokenData)

          // Verify storage
          const verifyExists = await tokensExist(connectionId)
          if (!verifyExists) {
            throw new Error("Verification failed - token not found after storage")
          }

          results.push({
            connectionId,
            userId,
            provider,
            status: "success",
          })

          console.log({
            action: "TOKEN_MIGRATED",
            connectionId,
            provider,
            userId,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error"

          results.push({
            connectionId,
            userId,
            provider,
            status: "failed",
            error: errorMessage,
          })

          errors.push(
            `${connectionId} (${provider}): ${errorMessage}`
          )

          console.error({
            action: "TOKEN_MIGRATION_FAILED",
            connectionId,
            provider,
            userId,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const endTime = new Date().toISOString()

      const summary: MigrationSummary = {
        startTime,
        endTime,
        totalConnections,
        totalTokens,
        migrated: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "failed").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        results,
        errors,
      }

      // Log migration completion
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "TOKENS_MIGRATED_TO_SECRET_MANAGER",
        entityType: "system",
        success: summary.failed === 0,
        details: {
          totalConnections: summary.totalConnections,
          totalTokens: summary.totalTokens,
          migrated: summary.migrated,
          failed: summary.failed,
          skipped: summary.skipped,
          duration: calculateDuration(startTime, endTime),
        },
        gdprCompliance: "Article 32 - Security of Processing",
      })

      console.log({
        action: "MIGRATION_COMPLETED",
        summary,
        timestamp: endTime,
      })

      return summary
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"

      // Log migration failure
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "TOKEN_MIGRATION_FAILED",
        entityType: "system",
        success: false,
        errorMessage,
      })

      console.error({
        action: "MIGRATION_FATAL_ERROR",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })

      throw new functions.https.HttpsError(
        "internal",
        `Migration failed: ${errorMessage}`
      )
    }
  }
)

/**
 * Verify migration completeness
 * Checks that all connections have tokens in Secret Manager
 */
export const verifyTokenMigration = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in"
      )
    }

    const userDoc = await db.collection("users").doc(context.auth.uid).get()
    if (!userDoc.exists || !userDoc.data()?.isAdministrator) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can verify migration"
      )
    }

    try {
      const connectionsSnapshot = await db
        .collection("calendarConnections")
        .get()

      const results: Array<{
        connectionId: string
        provider: any
        userId: any
        inSecretManager: boolean
      }> = []
      let allMigrated = true

      for (const doc of connectionsSnapshot.docs) {
        const connectionId = doc.id
        const exists = await tokensExist(connectionId)

        results.push({
          connectionId,
          provider: doc.data().provider,
          userId: doc.data().userId,
          inSecretManager: exists,
        })

        if (!exists) {
          allMigrated = false
        }
      }

      return {
        totalConnections: connectionsSnapshot.size,
        allMigrated,
        migrated: results.filter((r) => r.inSecretManager).length,
        notMigrated: results.filter((r) => !r.inSecretManager).length,
        results,
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        "internal",
        `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
)

/**
 * Cleanup old Firestore tokens (DANGEROUS - run after verification)
 * This deletes tokens from the _calendarTokens collection
 * Only run after verifying Secret Manager migration
 */
export const cleanupFirestoreTokens = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in"
      )
    }

    const userDoc = await db.collection("users").doc(context.auth.uid).get()
    if (!userDoc.exists || !userDoc.data()?.isAdministrator) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can cleanup tokens"
      )
    }

    // Require explicit confirmation
    const confirmationCode = data.confirmationCode
    const expectedCode = "DELETE_FIRESTORE_TOKENS"

    if (confirmationCode !== expectedCode) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Must provide confirmation code: "${expectedCode}"`
      )
    }

    try {
      // First, verify all tokens are in Secret Manager
      const verification = await verifyTokenMigration.run(data, context)

      if (!verification.allMigrated) {
        throw new Error(
          `Cannot cleanup: ${verification.notMigrated} tokens not yet migrated to Secret Manager`
        )
      }

      // Get all tokens from Firestore
      const tokensSnapshot = await db.collection("_calendarTokens").get()

      // Delete in batches
      const batch = db.batch()
      let count = 0

      tokensSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
        count++
      })

      await batch.commit()

      // Log cleanup
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "FIRESTORE_TOKENS_DELETED",
        entityType: "system",
        success: true,
        details: {
          deletedCount: count,
        },
        gdprCompliance: "Article 32 - Security of Processing",
      })

      console.log({
        action: "FIRESTORE_TOKENS_CLEANED_UP",
        deletedCount: count,
        timestamp: new Date().toISOString(),
      })

      return {
        success: true,
        deletedCount: count,
        message: `Successfully deleted ${count} tokens from Firestore`,
      }
    } catch (error) {
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "FIRESTORE_TOKEN_CLEANUP_FAILED",
        entityType: "system",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })

      throw new functions.https.HttpsError(
        "internal",
        `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
)

/**
 * Calculate duration between two ISO timestamps
 */
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const durationMs = end - start
  const durationSec = Math.floor(durationMs / 1000)

  if (durationSec < 60) {
    return `${durationSec} seconds`
  } else if (durationSec < 3600) {
    const minutes = Math.floor(durationSec / 60)
    const seconds = durationSec % 60
    return `${minutes}m ${seconds}s`
  } else {
    const hours = Math.floor(durationSec / 3600)
    const minutes = Math.floor((durationSec % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}
