
"use client"

import { useState, useEffect } from "react"
import { PersonProfile, ProfileProject, ProjectVisibility, FUNDING_ACCOUNTS, User } from "@/lib/types"
import { profiles as staticProfiles } from "@/lib/profiles"
import { useProfiles } from "@/lib/useProfiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Building,
  User as UserIcon,
  Plus,
  Shield
} from "lucide-react"

interface ProfileManagementProps {
  currentUser?: User | null
  currentUserProfile?: PersonProfile | null
}

export function ProfileManagement({ currentUser, currentUserProfile }: ProfileManagementProps = {}) {
  const allProfiles = useProfiles()
  const [selectedProfile, setSelectedProfile] = useState<PersonProfile | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLab, setFilterLab] = useState<string>("all")
  const [filterInstitute, setFilterInstitute] = useState<string>("all")
  const [filterOrganisation, setFilterOrganisation] = useState<string>("all")

  // Form state
  const [formData, setFormData] = useState<Partial<PersonProfile>>({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    organisation: "",
    institute: "",
    lab: "",
    reportsTo: null,
    fundedBy: [],
    startDate: new Date().toISOString().split("T")[0],
    phone: "",
    officeLocation: "",
    researchInterests: [],
    qualifications: [],
    notes: "",
    projects: [],
    principalInvestigatorProjects: [],
  })

  const [editingProject, setEditingProject] = useState<ProfileProject | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  // Check if current user can edit a profile
  const canEditProfile = (profile: PersonProfile): boolean => {
    if (!currentUserProfile) return false
    
    // Administrator can edit any profile
    if (currentUserProfile.isAdministrator || currentUser?.isAdministrator) {
      return true
    }
    
    // Users can only edit their own profile
    return profile.id === currentUserProfile.id || profile.userId === currentUser?.id
  }

  // Save profiles to localStorage
  const saveProfiles = (profilesToSave: PersonProfile[]) => {
    // Only save custom profiles (those not in static list)
    const staticIds = new Set(staticProfiles.map(p => p.id))
    const customProfiles = profilesToSave.filter(p => !staticIds.has(p.id))
    localStorage.setItem("lab-profiles", JSON.stringify(customProfiles))
    
    // Dispatch event to notify other components of profile updates
    window.dispatchEvent(new CustomEvent("profiles-updated"))
  }

  const labs = Array.from(new Set(allProfiles.map(p => p.lab)))
  const institutes = Array.from(new Set(allProfiles.map(p => p.institute)))
  const organisations = Array.from(new Set(allProfiles.map(p => p.organisation)))

  const filteredProfiles = allProfiles.filter(profile => {
    const matchesSearch = 
      profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.position.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLab = filterLab === "all" || profile.lab === filterLab
    const matchesInstitute = filterInstitute === "all" || profile.institute === filterInstitute
    const matchesOrganisation = filterOrganisation === "all" || profile.organisation === filterOrganisation

    return matchesSearch && matchesLab && matchesInstitute && matchesOrganisation
  })

  const handleCreateNew = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      position: "",
      organisation: "",
      institute: "",
      lab: "",
      reportsTo: null,
      fundedBy: [],
      startDate: new Date().toISOString().split("T")[0],
      phone: "",
      officeLocation: "",
      researchInterests: [],
      qualifications: [],
      notes: "",
      projects: [],
      principalInvestigatorProjects: [],
      isAdministrator: false,
    })
    setIsEditing(true)
    setSelectedProfile(null)
    setIsDialogOpen(true)
  }

  const handleAddProject = () => {
    setEditingProject({
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
    })
    setProjectDialogOpen(true)
  }

  const handleEditProject = (project: ProfileProject) => {
    setEditingProject({ ...project })
    setProjectDialogOpen(true)
  }

  const handleSaveProject = (project: ProfileProject) => {
    const currentProjects = formData.projects || []
    const isPI = project.id && formData.principalInvestigatorProjects?.includes(project.id)
    const isNew = !currentProjects.find(p => p.id === project.id)

    if (isNew) {
      // Add new project
      const updatedProjects = [...currentProjects, project]
      const updatedPIs = isPI 
        ? [...(formData.principalInvestigatorProjects || []), project.id]
        : formData.principalInvestigatorProjects || []
      
      setFormData({
        ...formData,
        projects: updatedProjects,
        principalInvestigatorProjects: updatedPIs,
      })
    } else {
      // Update existing project
      const updatedProjects = currentProjects.map(p => p.id === project.id ? project : p)
      setFormData({
        ...formData,
        projects: updatedProjects,
      })
    }

    setProjectDialogOpen(false)
    setEditingProject(null)
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

  const toggleProjectPI = (projectId: string) => {
    const currentPIs = formData.principalInvestigatorProjects || []
    const isPI = currentPIs.includes(projectId)
    
    setFormData({
      ...formData,
      principalInvestigatorProjects: isPI
        ? currentPIs.filter(id => id !== projectId)
        : [...currentPIs, projectId],
    })
  }

  const handleEdit = (profile: PersonProfile) => {
    if (!canEditProfile(profile)) {
      alert("You can only edit your own profile, or you need administrator privileges to edit other profiles.")
      return
    }
    
    setFormData({
      ...profile,
      fundedBy: profile.fundedBy || [],
      researchInterests: profile.researchInterests || [],
      qualifications: profile.qualifications || [],
      projects: profile.projects || [],
      principalInvestigatorProjects: profile.principalInvestigatorProjects || [],
      isAdministrator: profile.isAdministrator || false,
    })
    setSelectedProfile(profile)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleView = (profile: PersonProfile) => {
    setFormData({
      ...profile,
      fundedBy: profile.fundedBy || [],
      researchInterests: profile.researchInterests || [],
      qualifications: profile.qualifications || [],
      projects: profile.projects || [],
      principalInvestigatorProjects: profile.principalInvestigatorProjects || [],
      isAdministrator: profile.isAdministrator || false,
    })
    setSelectedProfile(profile)
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.organisation || !formData.institute || !formData.lab) {
      alert("Please fill in required fields: First Name, Last Name, Email, Organisation, Institute, and Lab")
      return
    }

    const profileId = selectedProfile?.id || `prof-${Date.now()}`
    const newProfile: PersonProfile = {
      id: profileId,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      email: formData.email!,
      phone: formData.phone || "",
      officeLocation: formData.officeLocation || "",

      // New organizational hierarchy fields (temporary placeholders)
      organisationId: `org_${formData.organisation!.toLowerCase().replace(/\s+/g, '_')}`,
      organisationName: formData.organisation!,
      instituteId: `inst_${formData.institute!.toLowerCase().replace(/\s+/g, '_')}`,
      instituteName: formData.institute!,
      labId: `lab_${formData.lab!.toLowerCase().replace(/\s+/g, '_')}`,
      labName: formData.lab!,

      // Position (new enum-based + legacy string)
      positionLevel: formData.position?.includes("PhD") ? "phd_student" as any :
                     formData.position?.includes("Postdoc") ? "postdoc_research_associate" as any :
                     formData.position?.includes("Professor") ? "professor" as any :
                     "research_assistant" as any,
      positionDisplayName: formData.position || "Unknown",
      position: formData.position || "",

      // Reporting structure
      reportsToId: formData.reportsTo || null,

      // PI status
      isPrincipalInvestigator: (formData.principalInvestigatorProjects?.length || 0) > 0,

      // Project membership
      masterProjectIds: [],
      masterProjectRoles: {},

      // Legacy fields (for backward compatibility)
      organisation: formData.organisation!,
      institute: formData.institute!,
      lab: formData.lab!,
      reportsTo: formData.reportsTo || null,
      fundedBy: formData.fundedBy || [],
      projects: formData.projects || [],
      principalInvestigatorProjects: formData.principalInvestigatorProjects || [],

      // Dates
      startDate: formData.startDate || new Date().toISOString().split("T")[0],

      // Research profile
      researchInterests: formData.researchInterests || [],
      qualifications: formData.qualifications || [],
      notes: formData.notes || "",

      // Account
      userId: formData.userId,
      profileComplete: formData.profileComplete !== undefined ? formData.profileComplete : true,
      onboardingComplete: false, // Will be true after new onboarding flow
      isAdministrator: formData.isAdministrator || false,
    }

    const updatedProfiles = selectedProfile
      ? allProfiles.map(p => p.id === selectedProfile.id ? newProfile : p)
      : [...allProfiles, newProfile]
    
    saveProfiles(updatedProfiles as PersonProfile[])
    
    // Update User record if this profile is linked to a user
    if (newProfile.userId && currentUser?.id === newProfile.userId) {
      const storedUsers = localStorage.getItem("lab-users")
      if (storedUsers) {
        const users: User[] = JSON.parse(storedUsers)
        const updatedUsers = users.map(u => 
          u.id === newProfile.userId 
            ? { ...u, isAdministrator: newProfile.isAdministrator }
            : u
        )
        localStorage.setItem("lab-users", JSON.stringify(updatedUsers))
      }
    }
    
    setIsDialogOpen(false)
    setSelectedProfile(null)
    setIsEditing(false)
  }

  const handleDelete = (profile: PersonProfile) => {
    // Don't allow deleting static profiles
    const staticIds = new Set(staticProfiles.map(p => p.id))
    if (staticIds.has(profile.id)) {
      alert("Cannot delete built-in profiles. These are read-only.")
      return
    }

    if (confirm(`Are you sure you want to delete ${profile.firstName} ${profile.lastName}?`)) {
      const updatedProfiles = allProfiles.filter(p => p.id !== profile.id)
      saveProfiles(updatedProfiles)
      if (selectedProfile?.id === profile.id) {
        setIsDialogOpen(false)
        setSelectedProfile(null)
      }
    }
  }

  const handleExport = () => {
    const customProfiles = allProfiles.filter(p => {
      const staticIds = new Set(staticProfiles.map(sp => sp.id))
      return !staticIds.has(p.id)
    })

    const dataStr = JSON.stringify(customProfiles, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `lab-profiles-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as PersonProfile[]
        const updatedProfiles = [...allProfiles]
        
        imported.forEach(profile => {
          const index = updatedProfiles.findIndex(p => p.id === profile.id)
          if (index >= 0) {
            updatedProfiles[index] = profile
          } else {
            updatedProfiles.push(profile)
          }
        })

        saveProfiles(updatedProfiles)
        alert(`Imported ${imported.length} profile(s)`)
      } catch (error) {
        alert("Error importing file. Please ensure it's valid JSON.")
      }
    }
    reader.readAsText(file)
  }

  const addArrayItem = (field: "researchInterests" | "qualifications" | "fundedBy") => {
    const current = formData[field] || []
    setFormData({ ...formData, [field]: [...current, ""] })
  }

  const updateArrayItem = (field: "researchInterests" | "qualifications" | "fundedBy", index: number, value: string) => {
    const current = formData[field] || []
    const updated = [...current]
    updated[index] = value
    setFormData({ ...formData, [field]: updated })
  }

  const removeArrayItem = (field: "researchInterests" | "qualifications" | "fundedBy", index: number) => {
    const current = formData[field] || []
    const updated = current.filter((_, i) => i !== index)
    setFormData({ ...formData, [field]: updated })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Management</h1>
          <p className="text-muted-foreground mt-1">View, edit, and create team member profiles</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <label className="cursor-pointer">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              asChild
            >
              <span>
                <Upload className="h-4 w-4" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <Button
            onClick={handleCreateNew}
            className="bg-brand-500 hover:bg-brand-600 text-white flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            New Profile
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <Input
          placeholder="Search by name, email, or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterLab}
          onChange={(e) => setFilterLab(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-background"
        >
          <option value="all">All Labs</option>
          {labs.map(lab => (
            <option key={lab} value={lab}>{lab}</option>
          ))}
        </select>
        <select
          value={filterOrganisation}
          onChange={(e) => setFilterOrganisation(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-background"
        >
          <option value="all">All Organisations</option>
          {organisations.map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <select
          value={filterInstitute}
          onChange={(e) => setFilterInstitute(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-background"
        >
          <option value="all">All Institutes</option>
          {institutes.map(inst => (
            <option key={inst} value={inst}>{inst}</option>
          ))}
        </select>
        <Badge variant="outline">{filteredProfiles.length} profiles</Badge>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => {
          const isStatic = staticProfiles.some(p => p.id === profile.id)
          return (
            <div
              key={profile.id}
              className="card-monday hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleView(profile)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{
                      backgroundColor: `hsl(${(profile.id.charCodeAt(0) * 137.508) % 360}, 70%, 60%)`
                    }}
                  >
                    {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{profile.position}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.lab}</p>
                  </div>
                </div>
                {isStatic && (
                  <Badge variant="outline" className="text-xs">Built-in</Badge>
                )}
                {profile.isAdministrator && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border flex gap-2">
                {canEditProfile(profile) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(profile)
                    }}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="flex-1 opacity-50 cursor-not-allowed"
                    title="You can only edit your own profile"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                {!isStatic && (currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(profile)
                    }}
                    className="text-danger hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Profile Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? (selectedProfile ? "Edit Profile" : "Create New Profile") : "View Profile"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? selectedProfile 
                  ? "Update the profile information below."
                  : "Fill in the details to create a new team member profile."
                : "View profile information. Click Edit to make changes."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
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
                  placeholder="e.g., Principal Investigator, PhD Student"
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Organisation, Institute & Lab */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Building className="h-4 w-4" />
                Organization Hierarchy
              </h3>
              <div>
                <Label htmlFor="organisation">Organisation *</Label>
                <Input
                  id="organisation"
                  value={formData.organisation || ""}
                  onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                  placeholder="e.g., University Research Centre"
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="institute">Institute *</Label>
                <Input
                  id="institute"
                  value={formData.institute || ""}
                  onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                  placeholder="e.g., Molecular Biology"
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="lab">Lab *</Label>
                <Input
                  id="lab"
                  value={formData.lab || ""}
                  onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                  placeholder="e.g., Martinez Lab"
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="reportsTo">Reports To</Label>
                <select
                  id="reportsTo"
                  value={formData.reportsTo || ""}
                  onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value || null })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="">None</option>
                  {allProfiles.filter(p => p.id !== formData.id).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} - {p.position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="officeLocation">Office Location</Label>
                  <Input
                    id="officeLocation"
                    value={formData.officeLocation || ""}
                    onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                    placeholder="e.g., Building A, Room 301"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Funding */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Funding
              </h3>
              <div>
                <Label>Funded By</Label>
                {(formData.fundedBy || []).map((funder, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <select
                      value={funder}
                      onChange={(e) => updateArrayItem("fundedBy", index, e.target.value)}
                      disabled={!isEditing}
                      className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                    >
                      <option value="">Select Account...</option>
                      {FUNDING_ACCOUNTS.map(account => (
                        <option key={account.id} value={account.name}>
                          {account.name} ({account.accountNumber})
                        </option>
                      ))}
                    </select>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem("fundedBy", index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("fundedBy")}
                    className="mt-2"
                  >
                    + Add Funding Account
                  </Button>
                )}
              </div>
            </div>

            {/* Research Interests */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Research Interests
              </h3>
              {(formData.researchInterests || []).map((interest, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={interest}
                    onChange={(e) => updateArrayItem("researchInterests", index, e.target.value)}
                    placeholder="e.g., Microfluidics, Cell Analysis"
                    disabled={!isEditing}
                  />
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem("researchInterests", index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem("researchInterests")}
                >
                  + Add Research Interest
                </Button>
              )}
            </div>

            {/* Qualifications */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Qualifications
              </h3>
              {(formData.qualifications || []).map((qual, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={qual}
                    onChange={(e) => updateArrayItem("qualifications", index, e.target.value)}
                    placeholder="e.g., PhD Molecular Biology, MSc Biochemistry"
                    disabled={!isEditing}
                  />
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem("qualifications", index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem("qualifications")}
                >
                  + Add Qualification
                </Button>
              )}
            </div>

            {/* Projects */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Projects
                </h3>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProject}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Project
                  </Button>
                )}
              </div>
              
              {(formData.projects || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects yet. {isEditing && "Click 'Add Project' to create one."}
                </p>
              ) : (
                <div className="space-y-2">
                  {(formData.projects || []).map((project) => {
                    const isPI = formData.principalInvestigatorProjects?.includes(project.id)
                    const statusColors = {
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
                              <Badge variant="outline" className={statusColors[project.status] || ""}>
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
                              <span><strong>Start:</strong> {new Date(project.startDate).toLocaleDateString()}</span>
                              <span><strong>End:</strong> {new Date(project.endDate).toLocaleDateString()}</span>
                              {project.budget && (
                                <span><strong>Budget:</strong> £{project.budget.toLocaleString()}</span>
                              )}
                            </div>
                            {project.fundedBy && project.fundedBy.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {project.fundedBy.map((funderId) => {
                                  const account = FUNDING_ACCOUNTS.find(a => a.id === funderId || a.name === funderId)
                                  return account ? (
                                    <Badge key={funderId} variant="outline" className="text-xs">
                                      {account.name}
                                    </Badge>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                          {isEditing && (
                            <div className="flex gap-1 ml-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleProjectPI(project.id)}
                                title={isPI ? "Remove as PI" : "Mark as Principal Investigator"}
                              >
                                <UserIcon className="h-3 w-3" />
                              </Button>
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

            {/* Administrator Checkbox - Only visible to administrators */}
            {isEditing && (currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAdministrator"
                    checked={formData.isAdministrator || false}
                    onChange={(e) => setFormData({ ...formData, isAdministrator: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isAdministrator" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-900">Administrator</span>
                  </Label>
                </div>
                <p className="text-xs text-purple-700">
                  Administrators can edit all profiles and manage user permissions.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-4">
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
          </div>

          <DialogFooter>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
                {canEditProfile(selectedProfile!) && (
                  <Button onClick={() => setIsEditing(true)} className="bg-brand-500 hover:bg-brand-600 text-white">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      {editingProject && (
        <ProjectDialog
          open={projectDialogOpen}
          project={editingProject}
          onClose={() => {
            setProjectDialogOpen(false)
            setEditingProject(null)
          }}
          onSave={handleSaveProject}
        />
      )}
    </div>
  )
}

// Project Dialog Component
function ProjectDialog({
  open,
  project,
  onClose,
  onSave,
}: {
  open: boolean
  project: ProfileProject
  onClose: () => void
  onSave: (project: ProfileProject) => void
}) {
  const allProfiles = useProfiles()
  const [formData, setFormData] = useState<ProfileProject>(project)

  useEffect(() => {
    setFormData(project)
  }, [project])

  const handleSave = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert("Please fill in required fields: Project Name, Start Date, and End Date")
      return
    }
    onSave(formData)
  }

  const addFunder = () => {
    setFormData({
      ...formData,
      fundedBy: [...(formData.fundedBy || []), ""],
    })
  }

  const updateFunder = (index: number, value: string) => {
    const updated = [...(formData.fundedBy || [])]
    updated[index] = value
    setFormData({ ...formData, fundedBy: updated })
  }

  const removeFunder = (index: number) => {
    const updated = (formData.fundedBy || []).filter((_, i) => i !== index)
    setFormData({ ...formData, fundedBy: updated })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project.id && project.name ? "Edit Project" : "Create New Project"}
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
              placeholder="Brief project description..."
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
                placeholder="e.g., EPSRC Research Grant"
              />
            </div>
            <div>
              <Label htmlFor="grantNumber">Grant Number</Label>
              <Input
                id="grantNumber"
                value={formData.grantNumber || ""}
                onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
                placeholder="e.g., EP/V012345/1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="projectBudget">Budget (£)</Label>
            <Input
              id="projectBudget"
              type="number"
              value={formData.budget || ""}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 500000"
            />
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
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <Label>Funding Accounts</Label>
            {(formData.fundedBy || []).map((funderId, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <select
                  value={funderId}
                  onChange={(e) => updateFunder(index, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="">Select Account...</option>
                  {FUNDING_ACCOUNTS.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.accountNumber})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeFunder(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFunder}
              className="mt-2"
            >
              + Add Funding Account
            </Button>
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
                  onChange={(e) => {
                    if (e.target.value && !formData.visibleTo?.includes(e.target.value)) {
                      setFormData({
                        ...formData,
                        visibleTo: [...(formData.visibleTo || []), e.target.value],
                      })
                      e.target.value = ""
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="">Add person...</option>
                  {allProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.firstName} {profile.lastName} - {profile.lab}
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
    </Dialog>
  )
}
