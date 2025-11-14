# GDPR Compliance & Funding System Implementation Plan
## Phases 2-4 Detailed Roadmap

**Project:** Momentum Lab Management Application
**Status:** Phase 1 Complete (3,706 lines implemented)
**Branch:** `claude/work-in-progress-01393E87eTRuDBgbUyfsSNGA`
**Date:** November 14, 2025

---

## Executive Summary

This document provides a comprehensive implementation plan for Phases 2-4 of the GDPR compliance and enhanced funding system. Phase 1 has successfully established the foundation with type definitions, security rules, UI components, and core infrastructure.

**Phase 1 Completed:**
- ✅ GDPR type definitions (UserConsent, PrivacySettings, DataExportRequest, AccountDeletionRequest)
- ✅ Enhanced funding types (FundingAllocation, FundingTransaction)
- ✅ Firestore security rules with RBAC
- ✅ Cookie Consent Banner (ePrivacy Directive)
- ✅ Privacy Dashboard (6 tabs - all GDPR user rights)
- ✅ EUR defaults and constants
- ✅ Main app integration

**Remaining Work:**
- **Phase 2:** Backend Cloud Functions (data export, account deletion, retention automation)
- **Phase 3:** Funding System UI (admin pages, order integration, ledgers)
- **Phase 4:** Advanced Features (AI disclaimers, notifications, analytics)

---

## Table of Contents

