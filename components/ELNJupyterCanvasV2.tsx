"use client"

import { useState, useRef } from "react"
import { ELNItem, ELNItemType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Image as ImageIcon,
  Mic,
  Database,
  Video,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  GripVertical,
  Check,
  X,
  Edit3,
  Upload,
  Link,
  Microscope,
  Package,
  File as FileIcon,
  Presentation,
  Lightbulb,
} from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { extractItemStructure } from "@/lib/ai/router"
import { uploadELNFile } from "@/lib/storage"
import { useAppContext } from "@/lib/AppContext"
import { logger } from "@/lib/logger"
import { ResourceLinkingDialog } from "@/components/eln/ResourceLinkingDialog"

interface ELNJupyterCanvasV2Props {
  items: ELNItem[]
  experimentId: string
  onAddItem: (item: Omit<ELNItem, "id" | "order" | "createdAt">) => void
  onUpdateItem: (itemId: string, updates: Partial<ELNItem>) => void
  onDeleteItem: (itemId: string) => void
}

const CELL_TYPES: Array<{
  type: ELNItemType
  label: string
  icon: typeof FileText
  accept?: string
}> = [
    { type: "note", label: "Text Note", icon: FileText },
    { type: "photo", label: "Image", icon: ImageIcon, accept: "image/*" },
    { type: "voice", label: "Audio", icon: Mic, accept: "audio/*" },
    { type: "data", label: "Data", icon: Database, accept: ".csv,.xlsx,.json,.txt" },
    { type: "video", label: "Video", icon: Video, accept: "video/*" },
    { type: "file", label: "File / PDF", icon: FileIcon, accept: "*" },
  ]

