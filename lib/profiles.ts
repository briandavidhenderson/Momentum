import { PersonProfile } from "./types"

// Static profiles have been removed - all profiles are now stored dynamically
// in localStorage via the ProfileManagement component and ProfileSetupPage
export const profiles: PersonProfile[] = []

export function getProfileById(id: string): PersonProfile | undefined {
  return profiles.find((p) => p.id === id)
}

export function getProfilesByLab(lab: string): PersonProfile[] {
  return profiles.filter((p) => p.lab === lab)
}

export function getProfilesByInstitute(institute: string): PersonProfile[] {
  return profiles.filter((p) => p.institute === institute)
}

export function getProfilesByOrganisation(organisation: string): PersonProfile[] {
  return profiles.filter((p) => p.organisation === organisation)
}

// Legacy function for backwards compatibility
export function getProfilesByDepartment(department: string): PersonProfile[] {
  return profiles.filter((p) => p.institute === department)
}

export function getDirectReports(managerId: string): PersonProfile[] {
  return profiles.filter((p) => p.reportsTo === managerId)
}