1. [Phase 2: Backend Cloud Functions](#phase-2-backend-cloud-functions)
   - 2.1 Data Export Cloud Function
   - 2.2 Account Deletion Cloud Function
   - 2.3 Data Retention Automation
   - 2.4 Audit Log System
2. [Phase 3: Funding System UI](#phase-3-funding-system-ui)
   - 3.1 Funding Admin Dashboard
   - 3.2 Order Integration
   - 3.3 Personal Ledger View
   - 3.4 Project Funding Section
3. [Phase 4: Advanced Features](#phase-4-advanced-features)
   - 4.1 AI Content Disclaimers
   - 4.2 Funding Notifications
   - 4.3 Analytics & Reporting
   - 4.4 CSV Export for Finance
4. [Testing Strategy](#testing-strategy)
5. [Deployment Plan](#deployment-plan)
6. [Timeline Estimates](#timeline-estimates)

---

# Phase 2: Backend Cloud Functions

## Overview
Phase 2 focuses on implementing serverless Cloud Functions that handle GDPR data processing, account lifecycle management, and automated compliance tasks. These functions run on Firebase Cloud Functions (Node.js) and are triggered by Firestore events, HTTP requests, or scheduled cron jobs.

**Estimated Time:** 3-4 days
**Dependencies:** Phase 1 complete, Firebase Functions SDK, Admin SDK
**Files to Create:** `firebase/functions/src/gdpr.ts`, `firebase/functions/src/funding.ts`, `firebase/functions/src/retention.ts`

---

## 2.1 Data Export Cloud Function

**Purpose:** Generate comprehensive data exports for GDPR Article 15 (Right of Access) and Article 20 (Data Portability) requests.

### Technical Specification

**Function Name:** `processDataExportRequest`
**Trigger:** Firestore onCreate - `dataExportRequests/{requestId}`
**Runtime:** Node.js 18+
**Timeout:** 540 seconds (9 minutes)
**Memory:** 2GB

### Implementation Details

```typescript
// firebase/functions/src/gdpr.ts

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import archiver from "archiver"
import { Storage } from "@google-cloud/storage"

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

export const processDataExportRequest = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .firestore.document("dataExportRequests/{requestId}")
  .onCreate(async (snapshot, context) => {
    const requestId = context.params.requestId
    const request = snapshot.data() as DataExportRequest
    const db = admin.firestore()
    const storage = new Storage()

    try {
      // Update status to processing
      await db.collection("dataExportRequests").doc(requestId).update({
        status: "processing",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Collect user data from all requested sources
      const userData: any = {
        exportedAt: new Date().toISOString(),
        userId: request.userId,
        userEmail: request.userEmail,
        exportFormat: request.exportFormat,
        gdprCompliance: {
          legalBasis: "Article 15 - Right of Access",
          dataPortability: "Article 20 - Right to Data Portability"
        }
      }

      // 1. User Profile
      if (request.includesProfile) {
        const userDoc = await db.collection("users").doc(request.userId).get()
        userData.profile = userDoc.data()

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
        const projectsSnapshot = await db.collection("projects")
          .where("members", "array-contains", request.userId)
          .get()
        userData.projects = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }

      // 3. Tasks
      if (request.includesTasks) {
        const tasksSnapshot = await db.collection("tasks")
          .where("assignedTo", "==", request.userId)
          .get()
        userData.tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }

      // 4. Orders
      if (request.includesOrders) {
        const ordersSnapshot = await db.collection("orders")
          .where("orderedBy", "==", request.userId)
          .get()
        userData.orders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }

      // 5. ELN Data (Experiments, Protocols, Items)
      if (request.includesELNData) {
        const elnExperimentsSnapshot = await db.collection("elnExperiments")
          .where("createdBy", "==", request.userId)
          .get()
        userData.elnExperiments = elnExperimentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        const elnProtocolsSnapshot = await db.collection("elnProtocols")
          .where("createdBy", "==", request.userId)
          .get()
        userData.elnProtocols = elnProtocolsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        const elnItemsSnapshot = await db.collection("elnItems")
          .where("createdBy", "==", request.userId)
          .get()
        userData.elnItems = elnItemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }

      // 6. Audit Logs
      if (request.includesAuditLogs) {
        const auditLogsSnapshot = await db.collection("auditLogs")
          .where("userId", "==", request.userId)
          .orderBy("timestamp", "desc")
          .limit(10000) // Last 10,000 events
          .get()
        userData.auditLogs = auditLogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }

      // 7. Funding Allocations & Transactions
      const allocationsSnapshot = await db.collection("fundingAllocations")
        .where("personId", "==", request.userId)
        .get()
      userData.fundingAllocations = allocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const transactionsSnapshot = await db.collection("fundingTransactions")
        .where("createdBy", "==", request.userId)
        .get()
      userData.fundingTransactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // 8. Special Category Data Markers
      const specialDataSnapshot = await db.collection("specialCategoryDataMarkers")
        .where("acknowledgedBy", "==", request.userId)
        .get()
      userData.specialCategoryData = specialDataSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Generate export file based on format
      let downloadUrl: string
      const bucketName = functions.config().storage.bucket || "momentum-exports"
      const fileName = `exports/${request.userId}/${requestId}_${Date.now()}`

      if (request.exportFormat === "json") {
        // JSON export
        const jsonContent = JSON.stringify(userData, null, 2)
        const file = storage.bucket(bucketName).file(`${fileName}.json`)
        await file.save(jsonContent, {
          contentType: "application/json",
          metadata: {
            userId: request.userId,
            exportedAt: new Date().toISOString()
          }
        })
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        })
        downloadUrl = url

      } else if (request.exportFormat === "csv") {
        // CSV export (simplified - key data only)
        const csvContent = convertToCSV(userData)
        const file = storage.bucket(bucketName).file(`${fileName}.csv`)
        await file.save(csvContent, {
          contentType: "text/csv",
          metadata: {
            userId: request.userId,
            exportedAt: new Date().toISOString()
          }
        })
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000
        })
        downloadUrl = url

      } else if (request.exportFormat === "zip" && request.includesUploadedFiles) {
        // ZIP export with uploaded files
        const archive = archiver("zip", { zlib: { level: 9 } })
        const zipFile = storage.bucket(bucketName).file(`${fileName}.zip`)
        const writeStream = zipFile.createWriteStream({
          contentType: "application/zip",
          metadata: {
            userId: request.userId,
            exportedAt: new Date().toISOString()
          }
        })

        archive.pipe(writeStream)

        // Add JSON data
        archive.append(JSON.stringify(userData, null, 2), { name: "data.json" })

        // Add uploaded files (if any)
        // TODO: Implement file collection from Storage

        await archive.finalize()

        const [url] = await zipFile.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000
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
        expiresAt
      })

      // Send notification email
      await sendExportReadyEmail(request.userEmail, downloadUrl, expiresAt)

      // Log audit event
      await logAuditEvent({
        userId: request.userId,
        action: "DATA_EXPORT_COMPLETED",
        entityType: "dataExportRequest",
        entityId: requestId,
        details: {
          exportFormat: request.exportFormat,
          recordCount: Object.keys(userData).length
        }
      })

      functions.logger.info(`Data export completed for user ${request.userId}`, {
        requestId,
        format: request.exportFormat
      })

    } catch (error) {
      functions.logger.error(`Data export failed for user ${request.userId}`, {
        requestId,
        error
      })

      await db.collection("dataExportRequests").doc(requestId).update({
        status: "failed",
        errorMessage: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })

function convertToCSV(userData: any): string {
  // Implementation for CSV conversion
  // Simplified example - real implementation would be more comprehensive
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

  return lines.join("\n")
}

async function sendExportReadyEmail(email: string, downloadUrl: string, expiresAt: string): Promise<void> {
  // TODO: Implement email sending (SendGrid, AWS SES, etc.)
  functions.logger.info(`Export ready email would be sent to ${email}`)
}

async function logAuditEvent(event: any): Promise<void> {
  const db = admin.firestore()
  await db.collection("auditLogs").add({
    ...event,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  })
}
```

### Testing Requirements

1. **Unit Tests:**
   - Test data collection for each source (profile, projects, tasks, orders, ELN)
   - Test JSON, CSV, and ZIP format generation
   - Test error handling for missing data
   - Test signed URL generation

2. **Integration Tests:**
   - Test end-to-end export request flow
   - Test with user with no data
   - Test with user with large amounts of data (>100MB)
   - Test concurrent export requests
   - Test expired download links

3. **Security Tests:**
   - Verify user can only export their own data
   - Test signed URL expiration (7 days)
   - Verify data includes all GDPR-required fields

### Deployment Checklist

- [ ] Install dependencies: `archiver`, `@google-cloud/storage`
- [ ] Configure Storage bucket for exports
- [ ] Set up retention policy (delete exports after 30 days)
- [ ] Configure email service credentials
- [ ] Deploy function: `firebase deploy --only functions:processDataExportRequest`
- [ ] Test with sample user account
- [ ] Monitor Cloud Functions logs for errors
- [ ] Set up alerting for failed exports

---

## 2.2 Account Deletion Cloud Function

**Purpose:** Complete and irreversible account deletion per GDPR Article 17 (Right to Erasure) while maintaining minimal audit trail for compliance.

### Technical Specification

**Function Name:** `processAccountDeletion`
**Trigger:** Firestore onCreate - `accountDeletionRequests/{requestId}`
**Runtime:** Node.js 18+
**Timeout:** 540 seconds (9 minutes)
**Memory:** 2GB

### Implementation Details

```typescript
// firebase/functions/src/gdpr.ts (continued)

export const processAccountDeletion = functions
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .firestore.document("accountDeletionRequests/{requestId}")
  .onCreate(async (snapshot, context) => {
    const requestId = context.params.requestId
    const request = snapshot.data() as AccountDeletionRequest
    const db = admin.firestore()
    const auth = admin.auth()

    try {
      // Update status to processing
      await db.collection("accountDeletionRequests").doc(requestId).update({
        status: "processing",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      functions.logger.info(`Starting account deletion for user ${request.userId}`)

      // Phase 1: Anonymize user profile (keep minimal audit trail)
      const userDoc = await db.collection("users").doc(request.userId).get()
      if (userDoc.exists) {
        const originalData = userDoc.data()

        // Create anonymized version
        const anonymizedData = {
          id: request.userId,
          email: `deleted_${request.userId}@anonymized.local`,
          fullName: "[DELETED USER]",
          deleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalEmail: request.userEmail, // For audit trail only
          retainForCompliance: request.retainForCompliance,
          retentionExpiresAt: request.retentionExpiresAt,
          // Remove all PII
          phone: null,
          officeLocation: null,
          bio: null,
          profileImageUrl: null,
          linkedinUrl: null,
          orcidId: null,
          researchGateUrl: null
        }

        await db.collection("users").doc(request.userId).set(anonymizedData, { merge: true })
      }

      // Phase 2: Delete privacy settings and consent
      await db.collection("privacySettings").doc(request.userId).delete()

      // Keep consent record for compliance but anonymize
      const consentDoc = await db.collection("userConsents").doc(request.userId).get()
      if (consentDoc.exists) {
        await db.collection("userConsents").doc(request.userId).update({
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Phase 3: Handle projects (reassign or anonymize contributions)
      const projectsSnapshot = await db.collection("projects")
        .where("members", "array-contains", request.userId)
        .get()

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data()

        // Remove from members array
        const updatedMembers = projectData.members.filter((id: string) => id !== request.userId)

        await db.collection("projects").doc(projectDoc.id).update({
          members: updatedMembers,
          [`memberDeletions.${request.userId}`]: {
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedName: request.userName
          }
        })
      }

      // Phase 4: Handle tasks (reassign or delete)
      const tasksSnapshot = await db.collection("tasks")
        .where("assignedTo", "==", request.userId)
        .get()

      for (const taskDoc of tasksSnapshot.docs) {
        // If task is incomplete, unassign. If completed, anonymize.
        const taskData = taskDoc.data()
        if (taskData.status === "completed") {
          await db.collection("tasks").doc(taskDoc.id).update({
            assignedTo: `[DELETED_USER_${request.userId}]`,
            assignedToName: "[DELETED USER]"
          })
        } else {
          await db.collection("tasks").doc(taskDoc.id).update({
            assignedTo: null,
            assignedToName: null,
            notes: `Original assignee deleted account on ${new Date().toISOString()}`
          })
        }
      }

      // Phase 5: Handle orders
      const ordersSnapshot = await db.collection("orders")
        .where("orderedBy", "==", request.userId)
        .get()

      for (const orderDoc of ordersSnapshot.docs) {
        // Anonymize but keep for financial audit trail
        await db.collection("orders").doc(orderDoc.id).update({
          orderedBy: `[DELETED_USER_${request.userId}]`,
          orderedByName: "[DELETED USER]",
          orderedByEmail: null,
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Phase 6: Handle ELN data
      if (request.deleteAllData) {
        // Delete ELN experiments
        const elnExperimentsSnapshot = await db.collection("elnExperiments")
          .where("createdBy", "==", request.userId)
          .get()

        const batch1 = db.batch()
        elnExperimentsSnapshot.docs.forEach(doc => {
          batch1.delete(doc.ref)
        })
        await batch1.commit()

        // Delete ELN protocols
        const elnProtocolsSnapshot = await db.collection("elnProtocols")
          .where("createdBy", "==", request.userId)
          .get()

        const batch2 = db.batch()
        elnProtocolsSnapshot.docs.forEach(doc => {
          batch2.delete(doc.ref)
        })
        await batch2.commit()

        // Delete ELN items
        const elnItemsSnapshot = await db.collection("elnItems")
          .where("createdBy", "==", request.userId)
          .get()

        const batch3 = db.batch()
        elnItemsSnapshot.docs.forEach(doc => {
          batch3.delete(doc.ref)
        })
        await batch3.commit()
      } else {
        // Anonymize but retain for research integrity
        const elnCollections = ["elnExperiments", "elnProtocols", "elnItems"]
        for (const collectionName of elnCollections) {
          const snapshot = await db.collection(collectionName)
            .where("createdBy", "==", request.userId)
            .get()

          for (const doc of snapshot.docs) {
            await db.collection(collectionName).doc(doc.id).update({
              createdBy: `[DELETED_USER_${request.userId}]`,
              createdByName: "[DELETED USER]",
              userDeleted: true,
              deletedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }
        }
      }

      // Phase 7: Handle funding allocations
      const allocationsSnapshot = await db.collection("fundingAllocations")
        .where("personId", "==", request.userId)
        .get()

      for (const allocationDoc of allocationsSnapshot.docs) {
        await db.collection("fundingAllocations").doc(allocationDoc.id).update({
          personId: `[DELETED_USER_${request.userId}]`,
          personName: "[DELETED USER]",
          status: "archived",
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Phase 8: Anonymize funding transactions (keep for audit)
      const transactionsSnapshot = await db.collection("fundingTransactions")
        .where("createdBy", "==", request.userId)
        .get()

      for (const transactionDoc of transactionsSnapshot.docs) {
        await db.collection("fundingTransactions").doc(transactionDoc.id).update({
          createdBy: `[DELETED_USER_${request.userId}]`,
          createdByName: "[DELETED USER]",
          userDeleted: true
        })
      }

      // Phase 9: Delete uploaded files from Storage
      if (request.deleteAllData) {
        const storage = admin.storage()
        const bucket = storage.bucket()

        try {
          const [files] = await bucket.getFiles({ prefix: `users/${request.userId}/` })
          for (const file of files) {
            await file.delete()
          }
          functions.logger.info(`Deleted ${files.length} files for user ${request.userId}`)
        } catch (storageError) {
          functions.logger.error("Error deleting files from storage", storageError)
        }
      }

      // Phase 10: Anonymize audit logs (keep for compliance)
      const auditLogsSnapshot = await db.collection("auditLogs")
        .where("userId", "==", request.userId)
        .get()

      for (const logDoc of auditLogsSnapshot.docs) {
        await db.collection("auditLogs").doc(logDoc.id).update({
          userId: `[DELETED_USER_${request.userId}]`,
          userEmail: null,
          userName: "[DELETED USER]",
          userDeleted: true
        })
      }

      // Phase 11: Delete special category data markers
      const specialDataSnapshot = await db.collection("specialCategoryDataMarkers")
        .where("acknowledgedBy", "==", request.userId)
        .get()

      const batch4 = db.batch()
      specialDataSnapshot.docs.forEach(doc => {
        batch4.delete(doc.ref)
      })
      await batch4.commit()

      // Phase 12: Delete Firebase Authentication account
      try {
        await auth.deleteUser(request.userId)
        functions.logger.info(`Deleted Firebase Auth account for user ${request.userId}`)
      } catch (authError) {
        functions.logger.error("Error deleting Firebase Auth account", authError)
        // Continue even if auth deletion fails
      }

      // Phase 13: Create final audit log entry
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
          retentionExpiresAt: request.retentionExpiresAt
        },
        gdprCompliance: "Article 17 - Right to Erasure"
      })

      // Update deletion request status
      await db.collection("accountDeletionRequests").doc(requestId).update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      functions.logger.info(`Account deletion completed for user ${request.userId}`)

    } catch (error) {
      functions.logger.error(`Account deletion failed for user ${request.userId}`, {
        requestId,
        error
      })

      await db.collection("accountDeletionRequests").doc(requestId).update({
        status: "failed",
        errorMessage: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })
```

### Testing Requirements

1. **Unit Tests:**
   - Test user profile anonymization
   - Test project membership removal
   - Test task reassignment logic
   - Test ELN data deletion vs anonymization
   - Test funding allocation archival

2. **Integration Tests:**
   - Test complete deletion flow with test user
   - Test partial deletion (anonymize research data)
   - Test deletion with active projects
   - Test deletion with pending orders
   - Verify audit logs retained

3. **Security Tests:**
   - Verify only user can delete their own account
   - Verify admin override capabilities
   - Test compliance retention (12 months)
   - Verify financial audit trail preserved

### Compliance Requirements

✅ **GDPR Article 17:** Complete erasure of personal data
✅ **Research Integrity:** Option to anonymize research contributions
✅ **Financial Compliance:** Audit trail preserved for legal requirements
✅ **Data Minimization:** Only essential audit data retained

---

## 2.3 Data Retention Automation

**Purpose:** Automated cleanup of expired data per GDPR Article 5 (Storage Limitation) and data retention policies defined in Phase 1.

### Technical Specification

**Function Name:** `enforceDataRetention`
**Trigger:** Pub/Sub scheduled (daily at 2:00 AM UTC)
**Runtime:** Node.js 18+
**Timeout:** 540 seconds
**Memory:** 1GB

### Retention Policies (from lib/constants.ts)

```typescript
export const DATA_RETENTION_PERIODS = {
  AUDIT_LOGS: 365,              // 12 months
  DELETED_USER_AUDIT: 365,       // 12 months minimal audit trail
  EXPERIMENT_LOGS: 2555,         // 7 years for research standards
  PROJECT_METADATA: 730,         // 24 months
  CONSENT_RECORDS: 2555,         // 7 years to demonstrate compliance
  DATA_EXPORT_DOWNLOADS: 7,      // Download links expire after 7 days
} as const
```

### Implementation Details

```typescript
// firebase/functions/src/retention.ts

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

export const enforceDataRetention = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every day 02:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    const db = admin.firestore()
    const storage = admin.storage()
    const now = admin.firestore.Timestamp.now()

    let deletedCount = 0

    try {
      functions.logger.info("Starting data retention enforcement")

      // 1. Delete expired data export download links (7 days)
      const expiredExportsSnapshot = await db.collection("dataExportRequests")
        .where("status", "==", "completed")
        .where("expiresAt", "<=", new Date(now.toMillis() - 7 * 24 * 60 * 60 * 1000).toISOString())
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

      functions.logger.info(`Deleted ${deletedCount} expired data exports`)

      // 2. Delete old audit logs (12 months retention)
      const auditLogCutoff = new Date(now.toMillis() - 365 * 24 * 60 * 60 * 1000)
      const oldAuditLogsSnapshot = await db.collection("auditLogs")
        .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(auditLogCutoff))
        .where("userDeleted", "!=", true) // Keep deleted user audit logs
        .limit(500) // Process in batches
        .get()

      const auditBatch = db.batch()
      oldAuditLogsSnapshot.docs.forEach(doc => {
        auditBatch.delete(doc.ref)
      })
      await auditBatch.commit()

      functions.logger.info(`Deleted ${oldAuditLogsSnapshot.size} old audit logs`)
      deletedCount += oldAuditLogsSnapshot.size

      // 3. Delete audit logs for deleted users (12 months retention)
      const deletedUserAuditCutoff = new Date(now.toMillis() - 365 * 24 * 60 * 60 * 1000)
      const deletedUserAuditSnapshot = await db.collection("auditLogs")
        .where("userDeleted", "==", true)
        .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(deletedUserAuditCutoff))
        .limit(500)
        .get()

      const deletedUserBatch = db.batch()
      deletedUserAuditSnapshot.docs.forEach(doc => {
        deletedUserBatch.delete(doc.ref)
      })
      await deletedUserBatch.commit()

      functions.logger.info(`Deleted ${deletedUserAuditSnapshot.size} deleted user audit logs`)
      deletedCount += deletedUserAuditSnapshot.size

      // 4. Archive old consent records (keep for 7 years, then delete)
      const consentCutoff = new Date(now.toMillis() - 2555 * 24 * 60 * 60 * 1000)
      const oldConsentsSnapshot = await db.collection("userConsents")
        .where("consentGivenAt", "<=", consentCutoff.toISOString())
        .limit(100)
        .get()

      for (const doc of oldConsentsSnapshot.docs) {
        // Archive to cold storage collection before deletion
        await db.collection("archivedConsents").doc(doc.id).set({
          ...doc.data(),
          archivedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        await doc.ref.delete()
        deletedCount++
      }

      functions.logger.info(`Archived ${oldConsentsSnapshot.size} old consent records`)

      // 5. Delete completed deletion requests after 30 days
      const deletionRequestCutoff = new Date(now.toMillis() - 30 * 24 * 60 * 60 * 1000)
      const oldDeletionRequestsSnapshot = await db.collection("accountDeletionRequests")
        .where("status", "==", "completed")
        .where("completedAt", "<=", admin.firestore.Timestamp.fromDate(deletionRequestCutoff))
        .limit(100)
        .get()

      const deletionBatch = db.batch()
      oldDeletionRequestsSnapshot.docs.forEach(doc => {
        deletionBatch.delete(doc.ref)
      })
      await deletionBatch.commit()

      functions.logger.info(`Deleted ${oldDeletionRequestsSnapshot.size} old deletion requests`)
      deletedCount += oldDeletionRequestsSnapshot.size

      // 6. Delete anonymized user profiles after retention period expires
      const usersSnapshot = await db.collection("users")
        .where("deleted", "==", true)
        .where("retentionExpiresAt", "<=", new Date().toISOString())
        .limit(50)
        .get()

      for (const doc of usersSnapshot.docs) {
        await doc.ref.delete()
        deletedCount++
      }

      functions.logger.info(`Deleted ${usersSnapshot.size} expired anonymized user profiles`)

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
            expiredUserProfiles: usersSnapshot.size
          }
        },
        gdprCompliance: "Article 5 - Storage Limitation"
      })

      functions.logger.info(`Data retention enforcement completed. Total deleted: ${deletedCount}`)

    } catch (error) {
      functions.logger.error("Data retention enforcement failed", error)
      throw error
    }
  })

function extractFileNameFromUrl(url: string): string {
  // Extract file path from signed URL
  const match = url.match(/exports\/[^?]+/)
  return match ? match[0] : ""
}
```

### Deployment Configuration

```json
// firebase.json (add to functions section)
{
  "functions": {
    "source": "firebase/functions",
    "runtime": "nodejs18",
    "schedule": {
      "enforceDataRetention": "every day 02:00"
    }
  }
}
```

### Testing Requirements

1. **Unit Tests:**
   - Test retention period calculations
   - Test batch deletion logic
   - Test archive before delete
   - Test file deletion from Storage

2. **Integration Tests:**
   - Test with data at various ages
   - Test incremental processing (pagination)
   - Test error recovery
   - Monitor performance with large datasets

3. **Compliance Tests:**
   - Verify 7-day export expiration
   - Verify 12-month audit log retention
   - Verify 7-year consent retention
   - Verify compliance with legal holds

### Monitoring & Alerts

- [ ] Set up Cloud Monitoring dashboard for retention metrics
- [ ] Alert on function failures
- [ ] Alert on high deletion counts (>1000/day)
- [ ] Weekly report of retention statistics

---

## 2.4 Audit Log System

**Purpose:** Comprehensive audit logging for GDPR Article 30 (Records of Processing Activities) and security monitoring.

### Implementation Details

```typescript
// firebase/functions/src/audit.ts

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

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
  | "PRIVACY_SETTINGS_UPDATED"
  | "DATA_EXPORT_REQUESTED"
  | "DATA_EXPORT_DOWNLOADED"
  | "ACCOUNT_DELETION_REQUESTED"
  | "SPECIAL_CATEGORY_DATA_MARKED"
  | "FUNDING_ALLOCATION_CREATED"
  | "FUNDING_ALLOCATION_UPDATED"
  | "FUNDING_TRANSACTION_CREATED"
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "PROJECT_CREATED"
  | "PROJECT_MEMBER_ADDED"
  | "PROJECT_MEMBER_REMOVED"
  | "ELN_EXPERIMENT_CREATED"
  | "ELN_EXPERIMENT_UPDATED"
  | "FILE_UPLOADED"
  | "FILE_DOWNLOADED"
  | "FILE_DELETED"
  | "DATA_RETENTION_ENFORCED"

// Callable function to log audit events from client
export const logAuditEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in")
  }

  const db = admin.firestore()

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
    gdprCompliance: data.gdprCompliance
  }

  await db.collection("auditLogs").add(auditEntry)

  return { success: true }
})
```

---

# Phase 3: Funding System UI

## Overview
Phase 3 focuses on building the user-facing components for the enhanced funding system, integrating budget management into existing workflows, and providing visibility into spending.

**Estimated Time:** 4-5 days
**Dependencies:** Phase 1 complete, funding types defined
**Files to Create:** Multiple React components in `components/views/` and `components/funding/`

---

## 3.1 Funding Admin Dashboard

**Purpose:** Central management interface for PIs and Finance Admins to create, monitor, and manage funding allocations across people and projects.

### Component Specification

**File:** `components/views/FundingAdmin.tsx`
**Access Control:** PI, Finance Admin, Lab Manager roles only
**Features:**
- View all funding accounts and allocations
- Create new person and project allocations
- Monitor budget utilization across lab
- View low balance warnings
- Review funding transaction history
- Export financial reports

### Implementation Details

```typescript
// components/views/FundingAdmin.tsx

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import {
  FundingAccount,
  FundingAllocation,
  FundingTransaction,
  UserRole
} from "@/lib/types"
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  getLowBalanceWarningLevel,
  FUNDING_WARNING_THRESHOLDS
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, DollarSign, Users, Briefcase, TrendingDown, Plus, Download } from "lucide-react"

export function FundingAdmin() {
  const { currentUser, currentUserProfile } = useAuth()
  const [fundingAccounts, setFundingAccounts] = useState<FundingAccount[]>([])
  const [allocations, setAllocations] = useState<FundingAllocation[]>([])
  const [transactions, setTransactions] = useState<FundingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showCreateAllocation, setShowCreateAllocation] = useState(false)

  // Check authorization
  const isAuthorized = currentUserProfile?.userRole === UserRole.PI ||
                       currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
                       currentUserProfile?.userRole === UserRole.LAB_MANAGER

  useEffect(() => {
    if (!isAuthorized) return
    loadFundingData()
  }, [currentUserProfile, isAuthorized])

  const loadFundingData = async () => {
    setLoading(true)
    try {
      const labId = currentUserProfile?.labId

      // Load funding accounts
      const accountsSnapshot = await getDocs(
        query(collection(db, "fundingAccounts"), where("labId", "==", labId))
      )
      const accounts = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FundingAccount[]
      setFundingAccounts(accounts)

      // Load all allocations for lab
      const allocationsSnapshot = await getDocs(
        query(collection(db, "fundingAllocations"), where("labId", "==", labId))
      )
      const allocs = allocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FundingAllocation[]
      setAllocations(allocs)

      // Load recent transactions (last 100)
      const transactionsSnapshot = await getDocs(
        query(
          collection(db, "fundingTransactions"),
          where("labId", "==", labId),
          orderBy("createdAt", "desc"),
          limit(100)
        )
      )
      const trans = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FundingTransaction[]
      setTransactions(trans)

    } catch (error) {
      console.error("Error loading funding data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only PIs, Finance Admins, and Lab Managers can access the Funding Admin dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return <div className="p-8">Loading funding data...</div>
  }

  // Calculate summary statistics
  const totalBudget = allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0)
  const totalSpent = allocations.reduce((sum, a) => sum + a.currentSpent, 0)
  const totalCommitted = allocations.reduce((sum, a) => sum + a.currentCommitted, 0)
  const totalRemaining = allocations.reduce((sum, a) => sum + (a.remainingBudget || 0), 0)

  const criticalAllocations = allocations.filter(a => {
    const percentSpent = ((a.currentSpent + a.currentCommitted) / (a.allocatedAmount || 1)) * 100
    return percentSpent >= FUNDING_WARNING_THRESHOLDS.CRITICAL
  })

  const personAllocations = allocations.filter(a => a.type === "PERSON")
  const projectAllocations = allocations.filter(a => a.type === "PROJECT")

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Funding Administration</h1>
          <p className="text-muted-foreground">Manage lab budget allocations and monitor spending</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateAllocation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Allocation
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Across {allocations.length} allocations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">
              Pending transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">
              Available to spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {criticalAllocations.length > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Budget Alerts ({criticalAllocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAllocations.map(allocation => {
                const percentSpent = ((allocation.currentSpent + allocation.currentCommitted) /
                                     (allocation.allocatedAmount || 1)) * 100
                return (
                  <div key={allocation.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <div>
                      <p className="font-medium">{allocation.type === "PERSON" ? "Person" : "Project"} Allocation</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(allocation.currentSpent + allocation.currentCommitted)} /
                        {formatCurrency(allocation.allocatedAmount || 0)}
                      </p>
                    </div>
                    <Badge variant="destructive">{percentSpent.toFixed(0)}% Used</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="people">
            <Users className="h-4 w-4 mr-2" />
            People ({personAllocations.length})
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Briefcase className="h-4 w-4 mr-2" />
            Projects ({projectAllocations.length})
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="accounts">Funding Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AllocationOverview
            allocations={allocations}
            transactions={transactions}
          />
        </TabsContent>

        <TabsContent value="people">
          <PersonAllocationsTable
            allocations={personAllocations}
            onEdit={(id) => console.log("Edit", id)}
          />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectAllocationsTable
            allocations={projectAllocations}
            onEdit={(id) => console.log("Edit", id)}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTable transactions={transactions} />
        </TabsContent>

        <TabsContent value="accounts">
          <FundingAccountsTable accounts={fundingAccounts} />
        </TabsContent>
      </Tabs>

      {/* Create Allocation Dialog */}
      {showCreateAllocation && (
        <CreateAllocationDialog
          fundingAccounts={fundingAccounts}
          onClose={() => setShowCreateAllocation(false)}
          onCreated={() => {
            setShowCreateAllocation(false)
            loadFundingData()
          }}
        />
      )}
    </div>
  )
}

// Sub-components...
function AllocationOverview({ allocations, transactions }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart and summary */}
        <p>Allocation overview charts and visualizations</p>
      </CardContent>
    </Card>
  )
}

function PersonAllocationsTable({ allocations, onEdit }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Budget Allocations</CardTitle>
        <CardDescription>Individual researcher funding allocations</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Person</th>
              <th className="text-left p-2">Funding Account</th>
              <th className="text-right p-2">Allocated</th>
              <th className="text-right p-2">Spent</th>
              <th className="text-right p-2">Committed</th>
              <th className="text-right p-2">Remaining</th>
              <th className="text-center p-2">Status</th>
              <th className="text-center p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation: FundingAllocation) => {
              const percentUsed = ((allocation.currentSpent + allocation.currentCommitted) /
                                  (allocation.allocatedAmount || 1)) * 100
              const warningLevel = getLowBalanceWarningLevel(percentUsed)

              return (
                <tr key={allocation.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{allocation.personName || allocation.personId}</td>
                  <td className="p-2">{allocation.fundingAccountName}</td>
                  <td className="text-right p-2">{formatCurrency(allocation.allocatedAmount || 0, allocation.currency)}</td>
                  <td className="text-right p-2">{formatCurrency(allocation.currentSpent, allocation.currency)}</td>
                  <td className="text-right p-2">{formatCurrency(allocation.currentCommitted, allocation.currency)}</td>
                  <td className="text-right p-2">{formatCurrency(allocation.remainingBudget || 0, allocation.currency)}</td>
                  <td className="text-center p-2">
                    <Badge variant={
                      warningLevel === "critical" ? "destructive" :
                      warningLevel === "high" ? "warning" :
                      warningLevel === "medium" ? "secondary" :
                      "default"
                    }>
                      {allocation.status}
                    </Badge>
                  </td>
                  <td className="text-center p-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(allocation.id)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function ProjectAllocationsTable({ allocations, onEdit }: any) {
  // Similar to PersonAllocationsTable but for projects
  return <div>Project allocations table...</div>
}

function TransactionsTable({ transactions }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Funding transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-center p-2">Status</th>
              <th className="text-left p-2">Created By</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction: FundingTransaction) => (
              <tr key={transaction.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                <td className="p-2">{transaction.type}</td>
                <td className="p-2">{transaction.description}</td>
                <td className="text-right p-2">{formatCurrency(transaction.amount, transaction.currency)}</td>
                <td className="text-center p-2">
                  <Badge variant={transaction.status === "FINAL" ? "default" : "secondary"}>
                    {transaction.status}
                  </Badge>
                </td>
                <td className="p-2">{transaction.createdByName || transaction.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function FundingAccountsTable({ accounts }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funding Accounts</CardTitle>
        <CardDescription>Available funding sources</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Funding accounts list */}
      </CardContent>
    </Card>
  )
}

function CreateAllocationDialog({ fundingAccounts, onClose, onCreated }: any) {
  // Dialog for creating new allocations
  return <div>Create allocation dialog...</div>
}
```

### Testing Requirements

1. **Authorization Tests:**
   - Test PI access
   - Test Finance Admin access
   - Block Researcher access
   - Test Lab Manager access

2. **Functional Tests:**
   - Create person allocation
   - Create project allocation
   - Update allocation limits
   - Archive allocation
   - View transaction history

3. **UI Tests:**
   - Low balance warnings display correctly
   - Budget calculations accurate
   - Currency formatting correct
   - Export functionality works

---

## 3.2 Order Integration

**Purpose:** Integrate funding allocation selection into the order creation workflow, enforce budget limits, and create funding transactions automatically.

### Component Modifications

**Files to Modify:**
- `components/views/Orders.tsx` - Add allocation selection
- `components/OrderDialog.tsx` - Add budget enforcement
- Backend logic - Auto-create funding transactions

### Implementation Details

```typescript
// components/OrderDialog.tsx (additions)

import { FundingAllocation } from "@/lib/types"
import { formatCurrency } from "@/lib/constants"

interface OrderDialogProps {
  // ... existing props
  userAllocations?: FundingAllocation[]
}

export function OrderDialog({ userAllocations, ...props }: OrderDialogProps) {
  const [selectedAllocation, setSelectedAllocation] = useState<string>("")
  const [orderTotal, setOrderTotal] = useState(0)
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null)

  // Check budget when allocation or total changes
  useEffect(() => {
    if (!selectedAllocation || !orderTotal) return

    const allocation = userAllocations?.find(a => a.id === selectedAllocation)
    if (!allocation) return

    const availableBudget = allocation.remainingBudget || 0

    if (orderTotal > availableBudget) {
      setBudgetWarning(
        `Order total (${formatCurrency(orderTotal)}) exceeds available budget (${formatCurrency(availableBudget)})`
      )
    } else if (allocation.softLimit && orderTotal > allocation.softLimit) {
      setBudgetWarning(
        `Order total exceeds soft limit (${formatCurrency(allocation.softLimit)}). Approval may be required.`
      )
    } else {
      setBudgetWarning(null)
    }
  }, [selectedAllocation, orderTotal, userAllocations])

  const handleCreateOrder = async () => {
    // Validate budget
    if (budgetWarning && !confirm("Budget warning: " + budgetWarning + ". Continue?")) {
      return
    }

    // Create order
    const orderId = await createOrder({
      // ... order details
      allocationId: selectedAllocation,
      estimatedCost: orderTotal
    })

    // Create funding transaction (ORDER_COMMIT)
    await createFundingTransaction({
      fundingAccountId: allocation.fundingAccountId,
      allocationId: selectedAllocation,
      orderId,
      amount: orderTotal,
      currency: allocation.currency,
      type: "ORDER_COMMIT",
      status: "PENDING",
      description: `Order commitment: ${orderDescription}`,
      createdBy: currentUser.uid,
      createdByName: currentUser.fullName,
      labId: currentUserProfile.labId
    })

    // Update allocation currentCommitted
    await updateAllocationCommitted(selectedAllocation, orderTotal)

    onCreated()
  }

  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        {/* ... existing order fields ... */}

        {/* Funding Allocation Section */}
        <div className="space-y-2">
          <Label>Funding Source *</Label>
          <Select value={selectedAllocation} onValueChange={setSelectedAllocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select funding allocation" />
            </SelectTrigger>
            <SelectContent>
              {userAllocations?.map(allocation => (
                <SelectItem key={allocation.id} value={allocation.id}>
                  {allocation.fundingAccountName} - {formatCurrency(allocation.remainingBudget || 0)} remaining
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Budget Warning */}
          {budgetWarning && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{budgetWarning}</AlertDescription>
            </Alert>
          )}

          {/* Allocation Details */}
          {selectedAllocation && (
            <Card className="mt-2">
              <CardContent className="pt-4">
                <AllocationBudgetSummary
                  allocation={userAllocations?.find(a => a.id === selectedAllocation)!}
                  proposedAmount={orderTotal}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreateOrder} disabled={!selectedAllocation || !!budgetWarning}>
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AllocationBudgetSummary({ allocation, proposedAmount }: any) {
  const newCommitted = allocation.currentCommitted + proposedAmount
  const newRemaining = (allocation.allocatedAmount || 0) - allocation.currentSpent - newCommitted

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Allocated Budget:</span>
        <span className="font-medium">{formatCurrency(allocation.allocatedAmount || 0)}</span>
      </div>
      <div className="flex justify-between">
        <span>Currently Spent:</span>
        <span>{formatCurrency(allocation.currentSpent)}</span>
      </div>
      <div className="flex justify-between">
        <span>Currently Committed:</span>
        <span>{formatCurrency(allocation.currentCommitted)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-orange-600">New Commitment:</span>
        <span className="font-medium text-orange-600">+{formatCurrency(proposedAmount)}</span>
      </div>
      <div className="border-t pt-2 flex justify-between">
        <span className="font-medium">Remaining After Order:</span>
        <span className={`font-bold ${newRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(newRemaining)}
        </span>
      </div>
    </div>
  )
}
```

### Backend Transaction Handling

```typescript
// Cloud Function to update transaction status when order is received

export const onOrderStatusChange = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    // Order marked as received
    if (before.status !== "received" && after.status === "received") {
      const orderId = context.params.orderId

      // Find PENDING transaction for this order
      const transactionsSnapshot = await db.collection("fundingTransactions")
        .where("orderId", "==", orderId)
        .where("type", "==", "ORDER_COMMIT")
        .where("status", "==", "PENDING")
        .get()

      if (transactionsSnapshot.empty) {
        functions.logger.warn(`No pending transaction found for order ${orderId}`)
        return
      }

      const transactionDoc = transactionsSnapshot.docs[0]
      const transaction = transactionDoc.data() as FundingTransaction

      // Create new FINAL transaction (ORDER_RECEIVED)
      await db.collection("fundingTransactions").add({
        fundingAccountId: transaction.fundingAccountId,
        allocationId: transaction.allocationId,
        orderId,
        amount: after.actualCost || transaction.amount,
        currency: transaction.currency,
        type: "ORDER_RECEIVED",
        status: "FINAL",
        description: `Order received: ${after.orderDescription || ""}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: transaction.createdBy,
        createdByName: transaction.createdByName,
        labId: transaction.labId,
        finalizedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Update original PENDING transaction to FINAL
      await transactionDoc.ref.update({
        status: "FINAL",
        finalizedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Update allocation: move from committed to spent
      const allocationRef = db.collection("fundingAllocations").doc(transaction.allocationId)
      const allocation = (await allocationRef.get()).data() as FundingAllocation

      await allocationRef.update({
        currentCommitted: allocation.currentCommitted - transaction.amount,
        currentSpent: allocation.currentSpent + (after.actualCost || transaction.amount),
        remainingBudget: (allocation.allocatedAmount || 0) -
                        (allocation.currentSpent + (after.actualCost || transaction.amount)) -
                        (allocation.currentCommitted - transaction.amount),
        lastTransactionAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Check if allocation is exhausted
      const newRemaining = (allocation.allocatedAmount || 0) -
                          (allocation.currentSpent + (after.actualCost || transaction.amount))
      if (newRemaining <= 0) {
        await allocationRef.update({ status: "exhausted" })
      }

      functions.logger.info(`Updated funding for order ${orderId}`)
    }

    // Order cancelled
    if (before.status !== "cancelled" && after.status === "cancelled") {
      // Release committed funds
      // Similar logic to reverse the commitment
    }
  })
```

---

## 3.3 Personal Ledger View

**Purpose:** Allow researchers to view their personal funding allocations, spending history, and remaining budget.

### Component Specification

**File:** `components/PersonalLedger.tsx`
**Integration:** Add to People page / User profile
**Access:** User can view their own ledger

### Implementation Details

```typescript
// components/PersonalLedger.tsx

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { FundingAllocation, FundingTransaction } from "@/lib/types"
import { formatCurrency, getLowBalanceWarningLevel } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingDown, Clock, AlertCircle } from "lucide-react"

export function PersonalLedger() {
  const { currentUser, currentUserProfile } = useAuth()
  const [allocations, setAllocations] = useState<FundingAllocation[]>([])
  const [transactions, setTransactions] = useState<FundingTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPersonalFunding()
  }, [currentUser])

  const loadPersonalFunding = async () => {
    setLoading(true)
    try {
      // Load user's allocations
      const allocationsSnapshot = await getDocs(
        query(
          collection(db, "fundingAllocations"),
          where("type", "==", "PERSON"),
          where("personId", "==", currentUser.uid),
          where("status", "in", ["active", "exhausted"])
        )
      )
      const allocs = allocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FundingAllocation[]
      setAllocations(allocs)

      // Load user's transaction history
      const allocationIds = allocs.map(a => a.id)
      if (allocationIds.length > 0) {
        const transactionsSnapshot = await getDocs(
          query(
            collection(db, "fundingTransactions"),
            where("allocationId", "in", allocationIds),
            orderBy("createdAt", "desc"),
            limit(50)
          )
        )
        const trans = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FundingTransaction[]
        setTransactions(trans)
      }

    } catch (error) {
      console.error("Error loading personal funding:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading your budget...</div>
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal Budget</CardTitle>
          <CardDescription>You currently have no funding allocations.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0)
  const totalSpent = allocations.reduce((sum, a) => sum + a.currentSpent, 0)
  const totalCommitted = allocations.reduce((sum, a) => sum + a.currentCommitted, 0)
  const totalRemaining = allocations.reduce((sum, a) => sum + (a.remainingBudget || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Budget</h2>
        <p className="text-muted-foreground">View your funding allocations and spending history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalSpent / totalAllocated) * 100).toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">Pending orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRemaining)}</div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Allocations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Funding Allocations</h3>
        {allocations.map(allocation => {
          const percentUsed = ((allocation.currentSpent + allocation.currentCommitted) /
                              (allocation.allocatedAmount || 1)) * 100
          const warningLevel = getLowBalanceWarningLevel(percentUsed)

          return (
            <Card key={allocation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{allocation.fundingAccountName}</CardTitle>
                    <CardDescription>
                      Allocated: {formatCurrency(allocation.allocatedAmount || 0, allocation.currency)}
                    </CardDescription>
                  </div>
                  <Badge variant={
                    warningLevel === "critical" ? "destructive" :
                    warningLevel === "high" ? "warning" :
                    "default"
                  }>
                    {allocation.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Usage</span>
                    <span className="font-medium">{percentUsed.toFixed(1)}%</span>
                  </div>
                  <Progress
                    value={percentUsed}
                    className={
                      warningLevel === "critical" ? "bg-red-200" :
                      warningLevel === "high" ? "bg-orange-200" :
                      "bg-green-200"
                    }
                  />
                </div>

                {/* Budget Breakdown */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Spent</p>
                    <p className="font-medium">{formatCurrency(allocation.currentSpent, allocation.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Committed</p>
                    <p className="font-medium">{formatCurrency(allocation.currentCommitted, allocation.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(allocation.remainingBudget || 0, allocation.currency)}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                {warningLevel === "critical" && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-600">Critical Budget Alert</p>
                      <p className="text-red-700">
                        You have used over 90% of your allocated budget. Please consult with your PI before placing additional orders.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest 50 funding transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-center p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                  <td className="p-2">
                    <Badge variant="outline">{transaction.type}</Badge>
                  </td>
                  <td className="p-2 text-sm">{transaction.description}</td>
                  <td className="text-right p-2 font-medium">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="text-center p-2">
                    <Badge variant={transaction.status === "FINAL" ? "default" : "secondary"}>
                      {transaction.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 3.4 Project Funding Section

**Purpose:** Display project-level funding allocations, burn rate, and budget forecasting within project pages.

### Component Specification

**File:** `components/ProjectFunding.tsx`
**Integration:** Add tab/section to Project page
**Access:** Project members can view, PI/Finance Admin can edit

### Implementation Summary

- Show all funding allocations assigned to the project
- Calculate project burn rate (spending per month)
- Forecast budget depletion date
- Show project-related orders and their funding sources
- Display budget vs actual spending charts

---

# Phase 4: Advanced Features

## Overview
Phase 4 implements advanced features that enhance the GDPR and funding systems with notifications, AI content tracking, analytics, and reporting capabilities.

**Estimated Time:** 3-4 days
**Dependencies:** Phases 1-3 complete
**Files to Create/Modify:** Notification components, AI tracking, reporting modules

---

## 4.1 AI Content Disclaimers

**Purpose:** EU AI Act compliance - track and label AI-generated content with appropriate disclaimers.

### Implementation Locations

1. **ELN Report Generation** (`components/views/ELN.tsx`)
2. **Experiment Summaries** (`components/ExperimentSummary.tsx`)
3. **Protocol Extraction** (`components/ProtocolExtractor.tsx`)

### Component Example

```typescript
// components/AIContentDisclaimer.tsx

"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Sparkles, Check, Info } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { AIGeneratedContent } from "@/lib/types"

interface AIContentDisclaimerProps {
  entityType: "eln_report" | "experiment_summary" | "task_suggestion" | "protocol_extraction"
  entityId: string
  modelName: string
  promptHash: string
  generatedContent: string
  onAccept?: () => void
}

export function AIContentDisclaimer({
  entityType,
  entityId,
  modelName,
  promptHash,
  generatedContent,
  onAccept
}: AIContentDisclaimerProps) {
  const [accepted, setAccepted] = useState(false)
  const [edited, setEdited] = useState(false)

  const recordAIGeneration = async (approved: boolean) => {
    const aiRecord: Omit<AIGeneratedContent, "id"> = {
      entityType,
      entityId,
      modelName,
      promptHash,
      generatedAt: new Date().toISOString(),
      disclaimerShown: true,
      userEdited: edited,
      userApproved: approved
    }

    await addDoc(collection(db, "aiGeneratedContent"), aiRecord)
  }

  const handleAccept = async () => {
    setAccepted(true)
    await recordAIGeneration(true)
    onAccept?.()
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Alert className="border-purple-300 bg-purple-50">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <AlertDescription className="ml-2">
          <div className="space-y-2">
            <p className="font-medium text-purple-900">
              AI-Generated Content
            </p>
            <p className="text-sm text-purple-800">
              This content was generated using artificial intelligence ({modelName}).
              In compliance with the EU AI Act, we inform you that AI-generated content may contain
              inaccuracies or biases. Please review and verify this content before use in scientific
              or regulatory contexts.
            </p>
            <div className="flex items-start gap-2 mt-3 p-3 bg-white rounded border border-purple-200">
              <Info className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="text-xs text-gray-700">
                <p className="font-medium">Required Actions:</p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Review the generated content for accuracy</li>
                  <li>Verify any scientific claims or data</li>
                  <li>Edit as needed to ensure correctness</li>
                  <li>Accept to confirm you have reviewed this content</li>
                </ul>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Generated Content */}
      <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">AI-Generated Content</span>
        </div>
        <div
          className="prose prose-sm max-w-none"
          contentEditable
          onInput={() => setEdited(true)}
          dangerouslySetInnerHTML={{ __html: generatedContent }}
        />
      </div>

      {/* Accept Button */}
      {!accepted ? (
        <Button onClick={handleAccept} className="w-full">
          <Check className="h-4 w-4 mr-2" />
          I have reviewed and accept this AI-generated content
        </Button>
      ) : (
        <Alert className="border-green-300 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2 text-green-800">
            Content accepted. {edited && "Your edits have been recorded."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

### Integration Example

```typescript
// In ELN report generation

const handleGenerateReport = async () => {
  setGenerating(true)

  // Call AI service
  const generatedReport = await callOpenAI({
    prompt: `Generate a lab report for experiment: ${experiment.title}`,
    model: "gpt-4"
  })

  // Show disclaimer
  setShowAIDisclaimer(true)
  setAIGeneratedContent(generatedReport)
  setGenerating(false)
}

return (
  <div>
    {showAIDisclaimer ? (
      <AIContentDisclaimer
        entityType="eln_report"
        entityId={experiment.id}
        modelName="gpt-4"
        promptHash={hashPrompt(prompt)}
        generatedContent={aiGeneratedContent}
        onAccept={() => {
          // Insert content into document
          insertAIContent(aiGeneratedContent)
          setShowAIDisclaimer(false)
        }}
      />
    ) : (
      <Button onClick={handleGenerateReport}>
        <Sparkles className="h-4 w-4 mr-2" />
        Generate Report with AI
      </Button>
    )}
  </div>
)
```

---

## 4.2 Funding Notifications

**Purpose:** Proactive notifications for budget alerts, low balance warnings, and funding-related events.

### Notification Types

1. **Low Balance Warnings** - Alert when allocation reaches 70%, 80%, 90% usage
2. **Budget Exhausted** - Notify when allocation is fully depleted
3. **Large Order Alert** - Notify PI when researcher creates order >€5000
4. **Allocation Created** - Notify researcher when they receive new funding allocation
5. **Transaction Finalized** - Notify when order is received and funds are deducted

### Implementation

```typescript
// firebase/functions/src/notifications.ts

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { FundingAllocation, FundingTransaction } from "./types"
import { FUNDING_WARNING_THRESHOLDS } from "./constants"

// Monitor allocation changes for low balance warnings
export const checkFundingAlertNotifications = functions.firestore
  .document("fundingAllocations/{allocationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as FundingAllocation
    const after = change.after.data() as FundingAllocation

    const percentBefore = ((before.currentSpent + before.currentCommitted) / (before.allocatedAmount || 1)) * 100
    const percentAfter = ((after.currentSpent + after.currentCommitted) / (after.allocatedAmount || 1)) * 100

    // Check if we crossed a warning threshold
    const thresholds = [
      FUNDING_WARNING_THRESHOLDS.MEDIUM,  // 70%
      FUNDING_WARNING_THRESHOLDS.HIGH,     // 80%
      FUNDING_WARNING_THRESHOLDS.CRITICAL  // 90%
    ]

    for (const threshold of thresholds) {
      if (percentBefore < threshold && percentAfter >= threshold) {
        // Crossed threshold - send notification
        await sendLowBalanceNotification(after, threshold)
      }
    }

    // Check if exhausted
    if (before.status !== "exhausted" && after.status === "exhausted") {
      await sendBudgetExhaustedNotification(after)
    }
  })

async function sendLowBalanceNotification(allocation: FundingAllocation, threshold: number) {
  const db = admin.firestore()

  // Get user profile to check notification preferences
  const userDoc = await db.collection("users").doc(allocation.personId).get()
  const user = userDoc.data()

  if (!user?.fundingAlertNotifications) {
    return // User has disabled funding notifications
  }

  const notification = {
    userId: allocation.personId,
    type: "FUNDING_LOW_BALANCE",
    title: `Budget Alert: ${threshold}% Used`,
    message: `Your ${allocation.fundingAccountName} allocation has reached ${threshold}% usage.
              Remaining budget: ${formatCurrency(allocation.remainingBudget, allocation.currency)}`,
    priority: threshold >= FUNDING_WARNING_THRESHOLDS.CRITICAL ? "high" : "medium",
    relatedEntityType: "fundingAllocation",
    relatedEntityId: allocation.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    actionUrl: `/funding/allocations/${allocation.id}`
  }

  await db.collection("notifications").add(notification)

  // Also send email if critical
  if (threshold >= FUNDING_WARNING_THRESHOLDS.CRITICAL && user.email) {
    await sendEmail({
      to: user.email,
      subject: "Critical Budget Alert - Momentum Lab",
      body: notification.message
    })
  }

  functions.logger.info(`Sent low balance notification for allocation ${allocation.id}`)
}

async function sendBudgetExhaustedNotification(allocation: FundingAllocation) {
  const db = admin.firestore()

  const notification = {
    userId: allocation.personId,
    type: "FUNDING_EXHAUSTED",
    title: "Budget Exhausted",
    message: `Your ${allocation.fundingAccountName} allocation has been fully depleted.
              Please contact your PI to request additional funding.`,
    priority: "high",
    relatedEntityType: "fundingAllocation",
    relatedEntityId: allocation.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    actionUrl: `/funding/allocations/${allocation.id}`
  }

  await db.collection("notifications").add(notification)

  // Notify PI as well
  const labDoc = await db.collection("labs").doc(allocation.labId).get()
  const lab = labDoc.data()

  if (lab?.piId) {
    const piNotification = {
      userId: lab.piId,
      type: "FUNDING_EXHAUSTED_PI",
      title: "Researcher Budget Exhausted",
      message: `${allocation.personName}'s ${allocation.fundingAccountName} allocation has been fully depleted.`,
      priority: "medium",
      relatedEntityType: "fundingAllocation",
      relatedEntityId: allocation.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/funding/admin`
    }

    await db.collection("notifications").add(piNotification)
  }
}

// Notify PI about large orders
export const notifyLargeOrder = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data()

    // Check if order exceeds threshold (€5000)
    const LARGE_ORDER_THRESHOLD = 5000

    if (order.estimatedCost >= LARGE_ORDER_THRESHOLD) {
      const db = admin.firestore()

      // Get lab PI
      const labDoc = await db.collection("labs").doc(order.labId).get()
      const lab = labDoc.data()

      if (lab?.piId) {
        const notification = {
          userId: lab.piId,
          type: "LARGE_ORDER_ALERT",
          title: "Large Order Created",
          message: `${order.orderedByName} created a ${formatCurrency(order.estimatedCost)} order: ${order.orderDescription}`,
          priority: "medium",
          relatedEntityType: "order",
          relatedEntityId: context.params.orderId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          actionUrl: `/orders/${context.params.orderId}`
        }

        await db.collection("notifications").add(notification)
      }
    }
  })

function formatCurrency(amount: number, currency: string = "EUR"): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    GBP: "£",
    USD: "$",
    CHF: "CHF"
  }
  return `${symbols[currency] || currency}${amount.toFixed(2)}`
}

async function sendEmail(params: { to: string; subject: string; body: string }) {
  // TODO: Implement email sending (SendGrid, AWS SES, etc.)
  functions.logger.info(`Email would be sent to ${params.to}`)
}
```

### In-App Notification Component

```typescript
// components/NotificationBell.tsx

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from "firebase/firestore"
import { Bell, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotificationBell() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!currentUser) return

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    })

    return () => unsubscribe()
  }, [currentUser])

  const markAsRead = async (notificationId: string) => {
    await updateDoc(doc(db, "notifications", notificationId), { read: true })
  }

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read)
    await Promise.all(unreadNotifs.map(n => markAsRead(n.id)))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl
                  }
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {notification.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">High</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.createdAt?.toDate?.()?.toRelativeTime() || "Just now"}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## 4.3 Analytics & Reporting

**Purpose:** Financial analytics and spending insights for PI and Finance Admin roles.

### Dashboard Metrics

1. **Spending Trends** - Monthly burn rate, spending by category
2. **Budget Utilization** - Allocation usage across people and projects
3. **Forecasting** - Projected budget depletion dates
4. **Order Analytics** - Top vendors, most expensive orders, order volume
5. **Funding Source Breakdown** - Spending by funding account

### Component Example

```typescript
// components/FundingAnalytics.tsx

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function FundingAnalytics({ allocations, transactions }: any) {
  // Calculate spending by month
  const spendingByMonth = transactions
    .filter((t: any) => t.type === "ORDER_RECEIVED" && t.status === "FINAL")
    .reduce((acc: any, t: any) => {
      const month = new Date(t.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      acc[month] = (acc[month] || 0) + t.amount
      return acc
    }, {})

  const monthlyData = Object.entries(spendingByMonth).map(([month, amount]) => ({
    month,
    amount
  }))

  // Calculate spending by category (person vs project)
  const spendingByType = {
    person: allocations.filter((a: any) => a.type === "PERSON").reduce((sum: number, a: any) => sum + a.currentSpent, 0),
    project: allocations.filter((a: any) => a.type === "PROJECT").reduce((sum: number, a: any) => sum + a.currentSpent, 0)
  }

  const categoryData = [
    { name: "Personal Allocations", value: spendingByType.person },
    { name: "Project Allocations", value: spendingByType.project }
  ]

  return (
    <div className="space-y-6">
      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Spending (€)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Spending by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Allocation Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" fill="#8884d8" label />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization by Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={allocations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fundingAccountName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="currentSpent" fill="#82ca9d" name="Spent" />
              <Bar dataKey="currentCommitted" fill="#ffc658" name="Committed" />
              <Bar dataKey="remainingBudget" fill="#8884d8" name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 4.4 CSV Export for Finance

**Purpose:** Generate CSV reports of funding transactions for accounting and audit purposes.

### Implementation

```typescript
// lib/exportFunding.ts

import { FundingTransaction, FundingAllocation } from "./types"
import { formatCurrency } from "./constants"

export function generateFundingCSV(transactions: FundingTransaction[]): string {
  const headers = [
    "Date",
    "Transaction ID",
    "Type",
    "Status",
    "Funding Account",
    "Allocation ID",
    "Order ID",
    "Amount",
    "Currency",
    "Description",
    "Created By",
    "Finalized Date"
  ]

  const rows = transactions.map(t => [
    new Date(t.createdAt).toLocaleDateString(),
    t.id,
    t.type,
    t.status,
    t.fundingAccountName || "",
    t.allocationId || "",
    t.orderId || "",
    t.amount.toFixed(2),
    t.currency,
    `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
    t.createdByName || t.createdBy,
    t.finalizedAt ? new Date(t.finalizedAt).toLocaleDateString() : ""
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.join(","))
    .join("\n")

  return csvContent
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Usage in FundingAdmin component
const handleExportTransactions = () => {
  const csvContent = generateFundingCSV(transactions)
  const filename = `funding-transactions-${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(csvContent, filename)
}
```

---

# Testing Strategy

## Unit Testing

### Phase 2: Cloud Functions
```bash
# Install testing dependencies
npm install --save-dev @firebase/testing jest ts-jest

# Test structure
firebase/functions/src/__tests__/
  ├── gdpr.test.ts
  ├── funding.test.ts
  ├── retention.test.ts
  └── notifications.test.ts
```

**Key Test Cases:**
- Data export collects all user data correctly
- Account deletion anonymizes vs deletes appropriately
- Retention periods enforced correctly
- Funding transactions update allocations properly

### Phase 3: UI Components
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Test structure
components/__tests__/
  ├── FundingAdmin.test.tsx
  ├── PersonalLedger.test.tsx
  ├── OrderDialog.test.tsx
  └── PrivacyDashboard.test.tsx
```

**Key Test Cases:**
- Authorization checks prevent unauthorized access
- Budget calculations are accurate
- Warning thresholds trigger correctly
- Currency formatting displays correctly

## Integration Testing

### End-to-End Workflows
1. **Complete Order Workflow:**
   - Create order with funding allocation
   - Check commitment created
   - Mark order received
   - Verify funds moved from committed to spent

2. **Data Export Workflow:**
   - Request data export
   - Verify all collections included
   - Check signed URL generation
   - Confirm 7-day expiration

3. **Account Deletion Workflow:**
   - Request deletion
   - Verify anonymization vs deletion logic
   - Check audit trail preserved
   - Confirm Firebase Auth deletion

## Security Testing

### Access Control Tests
- Verify Firestore rules block unauthorized reads
- Test role-based access (PI, Finance Admin, Researcher)
- Confirm users can only see their own data
- Test GDPR data export restrictions

### GDPR Compliance Tests
- Verify consent is recorded with version
- Test data export includes all required data
- Confirm deletion is complete and irreversible
- Check retention policies enforce correctly

---

# Deployment Plan

## Prerequisites
- [ ] Firebase project configured with Firestore, Functions, Storage
- [ ] Environment variables set (email service credentials, storage bucket)
- [ ] Dependencies installed: `npm install`
- [ ] TypeScript compilation successful: `npm run build`

## Phase 2 Deployment

```bash
# Deploy Cloud Functions
cd firebase/functions
npm install
npm run build
firebase deploy --only functions

# Verify functions deployed
firebase functions:list

# Set up Cloud Scheduler for retention (if not auto-created)
gcloud scheduler jobs create pubsub enforce-retention \
  --schedule="0 2 * * *" \
  --topic=enforce-retention \
  --message-body='{"trigger":"daily"}'
```

## Phase 3 Deployment

```bash
# Build Next.js application
npm run build

# Deploy to Firebase Hosting (or your hosting provider)
firebase deploy --only hosting

# Or deploy to Vercel
vercel deploy --prod
```

## Phase 4 Deployment

```bash
# Deploy notification functions
firebase deploy --only functions:checkFundingAlertNotifications,functions:notifyLargeOrder

# Deploy updated frontend with AI disclaimers and analytics
npm run build
firebase deploy --only hosting
```

## Post-Deployment Checklist
- [ ] Test data export function with sample user
- [ ] Test account deletion with test account
- [ ] Verify retention function runs on schedule
- [ ] Check Firestore security rules prevent unauthorized access
- [ ] Test funding allocation creation and updates
- [ ] Verify order integration creates transactions
- [ ] Test low balance notifications trigger correctly
- [ ] Confirm AI disclaimers display properly
- [ ] Test CSV export downloads correctly

---

# Timeline Estimates

## Phase 2: Backend Cloud Functions (3-4 days)

| Task | Estimated Time |
|------|----------------|
| Data Export Cloud Function | 1 day |
| Account Deletion Cloud Function | 1 day |
| Data Retention Automation | 0.5 days |
| Audit Log System | 0.5 days |
| Testing & Debugging | 1 day |

**Total: 3-4 days**

## Phase 3: Funding System UI (4-5 days)

| Task | Estimated Time |
|------|----------------|
| Funding Admin Dashboard | 1.5 days |
| Order Integration | 1 day |
| Personal Ledger View | 1 day |
| Project Funding Section | 0.5 days |
| Testing & Polish | 1 day |

**Total: 4-5 days**

## Phase 4: Advanced Features (3-4 days)

| Task | Estimated Time |
|------|----------------|
| AI Content Disclaimers | 1 day |
| Funding Notifications | 1 day |
| Analytics & Reporting | 1 day |
| CSV Export for Finance | 0.5 days |
| Testing & Integration | 0.5 days |

**Total: 3-4 days**

## Grand Total: 10-13 days

**With buffer for unexpected issues: 12-15 days (2.5-3 weeks)**

---

# Success Criteria

## Phase 2 Success Metrics
✅ Data exports generate complete user data in JSON/CSV/ZIP formats
✅ Account deletion completes in <5 minutes with full anonymization
✅ Retention function processes >100 records per run without timeout
✅ Audit logs capture all GDPR-relevant actions

## Phase 3 Success Metrics
✅ PI can create and manage funding allocations for all lab members
✅ Researchers see accurate budget remaining in order dialog
✅ Low balance warnings display at 70%, 80%, 90% thresholds
✅ Funding transactions automatically created on order lifecycle events
✅ Personal ledger displays accurate spending history

## Phase 4 Success Metrics
✅ AI-generated content shows EU AI Act compliant disclaimers
✅ Funding notifications delivered within 1 minute of trigger event
✅ Analytics charts render spending trends accurately
✅ CSV exports include all transactions with proper formatting

---

# Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cloud Function timeouts with large data exports | Medium | High | Implement pagination, streaming exports |
| Firestore query limits (10 `in` clauses) | Medium | Medium | Batch queries, use collection groups |
| Concurrent funding transactions causing race conditions | Low | High | Use Firestore transactions, optimistic locking |
| Email delivery failures | Medium | Low | Queue retries, log failures for manual follow-up |
| Large notification volumes overwhelming UI | Low | Medium | Implement pagination, mark all as read |
| AI API rate limits | Medium | Medium | Implement queuing, retry logic, fallback messages |

---

# Future Enhancements (Post-Phase 4)

1. **Advanced Forecasting**
   - Machine learning models for budget depletion prediction
   - Seasonal spending pattern analysis
   - Anomaly detection for unusual spending

2. **Multi-Lab Support**
   - Cross-lab funding transfers
   - Consolidated reporting for multi-lab PIs
   - Shared funding pools

3. **Integration with Accounting Systems**
   - QuickBooks integration
   - Xero API connection
   - Automatic invoice matching

4. **Mobile App**
   - Native iOS/Android apps
   - Push notifications for budget alerts
   - Mobile order approval workflow

5. **Enhanced GDPR Features**
   - Automated DPIA (Data Protection Impact Assessment) generation
   - GDPR compliance score dashboard
   - Data breach notification automation

---

# Appendix

## Useful Commands

```bash
# Firebase
firebase deploy --only functions:processDataExportRequest
firebase deploy --only firestore:rules
firebase functions:log --only processDataExportRequest

# Next.js
npm run dev
npm run build
npm run lint

# Testing
npm test
npm run test:watch
npm run test:coverage

# Database
firebase firestore:indexes
firebase firestore:delete --all-collections (DANGER!)
```

## Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `lib/types.ts` | GDPR and funding type definitions | 648 |
| `firestore.rules` | Security rules for all collections | 226 |
| `components/CookieConsentBanner.tsx` | ePrivacy compliance | 381 |
| `components/views/PrivacyDashboard.tsx` | GDPR user rights UI | 915 |
| `lib/constants.ts` | EUR defaults, thresholds, helpers | 195 |
| `firebase/functions/src/gdpr.ts` | Export & deletion functions | ~800 (planned) |
| `firebase/functions/src/funding.ts` | Transaction automation | ~400 (planned) |
| `components/views/FundingAdmin.tsx` | Admin dashboard | ~800 (planned) |

---

## Contact & Support

For questions about this implementation plan:
- Technical lead: [Your Name]
- Project manager: [PM Name]
- GDPR compliance officer: [DPO Name]

**Document Version:** 1.0
**Last Updated:** November 14, 2025
**Status:** Ready for Implementation
