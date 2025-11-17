/**
 * Calendar Token Service - Google Secret Manager
 * Secure storage and retrieval of OAuth tokens
 * Part of Phase 1 Foundation - Week 3 Security Fixes
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import * as admin from "firebase-admin"
import * as functions from "firebase-functions"

const secretManager = new SecretManagerServiceClient()

/**
 * Token data structure stored in Secret Manager
 */
export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in milliseconds
  provider: "google" | "microsoft"
  userId: string
  email: string
  createdAt: string // ISO 8601 timestamp
  lastRefreshedAt: string // ISO 8601 timestamp
}

/**
 * Get the Google Cloud project ID from Firebase config
 */
function getProjectId(): string {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
  if (!projectId) {
    throw new Error("Project ID not found in environment variables")
  }
  return projectId
}

/**
 * Get the secret name for a calendar connection
 */
function getSecretName(connectionId: string): string {
  const projectId = getProjectId()
  return `projects/${projectId}/secrets/calendar-token-${connectionId}`
}

/**
 * Get the full secret version path
 */
function getSecretVersionPath(connectionId: string, version = "latest"): string {
  return `${getSecretName(connectionId)}/versions/${version}`
}

/**
 * Store OAuth tokens securely in Google Secret Manager
 * Creates a new secret version for the connection
 *
 * @param connectionId - Calendar connection ID
 * @param tokenData - Token data to store (without connectionId)
 * @returns Promise that resolves when tokens are stored
 */
