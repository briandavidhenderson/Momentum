/**
 * Microsoft Calendar (Outlook) OAuth Integration
 * Handles linking Microsoft/Outlook Calendar to user accounts
 * Following the pattern established by Google Calendar OAuth
 */

import { getFunctions, httpsCallable } from "firebase/functions"
import { PersonProfile } from "../types"

/**
 * Get Firebase Functions instance
 */
function getFunctionsInstance() {
  return getFunctions()
}

/**
 * Link Microsoft Calendar to currently signed-in user
 * Opens OAuth popup and creates calendar connection
 */
export async function linkMicrosoftCalendar(): Promise<boolean> {
  try {
    // TODO: Implement Microsoft Calendar OAuth (Phase 5)
    // This is a placeholder for the Microsoft Calendar integration
    console.log("Microsoft Calendar integration coming in Phase 5")
    throw new Error("Microsoft Calendar integration not yet implemented")
  } catch (error: any) {
    console.error("Microsoft Calendar linking error:", error)
    throw new Error(error.message || "Failed to link Microsoft Calendar")
  }
}

/**
 * Unlink Microsoft Calendar from current user
 */
export async function unlinkMicrosoftCalendar(connectionId: string): Promise<void> {
  try {
    // TODO: Implement Microsoft Calendar unlink (Phase 5)
    console.log("Microsoft Calendar unlink coming in Phase 5")
    throw new Error("Microsoft Calendar integration not yet implemented")
  } catch (error: any) {
    console.error("Microsoft Calendar unlinking error:", error)
    throw new Error(error.message || "Failed to unlink Microsoft Calendar")
  }
}

/**
 * Check if Microsoft Calendar is linked for a user
 */
export function isMicrosoftCalendarLinked(profile: PersonProfile): boolean {
  return !!profile.calendarConnections?.microsoft
}

/**
 * Get Microsoft Calendar connection ID for a user
 */
export function getMicrosoftCalendarConnectionId(profile: PersonProfile): string | null {
  return profile.calendarConnections?.microsoft || null
}
