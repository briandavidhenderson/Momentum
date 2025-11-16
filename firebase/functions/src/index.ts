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
import {
  generateExperimentSuggestions,
  generateProjectDescription,
  suggestMaintenanceSchedule,
} from "./openai"

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

// Export OpenAI functions
export {
  generateExperimentSuggestions,
  generateProjectDescription,
  suggestMaintenanceSchedule,
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
 * Helper to parse dates from ORCID API responses
 */
function parseOrcidDate(dateObj: any): string | undefined {
  if (!dateObj) return undefined
  const year = dateObj.year?.value
  const month = dateObj.month?.value
  const day = dateObj.day?.value

  if (year && month && day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  } else if (year && month) {
    return `${year}-${String(month).padStart(2, "0")}`
  } else if (year) {
    return String(year)
  }
  return undefined
}

/**
 * Fetch and parse full ORCID record
 * Returns rich profile data including biography, employment, education, works, and funding
 */
async function fetchOrcidRecord(orcidId: string, accessToken: string, config: OrcidConfig): Promise<any> {
  const apiUrl = `${config.baseUrl.replace("sandbox.", "pub.")}/v3.0/${orcidId}/record`

  console.log(`Fetching ORCID record from: ${apiUrl}`)

  const response = await fetch(apiUrl, {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    console.error(`Failed to fetch ORCID record: ${response.status} ${response.statusText}`)
    return null
  }

  const record = await response.json()
  console.log("ORCID record fetched successfully")

  // Parse the record into our simplified format
  const orcidData: any = {}

  // Biography
  if (record.person?.biography?.content) {
    orcidData.biography = record.person.biography.content
  }

  // Name and email
  if (record.person?.name) {
    const givenNames = record.person.name["given-names"]?.value || ""
    const familyName = record.person.name["family-name"]?.value || ""
    orcidData.name = `${givenNames} ${familyName}`.trim()
  }

  if (record.person?.emails?.email?.length > 0) {
    orcidData.email = record.person.emails.email[0].email
  }

  // Employment
  if (record["activities-summary"]?.employments?.["affiliation-group"]) {
    orcidData.employment = record["activities-summary"].employments["affiliation-group"]
      .map((group: any) => {
        const emp = group.summaries?.[0]?.["employment-summary"]
        if (!emp) return null

        return {
          organization: emp.organization?.name || "",
          role: emp["role-title"] || undefined,
          department: emp.department || undefined,
          startDate: parseOrcidDate(emp["start-date"]),
          endDate: emp["end-date"] ? parseOrcidDate(emp["end-date"]) : undefined,
          location: emp.organization?.address ?
            [emp.organization.address.city, emp.organization.address.region, emp.organization.address.country]
              .filter(Boolean).join(", ") : undefined,
        }
      })
      .filter((e: any) => e !== null)
  }

  // Education
  if (record["activities-summary"]?.educations?.["affiliation-group"]) {
    orcidData.education = record["activities-summary"].educations["affiliation-group"]
      .map((group: any) => {
        const edu = group.summaries?.[0]?.["education-summary"]
        if (!edu) return null

        return {
          organization: edu.organization?.name || "",
          degree: edu["role-title"] || undefined,
          field: edu.department || undefined,
          startDate: parseOrcidDate(edu["start-date"]),
          endDate: parseOrcidDate(edu["end-date"]),
          location: edu.organization?.address ?
            [edu.organization.address.city, edu.organization.address.region, edu.organization.address.country]
              .filter(Boolean).join(", ") : undefined,
        }
      })
      .filter((e: any) => e !== null)
  }

  // Works (Publications)
  if (record["activities-summary"]?.works?.group) {
    orcidData.works = record["activities-summary"].works.group
      .slice(0, 20) // Limit to 20 most recent works
      .map((group: any) => {
        const work = group["work-summary"]?.[0]
        if (!work) return null

        return {
          title: work.title?.title?.value || "",
          type: work.type || undefined,
          publicationDate: parseOrcidDate(work["publication-date"]),
          journal: work["journal-title"]?.value || undefined,
          doi: work["external-ids"]?.["external-id"]?.find((id: any) => id["external-id-type"] === "doi")?.[
            "external-id-value"
          ] || undefined,
          url: work.url?.value || undefined,
        }
      })
      .filter((w: any) => w !== null)
  }

  // Funding
  if (record["activities-summary"]?.fundings?.group) {
    orcidData.funding = record["activities-summary"].fundings.group
      .map((group: any) => {
        const funding = group["funding-summary"]?.[0]
        if (!funding) return null

        return {
          title: funding.title?.title?.value || "",
          organization: funding.organization?.name || "",
          type: funding.type || undefined,
          startDate: parseOrcidDate(funding["start-date"]),
          endDate: parseOrcidDate(funding["end-date"]),
          grantNumber: funding["external-ids"]?.["external-id"]?.[0]?.["external-id-value"] || undefined,
          url: funding.url?.value || undefined,
        }
      })
      .filter((f: any) => f !== null)
  }

  return orcidData
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
/**
 * Fetch ORCID public record data
 */
async function fetchOrcidRecord(orcidId: string, accessToken: string, config: OrcidConfig) {
  try {
    // Fetch the public ORCID record
    const recordUrl = `${config.baseUrl}/v3.0/${orcidId}/record`
    const response = await fetch(recordUrl, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error("Failed to fetch ORCID record:", response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching ORCID record:", error)
    return null
  }
}

/**
 * Extract useful profile data from ORCID record
 */
function extractOrcidProfileData(record: any) {
  const data: any = {}

  try {
    // Extract person details
    const person = record?.person
    if (person) {
      // Name
      if (person.name) {
        const givenNames = person.name["given-names"]?.value
        const familyName = person.name["family-name"]?.value
        if (givenNames) data.firstName = givenNames
        if (familyName) data.lastName = familyName
      }

      // Biography
      if (person.biography?.content) {
        data.notes = person.biography.content
      }

      // Emails
      if (person.emails?.email && person.emails.email.length > 0) {
        // Get primary or first verified email
        const primaryEmail = person.emails.email.find((e: any) => e.primary) || person.emails.email[0]
        if (primaryEmail?.email) {
          data.email = primaryEmail.email
        }
      }
    }

    // Extract employment (most recent)
    const employments = record?.["activities-summary"]?.employments?.["affiliation-group"]
    if (employments && employments.length > 0) {
      const recentEmployment = employments[0]?.summaries?.[0]?.["employment-summary"]
      if (recentEmployment) {
        const orgName = recentEmployment.organization?.name
        const roleTitle = recentEmployment["role-title"]
        const departmentName = recentEmployment["department-name"]

        if (orgName) data.organisation = orgName
        if (departmentName) data.institute = departmentName
        if (roleTitle) data.position = roleTitle
      }
    }

    // Extract education (most recent degree)
    const educations = record?.["activities-summary"]?.educations?.["affiliation-group"]
    if (educations && educations.length > 0) {
      const degrees: string[] = []
      for (const eduGroup of educations.slice(0, 3)) { // Get top 3
        const edu = eduGroup?.summaries?.[0]?.["education-summary"]
        if (edu?.["role-title"]) {
          degrees.push(edu["role-title"])
        }
      }
      if (degrees.length > 0) {
        data.qualifications = degrees
      }
    }

    // Extract research interests from keywords
    const keywords = person?.keywords?.keyword
    if (keywords && keywords.length > 0) {
      data.researchInterests = keywords.map((k: any) => k.content).filter(Boolean).slice(0, 10)
    }
  } catch (error) {
    console.error("Error extracting ORCID profile data:", error)
  }

  return data
}

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
      const errorText = await tokenResponse.text()
      console.error("ORCID token exchange failed. Status:", tokenResponse.status)
      console.error("Response body:", errorText)
      throw new functions.https.HttpsError(
        "internal",
        `Failed to exchange authorization code: ${tokenResponse.status} ${tokenResponse.statusText}`
      )
    }

    const responseText = await tokenResponse.text()
    console.log("ORCID token response:", responseText.substring(0, 200))

    let tokenData
    try {
      tokenData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse ORCID token response as JSON:", parseError)
      console.error("Response was:", responseText.substring(0, 500))
      throw new functions.https.HttpsError(
        "internal",
        "Invalid response from ORCID - expected JSON but got HTML or invalid format"
      )
    }
    const orcidId = tokenData.orcid
    const accessToken = tokenData.access_token
    const name = tokenData.name

    if (!orcidId) {
      throw new functions.https.HttpsError(
        "internal",
        "No ORCID iD in response"
      )
    }

    console.log(`ORCID iD obtained: ${orcidId}`)

    // Fetch full ORCID record with rich data
    const orcidData = await fetchOrcidRecord(orcidId, accessToken, config)

    // Extract profile data from ORCID record for auto-population
    const extractedData = orcidData ? extractOrcidProfileData(orcidData) : {}

    // Get existing custom claims to avoid overwriting reserved claims
    const userRecord = await admin.auth().getUser(context.auth.uid)
    const existingClaims = userRecord.customClaims || {}

    // Filter out reserved Firebase claims
    const reservedClaims = ['aud', 'auth_time', 'exp', 'iat', 'iss', 'sub', 'firebase']
    const filteredClaims = Object.keys(existingClaims).reduce((acc, key) => {
      if (!reservedClaims.includes(key)) {
        acc[key] = existingClaims[key]
      }
      return acc
    }, {} as Record<string, any>)

    // Update user's custom claims (only non-reserved claims)
    await admin.auth().setCustomUserClaims(context.auth.uid, {
      ...filteredClaims,
      orcidId,
      orcidVerified: true,
    })

    // Prepare update data for Firestore
    const firestoreUpdate: any = {
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      orcidVerified: true,
      orcidLastSynced: admin.firestore.FieldValue.serverTimestamp(),
      orcidData: orcidData || {}, // Store rich ORCID data for display
      orcidClaims: {
        name: name || extractedData.firstName ? `${extractedData.firstName || ""} ${extractedData.lastName || ""}`.trim() : null,
        email: extractedData.email || null,
      },
    }

    // Get user's profileId from users collection
    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get()
    const userData = userDoc.data()
    const profileId = userData?.profileId

    if (!profileId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User profile not found. Please complete your profile setup first."
      )
    }

    // Merge extracted data (only if fields are not already set)
    const currentProfile = await admin.firestore().collection("personProfiles").doc(profileId).get()
    const currentData = currentProfile.data() || {}

    // Only update fields if they're empty or missing
    if (extractedData.firstName && !currentData.firstName) firestoreUpdate.firstName = extractedData.firstName
    if (extractedData.lastName && !currentData.lastName) firestoreUpdate.lastName = extractedData.lastName
    if (extractedData.email && !currentData.email) firestoreUpdate.email = extractedData.email
    if (extractedData.organisation && !currentData.organisation) firestoreUpdate.organisation = extractedData.organisation
    if (extractedData.institute && !currentData.institute) firestoreUpdate.institute = extractedData.institute
    if (extractedData.position && !currentData.position) firestoreUpdate.position = extractedData.position
    if (extractedData.notes && !currentData.notes) firestoreUpdate.notes = extractedData.notes
    if (extractedData.qualifications && (!currentData.qualifications || currentData.qualifications.length === 0)) {
      firestoreUpdate.qualifications = extractedData.qualifications
    }
    if (extractedData.researchInterests && (!currentData.researchInterests || currentData.researchInterests.length === 0)) {
      firestoreUpdate.researchInterests = extractedData.researchInterests
    }

    // Store ORCID data in Firestore personProfiles collection
    await admin.firestore().collection("personProfiles").doc(profileId).update(firestoreUpdate)

    console.log(`ORCID data stored successfully for user ${context.auth.uid}`)

    return {
      success: true,
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      name,
      dataFetched: orcidData !== null,
      extractedData,
    }
  } catch (error) {
    console.error("ORCID link error:", error)
    throw new functions.https.HttpsError("internal", "Failed to link ORCID account")
  }
})

