import * as admin from "firebase-admin"
import * as functions from "firebase-functions"

admin.initializeApp()

// Import GDPR functions
import { processDataExportRequest, processAccountDeletion } from "./gdpr"
import { enforceDataRetention } from "./retention"
import {
  logAuditEvent,
  logUserLogin,
  logUserDeletion,
  logConsentChanges,
  logPrivacySettingsChanges,
  logDataExportRequests,
  logAccountDeletionRequests,
  logSpecialCategoryData,
} from "./audit"
import {
  onOrderStatusChange,
  createDefaultAllocation,
} from "./funding"
import {
  checkFundingAlertNotifications,
  notifyLargeOrder,
  notifyAllocationCreated,
  notifyTransactionFinalized,
} from "./notifications"

// Export GDPR functions
export {
  processDataExportRequest,
  processAccountDeletion,
  enforceDataRetention,
}

// Export Audit functions
export {
  logAuditEvent,
  logUserLogin,
  logUserDeletion,
  logConsentChanges,
  logPrivacySettingsChanges,
  logDataExportRequests,
  logAccountDeletionRequests,
  logSpecialCategoryData,
}

// Export Funding functions
export {
  onOrderStatusChange,
  createDefaultAllocation,
}

// Export Notification functions
export {
  checkFundingAlertNotifications,
  notifyLargeOrder,
  notifyAllocationCreated,
  notifyTransactionFinalized,
}

/**
 * ORCID OAuth Configuration
 * These should be set via Firebase Functions config:
 * firebase functions:config:set orcid.client_id="YOUR_CLIENT_ID"
 * firebase functions:config:set orcid.client_secret="YOUR_CLIENT_SECRET"
 * firebase functions:config:set orcid.use_sandbox="true"
 */

interface OrcidConfig {
  clientId: string
  clientSecret: string
  useSandbox: boolean
  baseUrl: string
  authorizeUrl: string
  tokenUrl: string
}

function getOrcidConfig(): OrcidConfig {
  const useSandbox = functions.config().orcid?.use_sandbox === "true"
  const baseUrl = useSandbox ? "https://sandbox.orcid.org" : "https://orcid.org"

  return {
    clientId: functions.config().orcid?.client_id || process.env.ORCID_CLIENT_ID || "",
    clientSecret: functions.config().orcid?.client_secret || process.env.ORCID_CLIENT_SECRET || "",
    useSandbox,
    baseUrl,
    authorizeUrl: `${baseUrl}/oauth/authorize`,
    tokenUrl: `${baseUrl}/oauth/token`,
  }
}

/**
 * Initiate ORCID OAuth flow
 * Returns the authorization URL to redirect the user to
 */
export const orcidAuthStart = functions.https.onCall(async (data, context) => {
  const config = getOrcidConfig()

  if (!config.clientId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "ORCID client ID not configured"
    )
  }

  // Get the redirect URI from the request
  const redirectUri = data.redirect_uri || ""

  if (!redirectUri) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "redirect_uri is required"
    )
  }

  // Generate state parameter for CSRF protection
  const state = Math.random().toString(36).substring(2, 15)

  // Build authorization URL
  const authUrl = new URL(config.authorizeUrl)
  authUrl.searchParams.set("client_id", config.clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", "/authenticate")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  return {
    authUrl: authUrl.toString(),
    state,
  }
})

/**
 * Handle ORCID OAuth callback
 * Exchanges authorization code for access token and creates Firebase custom token
 */
