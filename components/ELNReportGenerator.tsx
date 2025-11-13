"use client"

import { useState } from "react"
import { ELNItem, ELNReport } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Sparkles, Loader2, Download, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { generateExperimentReport } from "@/lib/ai/router"

interface ELNReportGeneratorProps {
  experimentTitle: string
  experimentDescription?: string
  items: ELNItem[]
  reports: ELNReport[]
  onReportGenerated: (report: Omit<ELNReport, "id">) => void
}

export function ELNReportGenerator({
  experimentTitle,
  experimentDescription,
  items,
  reports,
  onReportGenerated
}: ELNReportGeneratorProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewingReport, setViewingReport] = useState<ELNReport | null>(null)
  const toast = useToast()

  const extractedItems = items.filter(item =>
    item.aiExtraction?.status === "completed" || item.type === "note"
  )

  const handleGenerateReport = async () => {
    if (extractedItems.length === 0) {
      toast.warning("Please extract structure from at least one item before generating a report")
      return
    }

    setIsGenerating(true)

    try {
      // Prepare items data for report generation
      const itemsData = extractedItems.map(item => ({
        type: item.type,
        extractedText: item.aiExtraction?.extractedText || item.description || "",
        structuredData: item.aiExtraction?.structuredData,
        description: item.title
      }))

      // Generate report using AI
      const result = await generateExperimentReport(
        itemsData,
        experimentTitle,
        experimentDescription
      )

      // Create new report
      const newReport: Omit<ELNReport, "id"> = {
        experimentId: "", // Will be set by parent
        background: result.data.background,
        protocols: result.data.protocols,
        results: result.data.results,
        conclusion: result.data.conclusion,
        generatedAt: new Date().toISOString(),
        generatedBy: "ai",
        version: (reports.length || 0) + 1,
        sourceItemIds: extractedItems.map(item => item.id)
      }

      onReportGenerated(newReport)
      setShowGenerateDialog(false)
      toast.success("Report generated successfully!")
    } catch (error) {
      console.error("Report generation failed:", error)
      toast.error("Failed to generate report. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReportAsMarkdown = (report: ELNReport) => {
    const markdown = `# ${experimentTitle}

${experimentDescription ? `*${experimentDescription}*\n\n` : ""}---

## Background

${report.background}

## Protocols

${report.protocols}

## Results

${report.results}

## Conclusion

${report.conclusion}

---

*Generated ${new Date(report.generatedAt).toLocaleDateString()} - Version ${report.version}*
*Report generated with AI from ${report.sourceItemIds.length} experimental items*
`

    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${experimentTitle.replace(/\s+/g, "-")}-report-v${report.version}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Report exported as Markdown!")
  }

  return (
    <div className="space-y-4">
      {/* Generate Report Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-500" />
                Experiment Reports
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generate comprehensive reports from your experimental data
              </p>
            </div>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="gap-2"
              disabled={extractedItems.length === 0}
            >
              <Sparkles className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {extractedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Extract structure from your items to generate reports
              </p>
              <p className="text-xs mt-1">
                Click &quot;Extract&quot; on items in your canvas to get started
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {extractedItems.length} items ready
              </Badge>
              <span className="text-muted-foreground">
                {reports.length > 0 ? `${reports.length} report(s) generated` : "No reports generated yet"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => setViewingReport(report)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-brand-500" />
                    <div>
                      <div className="font-medium text-sm">
                        Report v{report.version}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.generatedAt).toLocaleDateString()}
                        <span>•</span>
                        {report.sourceItemIds.length} items
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        exportReportAsMarkdown(report)
                      }}
                      className="gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Report Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Experiment Report</DialogTitle>
            <DialogDescription>
              AI will analyze all extracted data and create a comprehensive report with background, protocols, results, and conclusions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-brand-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Report will include:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Background:</strong> Scientific context and objectives</li>
                    <li>• <strong>Protocols:</strong> Extracted methods and procedures</li>
                    <li>• <strong>Results:</strong> Observations and data summary</li>
                    <li>• <strong>Conclusion:</strong> Synthesis and next steps</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items to analyze:</span>
              <Badge>{extractedItems.length} items</Badge>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
                className="flex-1"
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                className="flex-1 gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh]">
          {viewingReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>{experimentTitle} - Report v{viewingReport.version}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generated {new Date(viewingReport.generatedAt).toLocaleDateString()} from {viewingReport.sourceItemIds.length} items
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReportAsMarkdown(viewingReport)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                </div>
              </DialogHeader>

              <Tabs defaultValue="background" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="background">Background</TabsTrigger>
                  <TabsTrigger value="protocols">Protocols</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
                </TabsList>

                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                  <TabsContent value="background" className="prose prose-sm max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap">
                      {viewingReport.background}
                    </div>
                  </TabsContent>

                  <TabsContent value="protocols" className="prose prose-sm max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap">
                      {viewingReport.protocols}
                    </div>
                  </TabsContent>

                  <TabsContent value="results" className="prose prose-sm max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap">
                      {viewingReport.results}
                    </div>
                  </TabsContent>

                  <TabsContent value="conclusion" className="prose prose-sm max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap">
                      {viewingReport.conclusion}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
