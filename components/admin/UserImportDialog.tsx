"use client"

import { useState } from "react"
import { parseCSV, generateCSVTemplate, importUsers, UserImportRow } from "@/lib/services/userImportService"
import { logger } from "@/lib/logger"
import { useToast } from "@/lib/toast"
import { useAuth } from "@/lib/hooks/useAuth"
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
import { Download, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface UserImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

export function UserImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: UserImportDialogProps) {
  const { currentUser } = useAuth()
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: Array<{ row: number; email: string; error: string }>
  } | null>(null)

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate()
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "user_import_template.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toastSuccess("Template downloaded")
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toastError("Please select a CSV file")
        return
      }
      setFile(selectedFile)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!file || !currentUser) {
      toastError("Please select a file and ensure you're logged in")
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        toastError("No valid rows found in CSV file")
        setIsImporting(false)
        return
      }

      const result = await importUsers(rows, currentUser.uid)

      setImportResult(result)

      if (result.failed === 0) {
        toastSuccess(`Successfully imported ${result.success} user(s)`)
        onImportComplete?.()
      } else {
        toastWarning(
          `Imported ${result.success} user(s), ${result.failed} failed. Check errors below.`
        )
      }
    } catch (error: any) {
      logger.error("Error importing users", error)
      toastError(`Failed to import users: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Users</DialogTitle>
          <DialogDescription>
            Import multiple users from a CSV file. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Download */}
          <div className="space-y-2">
            <Label>Step 1: Download Template</Label>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </Button>
            <p className="text-xs text-muted-foreground">
              Use the template to ensure your CSV file has the correct format and column headers.
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Step 2: Select CSV File</Label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex-1">
                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2"
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4" />
                    {file ? file.name : "Choose CSV File"}
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isImporting}
                />
              </label>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Import Results</h4>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {importResult.success} Success
                  </Badge>
                  {importResult.failed > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {importResult.failed} Failed
                    </Badge>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Errors:</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, idx) => (
                      <div
                        key={idx}
                        className="text-sm p-2 bg-background rounded border border-border"
                      >
                        <div className="font-medium">Row {error.row}: {error.email}</div>
                        <div className="text-muted-foreground text-xs">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Important Notes */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Important Notes
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Imported users will need to sign up separately to create their Firebase Auth account</li>
              <li>Users can link their account to their profile using their email address</li>
              <li>ORCID iD can be included in the import, but users will need to verify it separately</li>
              <li>All required fields (Email, FirstName, LastName, Organisation, Institute, Lab) must be provided</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || isImporting || !currentUser}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isImporting ? "Importing..." : "Import Users"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