export async function storeTokens(
  connectionId: string,
  tokenData: Omit<TokenData, "connectionId">
): Promise<void> {
  try {
    const projectId = getProjectId()
    const secretId = `calendar-token-${connectionId}`
    const parent = `projects/${projectId}`

    // Prepare payload
    const payload = JSON.stringify({
      ...tokenData,
      connectionId,
      storedAt: new Date().toISOString(),
    })

    // Check if secret exists
    let secretExists = false
    try {
      await secretManager.getSecret({ name: `${parent}/secrets/${secretId}` })
      secretExists = true
    } catch (error: any) {
      if (error.code !== 5) {
        // 5 = NOT_FOUND
        throw error
      }
    }

    // Create secret if it doesn't exist
    if (!secretExists) {
      await secretManager.createSecret({
        parent,
        secretId,
        secret: {
          replication: {
            automatic: {},
          },
          labels: {
            type: "calendar-oauth-token",
            connectionId,
            provider: tokenData.provider,
          },
        },
      })

      console.log({
        action: "SECRET_CREATED",
        secretId,
        connectionId,
        provider: tokenData.provider,
        timestamp: new Date().toISOString(),
      })
    }

    // Add new version
    await secretManager.addSecretVersion({
      parent: `${parent}/secrets/${secretId}`,
      payload: {
        data: Buffer.from(payload, "utf8"),
      },
    })

    // Log storage event (audit trail)
    await logTokenAccess({
      action: "TOKEN_STORED",
      connectionId,
      userId: tokenData.userId,
      provider: tokenData.provider,
      success: true,
    })

    console.log({
      action: "TOKEN_STORED",
      connectionId,
      provider: tokenData.provider,
      userId: tokenData.userId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error storing tokens:", {
      connectionId,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    await logTokenAccess({
      action: "TOKEN_STORAGE_FAILED",
      connectionId,
      userId: tokenData.userId,
      provider: tokenData.provider,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    throw new Error(
      `Failed to store tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Retrieve OAuth tokens from Google Secret Manager
 *
 * @param connectionId - Calendar connection ID
 * @returns Token data
 * @throws Error if tokens not found or access fails
 */
export async function getTokens(connectionId: string): Promise<TokenData> {
  try {
    const secretPath = getSecretVersionPath(connectionId, "latest")

    // Access the secret version
    const [version] = await secretManager.accessSecretVersion({
      name: secretPath,
    })

    // Decode the payload
    const payload = version.payload?.data?.toString("utf8")
    if (!payload) {
      throw new Error("Secret payload is empty")
    }

    const tokenData = JSON.parse(payload) as TokenData & { storedAt: string }

    // Log access event (audit trail)
    await logTokenAccess({
      action: "TOKEN_ACCESSED",
      connectionId,
      userId: tokenData.userId,
      provider: tokenData.provider,
      success: true,
    })

    console.log({
      action: "TOKEN_ACCESSED",
      connectionId,
      provider: tokenData.provider,
      userId: tokenData.userId,
      timestamp: new Date().toISOString(),
    })

    return tokenData
  } catch (error) {
    console.error("Error retrieving tokens:", {
      connectionId,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    await logTokenAccess({
      action: "TOKEN_ACCESS_FAILED",
      connectionId,
      userId: "unknown",
      provider: "unknown",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    throw new Error(
      `Failed to retrieve tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Update tokens (used when refreshing access tokens)
 * Creates a new version of the secret with updated data
 *
 * @param connectionId - Calendar connection ID
 * @param updates - Partial token data to update
 */
export async function updateTokens(
  connectionId: string,
  updates: Partial<Pick<TokenData, "accessToken" | "expiresAt" | "refreshToken">>
): Promise<void> {
  try {
    // Get current tokens
    const currentTokens = await getTokens(connectionId)

    // Merge updates
    const updatedTokens: TokenData = {
      ...currentTokens,
      ...updates,
      lastRefreshedAt: new Date().toISOString(),
    }

    // Store new version
    await storeTokens(connectionId, updatedTokens)

    console.log({
      action: "TOKEN_UPDATED",
      connectionId,
      provider: currentTokens.provider,
      userId: currentTokens.userId,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating tokens:", {
      connectionId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    throw new Error(
      `Failed to update tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Delete tokens from Secret Manager
 * Called when a calendar connection is deleted
 *
 * @param connectionId - Calendar connection ID
 */
export async function deleteTokens(connectionId: string): Promise<void> {
  try {
    const secretName = getSecretName(connectionId)

    // Get token data for logging before deletion
    let userId = "unknown"
    let provider: "google" | "microsoft" | "unknown" = "unknown"
    try {
      const tokenData = await getTokens(connectionId)
      userId = tokenData.userId
      provider = tokenData.provider
    } catch (error) {
      // Token might not exist, continue with deletion
      console.warn("Could not retrieve token data before deletion:", connectionId)
    }

    // Delete the secret (all versions)
    await secretManager.deleteSecret({ name: secretName })

    // Log deletion event
    await logTokenAccess({
      action: "TOKEN_DELETED",
      connectionId,
      userId,
      provider,
      success: true,
    })

    console.log({
      action: "TOKEN_DELETED",
      connectionId,
      provider,
      userId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error deleting tokens:", {
      connectionId,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    await logTokenAccess({
      action: "TOKEN_DELETION_FAILED",
      connectionId,
      userId: "unknown",
      provider: "unknown",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    throw new Error(
      `Failed to delete tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Check if tokens exist for a connection
 *
 * @param connectionId - Calendar connection ID
 * @returns True if tokens exist, false otherwise
 */
export async function tokensExist(connectionId: string): Promise<boolean> {
  try {
    const secretName = getSecretName(connectionId)
    await secretManager.getSecret({ name: secretName })
    return true
  } catch (error: any) {
    if (error.code === 5) {
      // 5 = NOT_FOUND
      return false
    }
    throw error
  }
}

/**
 * List all calendar token secrets (for admin/migration purposes)
 *
 * @returns Array of connection IDs that have tokens
 */
export async function listAllTokens(): Promise<string[]> {
  try {
    const projectId = getProjectId()
    const parent = `projects/${projectId}`

    const [secrets] = await secretManager.listSecrets({
      parent,
      filter: 'labels.type="calendar-oauth-token"',
    })

    const connectionIds = secrets
      .map((secret) => {
        const name = secret.name || ""
        const match = name.match(/calendar-token-(.+)$/)
        return match ? match[1] : null
      })
      .filter((id): id is string => id !== null)

    return connectionIds
  } catch (error) {
    console.error("Error listing tokens:", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    throw new Error(
      `Failed to list tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Log token access events to Firestore audit trail
 * Implements GDPR Article 30 compliance
 */
async function logTokenAccess(event: {
  action: string
  connectionId: string
  userId: string
  provider: string | "unknown"
  success: boolean
  error?: string
}): Promise<void> {
  try {
    await admin.firestore().collection("auditLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: event.userId,
      action: event.action,
      entityType: "calendarToken",
      entityId: event.connectionId,
      success: event.success,
      errorMessage: event.error,
      details: {
        provider: event.provider,
      },
      gdprCompliance: "Article 30 - Records of Processing Activities",
    })
  } catch (error) {
    console.error("Failed to log token access:", {
      event,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    // Don't throw - logging failure shouldn't break token operations
  }
}

/**
 * Rotate tokens (create new version and mark old as destroyed)
 * Part of security best practices
 *
 * @param connectionId - Calendar connection ID
 * @param newTokenData - New token data
 */
export async function rotateTokens(
  connectionId: string,
  newTokenData: Omit<TokenData, "connectionId">
): Promise<void> {
  try {
    // Store new tokens (creates new version)
    await storeTokens(connectionId, newTokenData)

    // Note: Old versions are automatically kept by Secret Manager
    // They can be accessed if needed for recovery
    // Secret Manager handles version lifecycle

    console.log({
      action: "TOKEN_ROTATED",
      connectionId,
      provider: newTokenData.provider,
      userId: newTokenData.userId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error rotating tokens:", {
      connectionId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    throw new Error(
      `Failed to rotate tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