export const orcidAuthCallback = functions.https.onCall(async (data, context) => {
  const config = getOrcidConfig()

  if (!config.clientId || !config.clientSecret) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "ORCID not properly configured"
    )
  }

  // Get authorization code from request
  const code = data.code
  const redirectUri = data.redirect_uri

  if (!code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Authorization code is required"
    )
  }

  if (!redirectUri) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "redirect_uri is required"
    )
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("ORCID token exchange failed:", errorText)
      throw new functions.https.HttpsError(
        "internal",
        "Failed to exchange authorization code"
      )
    }

    const tokenData = await tokenResponse.json()

    // Extract ORCID iD from response
    const orcidId = tokenData.orcid
    const accessToken = tokenData.access_token
    const name = tokenData.name

    if (!orcidId) {
      throw new functions.https.HttpsError(
        "internal",
        "No ORCID iD in response"
      )
    }

    // Create or get user by ORCID iD
    let uid: string
    try {
      // Try to get existing user by ORCID iD (stored in customClaims)
      const userRecord = await admin.auth().getUserByEmail(`${orcidId}@orcid.placeholder`)
      uid = userRecord.uid
    } catch (error) {
      // User doesn't exist, create a new one
      const newUser = await admin.auth().createUser({
        email: `${orcidId}@orcid.placeholder`, // Placeholder email
        displayName: name || orcidId,
        emailVerified: false,
      })
      uid = newUser.uid

      // Set custom claims with ORCID data
      await admin.auth().setCustomUserClaims(uid, {
        orcidId,
        orcidVerified: true,
      })
    }

    // Create custom Firebase token
    const firebaseToken = await admin.auth().createCustomToken(uid, {
      orcidId,
      orcidVerified: true,
      orcidAccessToken: accessToken,
    })

    // Return the token and user data
    return {
      firebaseToken,
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      name,
    }
  } catch (error) {
    console.error("ORCID callback error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Internal server error")
  }
})

/**
 * Fetch and parse full ORCID record from the ORCID API
 */
