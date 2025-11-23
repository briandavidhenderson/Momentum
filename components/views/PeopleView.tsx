"use client"

import { useState, useEffect, useMemo } from "react"
import { PersonProfile } from "@/lib/types"
import { useProfiles } from "@/lib/useProfiles"
import { useUserGroups } from "@/lib/hooks/useUserGroups"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, GraduationCap, Users, Building, Network } from "lucide-react"
import { AdvancedNetworkView } from "@/components/AdvancedNetworkView"
import PositionBadge from "@/components/PositionBadge"
import { OrcidIcon } from "@/components/OrcidBadge"
import { logger } from "@/lib/logger"

interface PeopleViewProps {
  currentUserProfile?: PersonProfile | null
}

export default function PeopleView({ currentUserProfile }: PeopleViewProps = {}) {
  // Fixed: use labId instead of lab
  const allProfilesData = useProfiles(currentUserProfile?.labId ?? null)
  const allProfiles = useMemo(() => allProfilesData || [], [allProfilesData])
  const [selectedProfile, setSelectedProfile] = useState<PersonProfile | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "orgchart" | "network">("grid")
  const [orcidFilter, setOrcidFilter] = useState<"all" | "with" | "without">("all")

  // Filter profiles by lab if currentUserProfile is provided
  // Ensure profiles is always an array to prevent .map() errors
  const profiles = useMemo(() => {
    let filtered = (currentUserProfile?.labId
      ? allProfiles.filter(p => p.labId === currentUserProfile.labId)
      : allProfiles) || []

    // Apply ORCID filter
    if (orcidFilter === "with") {
      filtered = filtered.filter(p => p.orcidVerified)
    } else if (orcidFilter === "without") {
      filtered = filtered.filter(p => !p.orcidVerified)
    }

    return filtered
  }, [currentUserProfile?.labId, allProfiles, orcidFilter])

  // Fetch group memberships for all profiles
  const userIds = useMemo(() => profiles.map(p => p.id), [profiles])
  const { userGroupsMap } = useUserGroups(userIds)

  // Debug logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug("PeopleView: Profile loading status", {
        allProfilesCount: allProfiles?.length || 0,
        filteredProfilesCount: profiles.length,
        currentUserProfile: currentUserProfile ? {
          id: currentUserProfile.id,
          labId: currentUserProfile.labId,
          name: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
        } : null,
        allProfiles: allProfiles?.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, labId: p.labId })) || []
      })
    }
  }, [allProfiles, profiles, currentUserProfile])

  // Memoize arrays to avoid recompute on every render
  const labs = useMemo(() =>
    Array.from(new Set(profiles.map(p => p.labName).filter(Boolean))),
    [profiles]
  )
  const institutes = useMemo(() =>
    Array.from(new Set(profiles.map(p => p.instituteName).filter(Boolean))),
    [profiles]
  )
  const organisations = useMemo(() =>
    Array.from(new Set(profiles.map(p => p.organisationName).filter(Boolean))),
    [profiles]
  )

  // Pre-group profiles for org chart (O(N) instead of O(N³))
  const orgMap = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, PersonProfile[]>>>()
    for (const p of profiles) {
      const o = p.organisationName || "—"
      const i = p.instituteName || "—"
      const l = p.labName || "—"
      if (!map.has(o)) map.set(o, new Map())
      const im = map.get(o)!
      if (!im.has(i)) im.set(i, new Map())
      const lm = im.get(i)!
      if (!lm.has(l)) lm.set(l, [])
      lm.get(l)!.push(p)
    }
    return map
  }, [profiles])

  // Compute direct report counts
  const directReportCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const profile of profiles) {
      counts[profile.id] = profiles.filter(p => p.reportsTo === profile.id).length
    }
    return counts
  }, [profiles])

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${(firstName?.[0] ?? '?')}${(lastName?.[0] ?? '')}`.toUpperCase()
  }

  // Stable color based on string hash
  const palette = ["#14b8a6", "#8b5cf6", "#f59e0b", "#3b82f6", "#ec4899"]
  const labColor = (labName?: string) => {
    const s = labName?.trim()
    if (!s) return "#64748b" // neutral fallback (slate-500)
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    const idx = Math.abs(h) % palette.length
    return palette[idx]
  }

  const getFundingAccountNames = (fundedBy: string[] = []) => {
    return fundedBy.join(", ")
  }

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProfile) {
        setSelectedProfile(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedProfile])

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">People</h1>
          <p className="text-muted-foreground mt-1">Research team members and organizational structure</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* ORCID Filter */}
          <select
            value={orcidFilter}
            onChange={(e) => setOrcidFilter(e.target.value as "all" | "with" | "without")}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="all">All Members</option>
            <option value="with">With ORCID</option>
            <option value="without">Without ORCID</option>
          </select>

          {/* View Mode Buttons */}
          <Button
            onClick={() => setViewMode("grid")}
            variant={viewMode === "grid" ? "default" : "outline"}
            className={viewMode === "grid" ? "bg-brand-500 text-white" : ""}
            aria-pressed={viewMode === "grid"}
          >
            Grid View
          </Button>
          <Button
            onClick={() => setViewMode("orgchart")}
            variant={viewMode === "orgchart" ? "default" : "outline"}
            className={viewMode === "orgchart" ? "bg-brand-500 text-white" : ""}
            aria-pressed={viewMode === "orgchart"}
          >
            Org Chart
          </Button>
          <Button
            onClick={() => setViewMode("network")}
            variant={viewMode === "network" ? "default" : "outline"}
            className={viewMode === "network" ? "bg-brand-500 text-white" : ""}
            aria-pressed={viewMode === "network"}
          >
            <Network className="h-4 w-4 mr-2" />
            Network
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded">
              <Users className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded">
              <Building className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{labs.length}</p>
              <p className="text-sm text-muted-foreground">Labs</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded">
              <GraduationCap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{institutes.length}</p>
              <p className="text-sm text-muted-foreground">Institutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Network View */}
      {viewMode === "network" && (
        <div className="bg-card rounded-lg border border-border p-4">
          <AdvancedNetworkView />
        </div>
      )}

      {/* Org Chart View */}
      {viewMode === "orgchart" && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Organizational Hierarchy</h2>
          {Array.from(orgMap.entries()).map(([org, institutesMap]) => (
            <div key={org} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Building className="h-5 w-5" />
                {org}
              </h3>
              {Array.from(institutesMap.entries()).map(([inst, labsMap]) => (
                <div key={inst} className="ml-6 mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    {inst}
                  </h4>
                  {Array.from(labsMap.entries()).map(([lab, labProfiles]) => (
                    <div key={lab} className="ml-6 mb-3">
                      <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {lab}
                      </h5>
                      <div className="ml-6 space-y-1">
                        {labProfiles.map(profile => (
                          <div
                            key={profile.id}
                            role="button"
                            tabIndex={0}
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                            onClick={() => setSelectedProfile(profile)}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedProfile(profile)}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: labColor(profile.labName) }}
                            >
                              {getInitials(profile.firstName, profile.lastName)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{profile.firstName} {profile.lastName}</p>
                              <p className="text-xs text-muted-foreground">{profile.position}</p>
                            </div>
                            <PositionBadge positionLevel={profile.positionLevel} positionDisplayName={profile.positionDisplayName} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <>
          {profiles.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No team members found</h3>
              <p className="text-muted-foreground">Team members will appear here once they complete onboarding.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => {
                const directReportCount = directReportCounts[profile.id] || 0

                return (
                  <div
                    key={profile.id}
                    role="button"
                    tabIndex={0}
                    className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                    onClick={() => setSelectedProfile(profile)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedProfile(profile)}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                        style={{ backgroundColor: labColor(profile.labName) }}
                      >
                        {getInitials(profile.firstName, profile.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground truncate">
                            {profile.firstName} {profile.lastName}
                          </h3>
                          {profile.orcidVerified && (
                            <OrcidIcon size="sm" className="flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-1">
                          <PositionBadge positionLevel={profile.positionLevel} positionDisplayName={profile.positionDisplayName} />
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      {profile.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      {profile.officeLocation && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{profile.officeLocation}</span>
                        </div>
                      )}
                    </div>

                    {/* Organization Info */}
                    <div className="space-y-1 mb-4 pt-4 border-t border-border">
                      {profile.labName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground truncate">{profile.labName}</span>
                        </div>
                      )}
                      {profile.instituteName && (
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">{profile.instituteName}</span>
                        </div>
                      )}
                      {profile.organisationName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">{profile.organisationName}</span>
                        </div>
                      )}
                    </div>

                    {/* Research Interests */}
                    {Array.isArray(profile.researchInterests) && profile.researchInterests.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex gap-1 flex-wrap">
                          {profile.researchInterests.slice(0, 3).map((ri, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{ri}</Badge>
                          ))}
                          {profile.researchInterests.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{profile.researchInterests.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Direct Reports */}
                    {directReportCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Badge variant="secondary" className="text-xs">
                          {directReportCount} Direct Report{directReportCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}

                    {/* Group Memberships */}
                    {userGroupsMap[profile.id]?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Groups:</p>
                        <div className="flex gap-1 flex-wrap">
                          {userGroupsMap[profile.id].slice(0, 2).map((groupName, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {groupName}
                            </Badge>
                          ))}
                          {userGroupsMap[profile.id].length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{userGroupsMap[profile.id].length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Selected Profile Detail Modal */}
      {selectedProfile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: labColor(selectedProfile.labName) }}
              >
                {getInitials(selectedProfile.firstName, selectedProfile.lastName)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedProfile.firstName} {selectedProfile.lastName}
                </h2>
                <div className="mt-2">
                  <PositionBadge positionLevel={selectedProfile.positionLevel} positionDisplayName={selectedProfile.positionDisplayName} />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedProfile(null)}
              >
                Close
              </Button>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-lg text-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProfile.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.email}</p>
                    </div>
                  </div>
                )}
                {selectedProfile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Phone</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.phone}</p>
                    </div>
                  </div>
                )}
                {selectedProfile.officeLocation && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Office</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.officeLocation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Organizational Information */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-lg text-foreground">Organization</h3>
              <div className="space-y-2">
                {selectedProfile.labName && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Department</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.labName}</p>
                    </div>
                  </div>
                )}
                {selectedProfile.instituteName && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">School/Faculty</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.instituteName}</p>
                    </div>
                  </div>
                )}
                {selectedProfile.organisationName && (
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Organisation</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.organisationName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Research Interests */}
            {Array.isArray(selectedProfile.researchInterests) && selectedProfile.researchInterests.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-lg text-foreground">Research Interests</h3>
                <div className="flex gap-2 flex-wrap">
                  {selectedProfile.researchInterests.map((ri, i) => (
                    <Badge key={i} variant="secondary">{ri}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Group Memberships */}
            {userGroupsMap[selectedProfile.id]?.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-lg text-foreground">Research Groups</h3>
                <div className="flex gap-2 flex-wrap">
                  {userGroupsMap[selectedProfile.id].map((groupName, i) => (
                    <Badge key={i} variant="outline">{groupName}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Funding */}
            {selectedProfile.fundedBy && selectedProfile.fundedBy.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground">Funding</h3>
                <p className="text-sm text-muted-foreground">{getFundingAccountNames(selectedProfile.fundedBy)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
