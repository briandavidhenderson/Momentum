"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersonProfile, ProfileProject } from "@/lib/types"
import { Building, GraduationCap, BookOpen, Users, Mail, Phone, MapPin, Save, Plus } from "lucide-react"
import { 
  getOrganisations, 
  getInstitutes, 
  getLabs, 
  getFunders,
  createOrganisation, 
  createInstitute, 
  createLab,
  createFunder,
  createProfile,
  updateUser
} from "@/lib/firestoreService"
import type { Organisation, Institute, Lab, Funder } from "@/lib/firestoreService"

interface ProfileSetupPageProps {
  user: { id: string; email: string; fullName: string }
  onComplete: (profile: PersonProfile) => void
}

export function ProfileSetupPage({ user, onComplete }: ProfileSetupPageProps) {
  const [step, setStep] = useState(1)
  
  // Safely split fullName
  const nameParts = (user.fullName || "").split(" ")
  const firstName = nameParts[0] || ""
  const lastName = nameParts.slice(1).join(" ") || ""
  
  const [formData, setFormData] = useState<Partial<PersonProfile>>({
    firstName: firstName,
    lastName: lastName,
    email: user.email,
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
    userId: user.id,
    profileComplete: false,
  })

  const [newInterest, setNewInterest] = useState("")
  const [newQualification, setNewQualification] = useState("")
  
  // States for adding new hierarchy levels
  const [showNewOrg, setShowNewOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [showNewInstitute, setShowNewInstitute] = useState(false)
  const [newInstituteName, setNewInstituteName] = useState("")
  const [showNewLab, setShowNewLab] = useState(false)
  const [newLabName, setNewLabName] = useState("")
  const [showNewFunder, setShowNewFunder] = useState(false)
  const [newFunderName, setNewFunderName] = useState("")

  // Firestore data
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [funders, setFunders] = useState<Funder[]>([])
  const [loading, setLoading] = useState(false)
  
  const loadOrganisations = useCallback(async () => {
    try {
      const orgs = await getOrganisations()
      setOrganisations(orgs)
    } catch (error) {
      console.error("Error loading organisations:", error)
    }
  }, [])

  const loadFunders = useCallback(async () => {
    try {
      const funderList = await getFunders()
      setFunders(funderList)
    } catch (error) {
      console.error("Error loading funders:", error)
    }
  }, [])

  const loadInstitutes = useCallback(async (orgName: string) => {
    try {
      const org = organisations.find(o => o.name === orgName)
      if (org) {
        const insts = await getInstitutes(org.id)
        setInstitutes(insts)
      }
    } catch (error) {
      console.error("Error loading institutes:", error)
    }
  }, [organisations])

  const loadLabs = useCallback(async (instituteId: string) => {
    try {
      const labsList = await getLabs(instituteId)
      setLabs(labsList)
    } catch (error) {
      console.error("Error loading labs:", error)
    }
  }, [])
 
  const organisationNames = useMemo(() => organisations.map(o => o.name).sort(), [organisations])
  const instituteNames = useMemo(() => institutes.map(i => i.name).sort(), [institutes])
  const labNames = useMemo(() => labs.map(l => l.name).sort(), [labs])
  const funderNames = useMemo(() => funders.map(f => f.name).sort(), [funders])

  // Load organisations and funders on mount
  useEffect(() => {
    loadOrganisations()
    loadFunders()
  }, [loadOrganisations, loadFunders])
  
  // Load institutes when organisation changes
  useEffect(() => {
    if (formData.organisation) {
      loadInstitutes(formData.organisation)
    } else {
      setInstitutes([])
    }
  }, [formData.organisation, loadInstitutes])
 
  // Load labs when institute changes
  useEffect(() => {
    if (formData.institute) {
      const selectedInstitute = institutes.find(i => i.name === formData.institute)
      if (selectedInstitute) {
        loadLabs(selectedInstitute.id)
      }
    } else {
      setLabs([])
    }
  }, [formData.institute, institutes, loadLabs])
  
  const handleAddNewOrg = async () => {
    if (newOrgName.trim()) {
      try {
        setLoading(true)
        await createOrganisation(newOrgName.trim(), user.id)
        await loadOrganisations()
        setFormData({ ...formData, organisation: newOrgName.trim(), institute: "", lab: "" })
        setNewOrgName("")
        setShowNewOrg(false)
      } catch (error) {
        console.error("Error creating organisation:", error)
        alert("Error creating organisation. Please try again.")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddNewInstitute = async () => {
    if (newInstituteName.trim() && formData.organisation) {
      try {
        setLoading(true)
        const org = organisations.find(o => o.name === formData.organisation)
        if (org) {
          await createInstitute(newInstituteName.trim(), org.id, user.id)
          await loadInstitutes(formData.organisation)
          setFormData({ ...formData, institute: newInstituteName.trim(), lab: "" })
          setNewInstituteName("")
          setShowNewInstitute(false)
        }
      } catch (error) {
        console.error("Error creating institute:", error)
        alert("Error creating institute. Please try again.")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddNewLab = async () => {
    if (newLabName.trim() && formData.organisation && formData.institute) {
      try {
        setLoading(true)
        const org = organisations.find(o => o.name === formData.organisation)
        const inst = institutes.find(i => i.name === formData.institute)
        if (org && inst) {
          await createLab(newLabName.trim(), inst.id, org.id, user.id)
          await loadLabs(inst.id)
          setFormData({ ...formData, lab: newLabName.trim() })
          setNewLabName("")
          setShowNewLab(false)
        }
      } catch (error) {
        console.error("Error creating lab:", error)
        alert("Error creating lab. Please try again.")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddNewFunder = async () => {
    if (newFunderName.trim()) {
      try {
        setLoading(true)
        await createFunder(newFunderName.trim(), user.id)
        await loadFunders()
        setFormData({
          ...formData,
          fundedBy: [...(formData.fundedBy || []), newFunderName.trim()],
        })
        setNewFunderName("")
        setShowNewFunder(false)
      } catch (error) {
        console.error("Error creating funder:", error)
        alert("Error creating funder. Please try again.")
      } finally {
        setLoading(false)
      }
    }
  }

  const addArrayItem = (field: "researchInterests" | "qualifications") => {
    const value = field === "researchInterests" ? newInterest : newQualification
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] || []), value.trim()],
      })
      if (field === "researchInterests") setNewInterest("")
      else setNewQualification("")
    }
  }

  const removeArrayItem = (field: "researchInterests" | "qualifications", index: number) => {
    setFormData({
      ...formData,
      [field]: (formData[field] || []).filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.organisation || !formData.institute || !formData.lab) {
      alert("Please fill in all required fields: Name, Organisation, Institute, and Lab")
      return
    }

    try {
      setLoading(true)
      
      const newProfile: Omit<PersonProfile, 'id'> = {
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        email: formData.email!,
        position: formData.position || "",
        organisation: formData.organisation!,
        institute: formData.institute!,
        lab: formData.lab!,
        reportsTo: formData.reportsTo || null,
        fundedBy: formData.fundedBy || [],
        startDate: formData.startDate || new Date().toISOString().split("T")[0],
        phone: formData.phone || "",
        officeLocation: formData.officeLocation || "",
        researchInterests: formData.researchInterests || [],
        qualifications: formData.qualifications || [],
        notes: formData.notes || "",
        projects: [],
        principalInvestigatorProjects: [],
        userId: user.id,
        profileComplete: true,
      }

      // Save profile to Firestore
      console.log("Creating profile with data:", newProfile)
      console.log("User ID:", user.id)
      
      const profileId = await createProfile(user.id, newProfile)
      console.log("Profile created successfully with ID:", profileId)
      
      // Create the complete profile object with the generated ID
      const completeProfile: PersonProfile = {
        ...newProfile,
        id: profileId,
      }
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("profiles-updated"))

      onComplete(completeProfile)
    } catch (error: any) {
      console.error("Error creating profile:", error)
      console.error("Error code:", error?.code)
      console.error("Error message:", error?.message)
      console.error("Error stack:", error?.stack)
      
      // Show more specific error message
      const errorMessage = error?.message || "Unknown error"
      alert(`Error creating profile: ${errorMessage}\n\nPlease check the console for more details.`)
    } finally {
      setLoading(false)
    }
  }

  const canProceedToStep2 = formData.firstName && formData.lastName && formData.organisation && formData.institute && formData.lab
  const canProceedToStep3 = true // Optional fields, can always proceed
  const canComplete = canProceedToStep2

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="card-monday p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Tell us about yourself to join the lab network
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center ${step >= 1 ? "text-brand-500" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? "border-brand-500 bg-brand-50" : "border-muted-foreground"}`}>
                1
              </div>
              <span className="ml-2 font-medium">Basic Info</span>
            </div>
            <div className="flex-1 h-0.5 bg-muted-foreground mx-4" />
            <div className={`flex items-center ${step >= 2 ? "text-brand-500" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? "border-brand-500 bg-brand-50" : "border-muted-foreground"}`}>
                2
              </div>
              <span className="ml-2 font-medium">Position & Lab</span>
            </div>
            <div className="flex-1 h-0.5 bg-muted-foreground mx-4" />
            <div className={`flex items-center ${step >= 3 ? "text-brand-500" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? "border-brand-500 bg-brand-50" : "border-muted-foreground"}`}>
                3
              </div>
              <span className="ml-2 font-medium">Additional Details</span>
            </div>
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="organisation">Organisation *</Label>
                <div className="flex gap-2">
                  <select
                    id="organisation"
                    value={formData.organisation}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        organisation: e.target.value,
                        institute: "", // Reset dependent fields
                        lab: ""
                      })
                      setShowNewOrg(false)
                    }}
                    className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                    required
                  >
                    <option value="">Select Organisation...</option>
                    {organisationNames.map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewOrg(!showNewOrg)
                      if (showNewOrg) setNewOrgName("")
                    }}
                    className="whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
                {showNewOrg && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNewOrg())}
                      placeholder="New Organisation Name"
                      autoFocus
                    />
                    <Button type="button" onClick={handleAddNewOrg} size="sm">
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowNewOrg(false); setNewOrgName("") }} size="sm">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {formData.organisation && (
                <div>
                  <Label htmlFor="institute">Institute *</Label>
                  <div className="flex gap-2">
                    <select
                      id="institute"
                      value={formData.institute}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          institute: e.target.value,
                          lab: "" // Reset dependent field
                        })
                        setShowNewInstitute(false)
                      }}
                      className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                      required
                      disabled={!formData.organisation}
                    >
                      <option value="">Select Institute...</option>
                      {instituteNames.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewInstitute(!showNewInstitute)
                        if (showNewInstitute) setNewInstituteName("")
                      }}
                      className="whitespace-nowrap"
                      disabled={!formData.organisation}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add New
                    </Button>
                  </div>
                  {showNewInstitute && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={newInstituteName}
                        onChange={(e) => setNewInstituteName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNewInstitute())}
                        placeholder="New Institute Name"
                        autoFocus
                      />
                      <Button type="button" onClick={handleAddNewInstitute} size="sm">
                        Save
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setShowNewInstitute(false); setNewInstituteName("") }} size="sm">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {formData.organisation && formData.institute && (
                <div>
                  <Label htmlFor="lab">Lab *</Label>
                  <div className="flex gap-2">
                    <select
                      id="lab"
                      value={formData.lab}
                      onChange={(e) => {
                        setFormData({ ...formData, lab: e.target.value })
                        setShowNewLab(false)
                      }}
                      className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                      required
                      disabled={!formData.organisation || !formData.institute}
                    >
                      <option value="">Select Lab...</option>
                      {labNames.map(lab => (
                        <option key={lab} value={lab}>{lab}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewLab(!showNewLab)
                        if (showNewLab) setNewLabName("")
                      }}
                      className="whitespace-nowrap"
                      disabled={!formData.organisation || !formData.institute}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add New
                    </Button>
                  </div>
                  {showNewLab && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={newLabName}
                        onChange={(e) => setNewLabName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNewLab())}
                        placeholder="New Lab Name"
                        autoFocus
                      />
                      <Button type="button" onClick={handleAddNewLab} size="sm">
                        Save
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setShowNewLab(false); setNewLabName("") }} size="sm">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Show Active Projects for Selected Lab - TODO: Implement with Firestore */}
              {/* {formData.lab && labProjects.length > 0 && (...)} */}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Next: Position & Lab
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Position & Lab */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Position & Lab Details</h2>
              
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., PhD Student, Postdoctoral Researcher, Principal Investigator"
                />
              </div>

              <div>
                <Label htmlFor="reportsTo">Reports To</Label>
                <select
                  id="reportsTo"
                  value={formData.reportsTo || ""}
                  onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="">N/A - Not applicable</option>
                  {/* TODO: Load profiles from Firestore for "Reports To" dropdown */}
                </select>
              </div>

              <div>
                <Label htmlFor="funders">Funders</Label>
                <div className="space-y-2">
                  {(formData.fundedBy || []).map((funderName, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="px-3 py-2 rounded-md border border-border bg-background flex-1">
                        {funderName}
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
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value && !formData.fundedBy?.includes(e.target.value)) {
                        setFormData({
                          ...formData,
                          fundedBy: [...(formData.fundedBy || []), e.target.value],
                        })
                        e.target.value = ""
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                  >
                    <option value="">Select Funder...</option>
                    {funderNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewFunder(!showNewFunder)
                      if (showNewFunder) setNewFunderName("")
                    }}
                    className="whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
                {showNewFunder && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newFunderName}
                      onChange={(e) => setNewFunderName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNewFunder())}
                      placeholder="New Funder Name"
                      autoFocus
                    />
                    <Button type="button" onClick={handleAddNewFunder} size="sm">
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowNewFunder(false); setNewFunderName("") }} size="sm">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+44 20 7123 4567"
                />
              </div>

              <div>
                <Label htmlFor="officeLocation">Office Location</Label>
                <Input
                  id="officeLocation"
                  value={formData.officeLocation}
                  onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                  placeholder="e.g., Building A, Room 301"
                />
              </div>

              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3}
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  Next: Additional Details
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Additional Details */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Additional Details</h2>
              
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Research Interests</Label>
                {(formData.researchInterests || []).map((interest, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={interest}
                      onChange={(e) => {
                        const updated = [...(formData.researchInterests || [])]
                        updated[index] = e.target.value
                        setFormData({ ...formData, researchInterests: updated })
                      }}
                      placeholder="e.g., Microfluidics, Cell Analysis"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem("researchInterests", index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add research interest..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("researchInterests"))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addArrayItem("researchInterests")}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <Label>Qualifications</Label>
                {(formData.qualifications || []).map((qual, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={qual}
                      onChange={(e) => {
                        const updated = [...(formData.qualifications || [])]
                        updated[index] = e.target.value
                        setFormData({ ...formData, qualifications: updated })
                      }}
                      placeholder="e.g., PhD Molecular Biology"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem("qualifications", index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newQualification}
                    onChange={(e) => setNewQualification(e.target.value)}
                    placeholder="Add qualification..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("qualifications"))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addArrayItem("qualifications")}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  placeholder="Any additional information about yourself..."
                />
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canComplete}
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Complete Profile & Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

