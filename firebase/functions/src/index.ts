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

    // Store ORCID data in Firestore profile
    await admin.firestore().collection("profiles").doc(context.auth.uid).update({
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      orcidVerified: true,
      orcidLastSynced: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      orcidId,
      orcidUrl: `${config.baseUrl}/${orcidId}`,
      name,
    }
  } catch (error) {
    console.error("ORCID link error:", error)
    throw new functions.https.HttpsError("internal", "Failed to link ORCID account")
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
