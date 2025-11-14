/**
 * Data Retention Automation
 * Implements GDPR Article 5 (Storage Limitation)
 * Runs daily at 2:00 AM UTC to enforce retention policies
 */

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { Storage } from "@google-cloud/storage"

const db = admin.firestore()
const storage = new Storage()

// Data retention periods (in days) from lib/constants.ts
const DATA_RETENTION_PERIODS = {
  AUDIT_LOGS: 365,              // 12 months for GDPR compliance
  DELETED_USER_AUDIT: 365,       // 12 months minimal audit trail
  EXPERIMENT_LOGS: 2555,         // 7 years for research standards
  PROJECT_METADATA: 730,         // 24 months
  CONSENT_RECORDS: 2555,         // 7 years to demonstrate compliance
  DATA_EXPORT_DOWNLOADS: 7,      // Download links expire after 7 days
}

/**
 * Enforce Data Retention Policies
 * Scheduled function that runs daily to clean up expired data
 */
export const enforceDataRetention = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every day 02:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    let deletedCount = 0

    try {
      functions.logger.info("Starting data retention enforcement")

      // 1. Delete expired data export download links (7 days)
      const exportCutoff = new Date(now.toMillis() - DATA_RETENTION_PERIODS.DATA_EXPORT_DOWNLOADS * 24 * 60 * 60 * 1000)
      const expiredExportsSnapshot = await db
        .collection("dataExportRequests")
        .where("status", "==", "completed")
        .where("expiresAt", "<=", exportCutoff.toISOString())
        .get()

      for (const doc of expiredExportsSnapshot.docs) {
        const data = doc.data()

        // Delete file from Storage
        if (data.downloadUrl) {
          try {
            const fileName = extractFileNameFromUrl(data.downloadUrl)
            const file = storage.bucket().file(fileName)
            await file.delete()
            functions.logger.info(`Deleted expired export file: ${fileName}`)
          } catch (error) {
            functions.logger.error("Error deleting export file", error)
          }
        }

        // Delete export request document
        await doc.ref.delete()
        deletedCount++
      }

      functions.logger.info(`Deleted ${expiredExportsSnapshot.size} expired data exports`)

      // 2. Delete old audit logs (12 months retention)
      const auditLogCutoff = new Date(now.toMillis() - DATA_RETENTION_PERIODS.AUDIT_LOGS * 24 * 60 * 60 * 1000)
      const oldAuditLogsSnapshot = await db
        .collection("auditLogs")
        .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(auditLogCutoff))
        .where("userDeleted", "!=", true) // Keep deleted user audit logs separately
        .limit(500) // Process in batches
        .get()

      const auditBatch = db.batch()
      oldAuditLogsSnapshot.docs.forEach((doc) => {
        auditBatch.delete(doc.ref)
      })
      await auditBatch.commit()

      functions.logger.info(`Deleted ${oldAuditLogsSnapshot.size} old audit logs`)
      deletedCount += oldAuditLogsSnapshot.size

      // 3. Delete audit logs for deleted users (12 months retention)
      const deletedUserAuditCutoff = new Date(now.toMillis() - DATA_RETENTION_PERIODS.DELETED_USER_AUDIT * 24 * 60 * 60 * 1000)
      const deletedUserAuditSnapshot = await db
        .collection("auditLogs")
        .where("userDeleted", "==", true)
        .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(deletedUserAuditCutoff))
        .limit(500)
        .get()

      const deletedUserBatch = db.batch()
      deletedUserAuditSnapshot.docs.forEach((doc) => {
        deletedUserBatch.delete(doc.ref)
      })
      await deletedUserBatch.commit()

      functions.logger.info(`Deleted ${deletedUserAuditSnapshot.size} deleted user audit logs`)
      deletedCount += deletedUserAuditSnapshot.size

      // 4. Archive old consent records (keep for 7 years, then delete)
      const consentCutoff = new Date(now.toMillis() - DATA_RETENTION_PERIODS.CONSENT_RECORDS * 24 * 60 * 60 * 1000)
      const oldConsentsSnapshot = await db
        .collection("userConsents")
        .where("consentGivenAt", "<=", consentCutoff.toISOString())
        .limit(100)
        .get()

      for (const doc of oldConsentsSnapshot.docs) {
        // Archive to cold storage collection before deletion
        await db.collection("archivedConsents").doc(doc.id).set({
          ...doc.data(),
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        await doc.ref.delete()
        deletedCount++
      }

      functions.logger.info(`Archived ${oldConsentsSnapshot.size} old consent records`)

      // 5. Delete completed deletion requests after 30 days
      const deletionRequestCutoff = new Date(now.toMillis() - 30 * 24 * 60 * 60 * 1000)
      const oldDeletionRequestsSnapshot = await db
        .collection("accountDeletionRequests")
        .where("status", "==", "completed")
        .where("completedAt", "<=", admin.firestore.Timestamp.fromDate(deletionRequestCutoff))
        .limit(100)
        .get()

      const deletionBatch = db.batch()
      oldDeletionRequestsSnapshot.docs.forEach((doc) => {
        deletionBatch.delete(doc.ref)
      })
      await deletionBatch.commit()

      functions.logger.info(`Deleted ${oldDeletionRequestsSnapshot.size} old deletion requests`)
      deletedCount += oldDeletionRequestsSnapshot.size

      // 6. Delete anonymized user profiles after retention period expires
      const usersSnapshot = await db
        .collection("users")
        .where("deleted", "==", true)
        .where("retentionExpiresAt", "<=", new Date().toISOString())
        .limit(50)
        .get()

      for (const doc of usersSnapshot.docs) {
        await doc.ref.delete()
        deletedCount++
      }

      functions.logger.info(`Deleted ${usersSnapshot.size} expired anonymized user profiles`)

      // 7. Delete completed data export requests after 30 days
      const dataExportCutoff = new Date(now.toMillis() - 30 * 24 * 60 * 60 * 1000)
      const oldDataExportsSnapshot = await db
        .collection("dataExportRequests")
        .where("status", "in", ["completed", "failed"])
        .where("completedAt", "<=", admin.firestore.Timestamp.fromDate(dataExportCutoff))
        .limit(100)
        .get()

      const dataExportBatch = db.batch()
      oldDataExportsSnapshot.docs.forEach((doc) => {
        dataExportBatch.delete(doc.ref)
      })
      await dataExportBatch.commit()

      functions.logger.info(`Deleted ${oldDataExportsSnapshot.size} old data export requests`)
      deletedCount += oldDataExportsSnapshot.size

      // Log retention enforcement
      await db.collection("auditLogs").add({
        action: "DATA_RETENTION_ENFORCED",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          deletedCount,
          categories: {
            expiredExports: expiredExportsSnapshot.size,
            oldAuditLogs: oldAuditLogsSnapshot.size,
            deletedUserAuditLogs: deletedUserAuditSnapshot.size,
            oldConsents: oldConsentsSnapshot.size,
            oldDeletionRequests: oldDeletionRequestsSnapshot.size,
            expiredUserProfiles: usersSnapshot.size,
            oldDataExports: oldDataExportsSnapshot.size,
          },
        },
        gdprCompliance: "Article 5 - Storage Limitation",
      })

      functions.logger.info(`Data retention enforcement completed. Total deleted: ${deletedCount}`)
    } catch (error: any) {
      functions.logger.error("Data retention enforcement failed", error)

      // Log error but don't throw to prevent retry loops
      await db.collection("auditLogs").add({
        action: "DATA_RETENTION_FAILED",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        details: {
          deletedBeforeError: deletedCount,
        },
      })
    }
  })

/**
 * Helper function to extract file name from signed URL
 */
function extractFileNameFromUrl(url: string): string {
  // Extract file path from signed URL
  const match = url.match(/exports\/[^?]+/)
  return match ? match[0] : ""
}
