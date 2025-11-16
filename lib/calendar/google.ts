/**
 * Google Calendar OAuth Integration
 * Handles linking Google Calendar to user accounts
 * Following the pattern established by ORCID OAuth (lib/auth/orcid.ts)
 */

import { getFunctions, httpsCallable } from "firebase/functions"
import { PersonProfile } from "../types"
import { logger } from "@/lib/logger"

/**
 * Get Firebase Functions instance
 */
function getFunctionsInstance() {
  return getFunctions()
}

/**
 * Open Google Calendar authorization popup and handle OAuth flow
 */
async function initiateGoogleCalendarAuth(): Promise<{ code: string; state: string }> {
  const functions = getFunctionsInstance()
  const startAuth = httpsCallable(functions, "googleCalendarAuthStart")

  const result: any = await startAuth({})
  const { authUrl, state } = result.data

  // Open popup for Google authorization
  const width = 600
  const height = 700
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  const popup = window.open(
    authUrl,
    "google-calendar-auth",
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
          reject(new Error("Authorization was cancelled."))
          return
        }

        // Check if popup has navigated to our callback URL
        try {
          const popupUrl = new URL(popup.location.href)

          // Check if we're on the callback page
          if (popupUrl.origin === window.location.origin) {
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
      reject(new Error("Authorization timed out."))
    }, 5 * 60 * 1000)
  })
}

/**
 * Link Google Calendar to currently signed-in user
 * Opens OAuth popup and creates calendar connection
 */
export async function linkGoogleCalendar(): Promise<boolean> {
  try {
    // Initiate OAuth flow and get authorization code
    const { code, state } = await initiateGoogleCalendarAuth()

    // Exchange code for tokens and create connection via backend
    const functions = getFunctionsInstance()
    const callback = httpsCallable(functions, "googleCalendarAuthCallback")

    const result: any = await callback({
      code,
      state,
    })

    const { success, connectionId, email, calendarsCount } = result.data

    if (success) {
      logger.info(`Google Calendar connected: ${email} (${calendarsCount} calendars)`)
      return true
    }

    return false
  } catch (error: any) {
    logger.error("Google Calendar linking error:", error)
    throw new Error(error.message || "Failed to link Google Calendar")
  }
}

/**
 * Unlink Google Calendar from current user
 */
export async function unlinkGoogleCalendar(connectionId: string): Promise<void> {
  try {
    const functions = getFunctionsInstance()
    const unlink = httpsCallable(functions, "unlinkGoogleCalendar")

    await unlink({ connectionId })
  } catch (error: any) {
    logger.error("Google Calendar unlinking error", error)
    throw new Error(error.message || "Failed to unlink Google Calendar")
  }
}

/**
 * Check if Google Calendar is linked for a user
 */
export function isGoogleCalendarLinked(profile: PersonProfile): boolean {
  return !!profile.calendarConnections?.google
}

/**
 * Get Google Calendar connection ID for a user
 */
export function getGoogleCalendarConnectionId(profile: PersonProfile): string | null {
  return profile.calendarConnections?.google || null
}

/**
 * Manually trigger sync for Google Calendar
 */
export async function syncGoogleCalendar(connectionId: string): Promise<void> {
  try {
    const functions = getFunctionsInstance()
    const sync = httpsCallable(functions, "syncGoogleCalendar")

    await sync({ connectionId })
  } catch (error: any) {
    logger.error("Google Calendar sync error", error)
    throw new Error(error.message || "Failed to sync Google Calendar")
  }
}
