"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Organisation,
  Institute,
  Lab,
  Funder,
  PersonProfile,
  PositionLevel,
  POSITION_DISPLAY_NAMES,
  POSITION_HIERARCHY_ORDER,
  POSITION_CATEGORIES,
} from "@/lib/types"
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
  createMasterProject,
  createFundingAccount,
  updateUser,
} from "@/lib/firestoreService"
import { Building, GraduationCap, BookOpen, Users, Briefcase, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react"

interface OnboardingFlowProps {
  user: { id: string; email: string; fullName: string }
  onComplete: (profile: PersonProfile) => void
}

interface OnboardingState {
  // Step 1-3: Organisation/Institute/Lab
  selectedOrganisation: Organisation | null
  selectedInstitute: Institute | null
  selectedLab: Lab | null

  // Step 4: Personal details
  firstName: string
  lastName: string
  email: string
  phone: string
  officeLocation: string

  // Step 5: Position
  positionLevel: PositionLevel | null

  // Step 6: PI Status
  isPrincipalInvestigator: boolean

  // Step 7: Create/Join Project (optional - can skip)
  createProject: boolean
  projectName: string
  projectDescription: string
  grantName: string
  grantNumber: string
  funderId: string
  funderName: string
  totalBudget: string
  currency: string
  startDate: string
  endDate: string

  // Step 8: Create Account (if creating project)
  accountNumber: string
  accountName: string
  accountType: "main" | "equipment" | "consumables" | "travel" | "personnel" | "other"
}

type OnboardingStep =
  | "welcome"
  | "organisation"
  | "institute"
  | "lab"
  | "personal-details"
  | "position"
  | "pi-status"
  | "project-choice"
  | "project-details"
  | "account-details"
  | "review"
  | "complete"

export default function OnboardingFlow({ user, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data lists
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [funders, setFunders] = useState<Funder[]>([])

  // Search/create states
  const [orgSearchTerm, setOrgSearchTerm] = useState("")
  const [instSearchTerm, setInstSearchTerm] = useState("")
  const [labSearchTerm, setLabSearchTerm] = useState("")
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateInst, setShowCreateInst] = useState(false)
  const [showCreateLab, setShowCreateLab] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>("")

  // Form state
  const [state, setState] = useState<OnboardingState>({
    selectedOrganisation: null,
    selectedInstitute: null,
    selectedLab: null,
    firstName: user.fullName.split(" ")[0] || "",
    lastName: user.fullName.split(" ").slice(1).join(" ") || "",
    email: user.email,
    phone: "",
    officeLocation: "",
    positionLevel: null,
    isPrincipalInvestigator: false,
    createProject: false,
    projectName: "",
    projectDescription: "",
    grantName: "",
    grantNumber: "",
    funderId: "",
    funderName: "",
    totalBudget: "",
    currency: "GBP",
    startDate: "",
    endDate: "",
    accountNumber: "",
    accountName: "",
    accountType: "main",
  })

  // Load organisations on mount
  useEffect(() => {
    loadOrganisations()
    loadFunders()
  }, [])

  // Load institutes when organisation selected
  useEffect(() => {
    if (state.selectedOrganisation) {
      loadInstitutes(state.selectedOrganisation.id)
    }
  }, [state.selectedOrganisation])

  // Load labs when institute selected
  useEffect(() => {
    if (state.selectedInstitute) {
      loadLabs(state.selectedInstitute.id)
    }
  }, [state.selectedInstitute])

  const loadOrganisations = async () => {
    try {
      const orgs = await getOrganisations()
      setOrganisations(orgs)
    } catch (err) {
      console.error("Error loading organisations:", err)
      setError("Failed to load organisations")
    }
  }

  const loadInstitutes = async (orgId: string) => {
    try {
      const insts = await getInstitutes(orgId)
      setInstitutes(insts)
    } catch (err) {
      console.error("Error loading institutes:", err)
      setError("Failed to load institutes")
    }
  }

  const loadLabs = async (instId: string) => {
    try {
      const labsList = await getLabs(instId)
      setLabs(labsList)
    } catch (err) {
      console.error("Error loading labs:", err)
      setError("Failed to load labs")
    }
  }

  const loadFunders = async () => {
    try {
      const fundersList = await getFunders()
      setFunders(fundersList)
    } catch (err) {
      console.error("Error loading funders:", err)
      setError("Failed to load funders")
    }
  }

  const handleCreateOrganisation = async () => {
    if (!orgSearchTerm.trim()) return

    try {
      setLoading(true)
      const orgId = await createOrganisation({
        name: orgSearchTerm.trim(),
        country: selectedCountry || "Unknown",
        type: "university",
        createdBy: user.id,
      })

      await loadOrganisations()
      const newOrg = organisations.find(o => o.id === orgId)
      if (newOrg) {
        setState({ ...state, selectedOrganisation: newOrg })
        setShowCreateOrg(false)
        setOrgSearchTerm("")
      }
    } catch (err) {
      console.error("Error creating organisation:", err)
      setError("Failed to create organisation")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInstitute = async () => {
    if (!instSearchTerm.trim() || !state.selectedOrganisation) return

    try {
      setLoading(true)
      const instId = await createInstitute({
        name: instSearchTerm.trim(),
        organisationId: state.selectedOrganisation.id,
        organisationName: state.selectedOrganisation.name,
        createdBy: user.id,
      })

      await loadInstitutes(state.selectedOrganisation.id)
      const newInst = institutes.find(i => i.id === instId)
      if (newInst) {
        setState({ ...state, selectedInstitute: newInst })
        setShowCreateInst(false)
        setInstSearchTerm("")
      }
    } catch (err) {
      console.error("Error creating institute:", err)
      setError("Failed to create institute")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLab = async () => {
    if (!labSearchTerm.trim() || !state.selectedOrganisation || !state.selectedInstitute) return

    try {
      setLoading(true)
      const labId = await createLab({
        name: labSearchTerm.trim(),
        instituteId: state.selectedInstitute.id,
        instituteName: state.selectedInstitute.name,
        organisationId: state.selectedOrganisation.id,
        organisationName: state.selectedOrganisation.name,
        principalInvestigators: [],
        labManagerIds: [],
        createdBy: user.id,
      })

      await loadLabs(state.selectedInstitute.id)
      const newLab = labs.find(l => l.id === labId)
      if (newLab) {
        setState({ ...state, selectedLab: newLab })
        setShowCreateLab(false)
        setLabSearchTerm("")
      }
    } catch (err) {
      console.error("Error creating lab:", err)
      setError("Failed to create lab")
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!state.selectedOrganisation || !state.selectedInstitute || !state.selectedLab || !state.positionLevel) {
      setError("Please complete all required steps")
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create profile
      const profileData: Omit<PersonProfile, 'id'> = {
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
        officeLocation: state.officeLocation,

        // New organizational hierarchy
        organisationId: state.selectedOrganisation.id,
        organisationName: state.selectedOrganisation.name,
        instituteId: state.selectedInstitute.id,
        instituteName: state.selectedInstitute.name,
        labId: state.selectedLab.id,
        labName: state.selectedLab.name,

        // Position
        positionLevel: state.positionLevel,
        positionDisplayName: POSITION_DISPLAY_NAMES[state.positionLevel],
        position: POSITION_DISPLAY_NAMES[state.positionLevel], // Legacy

        // Reporting
        reportsToId: null,

        // PI Status
        isPrincipalInvestigator: state.isPrincipalInvestigator,

        // Project membership (will be populated if project created)
        masterProjectIds: [],
        masterProjectRoles: {},

        // Legacy fields (backward compatibility)
        organisation: state.selectedOrganisation.name,
        institute: state.selectedInstitute.name,
        lab: state.selectedLab.name,
        fundedBy: [],
        reportsTo: null,
        projects: [],
        principalInvestigatorProjects: [],

        // Dates
        startDate: new Date().toISOString().split("T")[0],

        // Research profile
        researchInterests: [],
        qualifications: [],
        notes: "",

        // Account
        userId: user.id,
        profileComplete: true,
        onboardingComplete: true,
        isAdministrator: false,
      }

      const profileId = await createProfile(user.id, profileData)

      // Update user document with profileId
      await updateUser(user.id, { profileId })

      // If creating a project, create it now
      if (state.createProject && state.projectName) {
        const projectId = await createMasterProject({
          name: state.projectName,
          description: state.projectDescription,

          // Organizational links
          labId: state.selectedLab.id,
          labName: state.selectedLab.name,
          instituteId: state.selectedInstitute.id,
          instituteName: state.selectedInstitute.name,
          organisationId: state.selectedOrganisation.id,
          organisationName: state.selectedOrganisation.name,

          // Grant info
          grantName: state.grantName,
          grantNumber: state.grantNumber,

          // Financial
          totalBudget: state.totalBudget ? parseFloat(state.totalBudget) : undefined,
          currency: state.currency,

          // Dates
          startDate: state.startDate,
          endDate: state.endDate,

          // Funding
          funderId: state.funderId,
          funderName: state.funderName,
          accountIds: [], // Will be populated after account creation

          // Team
          principalInvestigatorIds: state.isPrincipalInvestigator ? [profileId] : [],
          coPIIds: [],
          teamMemberIds: [profileId],
          teamRoles: {
            [profileId]: state.isPrincipalInvestigator ? "PI" : "RA"
          },

          // Status
          status: "planning",
          progress: 0,

          // Structure
          workpackageIds: [],

          // Visibility
          visibility: "lab",

          // Metadata
          createdBy: user.id,
        })

        // Create account if specified
        if (state.accountNumber && state.accountName) {
          await createFundingAccount({
            accountNumber: state.accountNumber,
            accountName: state.accountName,
            funderId: state.funderId,
            funderName: state.funderName,
            masterProjectId: projectId,
            masterProjectName: state.projectName,
            accountType: state.accountType,
            totalBudget: state.totalBudget ? parseFloat(state.totalBudget) : undefined,
            currency: state.currency,
            startDate: state.startDate,
            endDate: state.endDate,
            status: "active",
            createdBy: user.id,
          })
        }
      }

      setCurrentStep("complete")

      // Call onComplete after a brief delay to show success message
      setTimeout(() => {
        onComplete({
          ...profileData,
          id: profileId,
        } as PersonProfile)
      }, 2000)

    } catch (err) {
      console.error("Error completing onboarding:", err)
      setError("Failed to complete onboarding. Please try again.")
      setLoading(false)
    }
  }

  const canProceedFromStep = (step: OnboardingStep): boolean => {
    switch (step) {
      case "organisation":
        return !!state.selectedOrganisation
      case "institute":
        return !!state.selectedInstitute
      case "lab":
        return !!state.selectedLab
      case "personal-details":
        return !!(state.firstName && state.lastName && state.email)
      case "position":
        return !!state.positionLevel
      case "pi-status":
        return true // Always can proceed
      case "project-choice":
        return true // Can skip project creation
      case "project-details":
        return !state.createProject || !!(state.projectName && state.funderId && state.startDate && state.endDate)
      case "account-details":
        return !state.createProject || !!(state.accountNumber && state.accountName)
      default:
        return true
    }
  }

  const getNextStep = (current: OnboardingStep): OnboardingStep => {
    const steps: OnboardingStep[] = [
      "welcome",
      "organisation",
      "institute",
      "lab",
      "personal-details",
      "position",
      "pi-status",
      "project-choice",
    ]

    if (state.createProject) {
      steps.push("project-details", "account-details")
    }

    steps.push("review")

    const currentIndex = steps.indexOf(current)
    return steps[currentIndex + 1] || "complete"
  }

  const getPreviousStep = (current: OnboardingStep): OnboardingStep => {
    const steps: OnboardingStep[] = [
      "welcome",
      "organisation",
      "institute",
      "lab",
      "personal-details",
      "position",
      "pi-status",
      "project-choice",
    ]

    if (state.createProject && (current === "project-details" || current === "account-details" || current === "review")) {
      steps.push("project-details", "account-details")
    }

    steps.push("review")

    const currentIndex = steps.indexOf(current)
    return steps[currentIndex - 1] || "welcome"
  }

  const handleNext = () => {
    if (canProceedFromStep(currentStep)) {
      setCurrentStep(getNextStep(currentStep))
      setError(null)
    } else {
      setError("Please complete all required fields before proceeding")
    }
  }

  const handleBack = () => {
    setCurrentStep(getPreviousStep(currentStep))
    setError(null)
  }

  const filteredOrganisations = organisations.filter(org =>
    org.name.toLowerCase().includes(orgSearchTerm.toLowerCase())
  )

  const filteredInstitutes = institutes.filter(inst =>
    inst.name.toLowerCase().includes(instSearchTerm.toLowerCase())
  )

  const filteredLabs = labs.filter(lab =>
    lab.name.toLowerCase().includes(labSearchTerm.toLowerCase())
  )

  // Render different steps
  const renderStep = () => {
    switch (currentStep) {
      case "welcome":
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome to Momentum!</h2>
              <p className="text-gray-600 text-lg">
                Let&apos;s get you set up. This will only take a few minutes.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
              <h3 className="font-semibold mb-3">What we&apos;ll set up:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Your organization, institute, and lab affiliation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Your position and role in the lab</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Your research projects and funding (optional)</span>
                </li>
              </ul>
            </div>
            <Button onClick={handleNext} size="lg" className="mt-4">
              Get Started <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )

      case "organisation":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Select Your Organization</h2>
              <p className="text-gray-600">Choose your university or research institution</p>
            </div>

            <div>
              <Label htmlFor="org-search">Search for your organization</Label>
              <Input
                id="org-search"
                placeholder="e.g., University of Cambridge"
                value={orgSearchTerm}
                onChange={(e) => setOrgSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredOrganisations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No organizations found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateOrg(true)}
                    className="mt-2"
                  >
                    Create &quot;{orgSearchTerm}&quot;
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredOrganisations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setState({ ...state, selectedOrganisation: org })}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        state.selectedOrganisation?.id === org.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-500">{org.country}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showCreateOrg && orgSearchTerm && filteredOrganisations.length === 0 && (
              <Button
                variant="outline"
                onClick={() => setShowCreateOrg(true)}
                className="w-full"
              >
                Create new organization: &quot;{orgSearchTerm}&quot;
              </Button>
            )}

            {showCreateOrg && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Create New Organization</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Name: {orgSearchTerm}
                </p>
                <div className="mb-4">
                  <Label htmlFor="org-country" className="text-sm font-medium mb-2 block">
                    Country
                  </Label>
                  <select
                    id="org-country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a country</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Italy">Italy</option>
                    <option value="Spain">Spain</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Norway">Norway</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Finland">Finland</option>
                    <option value="Japan">Japan</option>
                    <option value="China">China</option>
                    <option value="India">India</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Mexico">Mexico</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateOrganisation} disabled={loading}>
                    {loading ? "Creating..." : "Confirm"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowCreateOrg(false)
                    setSelectedCountry("")
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )

      case "institute":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Select Your Institute</h2>
              <p className="text-gray-600">Choose your department or school</p>
              <p className="text-sm text-gray-500 mt-1">
                at {state.selectedOrganisation?.name}
              </p>
            </div>

            <div>
              <Label htmlFor="inst-search">Search for your institute</Label>
              <Input
                id="inst-search"
                placeholder="e.g., Department of Physics"
                value={instSearchTerm}
                onChange={(e) => setInstSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredInstitutes.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No institutes found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateInst(true)}
                    className="mt-2"
                  >
                    Create &quot;{instSearchTerm}&quot;
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredInstitutes.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => setState({ ...state, selectedInstitute: inst })}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        state.selectedInstitute?.id === inst.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="font-medium">{inst.name}</div>
                      {inst.department && (
                        <div className="text-sm text-gray-500">{inst.department}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showCreateInst && instSearchTerm && filteredInstitutes.length === 0 && (
              <Button
                variant="outline"
                onClick={() => setShowCreateInst(true)}
                className="w-full"
              >
                Create new institute: &quot;{instSearchTerm}&quot;
              </Button>
            )}

            {showCreateInst && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Create New Institute</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Name: {instSearchTerm}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleCreateInstitute} disabled={loading}>
                    {loading ? "Creating..." : "Confirm"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateInst(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )

      case "lab":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Select Your Lab</h2>
              <p className="text-gray-600">Choose your research group</p>
              <p className="text-sm text-gray-500 mt-1">
                at {state.selectedInstitute?.name}
              </p>
            </div>

            <div>
              <Label htmlFor="lab-search">Search for your lab</Label>
              <Input
                id="lab-search"
                placeholder="e.g., Quantum Physics Lab"
                value={labSearchTerm}
                onChange={(e) => setLabSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredLabs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No labs found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateLab(true)}
                    className="mt-2"
                  >
                    Create &quot;{labSearchTerm}&quot;
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLabs.map((lab) => (
                    <button
                      key={lab.id}
                      onClick={() => setState({ ...state, selectedLab: lab })}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        state.selectedLab?.id === lab.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="font-medium">{lab.name}</div>
                      {lab.description && (
                        <div className="text-sm text-gray-500 mt-1">{lab.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showCreateLab && labSearchTerm && filteredLabs.length === 0 && (
              <Button
                variant="outline"
                onClick={() => setShowCreateLab(true)}
                className="w-full"
              >
                Create new lab: &quot;{labSearchTerm}&quot;
              </Button>
            )}

            {showCreateLab && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Create New Lab</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Name: {labSearchTerm}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleCreateLab} disabled={loading}>
                    {loading ? "Creating..." : "Confirm"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateLab(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )

      case "personal-details":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Your Details</h2>
              <p className="text-gray-600">Tell us a bit about yourself</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={state.firstName}
                  onChange={(e) => setState({ ...state, firstName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={state.lastName}
                  onChange={(e) => setState({ ...state, lastName: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => setState({ ...state, email: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={state.phone}
                onChange={(e) => setState({ ...state, phone: e.target.value })}
                className="mt-1"
                placeholder="e.g., +44 123 456 7890"
              />
            </div>

            <div>
              <Label htmlFor="office">Office Location (optional)</Label>
              <Input
                id="office"
                value={state.officeLocation}
                onChange={(e) => setState({ ...state, officeLocation: e.target.value })}
                className="mt-1"
                placeholder="e.g., Building 3, Room 205"
              />
            </div>
          </div>
        )

      case "position":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Briefcase className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Your Position</h2>
              <p className="text-gray-600">What is your role in the lab?</p>
            </div>

            <div className="space-y-4">
              {Object.entries(POSITION_CATEGORIES).map(([category, positions]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm text-gray-700">{category}</h3>
                  <div className="space-y-2">
                    {positions.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setState({ ...state, positionLevel: pos })}
                        className={`w-full p-3 text-left rounded-lg border transition ${
                          state.positionLevel === pos
                            ? "bg-blue-50 border-blue-600"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        {POSITION_DISPLAY_NAMES[pos]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case "pi-status":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Principal Investigator Status</h2>
              <p className="text-gray-600">Are you a Principal Investigator (PI)?</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-sm text-gray-700 mb-4">
                Note: You can be a PI on some projects but not others. This setting determines whether
                you can create and manage your own research projects.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setState({ ...state, isPrincipalInvestigator: true })}
                className={`p-6 rounded-lg border-2 transition ${
                  state.isPrincipalInvestigator
                    ? "bg-blue-50 border-blue-600"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">Yes, I am a PI</div>
                <div className="text-sm text-gray-600">
                  I lead research projects and can manage funding accounts
                </div>
              </button>

              <button
                onClick={() => setState({ ...state, isPrincipalInvestigator: false })}
                className={`p-6 rounded-lg border-2 transition ${
                  !state.isPrincipalInvestigator
                    ? "bg-blue-50 border-blue-600"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">No, I&apos;m not a PI</div>
                <div className="text-sm text-gray-600">
                  I work on projects led by other researchers
                </div>
              </button>
            </div>
          </div>
        )

      case "project-choice":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Create Your First Project?</h2>
              <p className="text-gray-600">You can create a project now or do it later</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setState({ ...state, createProject: true })}
                className={`p-6 rounded-lg border-2 transition ${
                  state.createProject
                    ? "bg-blue-50 border-blue-600"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">Create Project Now</div>
                <div className="text-sm text-gray-600">
                  Set up your research project with funding details
                </div>
              </button>

              <button
                onClick={() => setState({ ...state, createProject: false })}
                className={`p-6 rounded-lg border-2 transition ${
                  !state.createProject
                    ? "bg-blue-50 border-blue-600"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">Skip for Now</div>
                <div className="text-sm text-gray-600">
                  I&apos;ll create my project later from my dashboard
                </div>
              </button>
            </div>
          </div>
        )

      case "project-details":
        if (!state.createProject) {
          handleNext()
          return null
        }

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Project Details</h2>
              <p className="text-gray-600">Tell us about your research project</p>
            </div>

            <div>
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={state.projectName}
                onChange={(e) => setState({ ...state, projectName: e.target.value })}
                className="mt-1"
                placeholder="e.g., Quantum Computing Research"
              />
            </div>

            <div>
              <Label htmlFor="projectDesc">Description (optional)</Label>
              <textarea
                id="projectDesc"
                value={state.projectDescription}
                onChange={(e) => setState({ ...state, projectDescription: e.target.value })}
                className="mt-1 w-full border rounded-md p-2 min-h-[100px]"
                placeholder="Brief description of your research project..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grantName">Grant Name (optional)</Label>
                <Input
                  id="grantName"
                  value={state.grantName}
                  onChange={(e) => setState({ ...state, grantName: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., UKRI Fellowship"
                />
              </div>
              <div>
                <Label htmlFor="grantNumber">Grant Number (optional)</Label>
                <Input
                  id="grantNumber"
                  value={state.grantNumber}
                  onChange={(e) => setState({ ...state, grantNumber: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., MR/X123456/1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="funder">Funder *</Label>
              <select
                id="funder"
                value={state.funderId}
                onChange={(e) => {
                  const funder = funders.find(f => f.id === e.target.value)
                  setState({
                    ...state,
                    funderId: e.target.value,
                    funderName: funder?.name || ""
                  })
                }}
                className="mt-1 w-full border rounded-md p-2"
              >
                <option value="">Select a funder...</option>
                {funders.map((funder) => (
                  <option key={funder.id} value={funder.id}>
                    {funder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="budget">Total Budget (optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={state.totalBudget}
                  onChange={(e) => setState({ ...state, totalBudget: e.target.value })}
                  className="mt-1"
                  placeholder="500000"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={state.currency}
                  onChange={(e) => setState({ ...state, currency: e.target.value })}
                  className="mt-1 w-full border rounded-md p-2"
                >
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={state.startDate}
                  onChange={(e) => setState({ ...state, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={state.endDate}
                  onChange={(e) => setState({ ...state, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )

      case "account-details":
        if (!state.createProject) {
          handleNext()
          return null
        }

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Funding Account</h2>
              <p className="text-gray-600">Add a funding account for this project</p>
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={state.accountNumber}
                onChange={(e) => setState({ ...state, accountNumber: e.target.value })}
                className="mt-1"
                placeholder="e.g., 1735578"
              />
            </div>

            <div>
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                value={state.accountName}
                onChange={(e) => setState({ ...state, accountName: e.target.value })}
                className="mt-1"
                placeholder="e.g., Main Research Account"
              />
            </div>

            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <select
                id="accountType"
                value={state.accountType}
                onChange={(e) => setState({ ...state, accountType: e.target.value as any })}
                className="mt-1 w-full border rounded-md p-2"
              >
                <option value="main">Main Account</option>
                <option value="equipment">Equipment</option>
                <option value="consumables">Consumables</option>
                <option value="travel">Travel</option>
                <option value="personnel">Personnel</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )

      case "review":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Review Your Information</h2>
              <p className="text-gray-600">Please confirm everything looks correct</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Organization</h3>
                <p className="text-sm text-gray-700">
                  {state.selectedOrganisation?.name} → {state.selectedInstitute?.name} → {state.selectedLab?.name}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Personal Details</h3>
                <p className="text-sm text-gray-700">
                  {state.firstName} {state.lastName}<br />
                  {state.email}
                  {state.phone && <><br />{state.phone}</>}
                  {state.officeLocation && <><br />{state.officeLocation}</>}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Position</h3>
                <p className="text-sm text-gray-700">
                  {state.positionLevel && POSITION_DISPLAY_NAMES[state.positionLevel]}
                  {state.isPrincipalInvestigator && " (Principal Investigator)"}
                </p>
              </div>

              {state.createProject && state.projectName && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Project</h3>
                  <p className="text-sm text-gray-700">
                    <strong>{state.projectName}</strong><br />
                    {state.projectDescription && <>{state.projectDescription}<br /></>}
                    Funder: {state.funderName}<br />
                    {state.totalBudget && <>Budget: {state.currency} {parseFloat(state.totalBudget).toLocaleString()}<br /></>}
                    Duration: {state.startDate} to {state.endDate}
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleComplete} disabled={loading} size="lg" className="w-full">
              {loading ? "Setting up your account..." : "Complete Setup"}
            </Button>
          </div>
        )

      case "complete":
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">All Set!</h2>
              <p className="text-gray-600 text-lg">
                Your account has been successfully set up.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Redirecting you to your dashboard...
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const isFirstStep = currentStep === "welcome"
  const isLastStep = currentStep === "review"
  const isCompleteStep = currentStep === "complete"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        {!isCompleteStep && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Step {["welcome", "organisation", "institute", "lab", "personal-details", "position", "pi-status", "project-choice", "project-details", "account-details", "review"].indexOf(currentStep) + 1} of 11</span>
              <span>Momentum Onboarding</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(["welcome", "organisation", "institute", "lab", "personal-details", "position", "pi-status", "project-choice", "project-details", "account-details", "review"].indexOf(currentStep) + 1) / 11 * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {renderStep()}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!isFirstStep && !isCompleteStep && (
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ChevronLeft className="mr-2 w-4 h-4" /> Back
            </Button>

            {!isLastStep && (
              <Button
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep) || loading}
              >
                Continue <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
