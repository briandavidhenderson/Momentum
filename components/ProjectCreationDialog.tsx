"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProfileProject, FUNDING_ACCOUNTS, ProjectVisibility } from "@/lib/types"
import { Building2, FolderKanban } from "lucide-react"

interface ProjectCreationDialogProps {
  open: boolean
  onClose: () => void
  onCreateRegular: () => void
  onCreateMaster: (masterProject: ProfileProject) => void
  currentUserProfileId: string | null
}

export function ProjectCreationDialog({
  open,
  onClose,
  onCreateRegular,
  onCreateMaster,
  currentUserProfileId,
}: ProjectCreationDialogProps) {
  const [step, setStep] = useState<"choose" | "master-details">("choose")
  const [formData, setFormData] = useState<Partial<ProfileProject>>({
    id: "",
    name: "",
    grantNumber: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 1 year from now
    status: "active",
    description: "",
    notes: "",
    fundedBy: [],
    visibility: "lab",
  })

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
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
        fundedBy: [],
        visibility: "lab",
      })
    }
  }, [open])

  const handleCreateMasterProject = () => {
    if (!formData.name?.trim()) {
      alert("Please enter a project name")
      return
    }
    onCreateMaster(formData as ProfileProject)
    onClose()
  }

  const handleRegularProject = () => {
    onCreateRegular()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" ? "Create New Project" : "Master Project Details"}
          </DialogTitle>
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
                    alert("Please set up your profile first to create master projects")
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

            <div>
              <Label htmlFor="budget">Total Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget || 0}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
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
              <Label htmlFor="fundedBy">Funding Accounts</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {FUNDING_ACCOUNTS.map((account) => (
                  <label
                    key={account.id}
                    className="flex items-center gap-2 p-2 border rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.fundedBy?.includes(account.id) || false}
                      onChange={(e) => {
                        const fundedBy = formData.fundedBy || []
                        if (e.target.checked) {
                          setFormData({ ...formData, fundedBy: [...fundedBy, account.id] })
                        } else {
                          setFormData({ ...formData, fundedBy: fundedBy.filter((id) => id !== account.id) })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{account.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                value={formData.visibility || "lab"}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as ProjectVisibility })}
                className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="private">Private (Only me)</option>
                <option value="lab">Lab (All lab members)</option>
                <option value="institute">Institute (All institute members)</option>
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
                Create Master Project
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

