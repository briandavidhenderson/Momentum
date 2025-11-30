"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader2, X } from "lucide-react"
import { parseInventoryCSV, ParsedInventoryItem } from "@/lib/utils/csvInventoryUtils"
import { createInventoryItem } from "@/lib/services/inventoryService"
import { useAuth } from "@/lib/hooks/useAuth"
import { InventoryItem } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

interface ImportInventoryDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
  labId?: string
}

export function ImportInventoryDialog({ open, onClose, onSuccess, labId }: ImportInventoryDialogProps) {
  const { currentUser, currentUserProfile } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedInventoryItem[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: Array<{ item: ParsedInventoryItem; error: string }>
  } | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
    setParsedData([])
    setParseErrors([])
    setImportResults(null)

    // Parse the file
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseInventoryCSV(text)
      setParsedData(result.items)
      setParseErrors(result.errors)
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (!currentUser?.uid || parsedData.length === 0) return

    setImporting(true)
    setImportProgress({ current: 0, total: parsedData.length })

    const successful: string[] = []
    const failed: Array<{ item: ParsedInventoryItem; error: string }> = []

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i]
      setImportProgress({ current: i + 1, total: parsedData.length })

      try {
        const itemData: Omit<InventoryItem, 'id'> & { createdBy: string } = {
          productName: item.productName,
          catNum: item.catNum,
          supplier: item.supplier,
          currentQuantity: item.currentQuantity,
          priceExVAT: item.priceExVAT,
          minQuantity: item.minQuantity,
          inventoryLevel: item.inventoryLevel,
          receivedDate: new Date(),
          category: item.category,
          subcategory: item.subcategory,
          notes: item.notes,
          labId: labId || currentUserProfile?.labId,
          createdBy: currentUser.uid,
          visibility: 'lab',
        }

        const itemId = await createInventoryItem(itemData)
        successful.push(itemId)

      } catch (error) {
        console.error(`Error importing row ${item.rowNumber}:`, error)
        failed.push({
          item,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    setImportResults({ successful: successful.length, failed })
    setImporting(false)

    if (successful.length > 0 && onSuccess) {
      onSuccess(successful.length)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParsedData([])
    setParseErrors([])
    setImportResults(null)
    setImportProgress({ current: 0, total: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-500" />
            Import Inventory from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Import Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the CSV template or use your existing inventory file</li>
              <li>Fill in the required fields: Product Name, Catalog Number, Quantity, Price</li>
              <li>Optional: Add Supplier, Min Quantity, Stock Level, Category, Subcategory, Notes</li>
              <li>Save as CSV format</li>
              <li>Upload the file below</li>
            </ol>
          </div>

          {/* File Upload */}
          {!importResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Select CSV File
                </Button>

                {file && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      disabled={importing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Parse Errors */}
              {parseErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">
                        {parseErrors.length} Error{parseErrors.length !== 1 ? "s" : ""} Found
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {parseErrors.map((error, index) => (
                          <div key={index} className="text-sm text-red-800">
                            Row {error.row}: {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parsed Data Preview */}
              {parsedData.length > 0 && parseErrors.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-2">
                        Ready to Import: {parsedData.length} Item{parsedData.length !== 1 ? "s" : ""}
                      </h4>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-green-100 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Product Name</th>
                              <th className="text-left p-2">Cat. #</th>
                              <th className="text-right p-2">Qty</th>
                              <th className="text-right p-2">Price</th>
                              <th className="text-left p-2">Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.slice(0, 50).map((item, index) => (
                              <tr key={index} className="border-t border-green-200">
                                <td className="p-2">{item.productName}</td>
                                <td className="p-2">{item.catNum}</td>
                                <td className="p-2 text-right">{item.currentQuantity}</td>
                                <td className="p-2 text-right">£{item.priceExVAT.toFixed(2)}</td>
                                <td className="p-2">{item.category || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedData.length > 50 && (
                          <div className="text-xs text-green-700 p-2 text-center">
                            ...and {parsedData.length - 50} more items
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {importing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900 mb-1">
                        Importing... {importProgress.current} of {importProgress.total}
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(importProgress.current / importProgress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">
                      Successfully Imported {importResults.successful} Item
                      {importResults.successful !== 1 ? "s" : ""}
                    </h4>
                  </div>
                </div>
              </div>

              {importResults.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">
                        {importResults.failed.length} Item{importResults.failed.length !== 1 ? "s" : ""} Failed
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {importResults.failed.map((failure, index) => (
                          <div key={index} className="text-sm text-red-800">
                            <span className="font-medium">Row {failure.item.rowNumber}:</span>{" "}
                            {failure.item.productName} - {failure.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {!importResults && (
                <p className="text-xs text-muted-foreground">
                  * Required fields must be filled in the CSV file
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={importing}
              >
                {importResults ? "Close" : "Cancel"}
              </Button>

              {!importResults && parsedData.length > 0 && parseErrors.length === 0 && (
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {parsedData.length} Item{parsedData.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}

              {importResults && importResults.successful > 0 && (
                <Button
                  onClick={handleReset}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  Import More
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
