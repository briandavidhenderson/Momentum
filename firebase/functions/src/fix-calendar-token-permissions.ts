/**
 * One-time migration to fix Secret Manager permissions for calendar tokens
 * This grants the Cloud Functions service account access to existing calendar token secrets
 *
 * Usage:
 * 1. Via Cloud Console: Go to Functions > fixCalendarTokenPermissions > Testing
 * 2. Via curl: curl -X POST https://us-central1-momentum-a60c5.cloudfunctions.net/fixCalendarTokenPermissions
 * 3. Via Firebase emulator: firebase functions:shell then run fixCalendarTokenPermissions()
 */

import * as functions from "firebase-functions/v1"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"

const secretManager = new SecretManagerServiceClient()

/**
 * Fix permissions on all calendar token secrets
 * Callable function - requires authentication
 */
export const fixCalendarTokenPermissions = functions.https.onCall(async (data: any, context: any) => {
  // Require authentication (not necessarily admin, since user needs to fix their own tokens)
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated")
  }

  console.log({
    action: "FIX_PERMISSIONS_STARTED",
    userId: context.auth.uid,
    timestamp: new Date().toISOString(),
  })

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

    const result = {
      success: true,
      message: `Fixed ${fixed} secrets, ${errors} errors`,
      totalSecrets: secrets.length,
      fixed,
      errors,
    }

    console.log({
      action: "FIX_PERMISSIONS_COMPLETED",
      userId: context.auth.uid,
      result,
      timestamp: new Date().toISOString(),
    })

    return result
  } catch (error) {
    console.error("Error fixing calendar token permissions:", error)
    throw new functions.https.HttpsError("internal", "Failed to fix permissions")
  }
})

/**
 * HTTP endpoint version (for testing/admin use)
 * Call via: curl https://us-central1-momentum-a60c5.cloudfunctions.net/fixCalendarTokenPermissionsHTTP
 */
export const fixCalendarTokenPermissionsHTTP = functions.https.onRequest(async (req, res) => {
  try {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
    if (!projectId) {
      res.status(500).json({ error: "Project ID not found" })
      return
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
    const results: any[] = []

    for (const secret of secrets) {
      if (!secret.name) continue

      try {
        // Get current IAM policy
        const [currentPolicy] = await secretManager.getIamPolicy({
          resource: secret.name,
        })

        // Check if service account already has access
        const hasAccess = currentPolicy.bindings?.some(
          (binding) =>
            binding.role === "roles/secretmanager.secretAccessor" &&
            binding.members?.includes(`serviceAccount:${serviceAccount}`)
        )

        if (hasAccess) {
          console.log(`Skipping ${secret.name} - already has access`)
          results.push({ secret: secret.name, status: "already_configured" })
          continue
        }

        // Add the service account to the policy
        const updatedBindings = currentPolicy.bindings || []
        const accessorBinding = updatedBindings.find(
          (b) => b.role === "roles/secretmanager.secretAccessor"
        )

        if (accessorBinding) {
          if (!accessorBinding.members) {
            accessorBinding.members = []
          }
          accessorBinding.members.push(`serviceAccount:${serviceAccount}`)
        } else {
          updatedBindings.push({
            role: "roles/secretmanager.secretAccessor",
            members: [`serviceAccount:${serviceAccount}`],
          })
        }

        // Update the policy
        await secretManager.setIamPolicy({
          resource: secret.name,
          policy: {
            bindings: updatedBindings,
            etag: currentPolicy.etag,
          },
        })

        console.log(`Granted access to ${secret.name}`)
        results.push({ secret: secret.name, status: "fixed" })
        fixed++
      } catch (error: any) {
        console.error(`Failed to grant access to ${secret.name}:`, error)
        results.push({ secret: secret.name, status: "error", error: error.message })
        errors++
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixed} secrets, ${errors} errors`,
      totalSecrets: secrets.length,
      fixed,
      errors,
      results,
    })
  } catch (error: any) {
    console.error("Error fixing calendar token permissions:", error)
    res.status(500).json({ error: error.message })
  }
})
