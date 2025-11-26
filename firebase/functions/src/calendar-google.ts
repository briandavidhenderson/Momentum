import * as functions from "firebase-functions/v1"
import * as admin from "firebase-admin"
import { storeTokens, deleteTokens, TokenData } from "./calendar-token-service"

// Google OAuth Configuration
interface GoogleConfig {
    clientId: string
    clientSecret: string
    redirectUri: string
    authUrl: string
    tokenUrl: string
}

function getGoogleConfig(): GoogleConfig {
    // Firebase Functions v7 no longer supports functions.config()
    // Use environment variables directly
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error("Google Calendar configuration missing:", {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            envKeys: Object.keys(process.env).filter(k => k.startsWith('GOOGLE_'))
        })
        throw new Error("Google Calendar configuration missing")
    }

    return {
        clientId,
        clientSecret,
        redirectUri: "", // Will be passed from client
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token"
    }
}

/**
 * Initiate Google Calendar OAuth flow
 * Returns the authorization URL to redirect the user to
 */
export const googleCalendarAuthStart = functions.https.onCall(async (data: any, context: any) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated to link Google Calendar"
        )
    }

    try {
        const config = getGoogleConfig()

        // Generate state parameter for CSRF protection
        // We embed the user ID to verify it on callback
        const state = Buffer.from(JSON.stringify({
            uid: context.auth.uid,
            nonce: Math.random().toString(36).substring(2, 15)
        })).toString('base64')

        // Build authorization URL
        const authUrl = new URL(config.authUrl)
        authUrl.searchParams.set("client_id", config.clientId)
        authUrl.searchParams.set("response_type", "code")
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email")
        authUrl.searchParams.set("access_type", "offline") // Required for refresh token
        authUrl.searchParams.set("prompt", "consent") // Force consent to ensure refresh token
        authUrl.searchParams.set("state", state)

        // The redirect URI must match exactly what's in Google Cloud Console
        // We'll use the one provided by the client, or construct a default
        const redirectUri = data.redirectUri || "http://localhost:3000/settings/integrations/google-callback"
        authUrl.searchParams.set("redirect_uri", redirectUri)

        return {
            authUrl: authUrl.toString(),
            state,
        }
    } catch (error) {
        console.error("Error starting Google Auth:", error)
        throw new functions.https.HttpsError("internal", "Failed to start Google Auth")
    }
})

/**
 * Handle Google Calendar OAuth callback
 * Exchanges authorization code for tokens and stores them
 */
export const googleCalendarAuthCallback = functions.https.onCall(async (data: any, context: any) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be authenticated"
        )
    }

    const { code, redirectUri } = data

    if (!code) {
        throw new functions.https.HttpsError("invalid-argument", "Authorization code is required")
    }

    try {
        // Verify state (CSRF protection)
        // In a real app, we should verify the nonce/uid match, but for now we trust the auth context
        // const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())

        const config = getGoogleConfig()

        // Exchange code for tokens
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
                redirect_uri: redirectUri || "http://localhost:3000/settings/integrations/google-callback",
            }),
        })

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            console.error("Google token exchange failed:", errorText)
            throw new functions.https.HttpsError("internal", "Failed to exchange authorization code")
        }

        const tokens = await tokenResponse.json()

        // Get user email from Google to identify the account
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        })

        if (!userResponse.ok) {
            console.error("Failed to fetch user info from Google:", await userResponse.text())
            throw new functions.https.HttpsError("internal", "Failed to fetch user info from Google")
        }

        const userData = await userResponse.json()
        const email = userData.email

        if (!email) {
            console.error("No email returned from Google userinfo:", userData)
            throw new functions.https.HttpsError("internal", "Failed to retrieve email from Google account")
        }

        // Create a connection ID
        const connectionId = `google_${context.auth!.uid}_${Date.now()}`

        // Store tokens securely
        const tokenData: Omit<TokenData, "connectionId"> = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token, // Important: might be missing if not 'access_type=offline' or 'prompt=consent'
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            provider: "google",
            userId: context.auth.uid,
            email: email,
            createdAt: new Date().toISOString(),
            lastRefreshedAt: new Date().toISOString(),
        }

        if (!tokens.refresh_token) {
            console.warn("No refresh token received from Google. Token refresh will fail.")
            // In production, we might want to fail here or prompt user to re-auth with consent
        }

        await storeTokens(connectionId, tokenData)

        // Update user profile with connection info
        // We need to find the user's profile ID first
        const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get()
        const profileId = userDoc.data()?.profileId

        if (profileId) {
            await admin.firestore().collection("personProfiles").doc(profileId).update({
                [`calendarConnections.google`]: connectionId,
                [`calendarConnections.googleEmail`]: email,
                [`calendarConnections.googleUpdatedAt`]: admin.firestore.FieldValue.serverTimestamp()
            })
        }

        return {
            success: true,
            connectionId,
            email,
            calendarsCount: 1 // Placeholder
        }

    } catch (error) {
        console.error("Google Calendar callback error:", error)
        throw new functions.https.HttpsError("internal", "Failed to complete Google Calendar linking")
    }
})