export function ELNJupyterCanvasV2({
  items,
  experimentId,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}: ELNJupyterCanvasV2Props) {
  const { currentUserProfile } = useAppContext()
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [extractingItem, setExtractingItem] = useState<string | null>(null)
  const [uploadingItem, setUploadingItem] = useState<boolean>(false)
  const [addingAfter, setAddingAfter] = useState<number | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = useState<ELNItemType | null>(null)
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null)
  const toast = useToast()

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0))

  const handleStartEdit = (item: ELNItem) => {
    setEditingCell(item.id)
    setEditContent(item.description || item.title || "")
  }

  const handleSaveEdit = (itemId: string) => {
    onUpdateItem(itemId, {
      description: editContent
    })
    setEditingCell(null)
    setEditContent("")
    toast.success("Cell updated")
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditContent("")
  }

  const handleAddCell = (type: ELNItemType, afterIndex: number | null) => {
    if (type === "note") {
      // Add empty text cell
      onAddItem({
        type: "note",
        title: "New Text Cell",
        description: ""
      })
      setAddingAfter(null)
      setShowTypeMenu(false)
    } else {
      // For other types, open file picker
      setSelectedType(type)
      setAddingAfter(afterIndex)
      setShowTypeMenu(false)
      fileInputRef.current?.click()
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedType || !currentUserProfile?.labId) return

    setUploadingItem(true)

    try {
      // Generate item ID
      const itemId = `item-${Date.now()}`

      // Upload to Firebase Storage
      const uploadResult = await uploadELNFile(
        file,
        currentUserProfile.labId,
        experimentId,
        itemId
      )

      // Add item with storage URL
      onAddItem({
        type: selectedType,
        title: file.name,
        description: "",
        fileUrl: uploadResult.url,
        storagePath: uploadResult.storagePath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })

      toast.success(`${selectedType} uploaded successfully!`)
      setSelectedType(null)
      setAddingAfter(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      logger.error("File upload error", error)
      toast.error("Failed to upload file. Please try again.")
    } finally {
      setUploadingItem(false)
    }
  }

  const handleExtractStructure = async (item: ELNItem) => {
    if (!item.fileUrl || extractingItem) return

    setExtractingItem(item.id)

    try {
      // Fetch the file from storage URL
      const response = await fetch(item.fileUrl)
      const blob = await response.blob()
      const file = new File([blob], item.fileName || "file", { type: item.fileType })

      const result = await extractItemStructure(file, item.type)

      onUpdateItem(item.id, {
        aiExtraction: {
          status: "completed",
          extractedText: result.data.text,
          entities: result.data.entities,
          summary: result.data.summary
        }
      })

      toast.success("Structure extracted!")
    } catch (error) {
      logger.error("Extraction failed", error)
      onUpdateItem(item.id, {
        aiExtraction: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      })
      toast.error("Extraction failed. Please try again.")
    } finally {
      setExtractingItem(null)
    }
  }

  const handleLinkResources = (itemId: string, resources: {
    equipmentIds?: string[]
    inventoryIds?: string[]
    whiteboardIds?: string[]
    researchPinIds?: string[]
  }) => {
    onUpdateItem(itemId, {
      linkedResources: resources
    })
    toast.success("Resources linked successfully")
  }

  const renderCell = (item: ELNItem, index: number) => {
    const isEditing = editingCell === item.id
    const isExtracting = extractingItem === item.id
    const Icon = CELL_TYPES.find(t => t.type === item.type)?.icon || FileText

    return (
      <div key={item.id} className="relative group">
        {/* Add Cell Button (appears between cells on hover) */}
        <div className="absolute -top-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs bg-white shadow-sm hover:bg-brand-50"
            onClick={() => {
              setAddingAfter(index - 1)
              setShowTypeMenu(true)
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Cell
          </Button>
        </div>

        {/* Cell Container */}
        <div className="border-2 border-border rounded-lg bg-white hover:border-brand-300 transition-colors">
          {/* Cell Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-gray-50">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <Icon className="h-4 w-4 text-brand-500" />
              <Badge variant="secondary" className="text-xs">
                {item.type}
              </Badge>
              {item.aiExtraction?.status === "completed" && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Extracted
                </Badge>
              )}
              {/* Resource Link Badges */}
              {item.linkedResources?.equipmentIds && item.linkedResources.equipmentIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Microscope className="h-3 w-3 mr-1" />
                  {item.linkedResources.equipmentIds.length}
                </Badge>
              )}
              {item.linkedResources?.inventoryIds && item.linkedResources.inventoryIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  {item.linkedResources.inventoryIds.length}
                </Badge>
              )}
              {item.linkedResources?.whiteboardIds && item.linkedResources.whiteboardIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Presentation className="h-3 w-3 mr-1" />
                  {item.linkedResources.whiteboardIds.length}
                </Badge>
              )}
              {item.linkedResources?.researchPinIds && item.linkedResources.researchPinIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {item.linkedResources.researchPinIds.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {item.type === "note" && !isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => handleStartEdit(item)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              {item.type !== "note" && !item.aiExtraction?.status && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleExtractStructure(item)}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Extract
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setLinkingItemId(item.id)}
              >
                <Link className="h-3 w-3 mr-1" />
                Link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => {
                  if (confirm("Delete this cell?")) {
                    onDeleteItem(item.id)
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Cell Content */}
          <div className="p-4">
            {item.type === "note" ? (
              isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] font-mono text-sm"
                    placeholder="Enter your notes here..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(item.id)}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-none cursor-text min-h-[60px] whitespace-pre-wrap"
                  onClick={() => handleStartEdit(item)}
                >
                  {item.description || item.title || <span className="text-muted-foreground italic">Click to edit...</span>}
                </div>
              )
            ) : item.type === "photo" && item.fileUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.fileUrl}
                  alt={item.title || "Image"}
                  className="max-w-full h-auto rounded-lg"
                />
                {item.description && (
                  <p className="text-sm text-muted-foreground italic">
                    {item.description}
                  </p>
                )}
              </div>
            ) : item.type === "voice" && item.fileUrl ? (
              <div className="space-y-2">
                <audio src={item.fileUrl} controls className="w-full" />
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            ) : item.type === "video" && item.fileUrl ? (
              <div className="space-y-2">
                <video src={item.fileUrl} controls className="w-full max-h-96 rounded-lg" />
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            ) : item.type === "file" && item.fileUrl ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-border">
                <FileIcon className="h-8 w-8 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title || item.fileName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.fileName} • {(item.fileSize ? (item.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size')}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                    Download / View
                  </a>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Icon className="h-8 w-8 text-brand-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.fileName || item.description}
                  </p>
                </div>
              </div>
            )}

            {/* AI Extraction Results */}
            {item.aiExtraction?.status === "completed" && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-700">
                  <Sparkles className="h-3 w-3" />
                  AI Extraction
                </div>
                {item.aiExtraction.summary && (
                  <p className="text-sm bg-brand-50 p-3 rounded">
                    {item.aiExtraction.summary}
                  </p>
                )}
                {item.aiExtraction.entities && item.aiExtraction.entities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.aiExtraction.entities.slice(0, 10).map((entity, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {entity.type}: {entity.value}
                      </Badge>
                    ))}
                    {item.aiExtraction.entities.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.aiExtraction.entities.length - 10} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Experimental Canvas</h3>
          <p className="text-sm text-muted-foreground">
            Jupyter-style notebook - Files stored securely in cloud storage
          </p>
        </div>
        <Button
          onClick={() => {
            setAddingAfter(sortedItems.length - 1)
            setShowTypeMenu(true)
          }}
          className="gap-2"
          disabled={uploadingItem}
        >
          {uploadingItem ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Cell
            </>
          )}
        </Button>
      </div>

      {/* Cell Type Selection Menu */}
      {showTypeMenu && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowTypeMenu(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold mb-3">Add Cell</h4>
            <div className="grid grid-cols-2 gap-2">
              {CELL_TYPES.map((cellType) => {
                const Icon = cellType.icon
                return (
                  <button
                    key={cellType.type}
                    onClick={() => handleAddCell(cellType.type, addingAfter)}
                    className="flex items-center gap-2 p-3 rounded-lg border-2 border-border hover:border-brand-500 hover:bg-brand-50 transition-colors"
                    disabled={uploadingItem}
                  >
                    <Icon className="h-5 w-5 text-brand-500" />
                    <span className="font-medium text-sm">{cellType.label}</span>
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => setShowTypeMenu(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={selectedType ? CELL_TYPES.find(t => t.type === selectedType)?.accept : "*"}
        onChange={handleFileUpload}
        disabled={uploadingItem}
      />

      {/* Cells */}
      {sortedItems.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            No cells yet
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Add text notes, images, audio, or data to get started
          </p>
          <Button
            onClick={() => {
              setAddingAfter(null)
              setShowTypeMenu(true)
            }}
            disabled={uploadingItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Cell
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedItems.map((item, index) => renderCell(item, index))}

          {/* Add Cell Button at Bottom */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAddingAfter(sortedItems.length - 1)
                setShowTypeMenu(true)
              }}
              className="gap-2"
              disabled={uploadingItem}
            >
              <Plus className="h-4 w-4" />
              Add Cell Below
            </Button>
          </div>
        </div>
      )}

      {/* Resource Linking Dialog */}
      {linkingItemId && (() => {
        const linkingItem = sortedItems.find(i => i.id === linkingItemId)
        return linkingItem ? (
          <ResourceLinkingDialog
            open={true}
            onClose={() => setLinkingItemId(null)}
            onLink={(resources) => handleLinkResources(linkingItemId, resources)}
            initialLinks={linkingItem.linkedResources}
          />
        ) : null
      })()}
    </div>
  )
}
