"use client"

import React, { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Upload, FileText, BrainCircuit, AlertCircle } from "lucide-react"
import { useResearchBoards } from "@/lib/hooks/useResearchBoards"
import { useResearchBoard } from "@/lib/hooks/useResearchBoard"
import { generateProtocolFromResearch } from "@/lib/ai/geminiAgent"
import { ProtocolExport } from "@/lib/protocol/types"

interface ImportProtocolDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (protocol: ProtocolExport) => void
}

export function ImportProtocolDialog({ open, onOpenChange, onImport }: ImportProtocolDialogProps) {
    const [activeTab, setActiveTab] = useState("file")
    const [jsonText, setJsonText] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setError(null)
        try {
            const text = await file.text()
            const data = JSON.parse(text)
            // Basic validation
            if (!data.nodes && !data.protocol?.nodes) {
                throw new Error("Invalid protocol file format")
            }
            onImport(data.protocol || data)
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse file")
        } finally {
            setLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleJsonImport = () => {
        if (!jsonText.trim()) return
        setLoading(true)
        setError(null)
        try {
            const data = JSON.parse(jsonText)
            if (!data.nodes && !data.protocol?.nodes) {
                throw new Error("Invalid protocol JSON format")
            }
            onImport(data.protocol || data)
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse JSON")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Protocol</DialogTitle>
                    <DialogDescription>
                        Import a protocol from a JSON file, paste raw JSON, generate from Research Board context, or extract from PDF.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="file">File Upload</TabsTrigger>
                        <TabsTrigger value="json">Paste JSON</TabsTrigger>
                        <TabsTrigger value="pdf">PDF Import</TabsTrigger>
                        <TabsTrigger value="research">Research Board</TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-12 hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-10 w-10 text-slate-400 mb-4" />
                            <p className="text-sm font-medium text-slate-900">Click to upload JSON file</p>
                            <p className="text-xs text-slate-500 mt-1">Supports .json protocol files</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="json" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Protocol JSON</Label>
                            <Textarea
                                placeholder="Paste your protocol JSON here..."
                                className="h-[300px] font-mono text-xs"
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                        <Button onClick={handleJsonImport} disabled={loading || !jsonText.trim()} className="w-full">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Import JSON
                        </Button>
                    </TabsContent>

                    <TabsContent value="pdf" className="space-y-4 py-4">
                        <PDFImporter
                            onImport={(protocol) => {
                                onImport(protocol)
                                onOpenChange(false)
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="research" className="py-4">
                        <ResearchBoardImporter
                            onImport={(protocol) => {
                                onImport(protocol)
                                onOpenChange(false)
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

function PDFImporter({ onImport }: { onImport: (protocol: ProtocolExport) => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState<string>("")

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setProgress("Uploading and extracting...")

        try {
            const formData = new FormData(e.currentTarget)
            const endpoint = process.env.NEXT_PUBLIC_PROTOCOL_IMPORT_ENDPOINT || "/api/protocol/import"

            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Import failed")
            }

            setProgress("Processing...")
            const data = await response.json()
            onImport(data.protocol || data)
        } catch (err) {
            console.error(err)
            setError(err instanceof Error ? err.message : "Failed to import PDF")
        } finally {
            setLoading(false)
            setProgress("")
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="protocol-name">Protocol Name</Label>
                <Input id="protocol-name" name="name" placeholder="e.g. PCR Thermocycling" defaultValue="Imported Protocol" />
            </div>
            <div>
                <Label>Research Paper (PDF)</Label>
                <Input type="file" name="file" accept="application/pdf" required className="cursor-pointer" />
                <p className="text-xs text-slate-500 mt-1">Up to 15 MB. The PDF text will be extracted server-side.</p>
            </div>
            <div>
                <Label htmlFor="protocol-description">Additional Notes / Description</Label>
                <Textarea id="protocol-description" name="description" placeholder="Optional description shown in metadata" rows={2} />
            </div>
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {progress || "Importing..."}
                    </>
                ) : "Import from PDF"}
            </Button>
        </form>
    )
}

function ResearchBoardImporter({ onImport }: { onImport: (protocol: ProtocolExport) => void }) {
    const { boards, loading: boardsLoading } = useResearchBoards()
    const [selectedBoardId, setSelectedBoardId] = useState<string>("")
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // We only fetch pins when a board is selected
    const { pins, loading: pinsLoading } = useResearchBoard(selectedBoardId || undefined)

    const handleGenerate = async () => {
        if (!selectedBoardId || pins.length === 0) return

        setGenerating(true)
        setError(null)

        try {
            // 1. Aggregate context from pins
            let context = `Research Board Context:\n`
            pins.forEach(pin => {
                context += `\n--- Pin: ${pin.title || 'Untitled'} (${pin.type}) ---\n`
                if (pin.content) context += `Content: ${pin.content}\n`
                if (pin.aiAnalysis) context += `AI Analysis: ${pin.aiAnalysis}\n`
                if (pin.aiSummary) context += `Summary: ${pin.aiSummary}\n`
                if (pin.pdfText) context += `PDF Text (excerpt): ${pin.pdfText.substring(0, 2000)}...\n`
            })

            // 2. Generate protocol
            const protocol = await generateProtocolFromResearch(context)

            // 3. Import
            onImport(protocol)
        } catch (err) {
            console.error(err)
            setError("Failed to generate protocol from research context. Please try again.")
        } finally {
            setGenerating(false)
        }
    }

    if (boardsLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Select Research Board</Label>
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose a board..." />
                    </SelectTrigger>
                    <SelectContent>
                        {boards.map(board => (
                            <SelectItem key={board.id} value={board.id}>{board.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedBoardId && (
                <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Board Content</h4>
                        <span className="text-xs text-slate-500">{pins.length} pins found</span>
                    </div>

                    {pinsLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
                    ) : pins.length > 0 ? (
                        <ScrollArea className="h-[200px] bg-white rounded border p-2">
                            <div className="space-y-2">
                                {pins.map(pin => (
                                    <div key={pin.id} className="flex items-start gap-2 text-sm p-2 hover:bg-slate-50 rounded">
                                        <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-900">{pin.title || 'Untitled Pin'}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{pin.content || pin.aiSummary || 'No content'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center p-4 text-sm text-slate-500">No pins in this board.</div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={generating || pins.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Analyzing & Generating...
                            </>
                        ) : (
                            <>
                                <BrainCircuit className="h-4 w-4 mr-2" />
                                Generate Protocol from Board
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-slate-500 text-center">
                        AI will analyze the pins and extract a structured protocol.
                    </p>
                </div>
            )}
        </div>
    )
}
