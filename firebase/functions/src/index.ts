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

    // Get existing custom claims (excluding reserved Firebase claims)
    const userRecord = await admin.auth().getUser(context.auth.uid)
    const existingClaims = userRecord.customClaims || {}

    // Update user's custom claims (only non-reserved claims)
    await admin.auth().setCustomUserClaims(context.auth.uid, {
      ...existingClaims,
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

// ============================================================================
// GOOGLE CALENDAR OAUTH
// ============================================================================

/**
 * Google Calendar OAuth Configuration
 * Set via Firebase Functions config:
 * firebase functions:config:set google.client_id="YOUR_CLIENT_ID"
 * firebase functions:config:set google.client_secret="YOUR_CLIENT_SECRET"
 * firebase functions:config:set google.redirect_uri="YOUR_REDIRECT_URI"
 */

interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
}

function getGoogleCalendarConfig(): GoogleCalendarConfig {
  return {
    clientId: functions.config().google?.client_id || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: functions.config().google?.client_secret || process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: functions.config().google?.redirect_uri || process.env.GOOGLE_REDIRECT_URI || "",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
  }
}

/**
 * Initiate Google Calendar OAuth flow
 * Returns the authorization URL to redirect the user to
 */
export const googleCalendarAuthStart = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const config = getGoogleCalendarConfig()

  if (!config.clientId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Google Calendar client ID not configured"
    )
  }

  // Generate state parameter for CSRF protection
  const state = `${context.auth.uid}-${Math.random().toString(36).substring(2, 15)}`

  // Build authorization URL
  const authUrl = new URL(config.authorizeUrl)
  authUrl.searchParams.set("client_id", config.clientId)
  authUrl.searchParams.set("redirect_uri", config.redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", config.scopes)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("access_type", "offline") // Get refresh token
  authUrl.searchParams.set("prompt", "consent") // Force consent to get refresh token

  return {
    authUrl: authUrl.toString(),
    state,
  }
})

/**
 * Handle Google Calendar OAuth callback
 * Exchanges authorization code for tokens and creates calendar connection
 */
export const googleCalendarAuthCallback = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const config = getGoogleCalendarConfig()

  if (!config.clientId || !config.clientSecret) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Google Calendar not properly configured"
    )
  }

  // Get authorization code from request
  const { code, state } = data

  if (!code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Authorization code is required"
    )
  }

  // Verify state parameter
  if (!state || !state.startsWith(context.auth.uid)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid state parameter"
    )
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Google token exchange failed:", errorText)
      throw new functions.https.HttpsError(
        "internal",
        "Failed to exchange authorization code"
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in || 3600

    if (!accessToken) {
      throw new functions.https.HttpsError(
        "internal",
        "No access token in response"
      )
    }

    // Get user's calendar list
    const calendarsResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarsResponse.ok) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch calendar list"
      )
    }

    const calendarsData = await calendarsResponse.json()
    const calendars = calendarsData.items || []

    // Get user info to get email
    const userinfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )

    let email = "unknown@google.com"
    if (userinfoResponse.ok) {
      const userinfo = await userinfoResponse.json()
      email = userinfo.email || email
    }

    // Store tokens in Secret Manager (TODO: implement encryption)
    // For now, we'll store a reference that tokens are server-side only
    const connectionId = admin.firestore().collection("calendarConnections").doc().id

    // Store encrypted tokens in Secret Manager
    // TODO: Implement proper encryption using @google-cloud/secret-manager
    // For now, we'll store tokens in Firestore (NOT RECOMMENDED FOR PRODUCTION)
    await admin.firestore().collection("_calendarTokens").doc(connectionId).set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Create calendar connection document
    const connection = {
      id: connectionId,
      userId: context.auth.uid,
      provider: "google",
      providerAccountId: email,
      providerAccountName: email,
      calendars: calendars.map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description || "",
        isPrimary: cal.primary || false,
        isSelected: cal.primary || false, // Auto-select primary calendar
        color: cal.backgroundColor || "",
        timeZone: cal.timeZone || "",
        accessRole: cal.accessRole || "reader",
      })),
      syncEnabled: true,
      syncDirection: "import",
      status: "active",
      tokenExpiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
      createdAt: new Date().toISOString(),
    }

    await admin.firestore().collection("calendarConnections").doc(connectionId).set(connection)

    // Update user profile with connection reference
    await admin.firestore().collection("personProfiles").doc(context.auth.uid).update({
      "calendarConnections.google": connectionId,
    })

    return {
      success: true,
      connectionId,
      email,
      calendarsCount: calendars.length,
    }
  } catch (error: any) {
    console.error("Google Calendar callback error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Internal server error")
  }
})

