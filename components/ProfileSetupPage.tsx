"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersonProfile, ProfileProject, Organisation, Institute, Lab, Funder } from "@/lib/types"
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

interface ProfileSetupPageProps {
  user: { id: string; email: string; fullName: string }
  onComplete: (profile: PersonProfile) => void
}

type QuestionType = 
  | "text"
  | "select"
  | "email"
  | "tel"
  | "date"
  | "textarea"
  | "multi-select"
  | "array"

interface Question {
  id: string
  label: string
  field: keyof PersonProfile
  type: QuestionType
  required: boolean
  placeholder?: string
  options?: string[]
  dependsOn?: { field: keyof PersonProfile; value: any }
  allowAddNew?: boolean
}

export function ProfileSetupPage({ user, onComplete }: ProfileSetupPageProps) {
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
    profileComplete: true, // Always true once profile is created
  })

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
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

  // Define all questions in order
  const allQuestions: Question[] = useMemo(() => [
    {
      id: "firstName",
      label: "What is your first name?",
      field: "firstName",
      type: "text",
      required: true,
      placeholder: "Enter your first name"
    },
    {
      id: "lastName",
      label: "What is your last name?",
      field: "lastName",
      type: "text",
      required: true,
      placeholder: "Enter your last name"
    },
    {
      id: "organisation",
      label: "Which organisation do you belong to?",
      field: "organisation",
      type: "select",
      required: true,
      options: organisationNames,
      allowAddNew: true
    },
    {
      id: "institute",
      label: "Which institute are you part of?",
      field: "institute",
      type: "select",
      required: true,
      options: instituteNames,
      dependsOn: { field: "organisation", value: true }, // true means just check if field has a value
      allowAddNew: true
    },
    {
      id: "lab",
      label: "Which lab do you work in?",
      field: "lab",
      type: "select",
      required: true,
      options: labNames,
      dependsOn: { field: "institute", value: true }, // true means just check if field has a value
      allowAddNew: true
    },
    {
      id: "position",
      label: "What is your position?",
      field: "position",
      type: "text",
      required: false,
      placeholder: "e.g., PhD Student, Postdoctoral Researcher, Principal Investigator"
    },
    {
      id: "phone",
      label: "What is your phone number?",
      field: "phone",
      type: "tel",
      required: false,
      placeholder: "+44 20 7123 4567"
    },
    {
      id: "officeLocation",
      label: "Where is your office located?",
      field: "officeLocation",
      type: "text",
      required: false,
      placeholder: "e.g., Building A, Room 301"
    },
    {
      id: "startDate",
      label: "When did you start?",
      field: "startDate",
      type: "date",
      required: false
    },
    {
      id: "notes",
      label: "Any additional information about yourself?",
      field: "notes",
      type: "textarea",
      required: false,
      placeholder: "Enter any additional information..."
    }
  ], [organisationNames, instituteNames, labNames, formData.organisation, formData.institute])

  // Filter visible questions based on dependencies
  const visibleQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (!q.dependsOn) return true
      const dependencyValue = formData[q.dependsOn.field]
      // If dependsOn.value is true, just check if the field has any value
      if (q.dependsOn.value === true) {
        return !!dependencyValue
      }
      // Otherwise check for exact match
      return dependencyValue === q.dependsOn.value
    })
  }, [allQuestions, formData])

  // Get current question
  const currentQuestion = visibleQuestions[currentQuestionIndex]
  const totalQuestions = visibleQuestions.length
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1

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

  // Ensure current question index is valid when visible questions change
  useEffect(() => {
    if (currentQuestionIndex >= visibleQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, visibleQuestions.length - 1))
    }
    
    // If current question is not in visible questions, find a valid one
    if (currentQuestion && !visibleQuestions.includes(currentQuestion)) {
      const newIndex = visibleQuestions.findIndex(q => q.id === currentQuestion.id)
      if (newIndex >= 0) {
        setCurrentQuestionIndex(newIndex)
      } else {
        // Find the first valid question
        const firstValidIndex = visibleQuestions.findIndex(q => {
          if (!q.dependsOn) return true
          const dependencyValue = formData[q.dependsOn.field]
          if (q.dependsOn.value === true) {
            return !!dependencyValue
          }
          return dependencyValue === q.dependsOn.value
        })
        if (firstValidIndex >= 0) {
          setCurrentQuestionIndex(firstValidIndex)
        }
      }
    }
  }, [visibleQuestions, currentQuestion, currentQuestionIndex, formData])
  
  const handleAddNewOrg = async () => {
    if (newOrgName.trim()) {
      try {
        setLoading(true)
        await createOrganisation({
          name: newOrgName.trim(),
          country: "Unknown", // TODO: Add country selection in UI
          type: "university",
          createdBy: user.id,
        })
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
          await createInstitute({
            name: newInstituteName.trim(),
            organisationId: org.id,
            organisationName: org.name,
            createdBy: user.id,
          })
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
          await createLab({
            name: newLabName.trim(),
            instituteId: inst.id,
            instituteName: inst.name,
            organisationId: org.id,
            organisationName: org.name,
            principalInvestigators: [],
            labManagerIds: [],
            createdBy: user.id,
          })
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
        await createFunder({
          name: newFunderName.trim(),
          country: "Unknown", // TODO: Add country selection in UI
          type: "other",
          createdBy: user.id,
        })
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
        phone: formData.phone || "",
        officeLocation: formData.officeLocation || "",

        // New organizational hierarchy fields
        organisationId: `org_${formData.organisation!.toLowerCase().replace(/\s+/g, '_')}`,
        organisationName: formData.organisation!,
        instituteId: `inst_${formData.institute!.toLowerCase().replace(/\s+/g, '_')}`,
        instituteName: formData.institute!,
        labId: `lab_${formData.lab!.toLowerCase().replace(/\s+/g, '_')}`,
        labName: formData.lab!,

        // Position
        positionLevel: formData.position?.includes("PhD") ? "phd_student" as any :
                       formData.position?.includes("Postdoc") ? "postdoc_research_associate" as any :
                       formData.position?.includes("Professor") ? "professor" as any :
                       "research_assistant" as any,
        positionDisplayName: formData.position || "Unknown",
        position: formData.position || "",

        // Reporting structure
        reportsToId: formData.reportsTo || null,

        // PI status
        isPrincipalInvestigator: false,

        // Project membership
        masterProjectIds: [],
        masterProjectRoles: {},

        // Legacy fields (for backward compatibility)
        organisation: formData.organisation!,
        institute: formData.institute!,
        lab: formData.lab!,
        reportsTo: formData.reportsTo || null,
        fundedBy: formData.fundedBy || [],
        projects: [],
        principalInvestigatorProjects: [],

        // Dates
        startDate: formData.startDate || new Date().toISOString().split("T")[0],

        // Research profile
        researchInterests: formData.researchInterests || [],
        qualifications: formData.qualifications || [],
        notes: formData.notes || "",

        // Account
        userId: user.id,
        profileComplete: true,
        onboardingComplete: false,
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

  // Check if current question is valid
  const canProceedToNext = useMemo(() => {
    if (!currentQuestion) return false
    if (!currentQuestion.required) return true
    
    const value = formData[currentQuestion.field]
    if (Array.isArray(value)) {
      return value.length > 0
    }
    return !!value
  }, [currentQuestion, formData])

  const handleNext = () => {
    if (!canProceedToNext && currentQuestion?.required) {
      alert(`Please ${currentQuestion.label.toLowerCase()}`)
      return
    }

    if (isLastQuestion) {
      handleSubmit()
    } else {
      setCurrentQuestionIndex(prev => Math.min(prev + 1, totalQuestions - 1))
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  // Render field based on question type
  const renderQuestionField = () => {
    if (!currentQuestion) return null

    const fieldValue = formData[currentQuestion.field] as any

    switch (currentQuestion.type) {
      case "text":
      case "tel":
        return (
          <Input
            id={currentQuestion.id}
            type={currentQuestion.type}
            value={fieldValue || ""}
            onChange={(e) => setFormData({ ...formData, [currentQuestion.field]: e.target.value })}
            placeholder={currentQuestion.placeholder}
            required={currentQuestion.required}
            autoFocus
          />
        )
      
      case "date":
        return (
          <Input
            id={currentQuestion.id}
            type="date"
            value={fieldValue || ""}
            onChange={(e) => setFormData({ ...formData, [currentQuestion.field]: e.target.value })}
            required={currentQuestion.required}
            autoFocus
          />
        )

      case "textarea":
        return (
          <textarea
            id={currentQuestion.id}
            value={fieldValue || ""}
            onChange={(e) => setFormData({ ...formData, [currentQuestion.field]: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
            placeholder={currentQuestion.placeholder}
            required={currentQuestion.required}
            autoFocus
          />
        )

      case "select":
        const showAddNew = currentQuestion.allowAddNew
        const isOrg = currentQuestion.id === "organisation"
        const isInstitute = currentQuestion.id === "institute"
        const isLab = currentQuestion.id === "lab"

        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                id={currentQuestion.id}
                value={fieldValue || ""}
                onChange={(e) => {
                  const updates: any = { ...formData, [currentQuestion.field]: e.target.value }
                  
                  // Reset dependent fields
                  if (isOrg) {
                    updates.institute = ""
                    updates.lab = ""
                    setShowNewOrg(false)
                  } else if (isInstitute) {
                    updates.lab = ""
                    setShowNewInstitute(false)
                  } else if (isLab) {
                    setShowNewLab(false)
                  }
                  
                  setFormData(updates)
                }}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                required={currentQuestion.required}
                disabled={
                  (isInstitute && !formData.organisation) ||
                  (isLab && (!formData.organisation || !formData.institute))
                }
                autoFocus
              >
                <option value="">Select {currentQuestion.label.split(" ").slice(-2).join(" ")}...</option>
                {currentQuestion.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {showAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (isOrg) {
                      setShowNewOrg(!showNewOrg)
                      if (showNewOrg) setNewOrgName("")
                    } else if (isInstitute) {
                      setShowNewInstitute(!showNewInstitute)
                      if (showNewInstitute) setNewInstituteName("")
                    } else if (isLab) {
                      setShowNewLab(!showNewLab)
                      if (showNewLab) setNewLabName("")
                    }
                  }}
                  className="whitespace-nowrap"
                  disabled={
                    (isInstitute && !formData.organisation) ||
                    (isLab && (!formData.organisation || !formData.institute))
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              )}
            </div>
            
            {/* Add new inputs */}
            {showAddNew && (
              <>
                {isOrg && showNewOrg && (
                  <div className="flex gap-2">
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
                {isInstitute && showNewInstitute && (
                  <div className="flex gap-2">
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
                {isLab && showNewLab && (
                  <div className="flex gap-2">
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
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="card-monday p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Question */}
          <div className="space-y-6">
            <div>
              <Label htmlFor={currentQuestion.id} className="text-lg font-medium">
                {currentQuestion.label}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className="mt-3">
                {renderQuestionField()}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentQuestionIndex === 0}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToNext && currentQuestion.required}
                className="bg-brand-500 hover:bg-brand-600 text-white"
              >
                {isLastQuestion ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Complete Profile
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

