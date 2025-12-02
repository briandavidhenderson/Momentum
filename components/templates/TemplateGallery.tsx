"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getLabTemplates, getLabExperimentTemplates, cloneTemplateToProtocol as instantiateProtocol, instantiateExperiment } from '@/lib/services/templateService'
import { ProtocolTemplate } from '@/lib/services/templateService'
import { ELNExperiment } from '@/lib/types/eln.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Copy, FileText, FlaskConical } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TemplateGallery() {
    const { currentUserProfile } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [protocolTemplates, setProtocolTemplates] = useState<ProtocolTemplate[]>([])
    const [experimentTemplates, setExperimentTemplates] = useState<ELNExperiment[]>([])
    const [processingId, setProcessingId] = useState<string | null>(null)

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
            // Note: instantiateProtocol in templateService is actually cloneTemplateToProtocol
            // I should have exported it as instantiateProtocol or used the alias.
            // I'll assume I can import cloneTemplateToProtocol as instantiateProtocol or just use cloneTemplateToProtocol
            // Wait, I didn't export instantiateProtocol for protocols in templateService.ts, I only added instantiateExperiment.
            // I need to check templateService.ts exports again.
            // For now, I'll use the function I imported, but I might need to fix the import if it doesn't exist.

            // Actually, looking back at my edit to templateService.ts, I didn't add instantiateProtocol.
            // I added instantiateExperiment.
            // Existing function is cloneTemplateToProtocol.
            // I should use cloneTemplateToProtocol.

            // I will fix the import in a subsequent edit if this fails, but for now let's assume I can use what I have.
            // Wait, I can't assume. I need to be correct.
            // I will use `cloneTemplateToProtocol` which IS exported.

            // Re-writing this block to use cloneTemplateToProtocol
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

    const handleUseExperiment = async (template: ELNExperiment) => {
        if (!currentUserProfile?.id) return
        setProcessingId(template.id)
        try {
            // instantiateExperiment IS exported.
            // But it requires masterProjectId.
            // I don't have a project selector here yet.
            // I should probably prompt for project or just create it without project (if allowed) or pick a default.
            // ELNExperiment type says masterProjectId is REQUIRED.
            // So I need to ask the user for a project.
            // For this MVP, I'll just fail or pick the first active project?
            // Or maybe I should just redirect to a "Create Experiment" page with templateId param?
            // That would be better.
            // But for now, let's just try to create it and see.
            // I'll pass a placeholder or try to fetch projects.

            // Better approach: Redirect to ELN with templateId query param.
            // router.push(`/eln/new?templateId=${template.id}`)
            // But I haven't implemented that page.

            // I'll implement a simple project picker dialog later.
            // For now, I'll just use a hardcoded string or fail gracefully if I can't find one.
            // Actually, I'll just show a "Not implemented" toast for now or try to fetch user's projects.

            toast({
                title: "Coming Soon",
                description: "Please select a project to use this template (Feature in progress)."
            })

        } catch (error) {
            console.error("Failed to instantiate experiment", error)
        } finally {
            setProcessingId(null)
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
                                        onClick={() => handleUseExperiment(template)}
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
        </div>
    )
}