/**
 * Resync ORCID profile data
 * Fetches the latest data from ORCID and updates the user's profile
 */
export const orcidResyncProfile = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    )
  }

  const config = getOrcidConfig()

  try {
    // Get user's profileId from users collection
    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get()
    const userData = userDoc.data()
    const profileId = userData?.profileId

    if (!profileId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User profile not found. Please complete your profile setup first."
      )
    }

    // Get current profile to check if ORCID is linked
    const profileDoc = await admin.firestore().collection("personProfiles").doc(profileId).get()
    const profileData = profileDoc.data()

    if (!profileData?.orcidId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No ORCID linked to this account"
      )
    }

    const orcidId = profileData.orcidId

    // Note: We don't have the access token anymore after initial linking
    // ORCID public API allows reading public data without authentication
    // Fetch public ORCID record without access token
    const recordUrl = `${config.baseUrl}/v3.0/${orcidId}/record`
    const response = await fetch(recordUrl, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch ORCID record"
      )
    }

    const orcidRecord = await response.json()

    // Extract profile data from ORCID record
    const extractedData = extractOrcidProfileData(orcidRecord)

    // Prepare update data for Firestore
    const firestoreUpdate: any = {
      orcidLastSynced: admin.firestore.FieldValue.serverTimestamp(),
      orcidClaims: {
        name: extractedData.firstName ? `${extractedData.firstName || ""} ${extractedData.lastName || ""}`.trim() : null,
        email: extractedData.email || null,
      },
    }

    // Option to force update all fields (if requested)
    const forceUpdate = data?.forceUpdate || false

    if (forceUpdate) {
      // Force update all fields
      if (extractedData.firstName) firestoreUpdate.firstName = extractedData.firstName
      if (extractedData.lastName) firestoreUpdate.lastName = extractedData.lastName
      if (extractedData.email) firestoreUpdate.email = extractedData.email
      if (extractedData.organisation) firestoreUpdate.organisation = extractedData.organisation
      if (extractedData.institute) firestoreUpdate.institute = extractedData.institute
      if (extractedData.position) firestoreUpdate.position = extractedData.position
      if (extractedData.notes) firestoreUpdate.notes = extractedData.notes
      if (extractedData.qualifications) firestoreUpdate.qualifications = extractedData.qualifications
      if (extractedData.researchInterests) firestoreUpdate.researchInterests = extractedData.researchInterests
    } else {
      // Only update empty fields
      const currentData = profileData
      if (extractedData.firstName && !currentData.firstName) firestoreUpdate.firstName = extractedData.firstName
      if (extractedData.lastName && !currentData.lastName) firestoreUpdate.lastName = extractedData.lastName
      if (extractedData.email && !currentData.email) firestoreUpdate.email = extractedData.email
      if (extractedData.organisation && !currentData.organisation) firestoreUpdate.organisation = extractedData.organisation
      if (extractedData.institute && !currentData.institute) firestoreUpdate.institute = extractedData.institute
      if (extractedData.position && !currentData.position) firestoreUpdate.position = extractedData.position
      if (extractedData.notes && !currentData.notes) firestoreUpdate.notes = extractedData.notes
      if (extractedData.qualifications && (!currentData.qualifications || currentData.qualifications.length === 0)) {
        firestoreUpdate.qualifications = extractedData.qualifications
      }
      if (extractedData.researchInterests && (!currentData.researchInterests || currentData.researchInterests.length === 0)) {
        firestoreUpdate.researchInterests = extractedData.researchInterests
      }
    }

    // Update Firestore personProfiles collection
    await admin.firestore().collection("personProfiles").doc(profileId).update(firestoreUpdate)

    return {
      success: true,
      message: "Profile synced successfully",
      extractedData,
    }
  } catch (error) {
    console.error("ORCID resync error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to resync ORCID profile")
  }
})
