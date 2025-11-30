"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProfileProject, ProjectVisibility, Funder, ResearchGroup, MasterProject } from "@/lib/types"
import { Building2, FolderKanban, Plus } from "lucide-react"
import { subscribeToFunders } from "@/lib/firestoreService"
import { FunderCreationDialog } from "./FunderCreationDialog"
import { getResearchGroups } from "@/lib/services/groupService"
import { Checkbox } from "@/components/ui/checkbox"

interface ProjectCreationDialogProps {
  open: boolean
  onClose: () => void
  onCreateRegular: (project: Partial<MasterProject>) => void
  onCreateMaster: (masterProject: ProfileProject & { funderId?: string; groupIds?: string[] }) => void
  currentUserProfileId: string | null
  currentUserId: string
  organisationId?: string
  labId?: string
  defaultGroupId?: string | null
  project?: MasterProject
  mode?: "create" | "edit"
  onUpdate?: (project: Partial<MasterProject>) => void
}

export function ProjectCreationDialog({
  open,
  onClose,
  onCreateRegular,
  onCreateMaster,
  currentUserProfileId,
  currentUserId,
  organisationId,
  labId,
  defaultGroupId = null,
  project,
  mode = "create",
  onUpdate,
}: ProjectCreationDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<"choose" | "master-details" | "regular-details">("choose")
  const [formData, setFormData] = useState<Partial<MasterProject & { groupIds?: string[] }>>({
    id: "",
    name: "",
    grantNumber: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 1 year from now
    status: "active",
    description: "",
    notes: "",
    // fundedBy: [], // Removed as it's not in MasterProject, but might be needed for ProfileProject compatibility?
    visibility: "lab",
    groupIds: defaultGroupId ? [defaultGroupId] : [],
  })

  // P0-1: Funder selection state
  const [funders, setFunders] = useState<Funder[]>([])
  const [selectedFunderId, setSelectedFunderId] = useState<string | null>(null)
  const [showFunderDialog, setShowFunderDialog] = useState(false)
  const [funderError, setFunderError] = useState<string | null>(null)
  const [availableGroups, setAvailableGroups] = useState<ResearchGroup[]>([])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      if (mode === "edit" && project) {
        setStep("master-details")
        setFormData({
          ...project,
          startDate: project.startDate,
          endDate: project.endDate,
        })
        setSelectedFunderId(project.funderId || null)
      } else {
        setStep("choose")
        setFormData({
          id: `project-${Date.now()}`,
          name: "",
          grantNumber: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "active",
          description: "",
          notes: "",
          // fundedBy: [], 
          visibility: "lab",
          groupIds: defaultGroupId ? [defaultGroupId] : [],
        })
        setSelectedFunderId(null)
      }
      setFunderError(null)
    }
  }, [open, defaultGroupId, mode, project])

  // P0-1: Load funders when master project step is reached
  useEffect(() => {
    if (step === "master-details" && open) {
      const unsubscribe = subscribeToFunders(
        (loadedFunders) => {
          setFunders(loadedFunders)

          // P0-1: Auto-prompt if no funders exist
          if (loadedFunders.length === 0 && !showFunderDialog) {
            setShowFunderDialog(true)
          }
        },
        organisationId
      )

      return () => unsubscribe()
    }
  }, [step, open, organisationId, showFunderDialog])

  // Load research groups for assignment
  useEffect(() => {
    if (!open || !labId) {
      setAvailableGroups([])
      return
    }
    const fetchGroups = async () => {
      try {
        const groups = await getResearchGroups(labId)
        setAvailableGroups(groups)
      } catch (error) {
        console.error('Failed to load research groups for project creation', error)
      }
    }
    fetchGroups()
  }, [open, labId])

  // P0-1: Handler for funder creation
  const handleFunderCreated = (funderId: string) => {
    setSelectedFunderId(funderId)
    setFunderError(null)
    setShowFunderDialog(false)
  }

  const handleCreateMasterProject = () => {
    // P0-1: Validate funder selection
    if (!selectedFunderId) {
      setFunderError("Please select a funder for this master project")
      return
    }

    if (!formData.name?.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a project name",
        variant: "destructive",
      })
      return
    }

    const projectData = {
      ...(formData as MasterProject),
      funderId: selectedFunderId,
      groupIds: formData.groupIds,
      type: (selectedFunderId ? "funded" : "unfunded") as "funded" | "unfunded",
    }

    if (mode === "edit" && onUpdate) {
      onUpdate(projectData)
    } else {
      // @ts-ignore - ProfileProject vs MasterProject mismatch is known and being deprecated
      onCreateMaster(projectData)
    }
    onClose()
  }

  const handleRegularProject = () => {
    setStep("regular-details")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit Project Details" : (step === "choose" ? "Create New Project" : "Master Project Details")}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update the details for this project."
                : (step === "choose"
                  ? "Select the type of project you would like to create."
                  : "Enter the details for your new master project.")}
            </DialogDescription>
          </DialogHeader>

          {step === "choose" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose the type of project you want to create:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Regular Project Card */}
                <button
                  onClick={handleRegularProject}
                  className="flex flex-col items-center gap-4 p-6 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-accent transition-all text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FolderKanban className="h-8 w-8 text-brand-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Regular Project</h3>
                    <p className="text-sm text-muted-foreground">
                      A simple project with tasks. Quick to set up and manage day-to-day work.
                    </p>
                  </div>
                </button>

                {/* Master Project Card */}
                <button
                  onClick={() => {
                    if (!currentUserProfileId) {
                      toast({
                        title: "Profile Required",
                        description: "Please set up your profile first to create master projects",
                        variant: "destructive",
                      })
                      return
                    }
                    setStep("master-details")
                  }}
                  className="flex flex-col items-center gap-4 p-6 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-accent transition-all text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Master Project</h3>
                    <p className="text-sm text-muted-foreground">
                      A large, funded project with workpackages, tasks, and deliverables. Linked to your profile.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : step === "regular-details" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="regular-name">Project Name *</Label>
                <Input
                  id="regular-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Lab Meeting Agenda"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="regular-description">Description</Label>
                <Textarea
                  id="regular-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="regular-visibility">Visibility</Label>
                <select
                  id="regular-visibility"
                  value={formData.visibility || "lab"}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="private">Private (Only me)</option>
                  <option value="lab">Department (All department members)</option>
                  <option value="institute">School/Faculty (All school/faculty members)</option>
                  <option value="organisation">Organisation (All organisation members)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("choose")}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!formData.name?.trim()) {
                      toast({
                        title: "Missing Name",
                        description: "Please enter a project name",
                        variant: "destructive",
                      })
                      return
                    }
                    onCreateRegular(formData as MasterProject)
                    onClose()
                  }}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  Create Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Advanced Quantum Computing Research"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="grantNumber">Grant Number</Label>
                <Input
                  id="grantNumber"
                  value={formData.grantNumber || ""}
                  onChange={(e) => setFormData({ ...formData, grantNumber: e.target.value })}
                  placeholder="e.g., NSF-2024-12345"
                  className="mt-1"
                />
              </div>

              {/* P0-1: Funder Selection */}
              <div>
                <Label htmlFor="funder">
                  Funder <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 mt-1">
                  <select
                    id="funder"
                    value={selectedFunderId || ""}
                    onChange={(e) => {
                      setSelectedFunderId(e.target.value || null)
                      setFunderError(null)
                    }}
                    className={`flex-1 px-3 py-2 border rounded-lg bg-background ${funderError ? "border-red-500" : "border-border"
                      }`}
                  >
                    <option value="">Select a funder...</option>
                    {funders.map((funder) => (
                      <option key={funder.id} value={funder.id}>
                        {funder.name}
                        {funder.programme ? ` (${funder.programme})` : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFunderDialog(true)}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Funder
                  </Button>
                </div>
                {funderError && (
                  <p className="text-red-500 text-sm mt-1">{funderError}</p>
                )}
                {funders.length === 0 && !showFunderDialog && (
                  <p className="text-amber-600 text-sm mt-1">
                    No funders available. Click &ldquo;New Funder&rdquo; to create one.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="budget">Total Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.totalBudget || 0}
                  onChange={(e) => setFormData({ ...formData, totalBudget: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Assign to Research Groups</Label>
                {availableGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    No research groups available for your department yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {availableGroups.map(group => (
                      <label key={group.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.groupIds?.includes(group.id) || false}
                          onCheckedChange={(checked) => {
                            const next = new Set(formData.groupIds || [])
                            if (checked) {
                              next.add(group.id)
                            } else {
                              next.delete(group.id)
                            }
                            setFormData({ ...formData, groupIds: Array.from(next) })
                          }}
                        />
                        <span className="flex-1">{group.name}</span>
                        <span className="text-xs text-muted-foreground">{group.memberCount || 0} members</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  You can update group memberships later from the project dashboard.
                </p>
              </div>



              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <select
                  id="visibility"
                  value={formData.visibility || "lab"}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="private">Private (Only me)</option>
                  <option value="lab">Department (All department members)</option>
                  <option value="institute">School/Faculty (All school/faculty members)</option>
                  <option value="organisation">Organisation (All organisation members)</option>
                  <option value="public">Public (Everyone)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("choose")}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateMasterProject}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  {mode === "edit" ? "Save Changes" : "Create Master Project"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* P0-1: Funder Creation Dialog */}
      <FunderCreationDialog
        isOpen={showFunderDialog}
        onClose={() => setShowFunderDialog(false)}
        onFunderCreated={handleFunderCreated}
        currentUserId={currentUserId}
        organisationId={organisationId}
      />
    </>
  )
}

