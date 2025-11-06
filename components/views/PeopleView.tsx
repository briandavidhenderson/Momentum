"use client"

import { useState, useEffect } from "react"
import { PersonProfile, FUNDING_ACCOUNTS } from "@/lib/types"
import { getDirectReports } from "@/lib/profiles"
import { useProfiles } from "@/lib/useProfiles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Mail, Phone, MapPin, BookOpen, GraduationCap, Users, Building, Network } from "lucide-react"
import { NetworkView } from "../NetworkView"
import PositionBadge from "@/components/PositionBadge"

interface PeopleViewProps {
  currentUserProfile?: PersonProfile | null
}

export default function PeopleView({ currentUserProfile }: PeopleViewProps = {}) {
  const allProfiles = useProfiles()
  const [selectedProfile, setSelectedProfile] = useState<PersonProfile | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "orgchart" | "network">("grid")

  // Filter profiles by lab if currentUserProfile is provided
  const profiles = currentUserProfile?.labId
    ? allProfiles.filter(p => p.labId === currentUserProfile.labId)
    : allProfiles

  // Debug logging
  useEffect(() => {
    console.log("PeopleView: Profile loading status", {
      allProfilesCount: allProfiles.length,
      filteredProfilesCount: profiles.length,
      currentUserProfile: currentUserProfile ? {
        id: currentUserProfile.id,
        labId: currentUserProfile.labId,
        name: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
      } : null,
      allProfiles: allProfiles.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, labId: p.labId }))
    })
  }, [allProfiles, profiles, currentUserProfile])

  const labs = Array.from(new Set(profiles.map(p => p.labName).filter(Boolean)))
  const institutes = Array.from(new Set(profiles.map(p => p.instituteName).filter(Boolean)))
  const organisations = Array.from(new Set(profiles.map(p => p.organisationName).filter(Boolean)))

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getColorForLab = (lab: string) => {
    const colors = [
      "#14b8a6", // teal
      "#8b5cf6", // purple
      "#f59e0b", // amber
      "#3b82f6", // blue
      "#ec4899", // pink
    ]
    const index = labs.indexOf(lab)
    return colors[index % colors.length]
  }

  const getFundingAccountNames = (fundedBy: string[]) => {
    return fundedBy.map(id => {
      const account = FUNDING_ACCOUNTS.find(a => a.id.toLowerCase() === id.toLowerCase())
      return account ? account.name : id
    }).join(", ")
  }

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">People</h1>
          <p className="text-muted-foreground mt-1">Research team members and organizational structure</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setViewMode("grid")}
            variant={viewMode === "grid" ? "default" : "outline"}
            className={viewMode === "grid" ? "bg-brand-500 text-white" : ""}
          >
            Grid View
          </Button>
          <Button
            onClick={() => setViewMode("orgchart")}
            variant={viewMode === "orgchart" ? "default" : "outline"}
            className={viewMode === "orgchart" ? "bg-brand-500 text-white" : ""}
          >
            Org Chart
          </Button>
          <Button
            onClick={() => setViewMode("network")}
            variant={viewMode === "network" ? "default" : "outline"}
            className={viewMode === "network" ? "bg-brand-500 text-white" : ""}
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
          <NetworkView currentUserProfile={currentUserProfile} />
        </div>
      )}

      {/* Org Chart View */}
      {viewMode === "orgchart" && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Organizational Hierarchy</h2>
          {organisations.map(org => (
            <div key={org} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Building className="h-5 w-5" />
                {org}
              </h3>
              {institutes.map(inst => {
                const instProfiles = profiles.filter(p => p.organisationName === org && p.instituteName === inst)
                if (instProfiles.length === 0) return null

                return (
                  <div key={inst} className="ml-6 mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      {inst}
                    </h4>
                    {labs.map(lab => {
                      const labProfiles = instProfiles.filter(p => p.labName === lab)
                      if (labProfiles.length === 0) return null

                      return (
                        <div key={lab} className="ml-6 mb-3">
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {lab}
                          </h5>
                          <div className="ml-6 space-y-1">
                            {labProfiles.map(profile => (
                              <div
                                key={profile.id}
                                className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                                onClick={() => setSelectedProfile(profile)}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                  style={{ backgroundColor: getColorForLab(profile.labName || '') }}
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
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const directReports = getDirectReports(profile.id)

            return (
              <div
                key={profile.id}
                className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedProfile(profile)}
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: getColorForLab(profile.labName || '') }}
                  >
                    {getInitials(profile.firstName, profile.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-foreground truncate">
                      {profile.firstName} {profile.lastName}
                    </h3>
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

                {/* Additional Info */}
                {profile.researchInterests && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {profile.researchInterests}
                    </p>
                  </div>
                )}

                {/* Direct Reports */}
                {directReports.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Badge variant="secondary" className="text-xs">
                      {directReports.length} Direct Report{directReports.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
                style={{ backgroundColor: getColorForLab(selectedProfile.labName || '') }}
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
                      <p className="text-sm font-medium text-foreground">Lab</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.labName}</p>
                    </div>
                  </div>
                )}
                {selectedProfile.instituteName && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Institute</p>
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
            {selectedProfile.researchInterests && (
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-lg text-foreground">Research Interests</h3>
                <p className="text-sm text-muted-foreground">{selectedProfile.researchInterests}</p>
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