/**
 * Unlink Google Calendar from user
 */
export const unlinkGoogleCalendar = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const { connectionId } = data

  if (!connectionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Connection ID is required"
    )
  }

  try {
    // Verify connection belongs to user
    const connectionRef = admin.firestore().collection("calendarConnections").doc(connectionId)
    const connectionDoc = await connectionRef.get()

    if (!connectionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Connection not found"
      )
    }

    const connectionData = connectionDoc.data()
    if (connectionData?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to delete this connection"
      )
    }

    // Delete tokens
    await admin.firestore().collection("_calendarTokens").doc(connectionId).delete()

    // Delete connection
    await connectionRef.delete()

    // Update user profile
    await admin.firestore().collection("personProfiles").doc(context.auth.uid).update({
      "calendarConnections.google": admin.firestore.FieldValue.delete(),
    })

    return { success: true }
  } catch (error: any) {
    console.error("Unlink Google Calendar error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to unlink Google Calendar")
  }
})

// ============================================================================
// GOOGLE CALENDAR SYNC
// ============================================================================

import { syncGoogleCalendarEvents } from "./calendar-sync"

/**
 * Manual sync trigger for Google Calendar
 * Allows users to manually sync their calendar
 */
export const syncGoogleCalendar = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const { connectionId } = data

  if (!connectionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Connection ID is required"
    )
  }

  try {
    // Verify connection belongs to user
    const connectionDoc = await admin
      .firestore()
      .collection("calendarConnections")
      .doc(connectionId)
      .get()

    if (!connectionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Connection not found"
      )
    }

    const connectionData = connectionDoc.data()
    if (connectionData?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to sync this connection"
      )
    }

    // Trigger sync
    const syncLog = await syncGoogleCalendarEvents(context.auth.uid, connectionId)

    return {
      success: true,
      syncLog,
    }
  } catch (error: any) {
    console.error("Manual sync error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to sync calendar")
  }
})

/**
 * Scheduled function to sync all Google Calendar connections
 * Runs every hour to keep calendars in sync
 */
export const scheduledGoogleCalendarSync = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    try {
      console.log("Starting scheduled Google Calendar sync...")

      // Get all active Google Calendar connections
      const connectionsSnapshot = await admin
        .firestore()
        .collection("calendarConnections")
        .where("provider", "==", "google")
        .where("status", "==", "active")
        .where("syncEnabled", "==", true)
        .get()

      console.log(`Found ${connectionsSnapshot.size} connections to sync`)

      // Sync each connection
      const syncPromises = connectionsSnapshot.docs.map(async (doc) => {
        const connection = doc.data()
        try {
          await syncGoogleCalendarEvents(connection.userId, doc.id)
          console.log(`Synced connection ${doc.id}`)
        } catch (error) {
          console.error(`Failed to sync connection ${doc.id}:`, error)
        }
      })

      await Promise.all(syncPromises)

      console.log("Scheduled sync completed")
      return null
    } catch (error) {
      console.error("Scheduled sync error:", error)
      return null
    }
  })

/**
 * Webhook handler for Google Calendar push notifications
 * Google sends notifications when calendar events change
 */
export const googleCalendarWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Verify this is from Google
    const channelId = req.headers["x-goog-channel-id"]
    const resourceId = req.headers["x-goog-resource-id"]
    const resourceState = req.headers["x-goog-resource-state"]

    if (!channelId || !resourceId) {
      console.error("Invalid webhook headers")
      res.status(400).send("Invalid request")
      return
    }

    console.log(`Webhook received: channel=${channelId}, state=${resourceState}`)

    // Handle sync notification
    if (resourceState === "sync") {
      // Initial sync notification, just acknowledge
      res.status(200).send("OK")
      return
    }

    // Find connection by webhook channel ID
    const connectionsSnapshot = await admin
      .firestore()
      .collection("calendarConnections")
      .where("webhookChannelId", "==", channelId)
      .where("webhookResourceId", "==", resourceId)
      .limit(1)
      .get()

    if (connectionsSnapshot.empty) {
      console.error(`No connection found for channel ${channelId}`)
      res.status(404).send("Connection not found")
      return
    }

    const connectionDoc = connectionsSnapshot.docs[0]
    const connection = connectionDoc.data()

    // Trigger sync for this connection
    await syncGoogleCalendarEvents(connection.userId, connectionDoc.id)

    console.log(`Webhook sync completed for connection ${connectionDoc.id}`)
    res.status(200).send("OK")
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).send("Internal server error")
  }
})

