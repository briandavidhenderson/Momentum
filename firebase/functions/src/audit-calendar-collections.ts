/**
 * Calendar Collections Audit Function
 * Audits Firestore calendar collections for data consistency and migration readiness
 * Part of Phase 1 Foundation refactoring
 */

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

const db = admin.firestore()

export interface CalendarAuditResult {
  timestamp: string
  collections: {
    events: number
    calendarConnections: number
    calendarConflicts: number
    calendarSyncConflicts: number // Check for orphaned data
    calendarSyncLogs: number
    _calendarTokens: number
  }
  findings: AuditFinding[]
  recommendations: string[]
  status: "healthy" | "warnings" | "critical"
}

export interface AuditFinding {
  severity: "info" | "warning" | "critical"
  category: "orphaned_data" | "data_mismatch" | "security" | "performance"
  message: string
  affectedCollection: string
  count?: number
  details?: any
}

/**
 * Audit calendar collections for data consistency
 * Only callable by authenticated admin users
 */
export const auditCalendarCollections = functions.https.onCall(
  async (data, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in to run audit"
      )
    }

    // Admin check - verify user is administrator
    const userDoc = await db.collection("users").doc(context.auth.uid).get()
    if (!userDoc.exists || !userDoc.data()?.isAdministrator) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can run system audits"
      )
    }

    const findings: AuditFinding[] = []
    const recommendations: string[] = []

    try {
      // Count documents in each collection
      const [
        eventsSnapshot,
        connectionsSnapshot,
        conflictsSnapshot,
        oldConflictsSnapshot,
        logsSnapshot,
        tokensSnapshot,
      ] = await Promise.all([
        db.collection("events").count().get(),
        db.collection("calendarConnections").count().get(),
        db.collection("calendarConflicts").count().get(),
        db.collection("calendarSyncConflicts").count().get(),
        db.collection("calendarSyncLogs").count().get(),
        db.collection("_calendarTokens").count().get(),
      ])

      const counts = {
        events: eventsSnapshot.data().count,
        calendarConnections: connectionsSnapshot.data().count,
        calendarConflicts: conflictsSnapshot.data().count,
        calendarSyncConflicts: oldConflictsSnapshot.data().count,
        calendarSyncLogs: logsSnapshot.data().count,
        _calendarTokens: tokensSnapshot.data().count,
      }

      // Finding 1: Check for orphaned data in deprecated collection
      if (counts.calendarSyncConflicts > 0) {
        findings.push({
          severity: "critical",
          category: "orphaned_data",
          message: `Found ${counts.calendarSyncConflicts} documents in deprecated 'calendarSyncConflicts' collection`,
          affectedCollection: "calendarSyncConflicts",
          count: counts.calendarSyncConflicts,
          details: {
            action: "migrate_to_calendarConflicts",
          },
        })
        recommendations.push(
          "Migrate data from 'calendarSyncConflicts' to 'calendarConflicts' collection"
        )
      } else {
        findings.push({
          severity: "info",
          category: "orphaned_data",
          message: "No orphaned data found in deprecated 'calendarSyncConflicts' collection",
          affectedCollection: "calendarSyncConflicts",
          count: 0,
        })
      }

      // Finding 2: Check token count matches connections
      if (counts._calendarTokens !== counts.calendarConnections) {
        findings.push({
          severity: "warning",
          category: "data_mismatch",
          message: `Token count (${counts._calendarTokens}) does not match connection count (${counts.calendarConnections})`,
          affectedCollection: "_calendarTokens",
          details: {
            tokens: counts._calendarTokens,
            connections: counts.calendarConnections,
            difference: Math.abs(counts._calendarTokens - counts.calendarConnections),
          },
        })
        recommendations.push(
          "Investigate token/connection mismatch - some connections may be missing tokens or tokens may be orphaned"
        )
      }

      // Finding 3: Check for tokens that need migration
      if (counts._calendarTokens > 0) {
        findings.push({
          severity: "warning",
          category: "security",
          message: `${counts._calendarTokens} OAuth tokens stored in Firestore (should migrate to Secret Manager)`,
          affectedCollection: "_calendarTokens",
          count: counts._calendarTokens,
          details: {
            recommendation: "Phase 2: Migrate to Google Secret Manager",
          },
        })
        recommendations.push(
          "Migrate OAuth tokens from Firestore to Google Secret Manager for enhanced security"
        )
      }

      // Finding 4: Check for external events without connections
      const externalEventsSnapshot = await db
        .collection("events")
        .where("isReadOnly", "==", true)
        .count()
        .get()

      const externalEventsCount = externalEventsSnapshot.data().count

      if (externalEventsCount > 0 && counts.calendarConnections === 0) {
        findings.push({
          severity: "warning",
          category: "orphaned_data",
          message: `Found ${externalEventsCount} external events but no calendar connections`,
          affectedCollection: "events",
          count: externalEventsCount,
          details: {
            action: "cleanup_orphaned_events",
          },
        })
        recommendations.push(
          "Delete orphaned external events that have no associated calendar connection"
        )
      }

      // Finding 5: Check for events with calendar connection
      if (counts.calendarConnections > 0) {
        const linkedEventsSnapshot = await db
          .collection("events")
          .where("calendarConnectionId", "!=", null)
          .count()
          .get()

        const linkedEventsCount = linkedEventsSnapshot.data().count

        findings.push({
          severity: "info",
          category: "performance",
          message: `${linkedEventsCount} events linked to calendar connections`,
          affectedCollection: "events",
          count: linkedEventsCount,
          details: {
            connections: counts.calendarConnections,
            avgEventsPerConnection:
              counts.calendarConnections > 0
                ? (linkedEventsCount / counts.calendarConnections).toFixed(1)
                : 0,
          },
        })
      }

      // Finding 6: Check for unresolved conflicts
      const unresolvedConflictsSnapshot = await db
        .collection("calendarConflicts")
        .where("resolved", "==", false)
        .count()
        .get()

      const unresolvedCount = unresolvedConflictsSnapshot.data().count

      if (unresolvedCount > 0) {
        findings.push({
          severity: "warning",
          category: "data_mismatch",
          message: `${unresolvedCount} unresolved calendar conflicts require user attention`,
          affectedCollection: "calendarConflicts",
          count: unresolvedCount,
          details: {
            total: counts.calendarConflicts,
            unresolved: unresolvedCount,
          },
        })
        recommendations.push(
          "Review and resolve pending calendar sync conflicts"
        )
      }

      // Finding 7: Check for failed syncs
      const failedSyncsSnapshot = await db
        .collection("calendarSyncLogs")
        .where("status", "==", "failed")
        .count()
        .get()

      const failedSyncsCount = failedSyncsSnapshot.data().count

      if (failedSyncsCount > 0) {
        findings.push({
          severity: "warning",
          category: "performance",
          message: `${failedSyncsCount} failed sync attempts found in logs`,
          affectedCollection: "calendarSyncLogs",
          count: failedSyncsCount,
          details: {
            total: counts.calendarSyncLogs,
            failed: failedSyncsCount,
            failureRate:
              counts.calendarSyncLogs > 0
                ? `${((failedSyncsCount / counts.calendarSyncLogs) * 100).toFixed(1)}%`
                : "0%",
          },
        })
        recommendations.push(
          "Investigate failed sync attempts - may indicate OAuth token issues or API problems"
        )
      }

      // Determine overall status
      const hasCritical = findings.some((f) => f.severity === "critical")
      const hasWarnings = findings.some((f) => f.severity === "warning")

      const status = hasCritical
        ? "critical"
        : hasWarnings
        ? "warnings"
        : "healthy"

      const result: CalendarAuditResult = {
        timestamp: new Date().toISOString(),
        collections: counts,
        findings,
        recommendations,
        status,
      }

      // Log audit execution
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "CALENDAR_AUDIT_EXECUTED",
        entityType: "system",
        success: true,
        details: {
          status,
          findingsCount: findings.length,
          criticalCount: findings.filter((f) => f.severity === "critical").length,
          warningCount: findings.filter((f) => f.severity === "warning").length,
        },
      })

      return result
    } catch (error) {
      // Log audit failure
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "CALENDAR_AUDIT_FAILED",
        entityType: "system",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })

      throw new functions.https.HttpsError(
        "internal",
        `Audit failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
)

/**
 * Get detailed information about orphaned conflicts
 * Used for migration planning
 */
export const getOrphanedConflicts = functions.https.onCall(
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
        "Only administrators can access orphaned data"
      )
    }

    try {
      // Get all documents from deprecated collection
      const snapshot = await db.collection("calendarSyncConflicts").get()

      const orphanedConflicts = snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))

      return {
        count: orphanedConflicts.length,
        conflicts: orphanedConflicts,
        migrationRequired: orphanedConflicts.length > 0,
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        "internal",
        `Failed to get orphaned conflicts: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
)

