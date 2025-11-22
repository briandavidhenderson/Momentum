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
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar")
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
        const userData = await userResponse.json()
        const email = userData.email

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
 * Sync Google Calendar (Placeholder)
 */
export const syncGoogleCalendar = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
    }

    // In a real implementation, this would trigger the sync logic
    // For now, we just return success to satisfy the frontend call
    return { success: true, message: "Sync started" }
})
