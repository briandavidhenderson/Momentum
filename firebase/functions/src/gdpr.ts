/**
 * GDPR Compliance Cloud Functions
 * Implements GDPR Articles 15-21 for data export and account deletion
 */

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { Storage } from "@google-cloud/storage"
import archiver from "archiver"

const db = admin.firestore()
const storage = new Storage()

interface DataExportRequest {
  id: string
  userId: string
  userEmail: string
  requestedAt: string
  status: "pending" | "processing" | "completed" | "failed"
  exportFormat: "json" | "csv" | "zip"
  downloadUrl?: string
  includesProfile: boolean
  includesProjects: boolean
  includesTasks: boolean
  includesOrders: boolean
  includesELNData: boolean
  includesUploadedFiles: boolean
  includesAuditLogs: boolean
  completedAt?: string
  expiresAt?: string
  errorMessage?: string
}

interface AccountDeletionRequest {
  id: string
  userId: string
  userEmail: string
  userName: string
  requestedAt: string
  status: "pending" | "processing" | "completed" | "failed"
  deleteAllData: boolean
  retainForCompliance: boolean
  retentionExpiresAt?: string
  reason?: string
  completedAt?: string
  errorMessage?: string
}

/**
 * Process Data Export Request (GDPR Articles 15 & 20)
 * Triggered when a new dataExportRequest document is created
 */
