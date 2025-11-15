/**
 * ORCID Service
 * Handles fetching and parsing ORCID records from the ORCID API
 */

import { OrcidRecord, OrcidAffiliation, OrcidWorkSummary } from "./orcidTypes"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import { logger } from "./logger"

const ORCID_API_BASE = "https://pub.orcid.org/v3.0"
const ORCID_SANDBOX_API_BASE = "https://sandbox.orcid.org/v3.0"

/**
 * Get the ORCID API base URL based on environment
 */
function getOrcidApiBase(useSandbox: boolean = false): string {
  return useSandbox ? ORCID_SANDBOX_API_BASE : ORCID_API_BASE
}

/**
 * Build ORCID authorization URL for OAuth flow
 */
export function buildOrcidAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state?: string,
  useSandbox: boolean = false
): string {
  const baseUrl = useSandbox ? "https://sandbox.orcid.org" : "https://orcid.org"
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "/read-limited",
    redirect_uri: redirectUri,
    ...(state ? { state } : {}),
  })

  return `${baseUrl}/oauth/authorize?${params.toString()}`
}

/**
 * Parse date from ORCID format
 */
function parseOrcidDate(dateObj: any): { year?: number; month?: number; day?: number } | undefined {
  if (!dateObj) return undefined

  return {
    year: dateObj.year?.value ? parseInt(dateObj.year.value) : undefined,
    month: dateObj.month?.value ? parseInt(dateObj.month.value) : undefined,
    day: dateObj.day?.value ? parseInt(dateObj.day.value) : undefined,
  }
}

/**
 * Parse affiliations from ORCID record
 */
function parseAffiliations(
  affiliationGroup: any,
  type: OrcidAffiliation["type"]
): OrcidAffiliation[] {
  if (!affiliationGroup || !Array.isArray(affiliationGroup)) {
    return []
  }

  return affiliationGroup
    .map((item: any) => {
      const summary = item["employment-summary"] || item["education-summary"] || item["qualification-summary"]
      if (!summary) return null

      const org = summary.organization
      const affiliation: OrcidAffiliation = {
        type,
        organisation: org?.name || "Unknown",
        roleTitle: summary["role-title"] || undefined,
        departmentName: summary["department-name"] || undefined,
        city: org?.address?.city || undefined,
        region: org?.address?.region || undefined,
        country: org?.address?.country || undefined,
        startDate: parseOrcidDate(summary["start-date"]),
        endDate: summary["end-date"] ? parseOrcidDate(summary["end-date"]) : null,
        url: summary.url?.value || undefined,
        putCode: summary["put-code"]?.toString() || undefined,
      }

      return affiliation
    })
    .filter((a): a is OrcidAffiliation => a !== null)
}

/**
 * Parse works/publications from ORCID record
 */
function parseWorks(worksGroup: any): OrcidWorkSummary[] {
  if (!worksGroup || !Array.isArray(worksGroup)) {
    return []
  }

  return worksGroup
    .map((group: any) => {
      const workSummary = group["work-summary"]?.[0]
      if (!workSummary) return null

      const title = workSummary.title?.title?.value || "Untitled"
      const publicationDate = workSummary["publication-date"]

      // Extract external IDs (DOI, PMID, etc.)
      const externalIds =
        workSummary["external-ids"]?.["external-id"]?.map((id: any) => ({
          type: id["external-id-type"],
          value: id["external-id-value"],
          url: id["external-id-url"]?.value,
        })) || []

      // Find DOI
      const doiId = externalIds.find((id: any) => id.type === "doi")
      const doi = doiId?.value

      const work: OrcidWorkSummary = {
        putCode: workSummary["put-code"]?.toString() || "",
        title,
        subtitle: workSummary.title?.subtitle?.value || undefined,
        journal: workSummary["journal-title"]?.value || undefined,
        year: publicationDate?.year?.value ? parseInt(publicationDate.year.value) : undefined,
        month: publicationDate?.month?.value ? parseInt(publicationDate.month.value) : undefined,
        day: publicationDate?.day?.value ? parseInt(publicationDate.day.value) : undefined,
        type: workSummary.type || undefined,
        doi,
        url: workSummary.url?.value || undefined,
        externalIds,
      }

      return work
    })
    .filter((w): w is OrcidWorkSummary => w !== null)
}

