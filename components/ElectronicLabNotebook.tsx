"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ELNExperiment, ELNPage, ELNStickyNote, ELNVoiceNote, PersonProfile } from "@/lib/types"
import { Plus, Camera, Mic, Square, X, Save, Download, Upload, ChevronLeft, ChevronRight, Edit2, Trash2, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ElectronicLabNotebookProps {
  experiments: ELNExperiment[]
  currentUserProfile: PersonProfile | null
  onExperimentsUpdate: (experiments: ELNExperiment[]) => void
}

const STICKY_NOTE_COLORS = [
  { name: "Yellow", value: "#FFEB3B" },
  { name: "Pink", value: "#F48FB1" },
  { name: "Blue", value: "#90CAF9" },
  { name: "Green", value: "#A5D6A7" },
  { name: "Orange", value: "#FFCC80" },
  { name: "Purple", value: "#CE93D8" },
]

export function ElectronicLabNotebook({
  experiments,
  currentUserProfile,
  onExperimentsUpdate,
}: ElectronicLabNotebookProps) {
  const [selectedExperiment, setSelectedExperiment] = useState<ELNExperiment | null>(null)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(-1)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [isCreatingExperiment, setIsCreatingExperiment] = useState(false)
  const [newExperimentTitle, setNewExperimentTitle] = useState("")
  const [newExperimentDescription, setNewExperimentDescription] = useState("")
  const [editingPageTitle, setEditingPageTitle] = useState("")
  const [stickyNoteText, setStickyNoteText] = useState("")
  const [selectedColor, setSelectedColor] = useState(STICKY_NOTE_COLORS[0].value)
  const [isAddingStickyNote, setIsAddingStickyNote] = useState(false)
  const [pendingStickyNotePosition, setPendingStickyNotePosition] = useState<{ x: number; y: number } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const currentPage = selectedExperiment && currentPageIndex >= 0 
    ? selectedExperiment.pages[currentPageIndex] 
    : null

  // Initialize with first experiment if available
  useEffect(() => {
    if (experiments.length > 0 && !selectedExperiment) {
      setSelectedExperiment(experiments[0])
      setCurrentPageIndex(0)
    }
  }, [experiments, selectedExperiment])

  // Update editing title when page changes
  useEffect(() => {
    if (currentPage) {
      setEditingPageTitle(currentPage.title)
    }
  }, [currentPage])

  // Handle image capture/upload
  const handleImageCapture = useCallback(() => {
    // Try camera first (mobile), then fallback to file picker
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    } else if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleImageSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const imageUrl = reader.result as string
      createNewPage(imageUrl)
    }
    reader.readAsDataURL(file)
    
    // Reset input
    if (event.target) {
      event.target.value = ""
    }
  }, [])

  // Create a new page with an image
  const createNewPage = (imageUrl: string) => {
    if (!selectedExperiment) return

    const newPage: ELNPage = {
      id: `page-${Date.now()}`,
      title: `Page ${selectedExperiment.pages.length + 1}`,
      imageUrl,
      voiceNotes: [],
      stickyNotes: [],
      createdAt: new Date().toISOString(),
    }

    const updatedExperiment = {
      ...selectedExperiment,
      pages: [...selectedExperiment.pages, newPage],
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
    setCurrentPageIndex(updatedExperiment.pages.length - 1)
  }

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        const reader = new FileReader()
        reader.onloadend = () => {
          const audioUrl = reader.result as string
          addVoiceNoteToPage(audioUrl, blob.size)
        }
        reader.readAsDataURL(blob)
        
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const addVoiceNoteToPage = (audioUrl: string, estimatedDuration: number) => {
    if (!currentPage || !selectedExperiment) return

    const audio = new Audio(audioUrl)
    audio.addEventListener("loadedmetadata", () => {
      const voiceNote: ELNVoiceNote = {
        id: `voice-${Date.now()}`,
        audioUrl,
        duration: audio.duration || estimatedDuration / 1000, // Approximate duration
        createdAt: new Date().toISOString(),
      }

      const updatedPage = {
        ...currentPage,
        voiceNotes: [...currentPage.voiceNotes, voiceNote],
        updatedAt: new Date().toISOString(),
      }

      const updatedPages = [...selectedExperiment.pages]
      updatedPages[currentPageIndex] = updatedPage

      const updatedExperiment = {
        ...selectedExperiment,
        pages: updatedPages,
        updatedAt: new Date().toISOString(),
      }

      updateExperiment(updatedExperiment)
    })
    audio.load()
  }

  // Handle sticky note placement
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAddingStickyNote || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setPendingStickyNotePosition({ x, y })
  }

  const confirmStickyNote = () => {
    if (!currentPage || !selectedExperiment || !pendingStickyNotePosition || !stickyNoteText.trim()) return

    const stickyNote: ELNStickyNote = {
      id: `note-${Date.now()}`,
      text: stickyNoteText.trim(),
      color: selectedColor,
      position: pendingStickyNotePosition,
      createdAt: new Date().toISOString(),
    }

    const updatedPage = {
      ...currentPage,
      stickyNotes: [...currentPage.stickyNotes, stickyNote],
      updatedAt: new Date().toISOString(),
    }

    const updatedPages = [...selectedExperiment.pages]
    updatedPages[currentPageIndex] = updatedPage

    const updatedExperiment = {
      ...selectedExperiment,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
    
    // Reset
    setIsAddingStickyNote(false)
    setStickyNoteText("")
    setPendingStickyNotePosition(null)
  }

  const cancelStickyNote = () => {
    setIsAddingStickyNote(false)
    setStickyNoteText("")
    setPendingStickyNotePosition(null)
  }

  const updatePageTitle = () => {
    if (!currentPage || !selectedExperiment) return

    const updatedPage = {
      ...currentPage,
      title: editingPageTitle.trim() || currentPage.title,
      updatedAt: new Date().toISOString(),
    }

    const updatedPages = [...selectedExperiment.pages]
    updatedPages[currentPageIndex] = updatedPage

    const updatedExperiment = {
      ...selectedExperiment,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
  }

  const deletePage = (pageIndex: number) => {
    if (!selectedExperiment || !confirm("Delete this page?")) return

    const updatedPages = selectedExperiment.pages.filter((_, i) => i !== pageIndex)
    const updatedExperiment = {
      ...selectedExperiment,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
    
    // Adjust current page index
    if (currentPageIndex >= updatedPages.length) {
      setCurrentPageIndex(Math.max(0, updatedPages.length - 1))
    } else if (currentPageIndex === pageIndex && updatedPages.length > 0) {
      setCurrentPageIndex(Math.max(0, pageIndex - 1))
    }
  }

  const deleteStickyNote = (noteId: string) => {
    if (!currentPage || !selectedExperiment) return

    const updatedPage = {
      ...currentPage,
      stickyNotes: currentPage.stickyNotes.filter(n => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    }

    const updatedPages = [...selectedExperiment.pages]
    updatedPages[currentPageIndex] = updatedPage

    const updatedExperiment = {
      ...selectedExperiment,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
  }

  const deleteVoiceNote = (noteId: string) => {
    if (!currentPage || !selectedExperiment) return

    const updatedPage = {
      ...currentPage,
      voiceNotes: currentPage.voiceNotes.filter(n => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    }

    const updatedPages = [...selectedExperiment.pages]
    updatedPages[currentPageIndex] = updatedPage

    const updatedExperiment = {
      ...selectedExperiment,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
  }

  const updateExperiment = (experiment: ELNExperiment) => {
    const updated = experiments.map(e => e.id === experiment.id ? experiment : e)
    onExperimentsUpdate(updated)
    setSelectedExperiment(experiment)
  }

  const createNewExperiment = () => {
    if (!newExperimentTitle.trim()) {
      alert("Please enter an experiment title")
      return
    }

    const newExperiment: ELNExperiment = {
      id: `experiment-${Date.now()}`,
      title: newExperimentTitle.trim(),
      description: newExperimentDescription.trim() || undefined,
      // Temporary placeholders until proper project selection is implemented
      masterProjectId: "temp_project_placeholder",
      masterProjectName: "No Project Selected",
      labId: currentUserProfile?.lab || "temp_lab_placeholder",
      labName: currentUserProfile?.lab || "Unknown Lab",
      createdBy: currentUserProfile?.id || "",
      pages: [],
      createdAt: new Date().toISOString(),
    }

    const updated = [...experiments, newExperiment]
    onExperimentsUpdate(updated)
    setSelectedExperiment(newExperiment)
    setCurrentPageIndex(-1)
    setIsCreatingExperiment(false)
    setNewExperimentTitle("")
    setNewExperimentDescription("")
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
          imported.id = `experiment-${Date.now()}` // New ID to avoid conflicts
          imported.createdAt = new Date().toISOString()
          const updated = [...experiments, imported]
          onExperimentsUpdate(updated)
          setSelectedExperiment(imported)
          setCurrentPageIndex(imported.pages.length > 0 ? 0 : -1)
        } catch (error) {
          console.error("Error importing experiment:", error)
          alert("Failed to import experiment. Please check the file format.")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const reorderPage = (fromIndex: number, toIndex: number) => {
    if (!selectedExperiment) return

    const updatedPages = [...selectedExperiment.pages]
    const [moved] = updatedPages.splice(fromIndex, 1)
    updatedPages.splice(toIndex, 0, moved)

    const updatedExperiment = {
      ...selectedExperiment,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    }

    updateExperiment(updatedExperiment)
    setCurrentPageIndex(toIndex)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <FileText className="h-6 w-6 text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Electronic Lab Notebook</h1>
            <p className="text-sm text-muted-foreground">Capture experiments with photos, voice notes, and sticky notes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={importExperiment}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          {selectedExperiment && (
            <Button
              variant="outline"
              onClick={() => exportExperiment(selectedExperiment)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <Button
            className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
            onClick={() => setIsCreatingExperiment(true)}
          >
            <Plus className="h-4 w-4" />
            New Experiment
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar - Experiment List and Pages */}
        <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Experiments */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Experiments</Label>
              <div className="space-y-1">
                {experiments.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => {
                      setSelectedExperiment(exp)
                      setCurrentPageIndex(exp.pages.length > 0 ? 0 : -1)
                    }}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      selectedExperiment?.id === exp.id
                        ? "bg-brand-500 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{exp.title}</div>
                    <div className={`text-xs ${selectedExperiment?.id === exp.id ? "text-white/80" : "text-muted-foreground"}`}>
                      {exp.pages.length} page{exp.pages.length !== 1 ? "s" : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pages for Selected Experiment */}
            {selectedExperiment && selectedExperiment.pages.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Pages</Label>
                <div className="space-y-1">
                  {selectedExperiment.pages.map((page, index) => (
                    <div
                      key={page.id}
                      className={`group relative p-2 rounded-lg border cursor-pointer transition-colors ${
                        currentPageIndex === index
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white border-border hover:border-brand-300"
                      }`}
                      onClick={() => setCurrentPageIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{page.title}</div>
                          <div className={`text-xs flex items-center gap-1 ${
                            currentPageIndex === index ? "text-white/80" : "text-muted-foreground"
                          }`}>
                            {page.stickyNotes.length > 0 && <span>📌 {page.stickyNotes.length}</span>}
                            {page.voiceNotes.length > 0 && <span>🎙️ {page.voiceNotes.length}</span>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePage(index)
                          }}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 ${
                            currentPageIndex === index ? "text-white hover:text-red-200" : "text-red-500 hover:text-red-700"
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <Button
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                  onClick={() => setIsCreatingExperiment(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Experiment
                </Button>
              </div>
            </div>
          ) : !currentPage ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No pages yet</p>
                <p className="text-sm text-muted-foreground mb-4">Add your first page by taking or uploading a photo</p>
                <Button
                  className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
                  onClick={handleImageCapture}
                >
                  <Camera className="h-4 w-4" />
                  Take / Add Photo
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Page Controls */}
              <div className="flex items-center justify-between p-4 bg-card border-b border-border">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                      disabled={currentPageIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPageIndex + 1} of {selectedExperiment.pages.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageIndex(Math.min(selectedExperiment.pages.length - 1, currentPageIndex + 1))}
                      disabled={currentPageIndex === selectedExperiment.pages.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Input
                    value={editingPageTitle}
                    onChange={(e) => setEditingPageTitle(e.target.value)}
                    onBlur={updatePageTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur()
                      }
                    }}
                    className="max-w-xs"
                    placeholder="Page title..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingStickyNote(true)}
                    className={isAddingStickyNote ? "bg-brand-500 text-white" : ""}
                  >
                    📌 Add Sticky Note
                  </Button>
                  {isRecording ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopRecording}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startRecording}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Record Voice Note
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImageCapture}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Add Photo
                  </Button>
                </div>
              </div>

              {/* Page Content */}
              <div className="flex-1 overflow-auto p-4 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                  {/* Image with Sticky Notes */}
                  <div className="relative bg-white rounded-lg shadow-lg p-4 mb-4">
                    <div className="relative">
                      <img
                        ref={imageRef}
                        src={currentPage.imageUrl}
                        alt={currentPage.title}
                        className="w-full h-auto rounded-lg"
                        onClick={handleImageClick}
                        style={{ cursor: isAddingStickyNote ? "crosshair" : "default" }}
                      />
                      
                      {/* Sticky Notes Overlay */}
                      {currentPage.stickyNotes.map((note) => (
                        <div
                          key={note.id}
                          className="absolute p-2 rounded shadow-lg min-w-[120px] max-w-[200px]"
                          style={{
                            left: `${note.position.x}%`,
                            top: `${note.position.y}%`,
                            backgroundColor: note.color,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium flex-1">{note.text}</p>
                            <button
                              onClick={() => deleteStickyNote(note.id)}
                              className="text-gray-600 hover:text-red-600 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sticky Note Placement Dialog */}
                  {isAddingStickyNote && pendingStickyNotePosition && (
                    <Dialog open={isAddingStickyNote} onOpenChange={cancelStickyNote}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Sticky Note</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Note Text</Label>
                            <Textarea
                              value={stickyNoteText}
                              onChange={(e) => setStickyNoteText(e.target.value)}
                              placeholder="Enter your note..."
                              rows={3}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Color</Label>
                            <div className="flex gap-2 mt-2">
                              {STICKY_NOTE_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => setSelectedColor(color.value)}
                                  className={`w-10 h-10 rounded border-2 ${
                                    selectedColor === color.value
                                      ? "border-gray-800 scale-110"
                                      : "border-gray-300"
                                  }`}
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={cancelStickyNote}>
                              Cancel
                            </Button>
                            <Button
                              onClick={confirmStickyNote}
                              className="bg-brand-500 hover:bg-brand-600 text-white"
                              disabled={!stickyNoteText.trim()}
                            >
                              Add Note
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Voice Notes */}
                  {currentPage.voiceNotes.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-4 mb-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Voice Notes ({currentPage.voiceNotes.length})
                      </h3>
                      <div className="space-y-2">
                        {currentPage.voiceNotes.map((voiceNote) => (
                          <div
                            key={voiceNote.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded border"
                          >
                            <audio
                              src={voiceNote.audioUrl}
                              controls
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(voiceNote.duration)}s
                            </span>
                            <button
                              onClick={() => deleteVoiceNote(voiceNote.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelected}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />

      {/* Create Experiment Dialog */}
      <Dialog open={isCreatingExperiment} onOpenChange={setIsCreatingExperiment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Experiment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Experiment Title *</Label>
              <Input
                value={newExperimentTitle}
                onChange={(e) => setNewExperimentTitle(e.target.value)}
                placeholder="e.g., Buffer Optimization Study"
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
    </div>
  )
}