/**
 * Migrate data from calendarSyncConflicts to calendarConflicts
 * One-time migration function
 */
export const migrateOrphanedConflicts = functions.https.onCall(
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
        "Only administrators can migrate data"
      )
    }

    try {
      const snapshot = await db.collection("calendarSyncConflicts").get()

      if (snapshot.empty) {
        return {
          success: true,
          migrated: 0,
          message: "No orphaned conflicts found",
        }
      }

      // Use batch writes for atomic migration
      const batch = db.batch()
      let count = 0

      for (const doc of snapshot.docs) {
        // Copy to new collection
        const newRef = db.collection("calendarConflicts").doc(doc.id)
        batch.set(newRef, doc.data())

        // Delete from old collection
        batch.delete(doc.ref)

        count++

        // Firestore batch limit is 500 operations
        if (count >= 250) {
          // 250 * 2 operations = 500 total
          await batch.commit()
          batch.delete(db.batch() as any) // Reset batch
        }
      }

      // Commit remaining operations
      if (count % 250 !== 0) {
        await batch.commit()
      }

      // Log migration
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "CALENDAR_CONFLICTS_MIGRATED",
        entityType: "system",
        success: true,
        details: {
          migratedCount: snapshot.size,
          from: "calendarSyncConflicts",
          to: "calendarConflicts",
        },
      })

      return {
        success: true,
        migrated: snapshot.size,
        message: `Successfully migrated ${snapshot.size} conflicts`,
      }
    } catch (error) {
      await db.collection("auditLogs").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
        action: "CALENDAR_CONFLICTS_MIGRATION_FAILED",
        entityType: "system",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })

      throw new functions.https.HttpsError(
        "internal",
        `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
)
