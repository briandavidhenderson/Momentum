/**
 * Audit Logging System
 * Implements GDPR Article 30 (Records of Processing Activities)
 * Provides comprehensive audit trail for compliance and security monitoring
 */

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

const db = admin.firestore()

export interface AuditLogEntry {
  timestamp: admin.firestore.FieldValue
  userId?: string
  userEmail?: string
  userName?: string
  action: AuditAction
  entityType?: string
  entityId?: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  labId?: string
  success: boolean
  errorMessage?: string
  gdprCompliance?: string
}

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "CONSENT_GIVEN"
  | "CONSENT_WITHDRAWN"
  | "CONSENT_UPDATED"
  | "PRIVACY_SETTINGS_UPDATED"
  | "DATA_EXPORT_REQUESTED"
  | "DATA_EXPORT_COMPLETED"
  | "DATA_EXPORT_DOWNLOADED"
  | "ACCOUNT_DELETION_REQUESTED"
  | "ACCOUNT_DELETED"
  | "SPECIAL_CATEGORY_DATA_MARKED"
  | "FUNDING_ALLOCATION_CREATED"
  | "FUNDING_ALLOCATION_UPDATED"
  | "FUNDING_TRANSACTION_CREATED"
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_RECEIVED"
  | "ORDER_CANCELLED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_MEMBER_ADDED"
  | "PROJECT_MEMBER_REMOVED"
  | "ELN_EXPERIMENT_CREATED"
  | "ELN_EXPERIMENT_UPDATED"
  | "ELN_PROTOCOL_CREATED"
  | "ELN_PROTOCOL_UPDATED"
  | "FILE_UPLOADED"
  | "FILE_DOWNLOADED"
  | "FILE_DELETED"
  | "DATA_RETENTION_ENFORCED"
  | "DATA_RETENTION_FAILED"

/**
 * Callable function to log audit events from client
 * Allows frontend to create audit log entries for user actions
 */
export const logAuditEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in")
  }

  const auditEntry: AuditLogEntry = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: context.auth.uid,
    userEmail: context.auth.token.email,
    userName: data.userName,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    changes: data.changes,
    ipAddress: context.rawRequest.ip,
    userAgent: context.rawRequest.headers["user-agent"],
    sessionId: data.sessionId,
    labId: data.labId,
    success: data.success !== false,
    errorMessage: data.errorMessage,
    gdprCompliance: data.gdprCompliance,
  }

  await db.collection("auditLogs").add(auditEntry)

  return { success: true }
})

/**
 * Monitor user authentication events
 */
export const logUserLogin = functions.auth.user().onCreate(async (user) => {
  await db.collection("auditLogs").add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: user.uid,
    userEmail: user.email,
    action: "USER_CREATED",
    entityType: "user",
    entityId: user.uid,
    details: {
      provider: user.providerData.map((p) => p.providerId),
      emailVerified: user.emailVerified,
    },
    success: true,
  })
})

/**
 * Monitor user deletion events
 */
export const logUserDeletion = functions.auth.user().onDelete(async (user) => {
  await db.collection("auditLogs").add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: user.uid,
    userEmail: user.email,
    action: "USER_DELETED",
    entityType: "user",
    entityId: user.uid,
    success: true,
    gdprCompliance: "Article 17 - Right to Erasure",
  })
})

/**
 * Monitor consent changes
 */
export const logConsentChanges = functions.firestore
  .document("userConsents/{consentId}")
  .onWrite(async (change, context) => {
    const consentId = context.params.consentId
    const before = change.before.exists ? change.before.data() : null
    const after = change.after.exists ? change.after.data() : null

    let action: AuditAction
    if (!before && after) {
      action = "CONSENT_GIVEN"
    } else if (before && !after) {
      action = "CONSENT_WITHDRAWN"
    } else {
      action = "CONSENT_UPDATED"
    }

    await db.collection("auditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: after?.userId || before?.userId,
      action,
      entityType: "userConsent",
      entityId: consentId,
      changes: {
        before: before ? {
          functionalCookies: before.functionalCookies,
          analyticsCookies: before.analyticsCookies,
          dataProcessingConsent: before.dataProcessingConsent,
        } : null,
        after: after ? {
          functionalCookies: after.functionalCookies,
          analyticsCookies: after.analyticsCookies,
          dataProcessingConsent: after.dataProcessingConsent,
        } : null,
      },
      success: true,
      gdprCompliance: "Article 7 - Conditions for Consent",
    })
  })

/**
 * Monitor privacy settings changes
 */
export const logPrivacySettingsChanges = functions.firestore
  .document("privacySettings/{settingsId}")
  .onWrite(async (change, context) => {
    const settingsId = context.params.settingsId
    const before = change.before.exists ? change.before.data() : null
    const after = change.after.exists ? change.after.data() : null

    if (!after) return // Ignore deletions

    await db.collection("auditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: after.userId,
      action: "PRIVACY_SETTINGS_UPDATED",
      entityType: "privacySettings",
      entityId: settingsId,
      changes: {
        before,
        after,
      },
      success: true,
      gdprCompliance: "Article 18 - Right to Restriction of Processing",
    })
  })

/**
 * Monitor data export requests
 */
export const logDataExportRequests = functions.firestore
  .document("dataExportRequests/{requestId}")
  .onCreate(async (snapshot, context) => {
    const requestId = context.params.requestId
    const data = snapshot.data()

    await db.collection("auditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: data.userId,
      userEmail: data.userEmail,
      action: "DATA_EXPORT_REQUESTED",
      entityType: "dataExportRequest",
      entityId: requestId,
      details: {
        exportFormat: data.exportFormat,
        includesProfile: data.includesProfile,
        includesProjects: data.includesProjects,
        includesTasks: data.includesTasks,
        includesOrders: data.includesOrders,
        includesELNData: data.includesELNData,
        includesAuditLogs: data.includesAuditLogs,
      },
      success: true,
      gdprCompliance: "Article 15 - Right of Access, Article 20 - Right to Data Portability",
    })
  })

/**
 * Monitor account deletion requests
 */
export const logAccountDeletionRequests = functions.firestore
  .document("accountDeletionRequests/{requestId}")
  .onCreate(async (snapshot, context) => {
    const requestId = context.params.requestId
    const data = snapshot.data()

    await db.collection("auditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      action: "ACCOUNT_DELETION_REQUESTED",
      entityType: "accountDeletionRequest",
      entityId: requestId,
      details: {
        deleteAllData: data.deleteAllData,
        retainForCompliance: data.retainForCompliance,
        reason: data.reason,
      },
      success: true,
      gdprCompliance: "Article 17 - Right to Erasure",
    })
  })

/**
 * Monitor special category data markers
 */
export const logSpecialCategoryData = functions.firestore
  .document("specialCategoryDataMarkers/{markerId}")
  .onCreate(async (snapshot, context) => {
    const markerId = context.params.markerId
    const data = snapshot.data()

    await db.collection("auditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: data.acknowledgedBy,
      action: "SPECIAL_CATEGORY_DATA_MARKED",
      entityType: "specialCategoryDataMarker",
      entityId: markerId,
      details: {
        dataEntityType: data.entityType,
        dataEntityId: data.entityId,
        dataCategory: data.dataCategory,
        lawfulBasis: data.lawfulBasis,
        specialCategoryBasis: data.specialCategoryBasis,
      },
      success: true,
      gdprCompliance: "Article 9 - Processing of Special Categories of Personal Data",
    })
  })