/**
 * Scheduled function to renew Google Calendar webhook channels
 * Channels expire after a certain time and need to be renewed
 * Runs daily to check and renew expiring channels
 */
export const renewGoogleCalendarChannels = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    try {
      console.log("Checking for expiring Google Calendar webhook channels...")

      // Get connections with expiring channels (within next 2 days)
      const twoDaysFromNow = new Date()
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

      const connectionsSnapshot = await admin
        .firestore()
        .collection("calendarConnections")
        .where("provider", "==", "google")
        .where("status", "==", "active")
        .get()

      const renewPromises = connectionsSnapshot.docs
        .filter((doc) => {
          const connection = doc.data()
          if (!connection.webhookExpiration) return false

          const expiration = new Date(connection.webhookExpiration)
          return expiration <= twoDaysFromNow
        })
        .map(async (doc) => {
          try {
            // TODO: Implement channel renewal with Google Calendar API
            // For now, just log that renewal is needed
            console.log(`Channel renewal needed for connection ${doc.id}`)

            // Mark channel as needing renewal
            await doc.ref.update({
              status: "expired",
              syncError: "Webhook channel expired, please reconnect",
            })
          } catch (error) {
            console.error(`Failed to renew channel for ${doc.id}:`, error)
          }
        })

      await Promise.all(renewPromises)

      console.log("Channel renewal check completed")
      return null
    } catch (error) {
      console.error("Channel renewal error:", error)
      return null
    }
  })

// ============================================================================
// MICROSOFT CALENDAR OAUTH
// ============================================================================

/**
 * Microsoft Calendar OAuth Configuration
 * Set via Firebase Functions config:
 * firebase functions:config:set microsoft.client_id="YOUR_CLIENT_ID"
 * firebase functions:config:set microsoft.client_secret="YOUR_CLIENT_SECRET"
 * firebase functions:config:set microsoft.redirect_uri="YOUR_REDIRECT_URI"
 * firebase functions:config:set microsoft.tenant_id="common"
 */

interface MicrosoftCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  tenantId: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
}

function getMicrosoftCalendarConfig(): MicrosoftCalendarConfig {
  const tenantId = functions.config().microsoft?.tenant_id || process.env.MICROSOFT_TENANT_ID || "common"

  return {
    clientId: functions.config().microsoft?.client_id || process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: functions.config().microsoft?.client_secret || process.env.MICROSOFT_CLIENT_SECRET || "",
    redirectUri: functions.config().microsoft?.redirect_uri || process.env.MICROSOFT_REDIRECT_URI || "",
    tenantId,
    authorizeUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    scopes: "https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite offline_access",
  }
}

/**
 * Initiate Microsoft Calendar OAuth flow
 * Returns the authorization URL to redirect the user to
 */
export const microsoftCalendarAuthStart = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const config = getMicrosoftCalendarConfig()

  if (!config.clientId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Microsoft Calendar client ID not configured"
    )
  }

  // Generate state parameter for CSRF protection
  const state = `${context.auth.uid}-${Math.random().toString(36).substring(2, 15)}`

  // Build authorization URL
  const authUrl = new URL(config.authorizeUrl)
  authUrl.searchParams.set("client_id", config.clientId)
  authUrl.searchParams.set("redirect_uri", config.redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", config.scopes)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("response_mode", "query")

  return {
    authUrl: authUrl.toString(),
    state,
  }
})

/**
 * Handle Microsoft Calendar OAuth callback
 * Exchanges authorization code for tokens and creates calendar connection
 */
