/**
 * Person Helper Utilities
 * 
 * Type System Clarification:
 * - PersonProfile: Full profile data stored in Firestore (source of truth)
 * - Person: UI-only display format (derived from PersonProfile)
 * - All ID fields (primaryOwner, helpers, ownerId, etc.) store PersonProfile IDs, not Person IDs
 */

import { Person, PersonProfile } from "./types"

/**
 * Generates a consistent color for a profile based on lab and index
 */
export function getColorForProfile(profile: PersonProfile, index: number): string {
  // Assign colors based on lab for consistency
  const labColors: Record<string, string> = {
    "Martinez Lab": "#14b8a6",
    "Rodriguez Lab": "#8b5cf6"
  }

  // If lab has assigned color, use variations of it
  if (labColors[profile.labName]) {
    const baseColor = labColors[profile.labName]
    // Create variations for different people in same lab
    const hueShift = index * 15
    return baseColor // Could enhance with actual color manipulation
  }

  // Default color palette
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#14b8a6", // teal
  ]

  return colors[index % colors.length]
}

/**
 * Converts a PersonProfile to a Person (UI-only display format)
 * Note: Person is a simplified view for UI components. The ID is the PersonProfile ID.
 */
export function personProfileToPerson(profile: PersonProfile, index: number = 0): Person {
  return {
    id: profile.id, // PersonProfile ID
    name: `${profile.firstName} ${profile.lastName}`,
    color: getColorForProfile(profile, index),
    avatarUrl: undefined, // Can be added later
    roleId: undefined, // Can be added later
    role: profile.positionDisplayName || profile.position || "Member",
  }
}

/**
 * Converts an array of PersonProfiles to Person array for UI display
 */
export function personProfilesToPeople(profiles: PersonProfile[]): Person[] {
  return profiles.map((profile, index) => personProfileToPerson(profile, index))
}

/**
 * Finds a PersonProfile by PersonProfile ID
 */
export function findPersonProfileById(profiles: PersonProfile[], id: string): PersonProfile | undefined {
  return profiles.find(p => p.id === id)
}

/**
 * Gets the display name for a PersonProfile ID
 */
export function getPersonDisplayName(profiles: PersonProfile[], personProfileId?: string): string {
  if (!personProfileId) return "Unassigned"
  const profile = findPersonProfileById(profiles, personProfileId)
  if (!profile) return "Unknown"
  return `${profile.firstName} ${profile.lastName}`
}

