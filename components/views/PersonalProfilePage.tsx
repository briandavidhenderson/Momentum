
"use client"

import { useState, useEffect } from "react"
import { PersonProfile, ProfileProject, ProjectVisibility } from "@/lib/types"
import { FirestoreUser } from "@/lib/firestoreService"
import { useProfiles } from "@/lib/useProfiles"
import { logger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  UserIcon,
  Save,
  Edit,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Building,
  Shield,
  Plus,
  X,
  Trash2
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { updateProfile, updateUser } from "@/lib/firestoreService"
import { OrcidBadge } from "@/components/OrcidBadge"
import { linkOrcidToCurrentUser, resyncOrcidProfile } from "@/lib/auth/orcid"
import { deleteField } from "firebase/firestore"
import { useToast } from "@/components/ui/toast"
import { MembershipManager } from "@/components/profile/MembershipManager"

interface PersonalProfilePageProps {
  currentUser: FirestoreUser | null
  currentUserProfile: PersonProfile | null
}

export function PersonalProfilePage({ currentUser, currentUserProfile }: PersonalProfilePageProps) {
  const allProfiles = useProfiles(currentUserProfile?.labId || null)
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<PersonProfile>>({})
  const [editingProject, setEditingProject] = useState<ProfileProject | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (currentUserProfile) {
      setFormData({
        ...currentUserProfile,
        fundedBy: currentUserProfile.fundedBy || [],
        researchInterests: currentUserProfile.researchInterests || [],
        qualifications: currentUserProfile.qualifications || [],
        projects: currentUserProfile.projects || [],
        principalInvestigatorProjects: currentUserProfile.principalInvestigatorProjects || [],
        isAdministrator: currentUserProfile.isAdministrator || false,
      })
    }
  }, [currentUserProfile])

  const handleSave = async (additionalData?: Partial<PersonProfile>) => {
    if (!currentUserProfile || !formData.firstName || !formData.lastName || !formData.email ||
      !formData.organisation || !formData.institute || !formData.labName) {
      toast({
        title: "Missing Fields",
        description: "Please fill in required fields: First Name, Last Name, Email, Organisation, School/Faculty, and Department",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedProfileData = {
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        displayName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email!,
        position: formData.position || "",
        organisation: formData.organisation!,
        institute: formData.institute!,
        labName: formData.labName!,
        // lab: formData.lab!, // DEPRECATED
        reportsToId: formData.reportsToId || null, // Fix Bug #8: Use reportsToId instead of deprecated reportsTo
        fundedBy: formData.fundedBy || [],
        startDate: formData.startDate || new Date().toISOString().split("T")[0],
        phone: formData.phone || "",
        officeLocation: formData.officeLocation || "",
        researchInterests: formData.researchInterests || [],
        qualifications: formData.qualifications || [],
        notes: formData.notes || "",
        projects: formData.projects || [],
        principalInvestigatorProjects: formData.principalInvestigatorProjects || [],
        profileComplete: formData.profileComplete !== undefined ? formData.profileComplete : true,
        isAdministrator: formData.isAdministrator || false,
        isPrincipalInvestigator: formData.isPrincipalInvestigator || false, // Fix Bug #8: Preserve PI status
        ...additionalData,
      }

      // Update profile in Firestore
      await updateProfile(currentUserProfile.id, updatedProfileData)

      // Update User record if admin status changed
      if (formData.userId && currentUser?.uid === formData.userId) {
        await updateUser(currentUser.uid, {
          isAdministrator: formData.isAdministrator || false
        })
      }

      setIsEditing(false)
      // No need to reload - Firestore real-time updates will handle it
    } catch (error) {
      logger.error("Error saving profile", error)
      toast({
        title: "Error",
        description: "Error saving profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddProject = () => {
    const newProject: ProfileProject = {
      id: `project-${Date.now()}`,
      name: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      grantName: "",
      grantNumber: "",
      fundedBy: [],
      budget: undefined,
      status: "planning",
      notes: "",
      visibility: "private",
      visibleTo: [],
    }
    setEditingProject(newProject)
    setProjectDialogOpen(true)
  }

  const handleSaveProject = (project: ProfileProject) => {
    if (!currentUserProfile) return

    const currentProjects = formData.projects || []
    const isPI = project.id && formData.principalInvestigatorProjects?.includes(project.id)
    const isNew = !currentProjects.find(p => p.id === project.id)

    let updatedProjects: ProfileProject[]
    let updatedPIs: string[]

    if (isNew) {
      updatedProjects = [...currentProjects, project]
      updatedPIs = isPI
        ? [...(formData.principalInvestigatorProjects || []), project.id]
        : formData.principalInvestigatorProjects || []
    } else {
      updatedProjects = currentProjects.map(p => p.id === project.id ? project : p)
      updatedPIs = formData.principalInvestigatorProjects || []
    }

    // Update form data
    const updatedFormData = {
      ...formData,
      projects: updatedProjects,
      principalInvestigatorProjects: updatedPIs,
    }
    setFormData(updatedFormData)

    // Save to Firestore immediately
    updateProfile(currentUserProfile.id, {
      projects: updatedProjects,
      principalInvestigatorProjects: updatedPIs,
    }).then(() => {
      // Success - real-time listener will update the UI
    }).catch(error => {
      logger.error("Error saving project", error)
      toast({
        title: "Error",
        description: "Error saving project. Please try again.",
        variant: "destructive",
      })
    })

    setProjectDialogOpen(false)
    setEditingProject(null)

    // Dispatch event to sync with timeline
    window.dispatchEvent(new CustomEvent("profiles-updated"))
  }

  const handleEditProject = (project: ProfileProject) => {
    setEditingProject({ ...project })
    setProjectDialogOpen(true)
  }

  const handleDeleteProject = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      const updatedProjects = (formData.projects || []).filter(p => p.id !== projectId)
      const updatedPIs = (formData.principalInvestigatorProjects || []).filter(id => id !== projectId)

      setFormData({
        ...formData,
        projects: updatedProjects,
        principalInvestigatorProjects: updatedPIs,
      })
    }
  }

  if (!currentUserProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No profile found. Please complete your profile setup.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and projects</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} className="bg-brand-500 hover:bg-brand-600 text-white">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <div className="card-monday p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position || ""}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., PhD Student, Postdoctoral Researcher"
              />
            </div>
            <div>
              <Label htmlFor="organisation">Organisation *</Label>
              <Input
                id="organisation"
                value={formData.organisation || ""}
                onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="institute">School/Faculty *</Label>
              <Input
                id="institute"
                value={formData.institute || ""}
                onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lab">Department *</Label>
              <Input
                id="lab"
                value={formData.labName || ""}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <input
                type="checkbox"
                id="isPrincipalInvestigator"
                checked={formData.isPrincipalInvestigator || false}
                onChange={(e) => {
                  const isPI = e.target.checked
                  setFormData({
                    ...formData,
                    isPrincipalInvestigator: isPI,
                    // If becoming a PI, clear the reportsToId
                    reportsToId: isPI ? null : formData.reportsToId
                  })
                }}
                disabled={!isEditing}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <Label htmlFor="isPrincipalInvestigator" className="font-medium">
                I am a Principal Investigator (PI)
              </Label>
            </div>

            <div>
              <Label htmlFor="reportsTo">Reports To (Supervisor)</Label>
              <select
                id="reportsTo"
                value={formData.reportsToId || ""}
                onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value || null })}
                disabled={!isEditing || formData.isPrincipalInvestigator}
                className="w-full px-3 py-2 rounded-md border border-border bg-background disabled:opacity-50"
              >
                <option value="">
                  {formData.isPrincipalInvestigator
                    ? "None (I am a PI)"
                    : "Select Supervisor"}
                </option>
                {allProfiles
                  .filter(p => p.id !== currentUserProfile.id)
                  .sort((a, b) => {
                    // Sort PIs to top
                    if (a.isPrincipalInvestigator && !b.isPrincipalInvestigator) return -1
                    if (!a.isPrincipalInvestigator && b.isPrincipalInvestigator) return 1
                    return a.lastName.localeCompare(b.lastName)
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} {p.isPrincipalInvestigator ? "(PI)" : ""} - {p.labName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., +44 20 7123 4567"
              />
            </div>
            <div>
              <Label htmlFor="officeLocation">Office Location</Label>
              <Input
                id="officeLocation"
                value={formData.officeLocation || ""}
                onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Building A, Room 301"
              />
            </div>
          </div>
        </div>

        {/* ORCID */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
              <path fill="#A6CE39" d="M256,128c0,70.7-57.3,128-128,128C57.3,256,0,198.7,0,128C0,57.3,57.3,0,128,0C198.7,0,256,57.3,256,128z" />
              <g><path fill="#FFF" d="M86.3,186.2H70.9V79.1h15.4v48.4V186.2z" /><path fill="#FFF" d="M108.9,79.1h41.6c39.6,0,57,28.3,57,53.6c0,27.5-21.5,53.6-56.8,53.6h-41.8V79.1z M124.3,172.4h24.5 c34.9,0,42.9-26.5,42.9-39.7c0-21.5-13.7-39.7-43.7-39.7h-23.7V172.4z" /><path fill="#FFF" d="M88.7,56.8c0,5.5-4.5,10.1-10.1,10.1c-5.6,0-10.1-4.6-10.1-10.1c0-5.6,4.5-10.1,10.1-10.1 C84.2,46.7,88.7,51.3,88.7,56.8z" /></g>
            </svg>
            ORCID
          </h2>

          {formData.orcidId ? (
            <div className="space-y-6">
              {/* ORCID Badge & Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <OrcidBadge
                    orcidId={formData.orcidId}
                    verified={formData.orcidVerified}
                    size="md"
                    showLabel
                  />
                </div>
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Are you sure you want to disconnect your ORCID?")) {
                        await handleSave({
                          orcidId: deleteField() as any,
                          orcidUrl: deleteField() as any,
                          orcidVerified: false,
                          orcidData: deleteField() as any,
                          orcidLastSynced: deleteField() as any
                        })
                      }
                    }}
                  >
                    Disconnect ORCID
                  </Button>
                )}
              </div>

              {formData.orcidLastSynced && (
                <p className="text-xs text-gray-500">
                  Last synced: {typeof formData.orcidLastSynced === 'object' && 'toDate' in formData.orcidLastSynced
                    ? (formData.orcidLastSynced as any)?.toDate?.().toLocaleDateString() || new Date().toLocaleDateString()
                    : new Date(formData.orcidLastSynced).toLocaleDateString()}
                </p>
              )}

              {/* ORCID Claims Display */}
              {formData.orcidClaims && (
                <div className="text-xs text-gray-600 bg-green-50 p-3 rounded border border-green-200">
                  <p className="font-semibold text-green-800 mb-1">ORCID Profile Information:</p>
                  {formData.orcidClaims.name && (
                    <p><strong>Name:</strong> {formData.orcidClaims.name}</p>
                  )}
                  {formData.orcidClaims.email && (
                    <p><strong>Email:</strong> {formData.orcidClaims.email}</p>
                  )}
                  <p className="text-xs mt-2 text-gray-500">
                    Your profile has been automatically populated with information from your ORCID record.
                  </p>
                </div>
              )}

              {/* Resync Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await resyncOrcidProfile(false)
                      toast({
                        title: "Profile Updated",
                        description: "Profile updated successfully with latest ORCID data (empty fields only)",
                      })
                      window.location.reload()
                    } catch (err: any) {
                      toast({
                        title: "Sync Failed",
                        description: err.message || "Failed to resync ORCID profile",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  Resync (Empty Fields)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm("This will overwrite your current profile data with information from ORCID. Continue?")) {
                      try {
                        await resyncOrcidProfile(true)
                        toast({
                          title: "Profile Updated",
                          description: "Profile fully updated with latest ORCID data",
                        })
                        window.location.reload()
                      } catch (err: any) {
                        toast({
                          title: "Sync Failed",
                          description: err.message || "Failed to resync ORCID profile",
                          variant: "destructive",
                        })
                      }
                    }
                  }}
                >
                  Force Resync (All Fields)
                </Button>
              </div>

              {/* Biography */}
              {formData.orcidData?.biography && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Biography</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{formData.orcidData.biography}</p>
                </div>
              )}

              {/* Employment */}
              {formData.orcidData?.employment && formData.orcidData.employment.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Employment</h3>
                  <div className="space-y-3">
                    {formData.orcidData.employment.map((emp, idx) => (
                      <div key={idx} className="pl-4 border-l-2 border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{emp.role || "Position"}</p>
                        <p className="text-sm text-gray-700">{emp.organization}</p>
                        {emp.department && <p className="text-xs text-gray-500">{emp.department}</p>}
                        <p className="text-xs text-gray-500">
                          {emp.startDate || "Unknown start"} - {emp.endDate || "Present"}
                        </p>
                        {emp.location && <p className="text-xs text-gray-500">{emp.location}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {formData.orcidData?.education && formData.orcidData.education.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Education</h3>
                  <div className="space-y-3">
                    {formData.orcidData.education.map((edu, idx) => (
                      <div key={idx} className="pl-4 border-l-2 border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{edu.degree || "Degree"}</p>
                        <p className="text-sm text-gray-700">{edu.organization}</p>
                        {edu.field && <p className="text-xs text-gray-500">{edu.field}</p>}
                        <p className="text-xs text-gray-500">
                          {edu.startDate || "Unknown start"} - {edu.endDate || "Unknown end"}
                        </p>
                        {edu.location && <p className="text-xs text-gray-500">{edu.location}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Publications/Works */}
              {formData.orcidData?.works && formData.orcidData.works.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Publications ({formData.orcidData.works.length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {formData.orcidData.works.map((work, idx) => (
                      <div key={idx} className="pl-4 border-l-2 border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{work.title}</p>
                        {work.journal && <p className="text-xs text-gray-600 italic">{work.journal}</p>}
                        <div className="flex gap-3 mt-1">
                          {work.publicationDate && (
                            <p className="text-xs text-gray-500">{work.publicationDate}</p>
                          )}
                          {work.type && (
                            <p className="text-xs text-gray-500">{work.type}</p>
                          )}
                        </div>
                        {work.doi && (
                          <a
                            href={`https://doi.org/${work.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            DOI: {work.doi}
                          </a>
                        )}
                        {work.url && !work.doi && (
                          <a
                            href={work.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Funding */}
              {formData.orcidData?.funding && formData.orcidData.funding.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Funding</h3>
                  <div className="space-y-3">
                    {formData.orcidData.funding.map((fund, idx) => (
                      <div key={idx} className="pl-4 border-l-2 border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{fund.title}</p>
                        <p className="text-sm text-gray-700">{fund.organization}</p>
                        {fund.type && <p className="text-xs text-gray-500">{fund.type}</p>}
                        {fund.grantNumber && (
                          <p className="text-xs text-gray-500">Grant: {fund.grantNumber}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {fund.startDate || "Unknown start"} - {fund.endDate || "Ongoing"}
                        </p>
                        {fund.url && (
                          <a
                            href={fund.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View details
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Connect your ORCID iD to verify your identity and automatically import your academic profile, including biography, employment, education, publications, and funding.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const result = await linkOrcidToCurrentUser()
                    // Reload the page to fetch updated profile with ORCID data
                    window.location.reload()
                  } catch (err: any) {
                    toast({
                      title: "Connection Failed",
                      description: err.message || "Failed to connect ORCID",
                      variant: "destructive",
                    })
                  }
                }}
                className="bg-[#A6CE39] hover:bg-[#8FB82E] text-white"
              >
                Connect ORCID
              </Button>
            </div>
          )}
        </div>

        {/* Funding */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Building className="h-4 w-4" />
            Funding
          </h3>
          <div className="space-y-2">
            {(formData.fundedBy || []).map((funderId, index) => {
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="px-3 py-2 rounded-md border border-border bg-background flex-1">
                    {funderId}
                  </span>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = (formData.fundedBy || []).filter((_, i) => i !== index)
                        setFormData({ ...formData, fundedBy: updated })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                placeholder="Add funding source..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      fundedBy: [...(formData.fundedBy || []), e.currentTarget.value.trim()],
                    })
                    e.currentTarget.value = ""
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Research Interests */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Research Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {(formData.researchInterests || []).map((interest, index) => (
              <Badge key={index} variant="outline" className="px-3 py-1">
                {interest}
                {isEditing && (
                  <button
                    onClick={() => {
                      const updated = (formData.researchInterests || []).filter((_, i) => i !== index)
                      setFormData({ ...formData, researchInterests: updated })
                    }}
                    className="ml-2 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                placeholder="Add research interest..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      researchInterests: [...(formData.researchInterests || []), e.currentTarget.value.trim()],
                    })
                    e.currentTarget.value = ""
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Qualifications */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Qualifications
          </h3>
          <div className="space-y-2">
            {(formData.qualifications || []).map((qual, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 rounded-md border border-border bg-background">
                  {qual}
                </span>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = (formData.qualifications || []).filter((_, i) => i !== index)
                      setFormData({ ...formData, qualifications: updated })
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Input
                placeholder="Add qualification..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      qualifications: [...(formData.qualifications || []), e.currentTarget.value.trim()],
                    })
                    e.currentTarget.value = ""
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              My Master Projects
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddProject()
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Project
            </Button>
          </div>

          {(formData.projects || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No projects yet. Click &apos;Add Project&apos; to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {(formData.projects || []).map((project) => {
                const isPI = formData.principalInvestigatorProjects?.includes(project.id)
                const statusColors: Record<string, string> = {
                  planning: "bg-gray-100 text-gray-700 border-gray-300",
                  active: "bg-green-100 text-green-700 border-green-300",
                  completed: "bg-blue-100 text-blue-700 border-blue-300",
                  "on-hold": "bg-yellow-100 text-yellow-700 border-yellow-300",
                }
                return (
                  <div
                    key={project.id}
                    className="p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{project.name}</span>
                          {isPI && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                              Principal Investigator
                            </Badge>
                          )}
                          <Badge variant="outline" className={statusColors[project.status || "planning"] || ""}>
                            {project.status}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {project.grantName && (
                            <span><strong>Grant:</strong> {project.grantName}</span>
                          )}
                          {project.grantNumber && (
                            <span><strong>Grant #:</strong> {project.grantNumber}</span>
                          )}
                          <span><strong>Start:</strong> {project.startDate}</span>
                          <span><strong>End:</strong> {project.endDate}</span>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="flex gap-1 ml-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-danger hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Memberships Section */}
        {currentUserProfile && (
          <div className="card-monday p-6 mt-6">
            <MembershipManager
              currentUserProfile={currentUserProfile}
              onUpdate={() => {
                window.dispatchEvent(new CustomEvent("profiles-updated"))
              }}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-4 mt-6">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
          />
        </div>

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => {
              // Reset form data
              if (currentUserProfile) {
                setFormData({
                  ...currentUserProfile,
                  fundedBy: currentUserProfile.fundedBy || [],
                  researchInterests: currentUserProfile.researchInterests || [],
                  qualifications: currentUserProfile.qualifications || [],
                  projects: currentUserProfile.projects || [],
                  principalInvestigatorProjects: currentUserProfile.principalInvestigatorProjects || [],
                  isAdministrator: currentUserProfile.isAdministrator || false,
                })
              }
              setIsEditing(false)
            }}>
              Cancel
            </Button>
            <Button onClick={() => handleSave()} className="bg-brand-500 hover:bg-brand-600 text-white">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Project Dialog - Only render on client when actually open to avoid hydration issues */}
      {isMounted && projectDialogOpen && (
        <ProjectDialog
          open={projectDialogOpen}
          project={editingProject}
          onClose={() => {
            setProjectDialogOpen(false)
            setEditingProject(null)
          }}
          onSave={handleSaveProject}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  )
}

// Project Dialog Component (reused from ProfileManagement)
function ProjectDialog({
  open,
  project,
  onClose,
  onSave,
  currentUserProfile,
}: {
  open: boolean
  project: ProfileProject | null
  onClose: () => void
  onSave: (project: ProfileProject) => void
  currentUserProfile: PersonProfile | null
}) {
  const { toast } = useToast()
  const allProfiles = useProfiles(currentUserProfile?.labId || null)
  const [formData, setFormData] = useState<ProfileProject>({
    id: "",
    name: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    grantName: "",
    grantNumber: "",
    fundedBy: [],
    budget: undefined,
    status: "planning",
    notes: "",
    visibility: "private",
    visibleTo: [],
  })

  useEffect(() => {
    if (project) {
      setFormData(project)
    }
  }, [project, open])

  const handleSave = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: "Missing Fields",
        description: "Please fill in required fields: Project Name, Start Date, and End Date",
        variant: "destructive",
      })
      return
    }
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose()
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project?.id && project?.name ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription>
            Add project details including grant information and funding sources.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Novel Microfluidic Diagnostic Platform"
            />
          </div>

          <div>
            <Label htmlFor="projectDescription">Description</Label>
            <textarea
              id="projectDescription"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
              placeholder="Brief description of the project..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectStartDate">Start Date *</Label>
              <Input
                id="projectStartDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="projectEndDate">End Date *</Label>
              <Input
                id="projectEndDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grantName">Grant Name</Label>
              <Input
                id="grantName"
                value={formData.grantName || ""}
                onChange={(e) => setFormData({ ...formData, grantName: e.target.value })}
                placeholder="e.g., ERC Starting Grant"
              />
            </div>
            <div>
              <Label htmlFor="grantNumber">Grant Number</Label>
              <Input
                id="grantNumber"
                value={formData.grantNumber || ""}
                onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
                placeholder="e.g., ERC-2020-STG-123456"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="projectStatus">Status</Label>
            <select
              id="projectStatus"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProfileProject["status"] })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>

          <div>
            <Label htmlFor="projectVisibility">Project Visibility</Label>
            <select
              id="projectVisibility"
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as ProjectVisibility })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="private">Private (Only you)</option>
              <option value="postdocs">You and your postdocs</option>
              <option value="pi-researchers">PIs and researchers</option>
              <option value="lab">All in your lab</option>
              <option value="custom">Specific people</option>
            </select>
            {formData.visibility === "custom" && (
              <div className="mt-2 space-y-2">
                <Label>Select People Who Can View This Project</Label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !formData.visibleTo?.includes(e.target.value)) {
                      setFormData({
                        ...formData,
                        visibleTo: [...(formData.visibleTo || []), e.target.value],
                      })
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="">Add person...</option>
                  {allProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.firstName} {profile.lastName} - {profile.labName}
                    </option>
                  ))}
                </select>
                {(formData.visibleTo || []).map((personId) => {
                  const profile = allProfiles.find(p => p.id === personId)
                  return (
                    <div key={personId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {profile ? `${profile.firstName} ${profile.lastName}` : personId}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            visibleTo: (formData.visibleTo || []).filter(id => id !== personId),
                          })
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="projectBudget">Budget</Label>
            <Input
              id="projectBudget"
              type="number"
              value={formData.budget || ""}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 50000"
            />
          </div>

          <div>
            <Label>Funding Accounts</Label>
            <div className="space-y-2">
              {(formData.fundedBy || []).map((funderId, index) => {
                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-md border border-border bg-background flex-1">
                      {funderId}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = (formData.fundedBy || []).filter((_, i) => i !== index)
                        setFormData({ ...formData, fundedBy: updated })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add funding source..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      fundedBy: [...(formData.fundedBy || []), e.currentTarget.value.trim()],
                    })
                    e.currentTarget.value = ""
                  }
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="projectNotes">Notes</Label>
            <textarea
              id="projectNotes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
            <Save className="h-4 w-4 mr-2" />
            Save Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
