/**
 * One-time migration to fix Secret Manager permissions for calendar tokens
 * This grants the Cloud Functions service account access to existing calendar token secrets
 */

import * as functions from "firebase-functions/v1"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"

const secretManager = new SecretManagerServiceClient()

/**
 * Fix permissions on all calendar token secrets
 * Call this once to grant access to existing secrets
 */
export const fixCalendarTokenPermissions = functions.https.onCall(async (data: any, context: any) => {
  // Require authentication and admin
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated")
  }

  try {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
    if (!projectId) {
      throw new functions.https.HttpsError("internal", "Project ID not found")
    }

    const parent = `projects/${projectId}`
    const serviceAccount = `${projectId}@appspot.gserviceaccount.com`

    // List all secrets with the calendar-oauth-token label
    const [secrets] = await secretManager.listSecrets({
      parent,
      filter: 'labels.type="calendar-oauth-token"',
    })

    console.log(`Found ${secrets.length} calendar token secrets`)

    let fixed = 0
    let errors = 0

    for (const secret of secrets) {
      if (!secret.name) continue

      try {
        // Grant access to the service account
        await secretManager.setIamPolicy({
          resource: secret.name,
          policy: {
            bindings: [
              {
                role: "roles/secretmanager.secretAccessor",
                members: [`serviceAccount:${serviceAccount}`],
              },
            ],
          },
        })

        console.log(`Granted access to ${secret.name}`)
        fixed++
      } catch (error) {
        console.error(`Failed to grant access to ${secret.name}:`, error)
        errors++
      }
    }

    return {
      success: true,
      message: `Fixed ${fixed} secrets, ${errors} errors`,
      totalSecrets: secrets.length,
      fixed,
      errors,
    }
  } catch (error) {
    console.error("Error fixing calendar token permissions:", error)
    throw new functions.https.HttpsError("internal", "Failed to fix permissions")
  }
})
