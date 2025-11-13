import * as admin from "firebase-admin"
import * as functions from "firebase-functions"

admin.initializeApp()

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
  apiBaseUrl: string
  authorizeUrl: string
  tokenUrl: string
}

function getOrcidConfig(): OrcidConfig {
  const useSandbox = functions.config().orcid?.use_sandbox === "true"
  const baseUrl = useSandbox ? "https://sandbox.orcid.org" : "https://orcid.org"
  const apiBaseUrl = useSandbox ? "https://pub.sandbox.orcid.org/v3.0" : "https://pub.orcid.org/v3.0"

  return {
    clientId: functions.config().orcid?.client_id || process.env.ORCID_CLIENT_ID || "",
    clientSecret: functions.config().orcid?.client_secret || process.env.ORCID_CLIENT_SECRET || "",
    useSandbox,
    baseUrl,
    apiBaseUrl,
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
  authUrl.searchParams.set("scope", "/read-limited")
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

    // Update user's custom claims
    await admin.auth().setCustomUserClaims(context.auth.uid, {
      ...context.auth.token,
      orcidId,
      orcidVerified: true,
    })

    // Fetch ORCID data with the access token
    const orcidData = await fetchOrcidData(orcidId, accessToken, config)

    // Find the user's profile by userId
    const profilesSnapshot = await admin.firestore()
      .collection("personProfiles")
      .where("userId", "==", context.auth.uid)
      .limit(1)
      .get()

    if (!profilesSnapshot.empty) {
      const profileDoc = profilesSnapshot.docs[0]

      // Store ORCID data in Firestore profile
      await profileDoc.ref.update({
        orcidId,
        orcidUrl: `${config.baseUrl}/${orcidId}`,
        orcidVerified: true,
        orcidBio: orcidData.bio,
        orcidPublications: orcidData.publications,
        orcidEmploymentHistory: orcidData.employmentHistory,
        orcidEducationHistory: orcidData.educationHistory,
        orcidLastSynced: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return {
      success: true,
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      name,
      publicationsCount: orcidData.publications.length,
      employmentsCount: orcidData.employmentHistory.length,
      educationsCount: orcidData.educationHistory.length,
    }
  } catch (error) {
    console.error("ORCID link error:", error)
    throw new functions.https.HttpsError("internal", "Failed to link ORCID account")
  }
})

/**
 * Fetch ORCID profile data including bio, publications, employment, and education
 */
async function fetchOrcidData(orcidId: string, accessToken: string, config: ReturnType<typeof getOrcidConfig>) {
  try {
    const headers = {
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    }

    // Fetch person data (bio, name, etc.)
    const personResponse = await fetch(`${config.apiBaseUrl}/${orcidId}/person`, { headers })
    const person = personResponse.ok ? await personResponse.json() : null

    // Fetch works (publications)
    const worksResponse = await fetch(`${config.apiBaseUrl}/${orcidId}/works`, { headers })
    const works = worksResponse.ok ? await worksResponse.json() : null

    // Fetch employment
    const employmentsResponse = await fetch(`${config.apiBaseUrl}/${orcidId}/employments`, { headers })
    const employments = employmentsResponse.ok ? await employmentsResponse.json() : null

    // Fetch education
    const educationsResponse = await fetch(`${config.apiBaseUrl}/${orcidId}/educations`, { headers })
    const educations = educationsResponse.ok ? await educationsResponse.json() : null

    // Extract and format the data
    const bio = person?.biography?.content || ""

    // Extract publications (limited to 50 most recent)
    const publications = works?.group?.slice(0, 50).map((group: any) => {
      const work = group["work-summary"]?.[0]
      return {
        title: work?.title?.title?.value || "",
        year: work?.["publication-date"]?.year?.value || "",
        type: work?.type || "",
        doi: work?.["external-ids"]?.["external-id"]?.find((id: any) => id["external-id-type"] === "doi")?.["external-id-value"] || "",
        putCode: work?.["put-code"] || ""
      }
    }).filter((pub: any) => pub.title) || []

    // Extract employment history
    const employmentHistory = employments?.["affiliation-group"]?.map((group: any) => {
      const employment = group.summaries?.[0]?.["employment-summary"]
      return {
        organization: employment?.organization?.name || "",
        role: employment?.["role-title"] || "",
        startDate: employment?.["start-date"]?.year?.value || "",
        endDate: employment?.["end-date"]?.year?.value || "Present",
        department: employment?.["department-name"] || ""
      }
    }).filter((emp: any) => emp.organization) || []

    // Extract education history
    const educationHistory = educations?.["affiliation-group"]?.map((group: any) => {
      const education = group.summaries?.[0]?.["education-summary"]
      return {
        institution: education?.organization?.name || "",
        degree: education?.["role-title"] || "",
        field: education?.["department-name"] || "",
        startDate: education?.["start-date"]?.year?.value || "",
        endDate: education?.["end-date"]?.year?.value || ""
      }
    }).filter((edu: any) => edu.institution) || []

    return {
      bio,
      publications,
      employmentHistory,
      educationHistory
    }
  } catch (error) {
    console.error("Error fetching ORCID data:", error)
    return {
      bio: "",
      publications: [],
      employmentHistory: [],
      educationHistory: []
    }
  }
}

/**
 * Sync ORCID data for a user (requires re-authentication to get fresh token)
 */
export const syncOrcidData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    )
  }

  const { orcidId, accessToken } = data

  if (!orcidId || !accessToken) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "ORCID ID and access token are required"
    )
  }

  try {
    const config = getOrcidConfig()
    const orcidData = await fetchOrcidData(orcidId, accessToken, config)

    // Find the user's profile by userId
    const profilesSnapshot = await admin.firestore()
      .collection("personProfiles")
      .where("userId", "==", context.auth.uid)
      .limit(1)
      .get()

    if (profilesSnapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found"
      )
    }

    const profileDoc = profilesSnapshot.docs[0]

    // Update profile with ORCID data
    await profileDoc.ref.update({
      orcidBio: orcidData.bio,
      orcidPublications: orcidData.publications,
      orcidEmploymentHistory: orcidData.employmentHistory,
      orcidEducationHistory: orcidData.educationHistory,
      orcidLastSynced: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      success: true,
      message: "ORCID data synced successfully",
      publicationsCount: orcidData.publications.length,
      employmentsCount: orcidData.employmentHistory.length,
      educationsCount: orcidData.educationHistory.length
    }
  } catch (error) {
    console.error("Error syncing ORCID data:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to sync ORCID data")
  }
})
