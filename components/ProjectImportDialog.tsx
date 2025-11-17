"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, CheckCircle, AlertCircle, Loader2, FileJson } from "lucide-react"
import {
  parseSnapshotFile,
  validateSnapshot,
  importProjectSnapshot,
} from "@/lib/services/projectSnapshotService"
import { ProjectSnapshot, ImportResult, ImportOptions } from "@/lib/types"
import { logger } from "@/lib/logger"

interface ProjectImportDialogProps {
  open: boolean
  onClose: () => void
  onImportSuccess: (projectId: string) => void
  labId: string
  userId: string
}

export function ProjectImportDialog({
  open,
  onClose,
  onImportSuccess,
  labId,
  userId,
}: ProjectImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Import options
  const [generateNewIds, setGenerateNewIds] = useState(true)
  const [importOrders, setImportOrders] = useState(true)
  const [importTasks, setImportTasks] = useState(true)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setValidationErrors([])
    setImportResult(null)

    try {
      // Parse file
      const parsed = await parseSnapshotFile(file)
      setSnapshot(parsed)

      // Validate
      const validation = validateSnapshot(parsed)
      if (!validation.valid) {
        setValidationErrors(validation.errors.map((e) => e.message))
      }
    } catch (error) {
      logger.error('Error parsing snapshot file', error)
      setValidationErrors([
        error instanceof Error ? error.message : 'Failed to parse JSON file',
      ])
      setSnapshot(null)
    }
  }

  const handleImport = async () => {
    if (!snapshot) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const options: ImportOptions = {
        generateNewIds,
        overwriteExisting: false,
        importOrders,
        importTasks,
        labId,
        userId,
      }

      const result = await importProjectSnapshot(snapshot, options)
      setImportResult(result)

      if (result.success && result.projectId) {
        logger.info('Project import completed successfully', {
          projectId: result.projectId,
          statistics: result.statistics,
        })

        // Auto-close and notify parent
        setTimeout(() => {
          onImportSuccess(result.projectId!)
          onClose()
          resetState()
        }, 2000)
      }
    } catch (error) {
      logger.error('Error importing project', error)
      setImportResult({
        success: false,
        statistics: {
          workpackagesCreated: 0,
          deliverablesCreated: 0,
          ordersCreated: 0,
          tasksCreated: 0,
          transactionsCreated: 0,
          itemsSkipped: 0,
        },
        errors: [
          {
            type: 'unknown',
            message: error instanceof Error ? error.message : 'Import failed',
          },
        ],
        warnings: [],
      })
    } finally {
      setIsImporting(false)
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setSnapshot(null)
    setValidationErrors([])
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const canImport =
    snapshot && validationErrors.length === 0 && !isImporting && !importResult?.success

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Project</DialogTitle>
          <DialogDescription>
            Import a project snapshot from a JSON file. The snapshot will be imported
            into your current lab workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="snapshot-file">Project Snapshot File</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="snapshot-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Choose JSON File'}
              </Button>
            </div>
            {selectedFile && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <FileJson className="h-3 w-3" />
                {(selectedFile.size / 1024).toFixed(2)} KB
              </div>
            )}
          </div>

          {/* Snapshot Preview */}
          {snapshot && validationErrors.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="font-medium text-blue-900">
                Ready to Import: {snapshot.project.name}
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Workpackages: {snapshot.project.workpackages?.length || 0}</div>
                <div>
                  Deliverables:{' '}
                  {snapshot.project.workpackages?.reduce(
                    (sum, wp) => sum + (wp.deliverables?.length || 0),
                    0
                  ) || 0}
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  Exported: {new Date(snapshot.exportedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-red-900">Validation Errors</div>
                  <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Import Options */}
          {snapshot && validationErrors.length === 0 && !importResult && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="font-medium text-sm">Import Options</div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateNewIds}
                  onChange={(e) => setGenerateNewIds(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">
                  Generate new IDs (recommended to avoid conflicts)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importOrders}
                  onChange={(e) => setImportOrders(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Import orders and inventory data</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importTasks}
                  onChange={(e) => setImportTasks(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Import tasks</span>
              </label>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                importResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div
                  className={`font-medium ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {importResult.success ? 'Import Successful' : 'Import Failed'}
                </div>

                {importResult.success && (
                  <div className="text-sm text-green-700 mt-2 space-y-1">
                    <div>
                      Created {importResult.statistics.workpackagesCreated} workpackages
                    </div>
                    <div>
                      Created {importResult.statistics.deliverablesCreated} deliverables
                    </div>
                    {importResult.statistics.ordersCreated > 0 && (
                      <div>Created {importResult.statistics.ordersCreated} orders</div>
                    )}
                    {importResult.statistics.tasksCreated > 0 && (
                      <div>Created {importResult.statistics.tasksCreated} tasks</div>
                    )}
                  </div>
                )}

                {!importResult.success && importResult.errors.length > 0 && (
                  <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {importResult?.success ? 'Close' : 'Cancel'}
          </Button>
          {!importResult?.success && (
            <Button
              onClick={handleImport}
              disabled={!canImport}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Project
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
