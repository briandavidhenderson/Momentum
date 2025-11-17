"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { exportProjectSnapshot, downloadSnapshot } from "@/lib/services/projectSnapshotService"
import { logger } from "@/lib/logger"

interface ProjectExportDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  userId: string
}

export function ProjectExportDialog({
  open,
  onClose,
  projectId,
  projectName,
  userId,
}: ProjectExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus('idle')
    setErrorMessage(null)

    try {
      logger.info('Starting project export', { projectId, projectName })

      // Export snapshot
      const snapshot = await exportProjectSnapshot(projectId, userId)

      // Download as JSON file
      const filename = `${projectName.replace(/\s+/g, '-').toLowerCase()}-snapshot-${Date.now()}.json`
      downloadSnapshot(snapshot, filename)

      setExportStatus('success')
      logger.info('Project export completed successfully', { projectId, filename })

      // Auto-close after success
      setTimeout(() => {
        onClose()
        setExportStatus('idle')
      }, 2000)
    } catch (error) {
      logger.error('Error exporting project', error)
      setExportStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to export project'
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Download a complete snapshot of &quot;{projectName}&quot; including all
            workpackages, deliverables, orders, tasks, and budget data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Status */}
          {exportStatus === 'success' && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-green-900">Export Successful</div>
                <div className="text-sm text-green-700 mt-1">
                  Project snapshot has been downloaded. You can import it into any
                  Momentum workspace.
                </div>
              </div>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-red-900">Export Failed</div>
                <div className="text-sm text-red-700 mt-1">
                  {errorMessage || 'An error occurred during export'}
                </div>
              </div>
            </div>
          )}

          {exportStatus === 'idle' && !isExporting && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>The exported snapshot will include:</div>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Project metadata and settings</li>
                <li>All workpackages and deliverables</li>
                <li>Linked orders and inventory updates</li>
                <li>Project tasks and day-to-day tasks</li>
                <li>Budget data and funding accounts</li>
                <li>Progress tracking information</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-border">
                The snapshot will be saved as a JSON file that you can re-import
                later or share with collaborators.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            {exportStatus === 'success' ? 'Close' : 'Cancel'}
          </Button>
          {exportStatus !== 'success' && (
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Project
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