/**
 * Fetch full ORCID record from the public API
 */
export async function fetchOrcidRecord(
  orcidId: string,
  accessToken?: string,
  useSandbox: boolean = false
): Promise<OrcidRecord> {
  const apiBase = getOrcidApiBase(useSandbox)
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  // If we have an access token, use it for authenticated requests (gets more data)
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  try {
    // Fetch the full ORCID record
    const response = await fetch(`${apiBase}/${orcidId}/record`, {
      headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ORCID record: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()

    // Parse personal information
    const person = json.person || {}
    const name = person.name || {}
    const givenNames = name["given-names"]?.value || ""
    const familyName = name["family-name"]?.value || ""
    const creditName = name["credit-name"]?.value || undefined
    const biography = person.biography?.content || undefined

    // Parse keywords
    const keywords =
      person.keywords?.keyword?.map((k: any) => k.content).filter(Boolean) || []

    // Parse researcher URLs
    const researcherUrls =
      person["researcher-urls"]?.["researcher-url"]?.map((url: any) => ({
        name: url["url-name"] || "Website",
        url: url.url?.value || "",
      })) || []

    // Parse activities
    const activities = json["activities-summary"] || {}

    const employments = parseAffiliations(activities.employments?.["employment-group"] || [], "employment")
    const educations = parseAffiliations(activities.educations?.["education-group"] || [], "education")
    const qualifications = parseAffiliations(activities.qualifications?.["qualification-group"] || [], "qualification")

    // Parse works
    const works = parseWorks(activities.works?.group || [])

    // Build the ORCID record
    const record: OrcidRecord = {
      orcidId,
      givenNames,
      familyName,
      creditName,
      biography,
      keywords,
      researcherUrls,
      employments,
      educations,
      qualifications,
      works,
      raw: json, // Store full JSON for debugging
      lastSyncedAt: new Date().toISOString(),
    }

    return record
  } catch (error) {
    logger.error("Error fetching ORCID record:", error)
    throw error
  }
}

/**
 * Save ORCID record to Firestore
 */
export async function saveOrcidRecord(orcidRecord: OrcidRecord, userId?: string): Promise<void> {
  const db = getFirestore()
  const recordRef = doc(db, "orcidRecords", orcidRecord.orcidId)

  const dataToSave = {
    ...orcidRecord,
    syncedBy: userId || orcidRecord.syncedBy,
    lastSyncedAt: new Date().toISOString(),
  }

  await setDoc(recordRef, dataToSave, { merge: true })
}

/**
 * Get ORCID record from Firestore
 */
export async function getOrcidRecord(orcidId: string): Promise<OrcidRecord | null> {
  const db = getFirestore()
  const recordRef = doc(db, "orcidRecords", orcidId)

  const docSnap = await getDoc(recordRef)

  if (!docSnap.exists()) {
    return null
  }

  return docSnap.data() as OrcidRecord
}

/**
 * Sync ORCID record: fetch from API and save to Firestore
 */
export async function syncOrcidRecord(
  orcidId: string,
  accessToken?: string,
  userId?: string,
  useSandbox: boolean = false
): Promise<OrcidRecord> {
  const record = await fetchOrcidRecord(orcidId, accessToken, useSandbox)
  record.syncedBy = userId
  await saveOrcidRecord(record, userId)
  return record
}

/**
 * Format ORCID display name from record
 */
export function formatOrcidName(record: OrcidRecord): string {
  if (record.creditName) return record.creditName
  return `${record.givenNames} ${record.familyName}`.trim()
}

/**
 * Get latest affiliation from ORCID record
 */
export function getLatestAffiliation(record: OrcidRecord): string | undefined {
  const allAffiliations = [
    ...(record.employments || []),
    ...(record.educations || []),
  ]

  // Sort by start date (most recent first)
  const sorted = allAffiliations.sort((a, b) => {
    const aYear = a.startDate?.year || 0
    const bYear = b.startDate?.year || 0
    const aMonth = a.startDate?.month || 0
    const bMonth = b.startDate?.month || 0

    if (aYear !== bYear) return bYear - aYear
    return bMonth - aMonth
  })

  const latest = sorted[0]
  if (!latest) return undefined

  return latest.roleTitle
    ? `${latest.roleTitle} at ${latest.organisation}`
    : latest.organisation
}
