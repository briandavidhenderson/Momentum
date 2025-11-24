"use client"

import { useState, useEffect } from "react"
import { ELNExperiment, ELNItem, ELNReport } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText, Download, Upload, Trash2 } from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { useToast } from "@/components/ui/toast"
import { ELNJupyterCanvasV2 } from "@/components/ELNJupyterCanvasV2"
import { ELNReportGenerator } from "@/components/ELNReportGenerator"
import { deleteELNFile } from "@/lib/storage"
import { logger } from "@/lib/logger"

export function ElectronicLabNotebook({ initialExperimentId }: { initialExperimentId?: string }) {
  const {
    elnExperiments,
    currentUserProfile,
    handleCreateExperiment,
    handleUpdateExperiment,
    handleDeleteExperiment,
  } = useAppContext()

  const experiments = elnExperiments as ELNExperiment[]
  const toast = useToast()

  const [selectedExperiment, setSelectedExperiment] = useState<ELNExperiment | null>(null)
  const [isCreatingExperiment, setIsCreatingExperiment] = useState(false)
  const [newExperimentTitle, setNewExperimentTitle] = useState("")
  const [newExperimentDescription, setNewExperimentDescription] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Debug: Log profile and experiments on mount
  useEffect(() => {
    logger.debug('ELN Component initialized', {
      hasProfile: !!currentUserProfile,
      labId: currentUserProfile?.labId,
      experimentsCount: experiments?.length || 0,
    });
  }, [currentUserProfile, experiments])

  // Initialize with first experiment if available
  useEffect(() => {
    if (experiments.length === 0) return

    if (initialExperimentId) {
      const matchingExperiment = experiments.find((exp) => exp.id === initialExperimentId)
      if (matchingExperiment && matchingExperiment.id !== selectedExperiment?.id) {
        setSelectedExperiment(matchingExperiment)
        return
      }
    }

    if (!selectedExperiment) {
      setSelectedExperiment(experiments[0])
    }
  }, [experiments, initialExperimentId, selectedExperiment])

  const createNewExperiment = async () => {
    if (!newExperimentTitle.trim()) {
      toast.warning("Please enter an experiment title")
      return
    }

    if (!currentUserProfile?.labId) {
      toast.error("Cannot create experiment: No lab associated with your profile")
      return
    }

    const newExperiment: Omit<ELNExperiment, "id" | "createdAt" | "labId" | "createdBy"> = {
      title: newExperimentTitle.trim(),
      description: newExperimentDescription.trim() || undefined,
      masterProjectId: "temp_project_placeholder",
      masterProjectName: "No Project Selected",
      labName: currentUserProfile?.labName || "Unknown Lab",
      pages: [],
      items: [], // New multimodal items array
      reports: [] // New reports array
    }

    try {
      await handleCreateExperiment(newExperiment)
      setIsCreatingExperiment(false)
      setNewExperimentTitle("")
      setNewExperimentDescription("")
      toast.success("Experiment created successfully!")
    } catch (error) {
      logger.error("Error creating experiment", error)
      toast.error("Failed to create experiment. Please try again.")
    }
  }

  const handleAddItem = (item: Omit<ELNItem, "id" | "order" | "createdAt">) => {
    if (!selectedExperiment) return

    const newItem: ELNItem = {
      ...item,
      id: `item-${Date.now()}`,
      order: selectedExperiment.items?.length || 0
    }

    const updatedExperiment = {
      ...selectedExperiment,
      items: [...(selectedExperiment.items || []), newItem],
      updatedAt: new Date().toISOString()
    }

    handleUpdateExperiment(updatedExperiment.id, updatedExperiment)
    setSelectedExperiment(updatedExperiment)
  }

  const handleUpdateItem = (itemId: string, updates: Partial<ELNItem>) => {
    if (!selectedExperiment) return

    const updatedItems = (selectedExperiment.items || []).map(item =>
      item.id === itemId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    )

    const updatedExperiment = {
      ...selectedExperiment,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    }

    handleUpdateExperiment(updatedExperiment.id, updatedExperiment)
    setSelectedExperiment(updatedExperiment)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedExperiment) return

    // Find the item to check if it has a storage file
    const itemToDelete = (selectedExperiment.items || []).find(item => item.id === itemId)

    // Delete from Firebase Storage if it has a storage path
    if (itemToDelete?.storagePath) {
      try {
        await deleteELNFile(itemToDelete.storagePath)
      } catch (error) {
        logger.error("Error deleting file from storage", error)
        // Continue with Firestore deletion even if storage deletion fails
      }
    }

    const updatedItems = (selectedExperiment.items || []).filter(item => item.id !== itemId)

    const updatedExperiment = {
      ...selectedExperiment,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    }

    handleUpdateExperiment(updatedExperiment.id, updatedExperiment)
    setSelectedExperiment(updatedExperiment)
    toast.success("Item deleted")
  }

  const handleReportGenerated = (report: Omit<ELNReport, "id">) => {
    if (!selectedExperiment) return

    const newReport: ELNReport = {
      ...report,
      id: `report-${Date.now()}`,
      experimentId: selectedExperiment.id
    }

    const updatedExperiment = {
      ...selectedExperiment,
      reports: [...(selectedExperiment.reports || []), newReport],
      updatedAt: new Date().toISOString()
    }

    handleUpdateExperiment(updatedExperiment.id, updatedExperiment)
    setSelectedExperiment(updatedExperiment)
  }

  const exportExperiment = (experiment: ELNExperiment) => {
    const dataStr = JSON.stringify(experiment, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${experiment.title.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Experiment exported!")
  }

  const importExperiment = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onloadend = () => {
        try {
          const imported = JSON.parse(reader.result as string) as ELNExperiment
          imported.id = `experiment-${Date.now()}`
          imported.createdAt = new Date().toISOString()
          handleCreateExperiment(imported)
          setSelectedExperiment(imported)
          toast.success("Experiment imported successfully!")
        } catch (error) {
          logger.error("Error importing experiment", error)
          toast.error("Failed to import experiment. Please check the file format.")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <FileText className="h-6 w-6 text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Electronic Lab Notebook</h1>
            <p className="text-sm text-muted-foreground">
              Multimodal experimental canvas with AI-powered report generation
            </p>
            {!currentUserProfile?.labId && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Warning: No lab associated with your profile. Experiments cannot be created.
              </p>
            )}
            {currentUserProfile?.labId && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Lab: {currentUserProfile.labName || currentUserProfile.labId} | Experiments: {experiments?.length || 0}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importExperiment} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          {selectedExperiment && (
            <Button variant="outline" onClick={() => exportExperiment(selectedExperiment)} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => setIsCreatingExperiment(true)}>
            <Plus className="h-4 w-4" />
            New Experiment
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden px-4">
        {/* Sidebar - Experiment List */}
        <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto rounded-lg">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Experiments
              </Label>
              <div className="space-y-1">
                {experiments.map((exp) => (
                  <div key={exp.id} className="relative group">
                    <button
                      onClick={() => setSelectedExperiment(exp)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedExperiment?.id === exp.id
                          ? "bg-brand-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{exp.title}</div>
                      <div className={`text-xs mt-1 ${selectedExperiment?.id === exp.id ? "text-white/80" : "text-muted-foreground"}`}>
                        {exp.items?.length || 0} items • {exp.reports?.length || 0} reports
                      </div>
                    </button>
                    {experiments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(exp.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedExperiment ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No experiment selected</p>
                <p className="text-sm text-muted-foreground mb-4">Create a new experiment to get started</p>
                <Button className="bg-brand-500 hover:bg-brand-600 text-white" onClick={() => setIsCreatingExperiment(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Experiment
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Experiment Header */}
              <div className="mb-4">
                <h2 className="text-xl font-bold">{selectedExperiment.title}</h2>
                {selectedExperiment.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedExperiment.description}</p>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="canvas" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-fit">
                  <TabsTrigger value="canvas">Canvas</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="canvas" className="flex-1 overflow-y-auto mt-4">
                  <ELNJupyterCanvasV2
                    items={selectedExperiment.items || []}
                    experimentId={selectedExperiment.id}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </TabsContent>

                <TabsContent value="reports" className="flex-1 overflow-y-auto mt-4">
                  <ELNReportGenerator
                    experimentTitle={selectedExperiment.title}
                    experimentDescription={selectedExperiment.description}
                    items={selectedExperiment.items || []}
                    reports={selectedExperiment.reports || []}
                    onReportGenerated={handleReportGenerated}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Create Experiment Dialog */}
      <Dialog open={isCreatingExperiment} onOpenChange={setIsCreatingExperiment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Experiment</DialogTitle>
            <DialogDescription>
              Create a new experiment to document your lab work with multimodal content and AI-powered reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Experiment Title *</Label>
              <Input
                value={newExperimentTitle}
                onChange={(e) => setNewExperimentTitle(e.target.value)}
                placeholder="e.g., Protein Purification Study"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={newExperimentDescription}
                onChange={(e) => setNewExperimentDescription(e.target.value)}
                placeholder="Brief description of the experiment..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingExperiment(false)}>
                Cancel
              </Button>
              <Button
                onClick={createNewExperiment}
                className="bg-brand-500 hover:bg-brand-600 text-white"
                disabled={!newExperimentTitle.trim()}
              >
                Create Experiment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Experiment Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Experiment</DialogTitle>
            <DialogDescription>
              Confirm permanent deletion of this experiment and all its associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this experiment? All items and reports will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (deleteConfirmId) {
                    try {
                      await handleDeleteExperiment(deleteConfirmId)
                      if (selectedExperiment?.id === deleteConfirmId) {
                        setSelectedExperiment(null)
                      }
                      setDeleteConfirmId(null)
                      toast.success("Experiment deleted successfully")
                    } catch (error) {
                      logger.error("Error deleting experiment", error)
                      toast.error("Failed to delete experiment. Please try again.")
                    }
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Experiment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