export const microsoftCalendarAuthCallback = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const config = getMicrosoftCalendarConfig()

  if (!config.clientId || !config.clientSecret) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Microsoft Calendar not properly configured"
    )
  }

  // Get authorization code from request
  const { code, state } = data

  if (!code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Authorization code is required"
    )
  }

  // Verify state parameter
  if (!state || !state.startsWith(context.auth.uid)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid state parameter"
    )
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Microsoft token exchange failed:", errorText)
      throw new functions.https.HttpsError(
        "internal",
        "Failed to exchange authorization code"
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in || 3600

    if (!accessToken) {
      throw new functions.https.HttpsError(
        "internal",
        "No access token in response"
      )
    }

    // Get user's calendar list
    const calendarsResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendars",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarsResponse.ok) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch calendar list"
      )
    }

    const calendarsData = await calendarsResponse.json()
    const calendars = calendarsData.value || []

    // Get user info to get email
    const userinfoResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )

    let email = "unknown@microsoft.com"
    let userId = ""
    if (userinfoResponse.ok) {
      const userinfo = await userinfoResponse.json()
      email = userinfo.mail || userinfo.userPrincipalName || email
      userId = userinfo.id || ""
    }

    // Create connection ID
    const connectionId = admin.firestore().collection("calendarConnections").doc().id

    // Store tokens in Firestore (TODO: migrate to Secret Manager for production)
    await admin.firestore().collection("_calendarTokens").doc(connectionId).set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Create calendar connection document
    const connection = {
      id: connectionId,
      userId: context.auth.uid,
      provider: "microsoft",
      providerAccountId: userId || email,
      providerAccountName: email,
      calendars: calendars.map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        description: cal.description || "",
        isPrimary: cal.isDefaultCalendar || false,
        isSelected: cal.isDefaultCalendar || false, // Auto-select primary calendar
        color: cal.color || "",
        timeZone: cal.timeZone || "",
        accessRole: cal.canEdit ? "owner" : "reader",
      })),
      syncEnabled: true,
      syncDirection: "import",
      status: "active",
      tokenExpiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
      createdAt: new Date().toISOString(),
    }

    await admin.firestore().collection("calendarConnections").doc(connectionId).set(connection)

    // Update user profile with connection reference
    await admin.firestore().collection("personProfiles").doc(context.auth.uid).update({
      "calendarConnections.microsoft": connectionId,
    })

    return {
      success: true,
      connectionId,
      email,
      calendarsCount: calendars.length,
    }
  } catch (error: any) {
    console.error("Microsoft Calendar callback error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Internal server error")
  }
})

/**
 * Unlink Microsoft Calendar from user
 */
export const unlinkMicrosoftCalendar = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const { connectionId } = data

  if (!connectionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Connection ID is required"
    )
  }

  try {
    // Verify connection belongs to user
    const connectionRef = admin.firestore().collection("calendarConnections").doc(connectionId)
    const connectionDoc = await connectionRef.get()

    if (!connectionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Connection not found"
      )
    }

    const connectionData = connectionDoc.data()
    if (connectionData?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to delete this connection"
      )
    }

    // Delete subscription if it exists
    if (connectionData?.subscriptionId) {
      try {
        const tokensDoc = await admin.firestore().collection("_calendarTokens").doc(connectionId).get()
        if (tokensDoc.exists) {
          const tokens = tokensDoc.data()
          if (tokens?.accessToken) {
            await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${connectionData.subscriptionId}`, {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${tokens.accessToken}`,
              },
            })
          }
        }
      } catch (error) {
        console.error("Error deleting Microsoft subscription:", error)
        // Continue with unlinking even if subscription deletion fails
      }
    }

    // Delete tokens
    await admin.firestore().collection("_calendarTokens").doc(connectionId).delete()

    // Delete connection
    await connectionRef.delete()

    // Update user profile
    await admin.firestore().collection("personProfiles").doc(context.auth.uid).update({
      "calendarConnections.microsoft": admin.firestore.FieldValue.delete(),
    })

    return { success: true }
  } catch (error: any) {
    console.error("Unlink Microsoft Calendar error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to unlink Microsoft Calendar")
  }
})

// ============================================================================
// MICROSOFT CALENDAR SYNC
// ============================================================================

import { syncMicrosoftCalendarEvents } from "./calendar-sync"

/**
 * Manual sync trigger for Microsoft Calendar
 * Allows users to manually sync their calendar
 */
export const syncMicrosoftCalendar = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    )
  }

  const { connectionId } = data

  if (!connectionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Connection ID is required"
    )
  }

  try {
    // Verify connection belongs to user
    const connectionDoc = await admin
      .firestore()
      .collection("calendarConnections")
      .doc(connectionId)
      .get()

    if (!connectionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Connection not found"
      )
    }

    const connectionData = connectionDoc.data()
    if (connectionData?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to sync this connection"
      )
    }

    // Trigger sync
    const syncLog = await syncMicrosoftCalendarEvents(context.auth.uid, connectionId)

    return {
      success: true,
      syncLog,
    }
  } catch (error: any) {
    console.error("Manual sync error:", error)
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError("internal", "Failed to sync calendar")
  }
})

/**
 * Scheduled function to sync all Microsoft Calendar connections
 * Runs every hour to keep calendars in sync
 */
