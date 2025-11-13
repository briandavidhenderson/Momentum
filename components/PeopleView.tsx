"use client"

import { useState, useEffect } from "react"
import { PersonProfile, FUNDING_ACCOUNTS } from "@/lib/types"
import { getDirectReports } from "@/lib/profiles"
import { useProfiles } from "@/lib/useProfiles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Mail, Phone, MapPin, BookOpen, GraduationCap, Users, Building, Network } from "lucide-react"
import { NetworkView } from "./NetworkView"
import PositionBadge from "@/components/PositionBadge"

interface PeopleViewProps {
  currentUserProfile?: PersonProfile | null
}

export function PeopleView({ currentUserProfile }: PeopleViewProps = {}) {
  const allProfiles = useProfiles(currentUserProfile?.lab || null)
  const [selectedProfile, setSelectedProfile] = useState<PersonProfile | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "orgchart" | "network">("grid")

  // Filter profiles by lab if currentUserProfile is provided
  const profiles = currentUserProfile?.lab
    ? allProfiles.filter(p => p.lab === currentUserProfile.lab)
    : allProfiles

  // Debug logging
  useEffect(() => {
    console.log("PeopleView: Profile loading status", {
      allProfilesCount: allProfiles.length,
      filteredProfilesCount: profiles.length,
      currentUserProfile: currentUserProfile ? {
        id: currentUserProfile.id,
        lab: currentUserProfile.lab,
        name: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
      } : null,
      allProfiles: allProfiles.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, lab: p.lab }))
    })
  }, [allProfiles, profiles, currentUserProfile])

  const labs = Array.from(new Set(profiles.map(p => p.lab)))
  const institutes = Array.from(new Set(profiles.map(p => p.institute)))
  const organisations = Array.from(new Set(profiles.map(p => p.organisation)))

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-monday">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </div>
        <div className="card-monday">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Building className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{labs.length}</p>
              <p className="text-sm text-muted-foreground">Research Labs</p>
            </div>
          </div>
        </div>
        <div className="card-monday">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{institutes.length}</p>
              <p className="text-sm text-muted-foreground">Institutes</p>
            </div>
          </div>
        </div>
        <div className="card-monday">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{profiles.filter(p => p.position.includes("PhD")).length}</p>
              <p className="text-sm text-muted-foreground">PhD Students</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "network" ? (
        /* Network View */
        <NetworkView currentUserProfile={currentUserProfile} />
      ) : viewMode === "grid" ? (
        /* Grid View - Grouped by Lab and Projects */
        <div className="space-y-6">
          {labs.map((lab) => {
            const labMembers = profiles.filter(p => p.lab === lab)
            const labColor = getColorForLab(lab)
            
            // Get all projects for this lab
            const labProjects = new Map<string, { name: string; members: PersonProfile[] }>()
            
            labMembers.forEach(profile => {
              profile.projects?.forEach(project => {
                if (!labProjects.has(project.id)) {
                  labProjects.set(project.id, { name: project.name, members: [] })
                }
                labProjects.get(project.id)!.members.push(profile)
              })
            })
            
            return (
              <div key={lab} className="space-y-4">
                <div className="flex items-center gap-3 py-2 px-4 rounded-lg" style={{ backgroundColor: `${labColor}20` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: labColor }} />
                  <h2 className="text-xl font-bold text-foreground">{lab}</h2>
                  <Badge className="ml-auto" style={{ backgroundColor: labColor, color: "white" }}>
                    {labMembers.length} members
                  </Badge>
                </div>
                
                {/* Projects in this lab */}
                {labProjects.size > 0 && (
                  <div className="space-y-4 ml-4 pl-4 border-l-2" style={{ borderColor: `${labColor}40` }}>
                    {Array.from(labProjects.entries()).map(([projectId, projectData]) => (
                      <div key={projectId} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">{projectData.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {projectData.members.length} {projectData.members.length === 1 ? 'person' : 'people'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                          {projectData.members.map((profile) => (
                            <div
                              key={profile.id}
                              className="card-monday cursor-pointer hover:shadow-lg transition-all p-3"
                              onClick={() => setSelectedProfile(profile)}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                                  style={{ backgroundColor: labColor }}
                                >
                                  {getInitials(profile.firstName, profile.lastName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-foreground truncate text-sm">
                                    {profile.firstName} {profile.lastName}
                                  </h4>
                                  <div className="mt-1">
                                    <PositionBadge
                                      positionLevel={profile.positionLevel}
                                      positionDisplayName={profile.positionDisplayName}
                                      size="sm"
                                      showIcon={false}
                                      isPrincipalInvestigator={profile.principalInvestigatorProjects?.includes(projectId) || false}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Lab members not in any project */}
                {labMembers.filter(p => !p.projects || p.projects.length === 0).length > 0 && (
                  <div className="space-y-2 ml-4">
                    <h3 className="font-semibold text-foreground text-sm text-muted-foreground">Other Lab Members</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {labMembers.filter(p => !p.projects || p.projects.length === 0).map((profile) => (
                        <div
                          key={profile.id}
                          className="card-monday cursor-pointer hover:shadow-lg transition-all"
                          onClick={() => setSelectedProfile(profile)}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                              style={{ backgroundColor: labColor }}
                            >
                              {getInitials(profile.firstName, profile.lastName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground truncate">
                                {profile.firstName} {profile.lastName}
                              </h3>
                              <div className="mt-1">
                                <PositionBadge
                                  positionLevel={profile.positionLevel}
                                  positionDisplayName={profile.positionDisplayName}
                                  size="sm"
                                  showIcon={true}
                                  isPrincipalInvestigator={profile.isPrincipalInvestigator || false}
                                />
                              </div>
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{profile.email}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {profile.fundedBy.map((fund) => (
                                  <Badge key={fund} variant="outline" className="text-[10px]">
                                    {fund}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Org Chart View */
        <div className="space-y-6">
          {labs.map((lab) => {
            const labLeaders = profiles.filter(p => p.lab === lab && p.reportsTo === null)
            const labColor = getColorForLab(lab)
            
            return (
              <div key={lab} className="card-monday">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: labColor }} />
                  <h2 className="text-xl font-bold text-foreground">{lab}</h2>
                </div>
                
                <div className="space-y-4">
                  {labLeaders.map((leader) => {
                    const directReports = getDirectReports(leader.id)
                    
                    return (
                      <div key={leader.id} className="space-y-3">
                        {/* Leader */}
                        <div
                          className="flex items-center gap-4 p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                          style={{ borderLeft: `4px solid ${labColor}` }}
                          onClick={() => setSelectedProfile(leader)}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: labColor }}
                          >
                            {getInitials(leader.firstName, leader.lastName)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground">
                              {leader.firstName} {leader.lastName}
                            </h3>
                            <div className="mt-1">
                              <PositionBadge
                                positionLevel={leader.positionLevel}
                                positionDisplayName={leader.positionDisplayName}
                                size="sm"
                                showIcon={true}
                                isPrincipalInvestigator={leader.isPrincipalInvestigator || false}
                              />
                            </div>
                          </div>
                          {directReports.length > 0 && (
                            <Badge className="bg-gray-200 text-gray-700">
                              {directReports.length} direct reports
                            </Badge>
                          )}
                        </div>
                        
                        {/* Direct Reports */}
                        {directReports.length > 0 && (
                          <div className="ml-12 pl-4 border-l-2 border-gray-200 space-y-2">
                            {directReports.map((report) => {
                              const subReports = getDirectReports(report.id)
                              
                              return (
                                <div key={report.id}>
                                  <div
                                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50"
                                    onClick={() => setSelectedProfile(report)}
                                  >
                                    <div
                                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: labColor, opacity: 0.8 }}
                                    >
                                      {getInitials(report.firstName, report.lastName)}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-foreground text-sm">
                                        {report.firstName} {report.lastName}
                                      </h4>
                                      <div className="mt-1">
                                        <PositionBadge
                                          positionLevel={report.positionLevel}
                                          positionDisplayName={report.positionDisplayName}
                                          size="sm"
                                          showIcon={false}
                                          isPrincipalInvestigator={report.isPrincipalInvestigator || false}
                                        />
                                      </div>
                                    </div>
                                    {subReports.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {subReports.length} reports
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Sub Reports */}
                                  {subReports.length > 0 && (
                                    <div className="ml-10 pl-4 border-l-2 border-gray-200 space-y-2 mt-2">
                                      {subReports.map((subReport) => (
                                        <div
                                          key={subReport.id}
                                          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                                          onClick={() => setSelectedProfile(subReport)}
                                        >
                                          <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: labColor, opacity: 0.6 }}
                                          >
                                            {getInitials(subReport.firstName, subReport.lastName)}
                                          </div>
                                          <div className="flex-1">
                                            <h5 className="font-medium text-foreground text-xs">
                                              {subReport.firstName} {subReport.lastName}
                                            </h5>
                                            <div className="mt-0.5">
                                              <PositionBadge
                                                positionLevel={subReport.positionLevel}
                                                positionDisplayName={subReport.positionDisplayName}
                                                size="sm"
                                                showIcon={false}
                                                isPrincipalInvestigator={subReport.isPrincipalInvestigator || false}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-6 mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                style={{ backgroundColor: getColorForLab(selectedProfile.lab) }}
              >
                {getInitials(selectedProfile.firstName, selectedProfile.lastName)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {selectedProfile.firstName} {selectedProfile.lastName}
                </h2>
                <div className="mt-2">
                  <PositionBadge
                    positionLevel={selectedProfile.positionLevel}
                    positionDisplayName={selectedProfile.positionDisplayName}
                    size="md"
                    showIcon={true}
                    isPrincipalInvestigator={selectedProfile.isPrincipalInvestigator || false}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {selectedProfile.fundedBy.map((fund) => (
                    <Badge key={fund} className="bg-brand-500 text-white">
                      {fund}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email</span>
                  </div>
                  <p className="text-foreground">{selectedProfile.email}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <p className="text-foreground">{selectedProfile.phone}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">Organisation</span>
                  </div>
                  <p className="text-foreground">{selectedProfile.organisation}</p>
                  <div className="mt-2">
                    <span className="font-medium">Institute</span>
                  </div>
                  <p className="text-foreground">{selectedProfile.institute}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Lab</span>
                  </div>
                  <p className="text-foreground">{selectedProfile.lab}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Office Location</span>
                  </div>
                  <p className="text-foreground">{selectedProfile.officeLocation}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="font-medium">Qualifications</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-foreground">
                  {selectedProfile.qualifications.map((qual, idx) => (
                    <li key={idx}>{qual}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Research Interests</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.researchInterests.map((interest, idx) => (
                    <Badge key={idx} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Funding Sources</p>
                <p className="text-foreground">{getFundingAccountNames(selectedProfile.fundedBy)}</p>
              </div>

              {selectedProfile.notes && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-foreground">{selectedProfile.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedProfile(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