export const processDataExportRequest = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .firestore.document("dataExportRequests/{requestId}")
  .onCreate(async (snapshot, context) => {
    const requestId = context.params.requestId
    const request = snapshot.data() as DataExportRequest

    try {
      functions.logger.info(`Starting data export for user ${request.userId}`, { requestId })

      // Update status to processing
      await db.collection("dataExportRequests").doc(requestId).update({
        status: "processing",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Collect user data from all requested sources
      const userData: any = {
        exportedAt: new Date().toISOString(),
        userId: request.userId,
        userEmail: request.userEmail,
        exportFormat: request.exportFormat,
        gdprCompliance: {
          legalBasis: "Article 15 - Right of Access",
          dataPortability: "Article 20 - Right to Data Portability",
        },
      }

      // 1. User Profile
      if (request.includesProfile) {
        const userDoc = await db.collection("users").doc(request.userId).get()
        if (userDoc.exists) {
          userData.profile = userDoc.data()
        }

        // Privacy settings
        const privacyDoc = await db.collection("privacySettings").doc(request.userId).get()
        if (privacyDoc.exists) {
          userData.privacySettings = privacyDoc.data()
        }

        // Consent records
        const consentDoc = await db.collection("userConsents").doc(request.userId).get()
        if (consentDoc.exists) {
          userData.consentRecords = consentDoc.data()
        }
      }

      // 2. Projects
      if (request.includesProjects) {
        const projectsSnapshot = await db
          .collection("projects")
          .where("members", "array-contains", request.userId)
          .get()
        userData.projects = projectsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // 3. Tasks
      if (request.includesTasks) {
        const tasksSnapshot = await db
          .collection("tasks")
          .where("assignedTo", "==", request.userId)
          .get()
        userData.tasks = tasksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // 4. Orders
      if (request.includesOrders) {
        const ordersSnapshot = await db
          .collection("orders")
          .where("orderedBy", "==", request.userId)
          .get()
        userData.orders = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // 5. ELN Data (Experiments, Protocols, Items)
      if (request.includesELNData) {
        const elnExperimentsSnapshot = await db
          .collection("elnExperiments")
          .where("createdBy", "==", request.userId)
          .get()
        userData.elnExperiments = elnExperimentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const elnProtocolsSnapshot = await db
          .collection("elnProtocols")
          .where("createdBy", "==", request.userId)
          .get()
        userData.elnProtocols = elnProtocolsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const elnItemsSnapshot = await db
          .collection("elnItems")
          .where("createdBy", "==", request.userId)
          .get()
        userData.elnItems = elnItemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // 6. Audit Logs (limited to last 10,000 events)
      if (request.includesAuditLogs) {
        const auditLogsSnapshot = await db
          .collection("auditLogs")
          .where("userId", "==", request.userId)
          .orderBy("timestamp", "desc")
          .limit(10000)
          .get()
        userData.auditLogs = auditLogsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // 7. Funding Allocations & Transactions
      const allocationsSnapshot = await db
        .collection("fundingAllocations")
        .where("personId", "==", request.userId)
        .get()
      userData.fundingAllocations = allocationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      const transactionsSnapshot = await db
        .collection("fundingTransactions")
        .where("createdBy", "==", request.userId)
        .get()
      userData.fundingTransactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // 8. Special Category Data Markers
      const specialDataSnapshot = await db
        .collection("specialCategoryDataMarkers")
        .where("acknowledgedBy", "==", request.userId)
        .get()
      userData.specialCategoryData = specialDataSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Generate export file based on format
      let downloadUrl: string
      const bucketName = "momentum-gdpr-exports" // Configure this in Firebase
      const fileName = `exports/${request.userId}/${requestId}_${Date.now()}`

      if (request.exportFormat === "json") {
        // JSON export
        const jsonContent = JSON.stringify(userData, null, 2)
        const file = storage.bucket(bucketName).file(`${fileName}.json`)
        await file.save(jsonContent, {
          contentType: "application/json",
          metadata: {
            metadata: {
              userId: request.userId,
              exportedAt: new Date().toISOString(),
            },
          },
        })

        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        downloadUrl = url
      } else if (request.exportFormat === "csv") {
        // CSV export (simplified - key data only)
        const csvContent = convertToCSV(userData)
        const file = storage.bucket(bucketName).file(`${fileName}.csv`)
        await file.save(csvContent, {
          contentType: "text/csv",
          metadata: {
            metadata: {
              userId: request.userId,
              exportedAt: new Date().toISOString(),
            },
          },
        })

        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        downloadUrl = url
      } else if (request.exportFormat === "zip") {
        // ZIP export
        const archive = archiver("zip", { zlib: { level: 9 } })
        const zipFile = storage.bucket(bucketName).file(`${fileName}.zip`)
        const writeStream = zipFile.createWriteStream({
          contentType: "application/zip",
          metadata: {
            metadata: {
              userId: request.userId,
              exportedAt: new Date().toISOString(),
            },
          },
        })

        archive.pipe(writeStream)

        // Add JSON data
        archive.append(JSON.stringify(userData, null, 2), { name: "data.json" })

        await archive.finalize()

        // Wait for stream to finish
        await new Promise((resolve, reject) => {
          writeStream.on("finish", resolve)
          writeStream.on("error", reject)
        })

        const [url] = await zipFile.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        downloadUrl = url
      } else {
        throw new Error(`Unsupported export format: ${request.exportFormat}`)
      }

      // Update request with download URL
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await db.collection("dataExportRequests").doc(requestId).update({
        status: "completed",
        downloadUrl,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
      })

      // Log audit event
      await logAuditEvent({
        userId: request.userId,
        action: "DATA_EXPORT_COMPLETED",
        entityType: "dataExportRequest",
        entityId: requestId,
        details: {
          exportFormat: request.exportFormat,
          recordCount: Object.keys(userData).length,
        },
      })

      functions.logger.info(`Data export completed for user ${request.userId}`, {
        requestId,
        format: request.exportFormat,
      })
    } catch (error: any) {
      functions.logger.error(`Data export failed for user ${request.userId}`, {
        requestId,
        error: error.message,
      })

      await db.collection("dataExportRequests").doc(requestId).update({
        status: "failed",
        errorMessage: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  })

/**
 * Process Account Deletion Request (GDPR Article 17)
 * Complete and irreversible deletion with minimal audit trail
 */
export const processAccountDeletion = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .firestore.document("accountDeletionRequests/{requestId}")
  .onCreate(async (snapshot, context) => {
    const requestId = context.params.requestId
    const request = snapshot.data() as AccountDeletionRequest

    try {
      functions.logger.info(`Starting account deletion for user ${request.userId}`)

      // Update status to processing
      await db.collection("accountDeletionRequests").doc(requestId).update({
        status: "processing",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Phase 1: Anonymize user profile (keep minimal audit trail)
      const userDoc = await db.collection("users").doc(request.userId).get()
      if (userDoc.exists) {
        const anonymizedData = {
          id: request.userId,
          email: `deleted_${request.userId}@anonymized.local`,
          fullName: "[DELETED USER]",
          deleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalEmail: request.userEmail,
          retainForCompliance: request.retainForCompliance,
          retentionExpiresAt: request.retentionExpiresAt,
          // Remove all PII
          phone: null,
          officeLocation: null,
          bio: null,
          profileImageUrl: null,
          linkedinUrl: null,
          orcidId: null,
          researchGateUrl: null,
        }

        await db.collection("users").doc(request.userId).set(anonymizedData, { merge: true })
      }

      // Phase 2: Delete privacy settings and anonymize consent
      await db.collection("privacySettings").doc(request.userId).delete()

      const consentDoc = await db.collection("userConsents").doc(request.userId).get()
      if (consentDoc.exists) {
        await db.collection("userConsents").doc(request.userId).update({
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }

      // Phase 3: Handle projects (remove from members array)
      const projectsSnapshot = await db
        .collection("projects")
        .where("members", "array-contains", request.userId)
        .get()

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data()
        const updatedMembers = projectData.members.filter((id: string) => id !== request.userId)

        await db.collection("projects").doc(projectDoc.id).update({
          members: updatedMembers,
          [`memberDeletions.${request.userId}`]: {
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedName: request.userName,
          },
        })
      }

      // Phase 4: Handle tasks (reassign or anonymize)
      const tasksSnapshot = await db
        .collection("tasks")
        .where("assignedTo", "==", request.userId)
        .get()

      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data()
        if (taskData.status === "completed") {
          await db.collection("tasks").doc(taskDoc.id).update({
            assignedTo: `[DELETED_USER_${request.userId}]`,
            assignedToName: "[DELETED USER]",
          })
        } else {
          await db.collection("tasks").doc(taskDoc.id).update({
            assignedTo: null,
            assignedToName: null,
            notes: `Original assignee deleted account on ${new Date().toISOString()}`,
          })
        }
      }

      // Phase 5: Handle orders (anonymize for audit trail)
      const ordersSnapshot = await db
        .collection("orders")
        .where("orderedBy", "==", request.userId)
        .get()

      for (const orderDoc of ordersSnapshot.docs) {
        await db.collection("orders").doc(orderDoc.id).update({
          orderedBy: `[DELETED_USER_${request.userId}]`,
          orderedByName: "[DELETED USER]",
          orderedByEmail: null,
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }

      // Phase 6: Handle ELN data
      if (request.deleteAllData) {
        // Delete ELN data completely
        const elnCollections = ["elnExperiments", "elnProtocols", "elnItems"]
        for (const collectionName of elnCollections) {
          const snapshot = await db
            .collection(collectionName)
            .where("createdBy", "==", request.userId)
            .get()

          const batch = db.batch()
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
          await batch.commit()
        }
      } else {
        // Anonymize but retain for research integrity
        const elnCollections = ["elnExperiments", "elnProtocols", "elnItems"]
        for (const collectionName of elnCollections) {
          const snapshot = await db
            .collection(collectionName)
            .where("createdBy", "==", request.userId)
            .get()

          for (const doc of snapshot.docs) {
            await db.collection(collectionName).doc(doc.id).update({
              createdBy: `[DELETED_USER_${request.userId}]`,
              createdByName: "[DELETED USER]",
              userDeleted: true,
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          }
        }
      }

      // Phase 7: Handle funding allocations
      const allocationsSnapshot = await db
        .collection("fundingAllocations")
        .where("personId", "==", request.userId)
        .get()

      for (const allocationDoc of allocationsSnapshot.docs) {
        await db.collection("fundingAllocations").doc(allocationDoc.id).update({
          personId: `[DELETED_USER_${request.userId}]`,
          personName: "[DELETED USER]",
          status: "archived",
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }

      // Phase 8: Anonymize funding transactions (keep for audit)
      const transactionsSnapshot = await db
        .collection("fundingTransactions")
        .where("createdBy", "==", request.userId)
        .get()

      for (const transactionDoc of transactionsSnapshot.docs) {
        await db.collection("fundingTransactions").doc(transactionDoc.id).update({
          createdBy: `[DELETED_USER_${request.userId}]`,
          createdByName: "[DELETED USER]",
          userDeleted: true,
        })
      }

      // Phase 9: Anonymize audit logs (keep for compliance)
      const auditLogsSnapshot = await db
        .collection("auditLogs")
        .where("userId", "==", request.userId)
        .get()

      for (const logDoc of auditLogsSnapshot.docs) {
        await db.collection("auditLogs").doc(logDoc.id).update({
          userId: `[DELETED_USER_${request.userId}]`,
          userEmail: null,
          userName: "[DELETED USER]",
          userDeleted: true,
        })
      }

      // Phase 10: Delete special category data markers
      const specialDataSnapshot = await db
        .collection("specialCategoryDataMarkers")
        .where("acknowledgedBy", "==", request.userId)
        .get()

      const specialDataBatch = db.batch()
      specialDataSnapshot.docs.forEach((doc) => {
        specialDataBatch.delete(doc.ref)
      })
      await specialDataBatch.commit()

      // Phase 11: Delete Firebase Authentication account
      try {
        await admin.auth().deleteUser(request.userId)
        functions.logger.info(`Deleted Firebase Auth account for user ${request.userId}`)
      } catch (authError: any) {
        functions.logger.error("Error deleting Firebase Auth account", authError)
        // Continue even if auth deletion fails
      }

      // Phase 12: Create final audit log entry
      await db.collection("auditLogs").add({
        action: "ACCOUNT_DELETED",
        entityType: "user",
        entityId: request.userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          requestId,
          deletedEmail: request.userEmail,
          deletedName: request.userName,
          deleteAllData: request.deleteAllData,
          retainForCompliance: request.retainForCompliance,
          retentionExpiresAt: request.retentionExpiresAt,
        },
        gdprCompliance: "Article 17 - Right to Erasure",
      })

      // Update deletion request status
      await db.collection("accountDeletionRequests").doc(requestId).update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      functions.logger.info(`Account deletion completed for user ${request.userId}`)
    } catch (error: any) {
      functions.logger.error(`Account deletion failed for user ${request.userId}`, {
        requestId,
        error: error.message,
      })

      await db.collection("accountDeletionRequests").doc(requestId).update({
        status: "failed",
        errorMessage: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  })

/**
 * Helper function to convert user data to CSV format
 */
function convertToCSV(userData: any): string {
  const lines: string[] = []

  // Header
  lines.push("Section,Key,Value")

  // Profile
  if (userData.profile) {
    Object.entries(userData.profile).forEach(([key, value]) => {
      lines.push(`Profile,${key},"${String(value).replace(/"/g, '""')}"`)
    })
  }

  // Projects
  if (userData.projects) {
    userData.projects.forEach((project: any, index: number) => {
      Object.entries(project).forEach(([key, value]) => {
        lines.push(`Project ${index + 1},${key},"${String(value).replace(/"/g, '""')}"`)
      })
    })
  }

  // Tasks
  if (userData.tasks) {
    userData.tasks.forEach((task: any, index: number) => {
      Object.entries(task).forEach(([key, value]) => {
        lines.push(`Task ${index + 1},${key},"${String(value).replace(/"/g, '""')}"`)
      })
    })
  }

  return lines.join("\n")
}

/**
 * Helper function to log audit events
 */
async function logAuditEvent(event: any): Promise<void> {
  await db.collection("auditLogs").add({
    ...event,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })
}