export const scheduledMicrosoftCalendarSync = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    try {
      console.log("Starting scheduled Microsoft Calendar sync...")

      // Get all active Microsoft Calendar connections
      const connectionsSnapshot = await admin
        .firestore()
        .collection("calendarConnections")
        .where("provider", "==", "microsoft")
        .where("status", "==", "active")
        .where("syncEnabled", "==", true)
        .get()

      console.log(`Found ${connectionsSnapshot.size} connections to sync`)

      // Sync each connection
      const syncPromises = connectionsSnapshot.docs.map(async (doc) => {
        const connection = doc.data()
        try {
          await syncMicrosoftCalendarEvents(connection.userId, doc.id)
          console.log(`Synced connection ${doc.id}`)
        } catch (error) {
          console.error(`Failed to sync connection ${doc.id}:`, error)
        }
      })

      await Promise.all(syncPromises)

      console.log("Scheduled sync completed")
      return null
    } catch (error) {
      console.error("Scheduled sync error:", error)
      return null
    }
  })

/**
 * Webhook handler for Microsoft Graph push notifications
 * Microsoft sends notifications when calendar events change
 */
export const microsoftCalendarWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Handle validation token (Microsoft requires this on first setup)
    if (req.query.validationToken) {
      console.log("Webhook validation requested")
      res.status(200).send(req.query.validationToken)
      return
    }

    // Parse notifications
    const notifications = req.body.value || []

    console.log(`Webhook received ${notifications.length} notifications`)

    // Acknowledge immediately
    res.status(202).send("Accepted")

    // Process each notification asynchronously
    for (const notification of notifications) {
      const connectionId = notification.clientState

      if (!connectionId) {
        console.error("No clientState in notification")
        continue
      }

      // Find connection
      const connectionDoc = await admin
        .firestore()
        .collection("calendarConnections")
        .doc(connectionId)
        .get()

      if (!connectionDoc.exists) {
        console.error(`No connection found for ${connectionId}`)
        continue
      }

      const connection = connectionDoc.data()

      // Trigger sync for this connection
      try {
        await syncMicrosoftCalendarEvents(connection?.userId || "", connectionId)
        console.log(`Webhook sync completed for connection ${connectionId}`)
      } catch (error) {
        console.error(`Webhook sync failed for ${connectionId}:`, error)
      }
    }
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).send("Internal server error")
  }
})

/**
 * Scheduled function to renew Microsoft Graph subscriptions
 * Subscriptions expire after 3 days and need to be renewed
 * Runs every 2 days to check and renew expiring subscriptions
 */
export const renewMicrosoftSubscriptions = functions.pubsub
  .schedule("every 48 hours")
  .onRun(async (context) => {
    try {
      console.log("Checking for expiring Microsoft Calendar subscriptions...")

      // Get connections with expiring subscriptions (within next 24 hours)
      const oneDayFromNow = new Date()
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)

      const connectionsSnapshot = await admin
        .firestore()
        .collection("calendarConnections")
        .where("provider", "==", "microsoft")
        .where("status", "==", "active")
        .get()

      const renewPromises = connectionsSnapshot.docs
        .filter((doc) => {
          const connection = doc.data()
          if (!connection.subscriptionExpiration) return false

          const expiration = new Date(connection.subscriptionExpiration)
          return expiration <= oneDayFromNow
        })
        .map(async (doc) => {
          try {
            const connection = doc.data()

            // Get access token
            const tokensDoc = await admin.firestore().collection("_calendarTokens").doc(doc.id).get()
            if (!tokensDoc.exists) {
              console.error(`No tokens found for connection ${doc.id}`)
              return
            }

            const tokens = tokensDoc.data()
            const accessToken = tokens?.accessToken

            if (!accessToken) {
              console.error(`No access token for connection ${doc.id}`)
              return
            }

            // Renew subscription
            const newExpiration = new Date()
            newExpiration.setDate(newExpiration.getDate() + 3) // 3 days from now

            const renewResponse = await fetch(
              `https://graph.microsoft.com/v1.0/subscriptions/${connection.subscriptionId}`,
              {
                method: "PATCH",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  expirationDateTime: newExpiration.toISOString(),
                }),
              }
            )

            if (renewResponse.ok) {
              await doc.ref.update({
                subscriptionExpiration: newExpiration.toISOString(),
              })
              console.log(`Subscription renewed for connection ${doc.id}`)
            } else {
              const errorText = await renewResponse.text()
              console.error(`Failed to renew subscription for ${doc.id}:`, errorText)

              // Mark as expired
              await doc.ref.update({
                status: "expired",
                syncError: "Subscription expired, please reconnect",
              })
            }
          } catch (error) {
            console.error(`Failed to renew subscription for ${doc.id}:`, error)
          }
        })

      await Promise.all(renewPromises)

      console.log("Subscription renewal check completed")
      return null
    } catch (error) {
      console.error("Subscription renewal error:", error)
      return null
    }
  })
