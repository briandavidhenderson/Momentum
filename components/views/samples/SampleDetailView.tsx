"use client"

import { useState, useEffect } from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, GitBranch, MapPin, Calendar, Database } from 'lucide-react'
import { Sample } from '@/lib/types/sample.types'
import { getSampleGenealogy, GenealogyNode } from '@/lib/services/sampleService'
import { format } from 'date-fns'

interface SampleDetailViewProps {
    sample: Sample
    onBack: () => void
    onSelectSample: (sample: Sample) => void
}

export function SampleDetailView({ sample, onBack, onSelectSample }: SampleDetailViewProps) {
    const [genealogy, setGenealogy] = useState<GenealogyNode | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadGenealogy()
    }, [sample.id])

    async function loadGenealogy() {
        setLoading(true)
        try {
            const data = await getSampleGenealogy(sample.id)
            setGenealogy(data)
        } catch (error) {
            console.error('Failed to load genealogy', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 shrink-0">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {sample.name}
                        <Badge variant="secondary" className="text-sm capitalize">
                            {sample.type.replace('_', ' ')}
                        </Badge>
                    </h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {sample.storageLocationPath || 'Unassigned Location'}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sample Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                                    <div className="text-lg font-medium">{sample.quantity} {sample.unit}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Concentration</label>
                                    <div className="text-lg font-medium">{sample.concentration || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        {sample.createdAt ? format(sample.createdAt, 'PPP') : '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Expiry</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        {sample.expiryDate ? format(sample.expiryDate, 'PPP') : 'No Expiry'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitBranch className="h-5 w-5" />
                                    Genealogy
                                </CardTitle>
                                <CardDescription>
                                    Parent and child relationships for this sample.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-4 text-muted-foreground">Loading genealogy...</div>
                                ) : genealogy ? (
                                    <div className="space-y-4">
                                        {/* Parent */}
                                        {sample.parentId ? (
                                            <div className="p-3 border rounded-md bg-muted/30">
                                                <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Parent</div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{sample.parentName || 'Unknown Parent'}</span>
                                                    {/* In a real app, we'd fetch the parent object to link to it */}
                                                    <Badge variant="outline">Parent</Badge>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground italic">No parent sample (Root)</div>
                                        )}

                                        <div className="flex justify-center">
                                            <div className="h-8 w-0.5 bg-border"></div>
                                        </div>

                                        {/* Current Node */}
                                        <div className="p-4 border-2 border-primary rounded-md bg-primary/5 shadow-sm text-center">
                                            <div className="font-bold text-lg">{sample.name}</div>
                                            <div className="text-xs text-muted-foreground">Current Sample</div>
                                        </div>

                                        <div className="flex justify-center">
                                            <div className="h-8 w-0.5 bg-border"></div>
                                        </div>

                                        {/* Children */}
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider text-center">Derived Children</div>
                                            {genealogy.children.length > 0 ? (
                                                <div className="grid gap-2">
                                                    {genealogy.children.map((childNode) => (
                                                        <div
                                                            key={childNode.sample.id}
                                                            className="p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors flex items-center justify-between"
                                                            onClick={() => onSelectSample(childNode.sample)}
                                                        >
                                                            <div className="font-medium">{childNode.sample.name}</div>
                                                            <Badge variant="secondary" className="text-xs">{childNode.sample.type}</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-sm text-muted-foreground italic p-2 border border-dashed rounded-md">
                                                    No derived samples
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-destructive">Failed to load genealogy</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar / Metadata */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Metadata</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {sample.meta && Object.keys(sample.meta).length > 0 ? (
                                    Object.entries(sample.meta).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="text-xs font-medium text-muted-foreground uppercase">{key}</label>
                                            <div className="text-sm font-medium">{String(value)}</div>
                                            <Separator className="my-2" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground italic">No additional metadata</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
