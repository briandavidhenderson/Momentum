"use client"

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
    ChevronRight,
    ChevronLeft,
    Play,
    CheckCircle2,
    Clock,
    AlertTriangle,
    FlaskConical,
    Camera,
    Mic,
    X,
    History as HistoryIcon,
    Loader2,
    Save,
    Plus,
    Edit
} from 'lucide-react'
import { useAppContext } from '@/lib/AppContext'
import { Protocol, ProtocolStep, ProtocolExecution, ProtocolStepExecution } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ProtocolHistoryView } from './protocols/ProtocolHistoryView'
import { ProtocolEditor } from './ProtocolEditor'
import { ResourceAvailabilityChecker, ResourceRequirement } from './ResourceAvailabilityChecker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    startProtocolExecution,
    updateProtocolExecution,
    finishProtocolExecution,
    abortProtocolExecution
} from '@/lib/services/protocolExecutionService'
import { deductInventory, getInventory } from '@/lib/services/inventoryService'
import { scheduleProtocol } from '@/lib/services/calendarService'
import { uploadFile } from '@/lib/storage'
import { useToast } from '@/components/ui/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { getRiskAssessment } from '@/lib/services/safetyService'
import { RiskAssessment } from '@/lib/types/safety.types'
import { CommentsSection } from '@/components/CommentsSection'
import { cloneProtocol } from '@/lib/services/cloningService'
import { Copy } from 'lucide-react'