async function fetchOrcidRecord(orcidId: string, accessToken: string, config: OrcidConfig) {
  const apiBase = config.useSandbox
    ? "https://sandbox.orcid.org/v3.0"
    : "https://pub.orcid.org/v3.0"

  try {
    const response = await fetch(`${apiBase}/${orcidId}/record`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch ORCID record: ${response.status}`)
      return null
    }

    const json = await response.json()

    // Parse personal information
    const person = json.person || {}
    const name = person.name || {}
    const givenNames = name["given-names"]?.value || ""
    const familyName = name["family-name"]?.value || ""
    const creditName = name["credit-name"]?.value || undefined
    const biography = person.biography?.content || undefined

    // Parse keywords
    const keywords =
      person.keywords?.keyword?.map((k: any) => k.content).filter(Boolean) || []

    // Parse researcher URLs
    const researcherUrls =
      person["researcher-urls"]?.["researcher-url"]?.map((url: any) => ({
        name: url["url-name"] || "Website",
        url: url.url?.value || "",
      })) || []

    // Parse activities
    const activities = json["activities-summary"] || {}

    // Parse employments
    const employments = (activities.employments?.["employment-group"] || [])
      .map((item: any) => {
        const summary = item["employment-summary"]
        if (!summary) return null

        const org = summary.organization
        return {
          type: "employment",
          organisation: org?.name || "Unknown",
          roleTitle: summary["role-title"] || undefined,
          departmentName: summary["department-name"] || undefined,
          city: org?.address?.city || undefined,
          country: org?.address?.country || undefined,
          startDate: summary["start-date"],
          endDate: summary["end-date"] || null,
        }
      })
      .filter(Boolean)

    // Parse educations
    const educations = (activities.educations?.["education-group"] || [])
      .map((item: any) => {
        const summary = item["education-summary"]
        if (!summary) return null

        const org = summary.organization
        return {
          type: "education",
          organisation: org?.name || "Unknown",
          roleTitle: summary["role-title"] || undefined,
          departmentName: summary["department-name"] || undefined,
          city: org?.address?.city || undefined,
          country: org?.address?.country || undefined,
          startDate: summary["start-date"],
          endDate: summary["end-date"] || null,
        }
      })
      .filter(Boolean)

    // Parse works (publications)
    const works = (activities.works?.group || [])
      .map((group: any) => {
        const workSummary = group["work-summary"]?.[0]
        if (!workSummary) return null

        const title = workSummary.title?.title?.value || "Untitled"
        const publicationDate = workSummary["publication-date"]

        // Extract DOI
        const externalIds = workSummary["external-ids"]?.["external-id"] || []
        const doiId = externalIds.find((id: any) => id["external-id-type"] === "doi")
        const doi = doiId?.["external-id-value"]

        return {
          putCode: workSummary["put-code"]?.toString() || "",
          title,
          journal: workSummary["journal-title"]?.value || undefined,
          year: publicationDate?.year?.value
            ? parseInt(publicationDate.year.value)
            : undefined,
          type: workSummary.type || undefined,
          doi,
        }
      })
      .filter(Boolean)

    // Build the ORCID record
    return {
      orcidId,
      givenNames,
      familyName,
      creditName,
      biography,
      keywords,
      researcherUrls,
      employments,
      educations,
      works,
      raw: json,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  } catch (error) {
    console.error("Error fetching ORCID record:", error)
    return null
  }
}

/**
 * Link ORCID to existing Firebase user
 */
export const orcidLinkAccount = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to link ORCID"
    )
  }

  const { authCode, redirectUri } = data

  if (!authCode) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Authorization code is required"
    )
  }

  const config = getOrcidConfig()

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to exchange authorization code"
      )
    }

    const tokenData = await tokenResponse.json()
    const orcidId = tokenData.orcid
    const accessToken = tokenData.access_token
    const name = tokenData.name

    if (!orcidId) {
      throw new functions.https.HttpsError(
        "internal",
        "No ORCID iD in response"
      )
    }

    // Fetch full ORCID record from API
    const orcidRecord = await fetchOrcidRecord(orcidId, accessToken, config)

    // Update user's custom claims
    await admin.auth().setCustomUserClaims(context.auth.uid, {
      ...context.auth.token,
      orcidId,
      orcidVerified: true,
    })

    // Store ORCID data in Firestore profile
    await admin.firestore().collection("profiles").doc(context.auth.uid).update({
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      orcidVerified: true,
      orcidLastSynced: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Store full ORCID record in separate collection
    if (orcidRecord) {
      await admin.firestore().collection("orcidRecords").doc(orcidId).set({
        ...orcidRecord,
        syncedBy: context.auth.uid,
      })
    }

    return {
      success: true,
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      name,
      recordFetched: !!orcidRecord,
    }
  } catch (error) {
    console.error("ORCID link error:", error)
    throw new functions.https.HttpsError("internal", "Failed to link ORCID account")
  }
})

/**
 * Sync ORCID record for current user (re-fetch from ORCID API)
 * Requires user to have ORCID already linked
 */
export const orcidSyncRecord = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    )
  }

  const config = getOrcidConfig()

  try {
    // Get user's profile to find their ORCID ID
    const profileDoc = await admin
      .firestore()
      .collection("profiles")
      .doc(context.auth.uid)
      .get()

    const profile = profileDoc.data()
    const orcidId = profile?.orcidId

    if (!orcidId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User does not have ORCID linked"
      )
    }

    // Get access token from custom claims
    const tokenResult = await admin.auth().getUser(context.auth.uid)
    const customClaims = tokenResult.customClaims || {}
    const accessToken = customClaims.orcidAccessToken as string | undefined

    if (!accessToken) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No ORCID access token available. Please re-link your ORCID account."
      )
    }

    // Fetch fresh ORCID record
    const orcidRecord = await fetchOrcidRecord(orcidId, accessToken, config)

    if (!orcidRecord) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch ORCID record"
      )
    }

    // Update profile with new sync time
    await admin.firestore().collection("profiles").doc(context.auth.uid).update({
      orcidLastSynced: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Save updated ORCID record
    await admin.firestore().collection("orcidRecords").doc(orcidId).set({
      ...orcidRecord,
      syncedBy: context.auth.uid,
    })

    return {
      success: true,
      orcidId,
      lastSynced: new Date().toISOString(),
      publicationCount: orcidRecord.works?.length || 0,
      employmentCount: orcidRecord.employments?.length || 0,
    }
  } catch (error) {
    console.error("ORCID sync error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to sync ORCID record")
  }
})
