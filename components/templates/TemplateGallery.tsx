"use client"

import { useState, useEffect } from 'react'
import { getLabTemplates, getLabExperimentTemplates, instantiateExperiment } from '@/lib/services/templateService'
import { ProtocolTemplate } from '@/lib/services/templateService'
import { ELNExperiment } from '@/lib/types/eln.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Copy, FileText, FlaskConical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppContext } from "@/lib/AppContext"

export function TemplateGallery() {
    const { currentUserProfile, projects } = useAppContext()
    const { toast } = useToast()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [protocolTemplates, setProtocolTemplates] = useState<ProtocolTemplate[]>([])
    const [experimentTemplates, setExperimentTemplates] = useState<ELNExperiment[]>([])
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Project Selection State
    const [showProjectDialog, setShowProjectDialog] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<ELNExperiment | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string>("")

    useEffect(() => {
        if (!currentUserProfile?.labId) return

        const fetchTemplates = async () => {
            try {
                const [protocols, experiments] = await Promise.all([
                    getLabTemplates(currentUserProfile.labId),
                    getLabExperimentTemplates(currentUserProfile.labId)
                ])
                setProtocolTemplates(protocols)
                setExperimentTemplates(experiments)
            } catch (error) {
                console.error("Failed to fetch templates", error)
            } finally {
                setLoading(false)
            }
        }

        fetchTemplates()
    }, [currentUserProfile?.labId])

    const handleUseProtocol = async (template: ProtocolTemplate) => {
        if (!currentUserProfile?.id) return
        setProcessingId(template.id)
        try {
            const { cloneTemplateToProtocol } = await import('@/lib/services/templateService')
            const protocolId = await cloneTemplateToProtocol(template.id, currentUserProfile.id)

            toast({
                title: "Protocol Created",
                description: "New protocol created from template."
            })
            router.push(`/protocols/${protocolId}`)
        } catch (error) {
            console.error("Failed to instantiate protocol", error)
            toast({
                title: "Error",
                description: "Failed to create protocol.",
                variant: "destructive"
            })
        } finally {
            setProcessingId(null)
        }
    }

    const handleInitiateExperiment = (template: ELNExperiment) => {
        setSelectedTemplate(template)
        setShowProjectDialog(true)
        // Pre-select first active project if available
        const activeProjects = projects.filter(p => p.status === 'active')
        if (activeProjects.length > 0) {
            setSelectedProjectId(activeProjects[0].id)
        }
    }

    const handleConfirmExperiment = async () => {
        if (!currentUserProfile?.id || !selectedTemplate || !selectedProjectId) return

        setProcessingId(selectedTemplate.id)
        setShowProjectDialog(false)

        try {
            const newExperiment = await instantiateExperiment(
                selectedTemplate.id,
                currentUserProfile.id,
                selectedProjectId
            )

            toast({
                title: "Experiment Created",
                description: "New experiment created from template."
            })

            // Redirect to ELN view with the new experiment
            // Note: ELN view might need to handle 'experimentId' param or we just go to ELN list
            // Ideally we open the experiment. 
            // Assuming /eln?experimentId=... or similar. 
            // Current ELN routing seems to be hash based or internal state.
            // Let's check how ELN is accessed. 
            // Usually it's a main view. 
            // For now, let's just go to ELN and maybe show a toast.
            // Or if there is a route /eln/[id], use that.
            // Based on file structure, there is no /eln/[id] page, it's a view.
            // So we just go to ELN view.
            // But we can try to set the active experiment via URL or context if supported.
            // For now, just navigate to ELN.

            // Actually, looking at page.tsx, ELN is a view.
            // Maybe we can pass query param?
            router.push('/?view=eln')

        } catch (error) {
            console.error("Failed to instantiate experiment", error)
            toast({
                title: "Error",
                description: "Failed to create experiment.",
                variant: "destructive"
            })
        } finally {
            setProcessingId(null)
            setSelectedTemplate(null)
            setSelectedProjectId("")
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Template Library</h2>
            </div>

            <Tabs defaultValue="protocols">
                <TabsList>
                    <TabsTrigger value="protocols">Protocols</TabsTrigger>
                    <TabsTrigger value="experiments">Experiments</TabsTrigger>
                </TabsList>

                <TabsContent value="protocols" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {protocolTemplates.map(template => (
                            <Card key={template.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{template.title}</CardTitle>
                                        <Badge variant="secondary">{template.type}</Badge>
                                    </div>
                                    <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        onClick={() => handleUseProtocol(template)}
                                        disabled={!!processingId}
                                    >
                                        {processingId === template.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                                        Use Template
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                        {protocolTemplates.length === 0 && <div className="col-span-full text-center text-muted-foreground p-8">No protocol templates found.</div>}
                    </div>
                </TabsContent>

                <TabsContent value="experiments" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {experimentTemplates.map(template => (
                            <Card key={template.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{template.title}</CardTitle>
                                        <Badge variant="outline">Experiment</Badge>
                                    </div>
                                    <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        onClick={() => handleInitiateExperiment(template)}
                                        disabled={!!processingId}
                                    >
                                        {processingId === template.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                                        Use Template
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                        {experimentTemplates.length === 0 && <div className="col-span-full text-center text-muted-foreground p-8">No experiment templates found.</div>}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Project</DialogTitle>
                        <DialogDescription>
                            Choose a project to associate with this new experiment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="project">Project</Label>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.filter(p => p.status === 'active').map(project => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProjectDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirmExperiment} disabled={!selectedProjectId}>Create Experiment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