export function ProtocolBenchMode() {
    const { protocols, currentUserProfile, addProtocol, updateProtocol } = useAppContext()
    const { toast } = useToast()
    const [activeProtocol, setActiveProtocol] = useState<Protocol | null>(null)
    const [activeExecution, setActiveExecution] = useState<ProtocolExecution | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<string[]>([])
    const [sessionTimer, setSessionTimer] = useState(0)
    const [historyProtocol, setHistoryProtocol] = useState<Protocol | null>(null)
    const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [stepNotes, setStepNotes] = useState<Record<string, string>>({})
    const [stepMedia, setStepMedia] = useState<Record<string, string[]>>({})
    const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null)
    const [isCheckingResources, setIsCheckingResources] = useState(false)
    const [requiredResources, setRequiredResources] = useState<ResourceRequirement[]>([])
    const [pendingProtocolStart, setPendingProtocolStart] = useState<Protocol | null>(null)

    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch Risk Assessment
    useEffect(() => {
        if (activeProtocol?.riskAssessmentId) {
            getRiskAssessment(activeProtocol.riskAssessmentId).then(setRiskAssessment)
        } else {
            setRiskAssessment(null)
        }
    }, [activeProtocol])

    // Timer logic
    useEffect(() => {
        if (activeExecution && activeExecution.status === 'running') {
            timerRef.current = setInterval(() => {
                setSessionTimer(prev => prev + 1)
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [activeExecution])

    const startProtocol = async (protocol: Protocol) => {
        if (!currentUserProfile) {
            toast({
                title: "Authentication required",
                description: "You must be logged in to start a protocol",
                variant: "destructive"
            })
            return
        }

        // Extract required resources
        const resources: ResourceRequirement[] = []
        protocol.steps.forEach(step => {
            step.requiredReagents?.forEach(reagent => {
                resources.push({
                    type: 'reagent',
                    id: '', // We don't have ID yet, checker will match by name
                    name: reagent.name,
                    quantityNeeded: parseFloat(reagent.quantity) || 1,
                    unit: reagent.quantity.replace(/[0-9.]/g, '').trim()
                })
            })
        })

        if (resources.length > 0) {
            setRequiredResources(resources)
            setPendingProtocolStart(protocol)
            setIsCheckingResources(true)
        } else {
            executeStartProtocol(protocol)
        }
    }

    const executeStartProtocol = async (protocol: Protocol) => {
        setIsSubmitting(true)
        try {
            const executionId = await startProtocolExecution({
                protocolId: protocol.id,
                protocolTitle: protocol.title,
                protocolVersionId: protocol.activeVersionId,
                performedBy: currentUserProfile!.id,
                performedByName: currentUserProfile!.displayName,
                labId: currentUserProfile!.labId
            })

            const newExecution: ProtocolExecution = {
                id: executionId,
                protocolId: protocol.id,
                protocolTitle: protocol.title,
                protocolVersionId: protocol.activeVersionId,
                performedBy: currentUserProfile!.id,
                performedByName: currentUserProfile!.displayName,
                labId: currentUserProfile!.labId,
                startedAt: new Date(),
                status: 'running',
                currentStepIndex: 0,
                steps: [],
                durationSeconds: 0
            }

            setActiveExecution(newExecution)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to start protocol",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
            setIsCheckingResources(false)
            setPendingProtocolStart(null)
        }
    }

    const exitBenchMode = async () => {
        if (activeExecution?.status === 'running') {
            if (confirm("Are you sure you want to abort this protocol execution?")) {
                await abortProtocolExecution(activeExecution.id)
                setActiveProtocol(null)
                setActiveExecution(null)
                setSessionTimer(0)
            }
        } else {
            setActiveProtocol(null)
            setActiveExecution(null)
            setSessionTimer(0)
        }
    }

    const finishProtocol = async () => {
        if (!activeExecution) return
        if (!confirm("Are you sure you want to finish this protocol?")) return

        setIsSubmitting(true)
        try {
            await finishProtocolExecution(activeExecution.id, sessionTimer)
            toast({
                title: "Protocol finished",
                description: "Execution saved successfully"
            })
            setActiveProtocol(null)
            setActiveExecution(null)
            setSessionTimer(0)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to finish protocol",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSaveProtocol = async (updatedProtocol: Protocol) => {
        try {
            if (editingProtocol?.id) {
                await updateProtocol(updatedProtocol.id, updatedProtocol)
                toast({ title: "Protocol updated" })
            } else {
                await addProtocol(updatedProtocol)
                toast({ title: "Protocol created" })
            }
            setEditingProtocol(null)
        } catch (error) {
            console.error(error)
            toast({ title: "Failed to save protocol", variant: "destructive" })
        }
    }

    const handleCloneProtocol = async (protocol: Protocol) => {
        if (!confirm(`Are you sure you want to clone "${protocol.title}"?`)) return

        try {
            await cloneProtocol(protocol.id)
            toast({
                title: "Protocol Cloned",
                description: "A copy has been created in your library."
            })
            // Note: The new protocol will appear automatically via real-time subscription
        } catch (error) {
            console.error(error)
            toast({
                title: "Cloning Failed",
                description: "Could not clone the protocol.",
                variant: "destructive"
            })
        }
    }

    const currentStep = activeProtocol?.steps[currentStepIndex]
    const progress = activeProtocol ? ((currentStepIndex) / activeProtocol.steps.length) * 100 : 0

    const handleNext = () => {
        if (!activeProtocol) return
        if (currentStepIndex < activeProtocol.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1)
        }
    }

    const toggleStepComplete = async (stepId: string) => {
        if (!activeExecution || !currentStep) return

        const isComplete = completedSteps.includes(stepId)
        const newCompletedSteps = isComplete
            ? completedSteps.filter(id => id !== stepId)
            : [...completedSteps, stepId]

        setCompletedSteps(newCompletedSteps)

        // Update execution in background
        const stepExecution: ProtocolStepExecution = {
            stepId,
            status: isComplete ? 'pending' : 'completed',
            completedAt: isComplete ? undefined : new Date(),
            notes: stepNotes[stepId],
            mediaUrls: stepMedia[stepId]
        }

        // Optimistic update
        const updatedSteps = [...activeExecution.steps.filter(s => s.stepId !== stepId), stepExecution]
        setActiveExecution({ ...activeExecution, steps: updatedSteps })

        try {
            await updateProtocolExecution(activeExecution.id, {
                steps: updatedSteps,
                currentStepIndex // Save current position
            })

            // Inventory Deduction
            if (!isComplete && currentStep.requiredReagents && currentStep.requiredReagents.length > 0) {
                const inventory = await getInventory()
                for (const reagent of currentStep.requiredReagents) {
                    const item = inventory.find(i => i.productName.toLowerCase() === reagent.name.toLowerCase())
                    if (item) {
                        const qty = parseFloat(reagent.quantity) || 1
                        const result = await deductInventory(item.id, qty)

                        if (result.newLevel === 'low') {
                            toast({
                                title: "Low Stock Alert",
                                description: `${result.productName} is running low.`,
                                variant: "destructive"
                            })
                        } else if (result.newLevel === 'out_of_stock') {
                            toast({
                                title: "Out of Stock Alert",
                                description: `${result.productName} is now out of stock!`,
                                variant: "destructive"
                            })
                        } else {
                            toast({
                                title: "Inventory Updated",
                                description: `Deducted ${qty} of ${reagent.name}`
                            })
                        }
                    } else {
                        console.warn(`Could not find inventory item for ${reagent.name}`)
                    }
                }
            }

        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to update step status",
                variant: "destructive"
            })
        }
    }

    const handlePhotoUpload = async () => {
        if (!activeExecution || !currentStep) return

        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            toast({ title: "Uploading photo..." })

            try {
                const path = `protocol_executions/${activeExecution.id}/steps/${currentStep.id}/${Date.now()}_${file.name}`
                const result = await uploadFile(file, path)

                const currentMedia = stepMedia[currentStep.id] || []
                const newMedia = [...currentMedia, result.url]
                setStepMedia({ ...stepMedia, [currentStep.id]: newMedia })

                toast({ title: "Photo uploaded" })
            } catch (error) {
                console.error(error)
                toast({
                    title: "Error",
                    description: "Failed to upload photo",
                    variant: "destructive"
                })
            }
        }
        input.click()
    }

    const handleVoiceNote = async () => {
        if (!activeExecution || !currentStep) return

        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'audio/*'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            toast({ title: "Uploading voice note..." })
            try {
                const path = `protocol_executions/${activeExecution.id}/steps/${currentStep.id}/${Date.now()}_${file.name}`
                const result = await uploadFile(file, path)

                const currentMedia = stepMedia[currentStep.id] || []
                const newMedia = [...currentMedia, result.url]
                setStepMedia({ ...stepMedia, [currentStep.id]: newMedia })

                toast({ title: "Voice note uploaded" })
            } catch (error) {
                console.error(error)
                toast({
                    title: "Error",
                    description: "Failed to upload voice note",
                    variant: "destructive"
                })
            }
        }
        input.click()
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (editingProtocol) {
        return (
            <ProtocolEditor
                protocol={editingProtocol.id ? editingProtocol : undefined}
                onSave={handleSaveProtocol}
                onCancel={() => setEditingProtocol(null)}
            />
        )
    }

    if (activeProtocol) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
                {/* Mobile Header */}
                <div className="border-b p-4 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={exitBenchMode}>
                            <X className="h-6 w-6" />
                        </Button>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">{activeProtocol.title}</h2>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Step {currentStepIndex + 1} of {activeProtocol.steps.length}</span>
                                <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(sessionTimer)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {riskAssessment && (
                            <Badge variant={riskAssessment.status === 'approved' ? "outline" : "destructive"} className="flex gap-1 items-center">
                                <AlertTriangle className="h-3 w-3" />
                                RA: {riskAssessment.status}
                            </Badge>
                        )}
                        <Badge variant={completedSteps.includes(currentStep?.id || '') ? "default" : "outline"}>
                            {completedSteps.includes(currentStep?.id || '') ? 'Completed' : 'Pending'}
                        </Badge>
                    </div>
                </div>

                {/* Floating Session Timer */}
                <div className="fixed top-20 right-4 z-50 bg-background/80 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg flex items-center gap-2 font-mono text-lg font-bold animate-in fade-in slide-in-from-top-4">
                    <Clock className="h-5 w-5 text-primary" />
                    {formatTime(sessionTimer)}
                </div>

                {/* Progress Bar */}
                <Progress value={progress} className="h-2 rounded-none" />

                {/* Main Content Area - Large Touch Targets */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {currentStep && (
                        <div className="flex flex-col gap-6 h-full">
                            {/* Instruction Card */}
                            <Card className={cn(
                                "flex-1 border-2 transition-colors",
                                completedSteps.includes(currentStep.id) ? "border-green-500/50 bg-green-50/10" : "border-primary/20"
                            )}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                            {currentStep.order}
                                        </div>
                                        Instruction
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <p className="text-xl leading-relaxed font-medium">
                                        {currentStep.instruction}
                                    </p>

                                    {/* Metadata Chips */}
                                    <div className="flex flex-wrap gap-3">
                                        {currentStep.expectedDuration && (
                                            <Badge variant="secondary" className="px-3 py-1 text-sm flex gap-2">
                                                <Clock className="h-4 w-4" />
                                                {currentStep.expectedDuration} mins
                                            </Badge>
                                        )}
                                        {currentStep.safetyNotes && (
                                            <Badge variant="destructive" className="px-3 py-1 text-sm flex gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                Safety Alert
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Safety Notes Expanded */}
                                    {currentStep.safetyNotes && (
                                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex gap-3 items-start">
                                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                            <p className="text-sm font-medium">{currentStep.safetyNotes}</p>
                                        </div>
                                    )}

                                    {/* Reagents List */}
                                    {currentStep.requiredReagents && currentStep.requiredReagents.length > 0 && (
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <FlaskConical className="h-4 w-4" />
                                                Required Reagents
                                            </h4>
                                            <ul className="space-y-2">
                                                {currentStep.requiredReagents.map((reagent, idx) => (
                                                    <li key={idx} className="flex justify-between text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                                                        <span>{reagent.name}</span>
                                                        <span className="font-mono text-muted-foreground">{reagent.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Notes / Deviations */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Notes / Deviations</label>
                                        <Textarea
                                            placeholder="Record any observations or deviations here..."
                                            value={stepNotes[currentStep.id] || ''}
                                            onChange={(e) => setStepNotes({ ...stepNotes, [currentStep.id]: e.target.value })}
                                            className="min-h-[100px] text-lg"
                                        />
                                    </div>

                                    {/* Media Uploads */}
                                    <div className="flex gap-4">
                                        <Button variant="outline" size="lg" className="flex-1 h-16" onClick={handlePhotoUpload}>
                                            <Camera className="mr-2 h-6 w-6" />
                                            Add Photo
                                        </Button>
                                        <Button variant="outline" size="lg" className="flex-1 h-16" onClick={handleVoiceNote}>
                                            <Mic className="mr-2 h-6 w-6" />
                                            Add Audio
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                {currentStepIndex === activeProtocol.steps.length - 1 && completedSteps.includes(currentStep?.id || '') ? (
                                    <Button
                                        className="flex-1 h-20 text-xl font-bold shadow-lg bg-green-600 hover:bg-green-700"
                                        size="lg"
                                        onClick={finishProtocol}
                                    >
                                        <CheckCircle2 className="mr-2 h-8 w-8" />
                                        Finish Run
                                    </Button>
                                ) : (
                                    <Button
                                        variant={completedSteps.includes(currentStep?.id || '') ? "default" : "secondary"}
                                        size="lg"
                                        className="flex-1 h-20 text-xl font-bold shadow-lg"
                                        onClick={() => currentStep && toggleStepComplete(currentStep.id)}
                                    >
                                        {completedSteps.includes(currentStep?.id || '') ? (
                                            <>
                                                <CheckCircle2 className="mr-2 h-8 w-8" />
                                                Step Complete
                                            </>
                                        ) : (
                                            "Mark Complete"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Navigation Bar */}
                <div className="border-t bg-card p-4 pb-8 safe-area-bottom">
                    <div className="flex gap-4 items-center">
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-20 w-20 rounded-full shrink-0"
                            onClick={handlePrev}
                            disabled={currentStepIndex === 0}
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </Button>

                        <div className="flex-1 text-center">
                            <span className="text-sm font-medium text-muted-foreground">
                                Step {currentStepIndex + 1} / {activeProtocol.steps.length}
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            size="lg"
                            className="h-20 w-20 rounded-full shrink-0"
                            onClick={handleNext}
                            disabled={currentStepIndex === activeProtocol.steps.length - 1}
                        >
                            <ChevronRight className="h-8 w-8" />
                        </Button>
                    </div>
                </div>
                {/* Comments Section */}
                <div className="p-6 bg-muted/30 border-t">
                    <CommentsSection
                        entityType="protocol"
                        entityId={activeProtocol.id}
                        entityTitle={activeProtocol.title}
                        entityOwnerId={activeProtocol.ownerId}
                        teamMembers={[]} // TODO: Pass team members
                    />
                </div>
            </div >
        )
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    Protocol Library
                </CardTitle>
                <Button size="sm" onClick={() => setEditingProtocol({} as Protocol)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Protocol
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="divide-y">
                        {protocols.map(protocol => (
                            <div key={protocol.id} className="p-4 hover:bg-accent/50 transition-colors flex items-center justify-between group">
                                <div className="space-y-1">
                                    <div className="font-medium">{protocol.title}</div>
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                        {protocol.description}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {protocol.tags?.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1 h-5">
                                                {tag}
                                            </Badge>
                                        ))}
                                        <Badge variant="outline" className="text-[10px] px-1 h-5">
                                            {protocol.steps.length} steps
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingProtocol(protocol)}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleCloneProtocol(protocol)}>
                                        <Copy className="h-4 w-4 mr-1" />
                                        Clone
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setHistoryProtocol(protocol)}>
                                        <HistoryIcon className="h-4 w-4 mr-1" />
                                        History
                                    </Button>
                                    <Button onClick={() => startProtocol(protocol)} size="sm" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                            <>
                                                <Play className="h-4 w-4 mr-1" />
                                                Start
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {protocols.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                No protocols found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            <Dialog open={!!historyProtocol} onOpenChange={(open) => !open && setHistoryProtocol(null)}>
                <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
                    <div className="p-6 pb-2">
                        <DialogHeader>
                            <DialogTitle>Protocol History</DialogTitle>
                        </DialogHeader>
                    </div>
                    <div className="flex-1 overflow-hidden p-6 pt-2">
                        {historyProtocol && (
                            <ProtocolHistoryView
                                protocol={historyProtocol}
                                onSelectVersion={(version) => {
                                    // TODO: Implement viewing a specific version
                                    console.log('Selected version:', version)
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCheckingResources} onOpenChange={setIsCheckingResources}>
                <DialogContent className="max-w-xl">
                    <ResourceAvailabilityChecker
                        requiredResources={requiredResources}
                        onProceed={() => pendingProtocolStart && executeStartProtocol(pendingProtocolStart)}
                        onCancel={() => setIsCheckingResources(false)}
                    />
                </DialogContent>
            </Dialog>
        </Card>
    )
}
