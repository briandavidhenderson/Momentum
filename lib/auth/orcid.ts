/**
 * ORCID Authentication Integration
 * Handles sign-in with ORCID and linking ORCID to existing accounts
 * Using Firebase Functions for OAuth flow
 */

import { getAuth, signInWithCustomToken, unlink } from "firebase/auth"
import { getFunctions, httpsCallable } from "firebase/functions"

/**
 * Configuration for ORCID OAuth2
 * Set to true to use sandbox, false for production
 */
const USE_ORCID_SANDBOX = true

/**
 * Get Firebase Functions instance
 */
function getFunctionsInstance() {
  return getFunctions()
}

/**
 * Get the redirect URI for ORCID OAuth callback
 */
function getRedirectUri(): string {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/auth/orcid/callback`
}

/**
 * Open ORCID authorization popup and handle OAuth flow
 */
async function initiateOrcidAuth(): Promise<{ code: string; state: string }> {
  // Get authorization URL from Firebase Function
  const functions = getFunctionsInstance()
  const startAuth = httpsCallable(functions, "orcidAuthStart")

  const redirectUri = getRedirectUri()
  const result: any = await startAuth({ redirect_uri: redirectUri })

  const { authUrl, state } = result.data

  // Open popup for ORCID authorization
  const width = 500
  const height = 600
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  const popup = window.open(
    authUrl,
    "orcid-auth",
    `width=${width},height=${height},left=${left},top=${top}`
  )

  if (!popup) {
    throw new Error("Pop-up was blocked. Please allow pop-ups for this site.")
  }

  // Wait for the popup to complete and return the authorization code
  return new Promise((resolve, reject) => {
    const checkPopup = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkPopup)
          reject(new Error("Sign-in was cancelled."))
          return
        }

        // Check if popup has navigated to our callback URL
        try {
          const popupUrl = new URL(popup.location.href)
          if (popupUrl.origin === window.location.origin && popupUrl.pathname.includes("/auth/orcid/callback")) {
            const code = popupUrl.searchParams.get("code")
            const returnedState = popupUrl.searchParams.get("state")

            if (code && returnedState) {
              popup.close()
              clearInterval(checkPopup)
              resolve({ code, state: returnedState })
            }
          }
        } catch (e) {
          // Cross-origin error - popup hasn't navigated to our domain yet
        }
      } catch (e) {
        clearInterval(checkPopup)
        reject(e)
      }
    }, 500)

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkPopup)
      if (!popup.closed) {
        popup.close()
      }
      reject(new Error("Authentication timed out."))
    }, 5 * 60 * 1000)
  })
}

/**
 * Normalize ORCID iD to standard format
 * Accepts "https://orcid.org/0000-0000-0000-0000" or "0000-0000-0000-0000"
 * Returns "0000-0000-0000-0000"
 */
export function normalizeOrcid(x: string): string {
  if (!x) return ""

  // Remove URL prefix if present
  const normalized = x.replace(/^https?:\/\/(sandbox\.)?orcid\.org\//, "")

  // Validate format (should be 0000-0000-0000-000X where X is checksum)
  const orcidPattern = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/
  if (!orcidPattern.test(normalized)) {
    console.warn("Invalid ORCID format:", x)
    return ""
  }

  return normalized
}

/**
 * Sign in with ORCID (creates new account or signs into existing linked account)
 */
export async function signInWithOrcid() {
  const auth = getAuth()

  try {
    // Initiate OAuth flow and get authorization code
    const { code } = await initiateOrcidAuth()

    // Exchange code for Firebase token via backend
    const functions = getFunctionsInstance()
    const callback = httpsCallable(functions, "orcidAuthCallback")

    const result: any = await callback({
      code,
      redirect_uri: getRedirectUri(),
    })

    const { firebaseToken, orcidId, orcidUrl, name } = result.data

    // Sign in to Firebase with custom token
    await signInWithCustomToken(auth, firebaseToken)

    return {
      orcid: orcidId,
      orcidUrl,
      claims: { name, email: null },
      tokens: { idToken: null, accessToken: null }
    }
  } catch (error: any) {
    console.error("ORCID sign-in error:", error)
    throw new Error(error.message || "Failed to sign in with ORCID")
  }
}

/**
 * Link ORCID to currently signed-in user
 */
export async function linkOrcidToCurrentUser() {
  const auth = getAuth()

  if (!auth.currentUser) {
    throw new Error("No user is currently signed in")
  }

  try {
    // Initiate OAuth flow and get authorization code
    const { code } = await initiateOrcidAuth()

    // Link ORCID via backend function
    const functions = getFunctionsInstance()
    const linkAccount = httpsCallable(functions, "orcidLinkAccount")

    const result: any = await linkAccount({
      authCode: code,
      redirectUri: getRedirectUri(),
    })

    const { orcidId, orcidUrl, name } = result.data

    return {
      orcid: orcidId,
      orcidUrl,
      claims: { name, email: null },
      tokens: { idToken: null, accessToken: null }
    }
  } catch (error: any) {
    console.error("ORCID linking error:", error)

    // Handle specific errors
    if (error.message?.includes("already linked")) {
      throw new Error("This ORCID iD is already linked to another account.")
    }

    throw new Error(error.message || "Failed to link ORCID")
  }
}

/**
 * Unlink ORCID from current user
 */
export async function unlinkOrcidFromCurrentUser() {
  const auth = getAuth()

  if (!auth.currentUser) {
    throw new Error("No user is currently signed in")
  }

  try {
    // Remove ORCID data from Firestore profile
    const { getFirestore, doc, updateDoc, deleteField } = await import("firebase/firestore")
    const db = getFirestore()
    const profileRef = doc(db, "profiles", auth.currentUser.uid)

    await updateDoc(profileRef, {
      orcidId: deleteField(),
      orcidUrl: deleteField(),
      orcidVerified: deleteField(),
      orcidLastSynced: deleteField(),
    })

    // Try to unlink from Firebase auth providers (for backwards compatibility)
    try {
      await unlink(auth.currentUser, "orcid.org")
    } catch (e) {
      // Ignore if provider not linked
    }

    try {
      await unlink(auth.currentUser, "oidc.orcid")
    } catch (e) {
      // Ignore if provider not linked
    }

    return true
  } catch (error: any) {
    console.error("ORCID unlinking error:", error)
    throw new Error(error.message || "Failed to unlink ORCID")
  }
}

/**
 * Check if current user has ORCID linked
 * Checks both custom claims and provider data for backwards compatibility
 */
export async function isOrcidLinked(): Promise<boolean> {
  const auth = getAuth()

  if (!auth.currentUser) return false

  // Check provider data for old OAuth/OIDC linked accounts
  const hasOrcidProvider = auth.currentUser.providerData.some(
    provider => provider.providerId === "orcid.org" || provider.providerId === "oidc.orcid"
  )

  if (hasOrcidProvider) return true

  // Check custom claims for new Firebase Functions linked accounts
  const tokenResult = await auth.currentUser.getIdTokenResult()
  return !!tokenResult.claims.orcidId
}

/**
 * Format ORCID iD for display
 */
export function formatOrcidDisplay(orcid: string): string {
  if (!orcid) return ""

  // Ensure it's in the standard format
  const normalized = normalizeOrcid(orcid)
  return normalized || orcid
}

/**
 * Get ORCID URL for a given ORCID iD
 */
export function getOrcidUrl(orcid: string, sandbox: boolean = false): string {
  const normalized = normalizeOrcid(orcid)
  if (!normalized) return ""

  const domain = sandbox ? "sandbox.orcid.org" : "orcid.org"
  return `https://${domain}/${normalized}`
}

/**
 * Sync ORCID data (publications, bio, employment, education)
 * Re-links ORCID which triggers data sync on the backend
 */
export async function syncOrcidData(): Promise<{
  success: boolean
  message: string
  publicationsCount?: number
  employmentsCount?: number
  educationsCount?: number
}> {
  const auth = getAuth()

  if (!auth.currentUser) {
    throw new Error("User must be authenticated")
  }

  try {
    // Re-link ORCID which will trigger data fetch with the new /read-limited scope
    await linkOrcidToCurrentUser()

    return {
      success: true,
      message: "ORCID data synced successfully"
    }
  } catch (error: any) {
    console.error("ORCID sync error:", error)
    throw new Error(error.message || "Failed to sync ORCID data")
  }
}
