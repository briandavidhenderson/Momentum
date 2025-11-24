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
  POSITION_CATEGORIES,
} from "@/lib/types"
import { getFirebaseAuth } from "@/lib/firebase"
import {
  getOrganisations,
  getInstitutes,
  getLabs,
  getFunders,
  createOrganisation,
  createInstitute,
  createLab,
  createProfile,
  createMasterProject,
  createFundingAccount,
  updateUser,
  subscribeToProfiles,  // Feature #8: For supervisor selection
} from "@/lib/firestoreService"
import { Building, GraduationCap, BookOpen, Users, Briefcase, CheckCircle2, ChevronRight, ChevronLeft, X } from "lucide-react"
import { FunderCreationDialog } from "./FunderCreationDialog"
import { OrcidIcon } from "./OrcidBadge"
import { linkOrcidToCurrentUser } from "@/lib/auth/orcid"
import { logger } from "@/lib/logger"

interface OnboardingFlowProps {
  user: { uid: string; email: string; fullName: string }
  onComplete: (profile: PersonProfile) => void
  onCancel?: () => void
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

  // Step 6b: Supervisor Selection (for non-PIs) - Feature #8
  supervisorId: string | null

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
  | "orcid"
  | "pi-status"
  | "supervisor-selection"  // Feature #8: Add supervisor assignment step
  | "project-choice"
  | "project-details"
  | "account-details"
  | "review"
  | "complete"

/**
 * Splits a full name into first and last name components.
 * Never uses email-like strings (e.g., "alice.smith") as names.
 */
function splitFullName(fullName: string | undefined | null): { firstName: string; lastName: string } {
  if (!fullName) {
    return { firstName: '', lastName: '' }
  }

  const trimmed = fullName.trim()

  // If empty or looks like an email local part (contains dots/underscores but no spaces), return empty
  if (!trimmed || (!trimmed.includes(' ') && (trimmed.includes('.') || trimmed.includes('_')))) {
    return { firstName: '', lastName: '' }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

export default function OnboardingFlow({ user, onComplete, onCancel }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Get a valid user UID - try prop first, fall back to Firebase Auth if needed
   * This handles cases where the user prop becomes stale during onboarding
   */
  const getValidUserUid = (): string | null => {
    // Try user prop first
    if (user?.uid && typeof user.uid === 'string' && user.uid.trim() !== '') {
      return user.uid
    }

    // Fall back to Firebase Auth
    const auth = getFirebaseAuth()
    const firebaseUser = auth.currentUser
    if (firebaseUser?.uid) {
      logger.info("Using fresh Firebase Auth UID instead of stale prop", { uid: firebaseUser.uid })
      return firebaseUser.uid
    }

    logger.error("No valid user UID found", { propUser: user, firebaseUser })
    return null
  }

  // Data lists
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [funders, setFunders] = useState<Funder[]>([])
  const [profiles, setProfiles] = useState<PersonProfile[]>([])  // Feature #8: For supervisor selection

  // Search/create states
  const [orgSearchTerm, setOrgSearchTerm] = useState("")
  const [instSearchTerm, setInstSearchTerm] = useState("")
  const [labSearchTerm, setLabSearchTerm] = useState("")
  const [funderSearchTerm, setFunderSearchTerm] = useState("")
  const [positionFilter, setPositionFilter] = useState("")
  const [supervisorSearchTerm, setSupervisorSearchTerm] = useState("")
  const [supervisorFilter, setSupervisorFilter] = useState<"all" | "org" | "school" | "dept">("dept")
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateInst, setShowCreateInst] = useState(false)
  const [showCreateLab, setShowCreateLab] = useState(false)
  const [showCreateFunder, setShowCreateFunder] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [selectedFunderType, setSelectedFunderType] = useState<"public" | "private" | "charity" | "internal" | "government" | "industry" | "eu" | "other">("government")

  // Form state
  const { firstName: initialFirstName, lastName: initialLastName } = splitFullName(user.fullName)
  const [state, setState] = useState<OnboardingState>({
    selectedOrganisation: null,
    selectedInstitute: null,
    selectedLab: null,
    firstName: initialFirstName,
    lastName: initialLastName,
    email: user.email,
    phone: "",
    officeLocation: "",
    positionLevel: null,
    isPrincipalInvestigator: false,
    supervisorId: null,  // Feature #8
    createProject: false,
    projectName: "",
    projectDescription: "",
    grantName: "",
    grantNumber: "",
    funderId: "",
    funderName: "",
    totalBudget: "",
    currency: "EUR", // Default to EUR for Ireland
    startDate: "",
    endDate: "",
    accountNumber: "",
    accountName: "",
    accountType: "main",
  })

  // ORCID state
  const [orcidConnecting, setOrcidConnecting] = useState(false)
  const [orcidData, setOrcidData] = useState<{
    orcidId?: string
    orcidUrl?: string
    verified?: boolean
  }>({})

  // Dynamic step calculation
  const getSteps = (): OnboardingStep[] => {
    const base: OnboardingStep[] = [
      "welcome",
      "organisation",
      "institute",
      "lab",
      "personal-details",
      "position",
      "orcid",
      "pi-status",
    ]

    // Feature #8: Add supervisor selection for non-PIs
    if (!state.isPrincipalInvestigator) {
      base.push("supervisor-selection")
    }

    base.push("project-choice")

    if (state.createProject) {
      base.push("project-details", "account-details")
    }
    base.push("review")
    return base
  }

  const steps = getSteps()
  const currentIndex = steps.indexOf(currentStep)
  const totalSteps = steps.length

  // Load organisations on mount with cleanup
  useEffect(() => {
    let active = true
    ;(async () => {
      const orgs = await loadOrganisations()
      if (active && orgs) setOrganisations(orgs)
    })()
    return () => {
      active = false
    }
  }, [])

  // Load funders on mount with cleanup
  useEffect(() => {
    let active = true
    ;(async () => {
      const fundersList = await loadFunders()
      if (active && fundersList) setFunders(fundersList)
    })()
    return () => {
      active = false
    }
  }, [])

  // Feature #8: Load profiles when lab selected (for supervisor selection)
  useEffect(() => {
    if (!state.selectedLab?.id) {
      setProfiles([])
      return
    }

    const unsubscribe = subscribeToProfiles(
      { labId: state.selectedLab.id },
      (loadedProfiles) => {
        setProfiles(loadedProfiles)
      }
    )

    return () => unsubscribe()
  }, [state.selectedLab])

  // Load institutes when organisation selected with cleanup
  useEffect(() => {
    if (!state.selectedOrganisation) return
    let active = true
    ;(async () => {
      const insts = await loadInstitutes(state.selectedOrganisation!.id)
      if (active && insts) setInstitutes(insts)
    })()
    return () => {
      active = false
    }
  }, [state.selectedOrganisation])

  // Load labs when institute selected with cleanup
  useEffect(() => {
    if (!state.selectedInstitute) return
    let active = true
    ;(async () => {
      const labsList = await loadLabs(state.selectedInstitute!.id)
      if (active && labsList) setLabs(labsList)
    })()
    return () => {
      active = false
    }
  }, [state.selectedInstitute])

  const loadOrganisations = async (): Promise<Organisation[] | null> => {
    try {
      const orgs = await getOrganisations()
      setOrganisations(orgs)
      return orgs
    } catch (err) {
      logger.error("Error loading organisations", err)
      setError("Failed to load organisations")
      return null
    }
  }

  const loadInstitutes = async (orgId: string): Promise<Institute[] | null> => {
    try {
      const insts = await getInstitutes(orgId)
      setInstitutes(insts)
      return insts
    } catch (err) {
      logger.error("Error loading institutes", err)
      setError("Failed to load institutes")
      return null
    }
  }

  const loadLabs = async (instId: string): Promise<Lab[] | null> => {
    try {
      const labsList = await getLabs(instId)
      setLabs(labsList)
      return labsList
    } catch (err) {
      logger.error("Error loading labs", err)
      setError("Failed to load labs")
      return null
    }
  }

  const loadFunders = async (): Promise<Funder[] | null> => {
    try {
      const fundersList = await getFunders()
      setFunders(fundersList)
      return fundersList
    } catch (err) {
      logger.error("Error loading funders", err)
      setError("Failed to load funders")
      return null
    }
  }

  const handleCreateOrganisation = async () => {
    if (!orgSearchTerm.trim() || !selectedCountry) {
      logger.debug("Organisation creation validation failed", {
        orgSearchTerm,
        selectedCountry,
      })
      return
    }

    const userId = getValidUserUid()
    if (!userId) {
      setError("Authentication error. Please refresh the page and try again.")
      return
    }

    logger.debug("Creating organisation", {
      name: orgSearchTerm.trim(),
      country: selectedCountry,
      type: "university",
      createdBy: userId,
    })

    try {
      setLoading(true)
      setError(null)
      const orgId = await createOrganisation({
        name: orgSearchTerm.trim(),
        country: selectedCountry,
        type: "university",
        createdBy: userId,
      })
      logger.info("Organisation created", { orgId })

      const orgs = await loadOrganisations()
      logger.debug("Reloaded organisations", { count: orgs?.length })
      if (orgs) {
        const newOrg = orgs.find((o) => o.id === orgId)
        logger.debug("Found new organisation", { organisation: newOrg })
        if (newOrg) {
          setState((s) => ({ ...s, selectedOrganisation: newOrg }))
          setShowCreateOrg(false)
          setOrgSearchTerm("")
          setSelectedCountry("")
        }
      }
    } catch (err) {
      logger.error("Error creating organisation", err)
      setError(`Failed to create organisation: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInstitute = async () => {
    if (!instSearchTerm.trim() || !state.selectedOrganisation) return

    const userId = getValidUserUid()
    if (!userId) {
      setError("Authentication error. Please refresh the page and try again.")
      return
    }

    try {
      setLoading(true)
      const instId = await createInstitute({
        name: instSearchTerm.trim(),
        organisationId: state.selectedOrganisation.id,
        organisationName: state.selectedOrganisation.name,
        createdBy: userId,
      })

      const insts = await loadInstitutes(state.selectedOrganisation.id)
      if (insts) {
        const newInst = insts.find((i) => i.id === instId)
        if (newInst) {
          setState((s) => ({ ...s, selectedInstitute: newInst }))
          setShowCreateInst(false)
          setInstSearchTerm("")
        }
      }
    } catch (err) {
      logger.error("Error creating institute", err)
      setError("Failed to create school/faculty")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLab = async () => {
    if (!labSearchTerm.trim() || !state.selectedOrganisation || !state.selectedInstitute) return

    const userId = getValidUserUid()
    if (!userId) {
      setError("Authentication error. Please refresh the page and try again.")
      return
    }

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
        createdBy: userId,
      })

      const labsList = await loadLabs(state.selectedInstitute.id)
      if (labsList) {
        const newLab = labsList.find((l) => l.id === labId)
        if (newLab) {
          setState((s) => ({ ...s, selectedLab: newLab }))
          setShowCreateLab(false)
          setLabSearchTerm("")
        }
      }
    } catch (err) {
      logger.error("Error creating lab", err)
      // Fix Bug #7: Show specific error message instead of generic message
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Failed to create department: ${errorMessage}. Please try again or contact support if the issue persists.`)
    } finally {
      setLoading(false)
    }
  }

  const handleFunderCreated = async (funderId: string) => {
    // Reload funders list
    const fundersList = await loadFunders()
    if (fundersList) {
      const newFunder = fundersList.find((f) => f.id === funderId)
      if (newFunder) {
        setState((s) => ({
          ...s,
          funderId: newFunder.id,
          funderName: newFunder.name,
        }))
      }
    }
  }

  const handleComplete = async () => {
    // Get a valid user object - try prop first, fall back to Firebase Auth if needed
    let validUser = user
    if (!user || !user.uid || typeof user.uid !== 'string' || user.uid.trim() === '') {
      // User prop is stale or invalid, get fresh user from Firebase Auth
      const auth = getFirebaseAuth()
      const firebaseUser = auth.currentUser

      if (!firebaseUser || !firebaseUser.uid) {
        logger.error("No authenticated user found", { propUser: user, firebaseUser })
        setError("Authentication error. Please refresh the page and try again.")
        return
      }

      // Create a temporary user object from Firebase Auth user
      validUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || user?.email || '',
        fullName: firebaseUser.displayName || user?.fullName || '',
      }

      logger.info("Using fresh Firebase Auth user instead of stale prop", { uid: validUser.uid })
    }

    if (!state.selectedOrganisation || !state.selectedInstitute || !state.selectedLab) {
      setError("Please select organisation, institute, and lab")
      return
    }

    if (!state.positionLevel) {
      setError("Please select a position")
      return
    }

    // Date validation
    if (state.createProject && state.startDate && state.endDate) {
      if (new Date(state.endDate) < new Date(state.startDate)) {
        setError("End date must be after start date")
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      logger.info("Starting profile creation", { userId: validUser.uid })

      const positionDisplay = POSITION_DISPLAY_NAMES[state.positionLevel]

      // Create profile
      const profileData: Omit<PersonProfile, "id"> = {
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

        // Dynamic organizational memberships (can be added later)
        researchGroupIds: [],
        workingLabIds: [],

        // Position
        positionLevel: state.positionLevel,
        positionDisplayName: positionDisplay,
        position: positionDisplay, // Legacy

        // Reporting - Feature #8: Save supervisor assignment
        reportsToId: state.supervisorId,

        // PI Status
        isPrincipalInvestigator: state.isPrincipalInvestigator,

        // ORCID fields (only include if connected to avoid Firestore undefined values)
        ...(orcidData.orcidId ? {
          orcidId: orcidData.orcidId,
          orcidUrl: orcidData.orcidUrl,
          orcidVerified: orcidData.verified || false,
          orcidLastSynced: new Date().toISOString(),
        } : {}),

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
        userId: validUser.uid,
        profileComplete: true,
        onboardingComplete: true,
        isAdministrator: false,
      }

      const profileId = await createProfile(validUser.uid, profileData)

      // Note: createProfile already updates the user document with profileId
      // No need to call updateUser again (would be redundant)

      // If creating a project, create it now
      if (state.createProject && state.projectName) {
        // Parse and validate budget (default to 0 if not provided)
        const budgetValue = state.totalBudget ? parseFloat(state.totalBudget) : 0
        if (state.totalBudget && (isNaN(budgetValue) || budgetValue < 0)) {
          setError("Invalid budget amount")
          setLoading(false)
          return
        }

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
          type: budgetValue > 0 ? "funded" : "unfunded",

          // Grant info
          grantName: state.grantName,
          grantNumber: state.grantNumber,

          // Financial
          totalBudget: budgetValue,
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
            [profileId]: state.isPrincipalInvestigator ? "PI" : "RA",
          },

          // Status
          status: "planning",
          progress: 0,

          // Structure
          workpackageIds: [],

          // Visibility
          visibility: "lab",

          // Metadata
          createdBy: validUser.uid,
        })

        // Create account if specified
        if (state.accountNumber && state.accountName) {
          const accountId = await createFundingAccount({
            accountNumber: state.accountNumber,
            accountName: state.accountName,
            funderId: state.funderId,
            funderName: state.funderName,
            masterProjectId: projectId,
            masterProjectName: state.projectName,
            accountType: state.accountType,
            totalBudget: budgetValue,
            currency: state.currency,
            startDate: state.startDate,
            endDate: state.endDate,
            status: "active",
            createdBy: validUser.uid,
          })

          // Create personal funding allocation for the PI
          if (accountId && state.isPrincipalInvestigator) {
            const { createFundingAllocation } = await import("@/lib/services/fundingService")
            // Allocate 50% of total budget to PI by default (can be adjusted later)
            const piAllocationAmount = budgetValue * 0.5

            await createFundingAllocation({
              fundingAccountId: accountId,
              fundingAccountName: state.accountName,
              labId: state.selectedLab.id,
              type: "PERSON",
              personId: profileId,
              personName: `${profileData.firstName} ${profileData.lastName}`,
              allocatedAmount: piAllocationAmount,
              currentSpent: 0,
              currentCommitted: 0,
              remainingBudget: piAllocationAmount,
              currency: state.currency,
              status: "active",
              createdAt: new Date().toISOString(),
              createdBy: validUser.uid,
            })

            logger.info("Created PI funding allocation during onboarding", {
              profileId,
              accountId,
              amount: piAllocationAmount,
            })
          }
        }
      }

      // Call onComplete immediately to update app state
      // Do this BEFORE showing the complete step to ensure state is updated
      onComplete({
        ...profileData,
        id: profileId,
      } as PersonProfile)

      // Show complete message briefly, then the callback above will transition to app
      setCurrentStep("complete")
      setLoading(false)
    } catch (err) {
      logger.error("Error completing onboarding", err)
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
        return (
          !state.createProject || !!(state.projectName && state.funderId && state.startDate && state.endDate)
        )
      case "account-details":
        return !state.createProject || !!(state.accountNumber && state.accountName)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (canProceedFromStep(currentStep)) {
      const nextIndex = currentIndex + 1
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex])
        setError(null)
      }
    } else {
      setError("Please complete all required fields before proceeding")
    }
  }

  const handleBack = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
      setError(null)
    }
  }

  const filteredOrganisations = organisations.filter((org) =>
    org.name.toLowerCase().includes(orgSearchTerm.toLowerCase())
  )

  const filteredInstitutes = institutes.filter((inst) =>
    inst.name.toLowerCase().includes(instSearchTerm.toLowerCase())
  )

  const filteredLabs = labs.filter((lab) => lab.name.toLowerCase().includes(labSearchTerm.toLowerCase()))

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
                  {orgSearchTerm && (
                    <Button variant="outline" size="sm" onClick={() => setShowCreateOrg(true)} className="mt-2">
                      Create &quot;{orgSearchTerm}&quot;
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredOrganisations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setState((s) => ({ ...s, selectedOrganisation: org }))}
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
              <Button variant="outline" onClick={() => setShowCreateOrg(true)} className="w-full">
                Create new organization: &quot;{orgSearchTerm}&quot;
              </Button>
            )}

            {showCreateOrg && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Create New Organization</h3>
                <p className="text-sm text-gray-600 mb-4">Name: {orgSearchTerm}</p>
                <div className="mb-4">
                  <Label htmlFor="org-country" className="text-sm font-medium mb-2 block">
                    Country *
                  </Label>
                  <select
                    id="org-country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a country</option>
                    <option value="Ireland">Ireland</option>
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
                  <Button onClick={handleCreateOrganisation} disabled={loading || !selectedCountry}>
                    {loading ? "Creating..." : "Confirm"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateOrg(false)
                      setSelectedCountry("")
                    }}
                  >
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
              <h2 className="text-2xl font-bold">Select Your School/Faculty</h2>
              <p className="text-gray-600">Choose your school or faculty</p>
              <p className="text-sm text-gray-500 mt-1">at {state.selectedOrganisation?.name}</p>
            </div>

            <div>
              <Label htmlFor="inst-search">Search for your school/faculty</Label>
              <Input
                id="inst-search"
                placeholder="e.g., School of Medicine, Faculty of Engineering"
                value={instSearchTerm}
                onChange={(e) => setInstSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredInstitutes.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No schools/faculties found.</p>
                  {instSearchTerm && (
                    <Button variant="outline" size="sm" onClick={() => setShowCreateInst(true)} className="mt-2">
                      Create &quot;{instSearchTerm}&quot;
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredInstitutes.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => setState((s) => ({ ...s, selectedInstitute: inst }))}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        state.selectedInstitute?.id === inst.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="font-medium">{inst.name}</div>
                      {inst.department && <div className="text-sm text-gray-500">{inst.department}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showCreateInst && instSearchTerm && filteredInstitutes.length === 0 && (
              <Button variant="outline" onClick={() => setShowCreateInst(true)} className="w-full">
                Create new school/faculty: &quot;{instSearchTerm}&quot;
              </Button>
            )}

            {showCreateInst && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Create New School/Faculty</h3>
                <p className="text-sm text-gray-600 mb-4">Name: {instSearchTerm}</p>
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
              <h2 className="text-2xl font-bold">Select Your Department</h2>
              <p className="text-gray-600">Choose your academic department</p>
              <p className="text-sm text-gray-500 mt-1">at {state.selectedInstitute?.name}</p>
            </div>

            <div>
              <Label htmlFor="lab-search">Search for your department</Label>
              <Input
                id="lab-search"
                placeholder="e.g., Department of Histopathology, Department of Physics"
                value={labSearchTerm}
                onChange={(e) => setLabSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredLabs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No departments found.</p>
                  {labSearchTerm && (
                    <Button variant="outline" size="sm" onClick={() => setShowCreateLab(true)} className="mt-2">
                      Create &quot;{labSearchTerm}&quot;
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLabs.map((lab) => (
                    <button
                      key={lab.id}
                      onClick={() => setState((s) => ({ ...s, selectedLab: lab }))}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        state.selectedLab?.id === lab.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="font-medium">{lab.name}</div>
                      {lab.description && <div className="text-sm text-gray-500 mt-1">{lab.description}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showCreateLab && labSearchTerm && filteredLabs.length === 0 && (
              <Button variant="outline" onClick={() => setShowCreateLab(true)} className="w-full">
                Create new department: &quot;{labSearchTerm}&quot;
              </Button>
            )}

            {showCreateLab && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Create New Department</h3>
                <p className="text-sm text-gray-600 mb-4">Name: {labSearchTerm}</p>
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
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={state.firstName}
                  onChange={(e) => setState((s) => ({ ...s, firstName: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={state.lastName}
                  onChange={(e) => setState((s) => ({ ...s, lastName: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={state.phone}
                onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
                className="mt-1"
                placeholder="e.g., +353 123 456 7890"
              />
            </div>

            <div>
              <Label htmlFor="office">Office Location (optional)</Label>
              <Input
                id="office"
                value={state.officeLocation}
                onChange={(e) => setState((s) => ({ ...s, officeLocation: e.target.value }))}
                className="mt-1"
                placeholder="e.g., Building 3, Room 205"
              />
            </div>
          </div>
        )

      case "position": {
        const filteredPositionCategories = Object.entries(POSITION_CATEGORIES).reduce(
          (acc, [category, positions]) => {
            const filtered = positions.filter((pos) =>
              POSITION_DISPLAY_NAMES[pos].toLowerCase().includes(positionFilter.toLowerCase())
            )
            if (filtered.length > 0) {
              acc[category] = filtered
            }
            return acc
          },
          {} as Record<string, PositionLevel[]>
        )

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Briefcase className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Your Position</h2>
              <p className="text-gray-600">What is your role in the lab?</p>
            </div>

            <div>
              <Label htmlFor="position-search">Search positions</Label>
              <Input
                id="position-search"
                placeholder="e.g., PhD Student, Postdoc, Professor..."
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(filteredPositionCategories).map(([category, positions]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm text-gray-700">{category}</h3>
                  <div className="space-y-2">
                    {positions.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setState((s) => ({ ...s, positionLevel: pos }))}
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
              {Object.keys(filteredPositionCategories).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No positions match your search. Try a different keyword.
                </div>
              )}
            </div>

            {state.positionLevel && (
              <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 border-t">
                <Button
                  onClick={handleNext}
                  className="w-full"
                  size="lg"
                >
                  Continue with {POSITION_DISPLAY_NAMES[state.positionLevel]} <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )
      }

      case "orcid":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <OrcidIcon size="lg" className="mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Verify Your ORCID</h2>
              <p className="text-gray-600">
                Connect your ORCID iD so collaborators can trust your profile
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold mb-2">What is ORCID?</h3>
              <p className="text-sm text-gray-700 mb-3">
                ORCID provides a persistent identifier that distinguishes you from other researchers.
                It&apos;s free and widely used in academic publishing and grants.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Link your research outputs and funding</li>
                <li>Trusted by publishers and institutions worldwide</li>
                <li>Control your research profile</li>
              </ul>
            </div>

            {orcidData.orcidId ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">ORCID Connected!</h3>
                <p className="text-sm text-gray-700">
                  Your ORCID iD: <strong>{orcidData.orcidId}</strong>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrcidData({})}
                  className="mt-4"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={async () => {
                    try {
                      setOrcidConnecting(true)
                      setError(null)
                      const result = await linkOrcidToCurrentUser()
                      setOrcidData({
                        orcidId: result.orcid,
                        orcidUrl: result.orcidUrl,
                        verified: true,
                      })
                    } catch (err: any) {
                      logger.error("ORCID linking error", err)
                      setError(err.message || "Failed to connect ORCID")
                    } finally {
                      setOrcidConnecting(false)
                    }
                  }}
                  disabled={orcidConnecting}
                  className="bg-[#A6CE39] hover:bg-[#8FB82E] text-white"
                >
                  {orcidConnecting ? "Connecting..." : "Connect ORCID"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNext}
                >
                  Skip for Now
                </Button>
              </div>
            )}

            <p className="text-xs text-center text-gray-500">
              You can connect ORCID later from your profile settings
            </p>
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
                Note: You can be a PI on some projects but not others. This setting determines whether you can create
                and manage your own research projects.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setState((s) => ({ ...s, isPrincipalInvestigator: true }))}
                className={`p-6 rounded-lg border-2 transition ${
                  state.isPrincipalInvestigator ? "bg-blue-50 border-blue-600" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">Yes, I am a PI</div>
                <div className="text-sm text-gray-600">I lead research projects and can manage funding accounts</div>
              </button>

              <button
                onClick={() => setState((s) => ({ ...s, isPrincipalInvestigator: false }))}
                className={`p-6 rounded-lg border-2 transition ${
                  !state.isPrincipalInvestigator
                    ? "bg-blue-50 border-blue-600"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">No, I&apos;m not a PI</div>
                <div className="text-sm text-gray-600">I work on projects led by other researchers</div>
              </button>
            </div>
          </div>
        )

      case "supervisor-selection":
        // Feature #8: Supervisor assignment for non-PIs with network-wide search
        const allPIs = profiles.filter((p) => p.isPrincipalInvestigator)
        const filteredSupervisors = allPIs
          .filter((p) => {
            // Apply scope filter
            if (supervisorFilter === "dept") {
              return p.labId === state.selectedLab?.id
            } else if (supervisorFilter === "school") {
              return p.instituteId === state.selectedInstitute?.id
            } else if (supervisorFilter === "org") {
              return p.organisationId === state.selectedOrganisation?.id
            }
            // "all" - no filter
            return true
          })
          .filter((p) => {
            // Apply search filter
            if (!supervisorSearchTerm) return true
            const searchLower = supervisorSearchTerm.toLowerCase()
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
            const position = (p.positionDisplayName || p.position || "").toLowerCase()
            const department = (p.labName || "").toLowerCase()
            return fullName.includes(searchLower) ||
                   position.includes(searchLower) ||
                   department.includes(searchLower)
          })

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Select Your Supervisor</h2>
              <p className="text-gray-600">
                Who is your primary supervisor or PI?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                You can search across the entire network
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                Your supervisor will be able to view your projects and track your progress.
                You can update this later from your profile settings.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setSupervisorFilter("all")}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  supervisorFilter === "all"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                All Network
              </button>
              <button
                onClick={() => setSupervisorFilter("org")}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  supervisorFilter === "org"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                My Organisation
              </button>
              <button
                onClick={() => setSupervisorFilter("school")}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  supervisorFilter === "school"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                My School/Faculty
              </button>
              <button
                onClick={() => setSupervisorFilter("dept")}
                className={`px-4 py-2 font-medium border-b-2 transition ${
                  supervisorFilter === "dept"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                My Department
              </button>
            </div>

            {/* Search Field */}
            <div>
              <Label htmlFor="supervisor-search">Search supervisors by name</Label>
              <Input
                id="supervisor-search"
                placeholder="Search by name, position, or department..."
                value={supervisorSearchTerm}
                onChange={(e) => setSupervisorSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Supervisor List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSupervisors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No supervisors found.</p>
                  <p className="text-sm mt-2">Try changing your search or filter settings.</p>
                  <Button
                    onClick={() => setState((s) => ({ ...s, supervisorId: null }))}
                    variant="outline"
                    className="mt-4"
                  >
                    Continue Without Supervisor
                  </Button>
                </div>
              ) : (
                filteredSupervisors.map((supervisor) => (
                  <button
                    key={supervisor.id}
                    onClick={() => setState((s) => ({ ...s, supervisorId: supervisor.id }))}
                    className={`w-full p-4 rounded-lg border-2 transition text-left ${
                      state.supervisorId === supervisor.id
                        ? "bg-blue-50 border-blue-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold">
                      {supervisor.firstName} {supervisor.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {supervisor.positionDisplayName || supervisor.position}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {supervisor.labName} • {supervisor.instituteName}
                    </div>
                    {supervisor.organisationId !== state.selectedOrganisation?.id && (
                      <div className="text-xs text-gray-400 mt-1">
                        {supervisor.organisationName}
                      </div>
                    )}
                  </button>
                ))
              )}
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
                onClick={() => setState((s) => ({ ...s, createProject: true }))}
                className={`p-6 rounded-lg border-2 transition ${
                  state.createProject ? "bg-blue-50 border-blue-600" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">Create Project Now</div>
                <div className="text-sm text-gray-600">Set up your research project with funding details</div>
              </button>

              <button
                onClick={() => setState((s) => ({ ...s, createProject: false }))}
                className={`p-6 rounded-lg border-2 transition ${
                  !state.createProject ? "bg-blue-50 border-blue-600" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-2">Skip for Now</div>
                <div className="text-sm text-gray-600">I&apos;ll create my project later from my dashboard</div>
              </button>
            </div>
          </div>
        )

      case "project-details":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Project Details</h2>
              <p className="text-gray-600">Tell us about your research project</p>
            </div>

            <div>
              <Label htmlFor="projectName">
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="projectName"
                value={state.projectName}
                onChange={(e) => setState((s) => ({ ...s, projectName: e.target.value }))}
                className="mt-1"
                placeholder="e.g., Quantum Computing Research"
              />
            </div>

            <div>
              <Label htmlFor="projectDesc">Description (optional)</Label>
              <textarea
                id="projectDesc"
                value={state.projectDescription}
                onChange={(e) => setState((s) => ({ ...s, projectDescription: e.target.value }))}
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
                  onChange={(e) => setState((s) => ({ ...s, grantName: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g., UKRI Fellowship"
                />
              </div>
              <div>
                <Label htmlFor="grantNumber">Grant Number (optional)</Label>
                <Input
                  id="grantNumber"
                  value={state.grantNumber}
                  onChange={(e) => setState((s) => ({ ...s, grantNumber: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g., MR/X123456/1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="funder">
                Funder <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <select
                  id="funder"
                  value={state.funderId}
                  onChange={(e) => {
                    const funder = funders.find((f) => f.id === e.target.value)
                    setState((s) => ({
                      ...s,
                      funderId: e.target.value,
                      funderName: funder?.name || "",
                    }))
                  }}
                  className="mt-1 flex-1 border rounded-md p-2"
                >
                  <option value="">Select a funder...</option>
                  {funders.map((funder) => (
                    <option key={funder.id} value={funder.id}>
                      {funder.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={() => {
                    if (!getValidUserUid()) {
                      setError("Authentication error. Please refresh the page and try again.")
                      return
                    }
                    setShowCreateFunder(true)
                  }}
                  variant="outline"
                  className="mt-1"
                >
                  Create New
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="budget">Total Budget (optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.totalBudget}
                  onChange={(e) => setState((s) => ({ ...s, totalBudget: e.target.value }))}
                  className="mt-1"
                  placeholder="500000"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={state.currency}
                  onChange={(e) => setState((s) => ({ ...s, currency: e.target.value }))}
                  className="mt-1 w-full border rounded-md p-2"
                >
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={state.startDate}
                  onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={state.endDate}
                  min={state.startDate}
                  onChange={(e) => setState((s) => ({ ...s, endDate: e.target.value }))}
                  className="mt-1"
                />
                {state.startDate && state.endDate && new Date(state.endDate) < new Date(state.startDate) && (
                  <p className="text-xs text-red-500 mt-1">End date must be after start date</p>
                )}
              </div>
            </div>
          </div>
        )

      case "account-details":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Funding Account</h2>
              <p className="text-gray-600">Add a funding account for this project</p>
            </div>

            <div>
              <Label htmlFor="accountNumber">
                Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountNumber"
                value={state.accountNumber}
                onChange={(e) => setState((s) => ({ ...s, accountNumber: e.target.value }))}
                className="mt-1"
                placeholder="e.g., 1735578"
              />
            </div>

            <div>
              <Label htmlFor="accountName">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountName"
                value={state.accountName}
                onChange={(e) => setState((s) => ({ ...s, accountName: e.target.value }))}
                className="mt-1"
                placeholder="e.g., Main Research Account"
              />
            </div>

            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <select
                id="accountType"
                value={state.accountType}
                onChange={(e) =>
                  setState((s) => ({ ...s, accountType: e.target.value as OnboardingState["accountType"] }))
                }
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
                  {state.firstName} {state.lastName}
                  <br />
                  {state.email}
                  {state.phone && (
                    <>
                      <br />
                      {state.phone}
                    </>
                  )}
                  {state.officeLocation && (
                    <>
                      <br />
                      {state.officeLocation}
                    </>
                  )}
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
                    <strong>{state.projectName}</strong>
                    <br />
                    {state.projectDescription && (
                      <>
                        {state.projectDescription}
                        <br />
                      </>
                    )}
                    Funder: {state.funderName}
                    <br />
                    {state.totalBudget && (
                      <>
                        Budget: {state.currency} {parseFloat(state.totalBudget).toLocaleString()}
                        <br />
                      </>
                    )}
                    Duration: {state.startDate} to {state.endDate}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleComplete}
              disabled={loading}
              size="lg"
              className="w-full"
            >
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
              <p className="text-gray-600 text-lg">Your account has been successfully set up.</p>
            </div>
            <div className="text-sm text-gray-500">Redirecting you to your dashboard...</div>
          </div>
        )

      default:
        return null
    }
  }

  const isFirstStep = currentStep === "welcome"
  const isCompleteStep = currentStep === "complete"
  const isLastStep = currentStep === "review"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 relative">
        {/* Cancel button */}
        {!isCompleteStep && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label="Cancel onboarding"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {!isCompleteStep && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>
                Step {currentIndex + 1} of {totalSteps}
              </span>
              <span>Momentum Onboarding</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((currentIndex + 1) / totalSteps) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {renderStep()}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {!isFirstStep && !isCompleteStep && (
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ChevronLeft className="mr-2 w-4 h-4" /> Back
            </Button>

            {!isLastStep && (
              <Button onClick={handleNext} disabled={!canProceedFromStep(currentStep) || loading}>
                Continue <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Funder Creation Dialog */}
      <FunderCreationDialog
        isOpen={showCreateFunder && !!getValidUserUid()}
        onClose={() => setShowCreateFunder(false)}
        onFunderCreated={handleFunderCreated}
        currentUserId={getValidUserUid() || ''}
        organisationId={state.selectedOrganisation?.id}
      />
    </div>
  )
}