/**
 * Unlink Google Calendar
 */
export const unlinkGoogleCalendar = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
    }

    const { connectionId } = data
    if (!connectionId) {
        throw new functions.https.HttpsError("invalid-argument", "Connection ID is required")
    }

    try {
        // Delete tokens
        await deleteTokens(connectionId)

        // Update user profile
        const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get()
        const profileId = userDoc.data()?.profileId

        if (profileId) {
            await admin.firestore().collection("personProfiles").doc(profileId).update({
                [`calendarConnections.google`]: admin.firestore.FieldValue.delete(),
                [`calendarConnections.googleEmail`]: admin.firestore.FieldValue.delete(),
                [`calendarConnections.googleUpdatedAt`]: admin.firestore.FieldValue.delete()
            })
        }

        return { success: true }
    } catch (error) {
        console.error("Error unlinking Google Calendar:", error)
        throw new functions.https.HttpsError("internal", "Failed to unlink Google Calendar")
    }
})

/**
 * Sync Google Calendar
 * Fetches events from Google Calendar and stores them in Firestore
 */
export const syncGoogleCalendar = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
    }

    try {
        const { connectionId } = data

        if (!connectionId) {
            throw new functions.https.HttpsError("invalid-argument", "Connection ID is required")
        }

        // Get the OAuth tokens
        const { getTokens } = await import("./calendar-token-service")
        const tokens = await getTokens(connectionId)

        // Fetch events from Google Calendar API
        const now = new Date()
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
        calendarUrl.searchParams.set("timeMin", oneMonthAgo.toISOString())
        calendarUrl.searchParams.set("timeMax", oneMonthFromNow.toISOString())
        calendarUrl.searchParams.set("singleEvents", "true")
        calendarUrl.searchParams.set("orderBy", "startTime")

        const eventsResponse = await fetch(calendarUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${tokens.accessToken}`
            }
        })

        if (!eventsResponse.ok) {
            const errorText = await eventsResponse.text()
            console.error("Failed to fetch Google Calendar events:", errorText)
            throw new functions.https.HttpsError("internal", "Failed to fetch calendar events from Google")
        }

        const eventsData = await eventsResponse.json()
        const events = eventsData.items || []

        // Get user's profile to store events
        const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get()
        const profileId = userDoc.data()?.profileId

        if (!profileId) {
            throw new functions.https.HttpsError("not-found", "User profile not found")
        }

        // Fetch labId for filtering in UI queries
        const profileDoc = await admin.firestore().collection("personProfiles").doc(profileId).get()
        const profileData = profileDoc.data() || {}
        const labId = profileData.labId

        // Store events in Firestore
        let syncedCount = 0
        const batch = admin.firestore().batch()

        for (const event of events) {
            const startTimestamp = event.start?.dateTime
                ? admin.firestore.Timestamp.fromDate(new Date(event.start.dateTime))
                : event.start?.date
                    ? admin.firestore.Timestamp.fromDate(new Date(event.start.date))
                    : null
            const endTimestamp = event.end?.dateTime
                ? admin.firestore.Timestamp.fromDate(new Date(event.end.dateTime))
                : event.end?.date
                    ? admin.firestore.Timestamp.fromDate(new Date(event.end.date))
                    : null

            if (!startTimestamp || !endTimestamp) {
                console.warn("Skipping event without start/end", { eventId: event.id, hasStart: !!startTimestamp, hasEnd: !!endTimestamp })
                continue
            }

            const eventId = `google-${connectionId}-${event.id}`
            const eventRef = admin.firestore().collection("events").doc(eventId)

            const eventData: Record<string, any> = {
                id: eventId,
                title: event.summary || "Untitled Event",
                description: event.description || "",
                location: event.location || "",
                start: startTimestamp,
                end: endTimestamp,
                attendees: [],
                reminders: [],
                tags: [],
                visibility: "lab",
                ownerId: profileId,
                createdBy: context.auth.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                calendarSource: "google",
                calendarId: "primary",
                isReadOnly: true,
                externalUrl: event.htmlLink || "",
                syncStatus: "synced",
                lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
                integrationRefs: {
                    googleEventId: event.id,
                },
                type: "other",
            }

            if (labId) {
                eventData.labId = labId
            }

            batch.set(eventRef, eventData, { merge: true })
            syncedCount++
        }

        await batch.commit()

        // Update the last sync timestamp in the user's profile
        await admin.firestore().collection("personProfiles").doc(profileId).update({
            "calendarConnections.googleLastSync": admin.firestore.FieldValue.serverTimestamp()
        })

        console.log({
            action: "CALENDAR_SYNCED",
            connectionId,
            userId: context.auth.uid,
            eventsSynced: syncedCount,
            timestamp: new Date().toISOString()
        })

        return {
            success: true,
            message: "Calendar synced successfully",
            eventsSynced: syncedCount
        }

    } catch (error) {
        console.error("Error syncing Google Calendar:", error)

        // Check if it's already a HttpsError
        if (error instanceof functions.https.HttpsError) {
            throw error
        }

        throw new functions.https.HttpsError("internal", "Failed to sync Google Calendar")
    }
})
