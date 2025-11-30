"use client"

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, TestTube, Dna, Microscope } from 'lucide-react'
import { Sample, SampleType } from '@/lib/types/sample.types'
import { getSamples } from '@/lib/services/sampleService'
import { useAppContext } from '@/lib/AppContext'
import { format } from 'date-fns'
import { CreateSampleDialog } from './CreateSampleDialog'

interface SampleListViewProps {
    onSelectSample: (sample: Sample) => void
    onCreateSample: () => void
}

export function SampleListView({ onSelectSample, onCreateSample }: SampleListViewProps) {
    const { currentUserProfile } = useAppContext()
    const [samples, setSamples] = useState<Sample[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<SampleType | 'all'>('all')
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    useEffect(() => {
        if (currentUserProfile?.labId) {
            loadSamples()
        }
    }, [currentUserProfile?.labId])

    async function loadSamples() {
        if (!currentUserProfile?.labId) return
        setLoading(true)
        try {
            const data = await getSamples(currentUserProfile.labId)
            setSamples(data)
        } catch (error) {
            console.error('Failed to load samples', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredSamples = samples.filter(sample => {
        const matchesSearch = sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sample.type.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = typeFilter === 'all' || sample.type === typeFilter
        return matchesSearch && matchesType
    })

    const getIconForType = (type: SampleType) => {
        switch (type) {
            case 'cell_line': return <Microscope className="h-4 w-4" />
            case 'dna':
            case 'rna':
            case 'plasmid': return <Dna className="h-4 w-4" />
            default: return <TestTube className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between gap-4 p-1">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search samples..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="cell_line">Cell Line</SelectItem>
                            <SelectItem value="plasmid">Plasmid</SelectItem>
                            <SelectItem value="tissue">Tissue</SelectItem>
                            <SelectItem value="antibody">Antibody</SelectItem>
                            <SelectItem value="chemical">Chemical</SelectItem>
                            <SelectItem value="dna">DNA</SelectItem>
                            <SelectItem value="rna">RNA</SelectItem>
                            <SelectItem value="protein">Protein</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Sample
                </Button>
            </div>

            <CreateSampleDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSampleCreated={loadSamples}
            />

            <div className="border rounded-md flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Loading samples...
                                    </TableCell>
                                </TableRow>
                            ) : filteredSamples.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No samples found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSamples.map((sample) => (
                                    <TableRow
                                        key={sample.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => onSelectSample(sample)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {getIconForType(sample.type)}
                                                {sample.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {sample.type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {sample.storageLocationPath || <span className="text-muted-foreground italic">Unassigned</span>}
                                        </TableCell>
                                        <TableCell>
                                            {sample.quantity} {sample.unit}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {sample.createdAt ? format(sample.createdAt, 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
