"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Sample, SampleType, StorageLocation } from '@/lib/types/sample.types'
import { createSample, getSamples, getStorageLocations } from '@/lib/services/sampleService'
import { useAppContext } from '@/lib/AppContext'
import { Loader2 } from 'lucide-react'

interface CreateSampleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSampleCreated: () => void
}

export function CreateSampleDialog({ open, onOpenChange, onSampleCreated }: CreateSampleDialogProps) {
    const { currentUserProfile } = useAppContext()
    const [loading, setLoading] = useState(false)
    const [locations, setLocations] = useState<StorageLocation[]>([])
    const [parentSamples, setParentSamples] = useState<Sample[]>([])

    // Form State
    const [name, setName] = useState('')
    const [type, setType] = useState<SampleType>('cell_line')
    const [quantity, setQuantity] = useState('')
    const [unit, setUnit] = useState('vials')
    const [concentration, setConcentration] = useState('')
    const [storageLocationId, setStorageLocationId] = useState<string>('')
    const [parentId, setParentId] = useState<string>('none')
    const [description, setDescription] = useState('')

    const loadDependencies = useCallback(async () => {
        if (!currentUserProfile?.labId) return
        try {
            const [locs, samples] = await Promise.all([
                getStorageLocations(currentUserProfile.labId),
                getSamples(currentUserProfile.labId)
            ])
            setLocations(locs)
            setParentSamples(samples)
        } catch (error) {
            console.error('Failed to load dependencies', error)
        }
    }, [currentUserProfile?.labId])

    useEffect(() => {
        if (open && currentUserProfile?.labId) {
            loadDependencies()
        }
    }, [open, currentUserProfile?.labId, loadDependencies])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentUserProfile?.labId || !currentUserProfile?.id) return

        setLoading(true)
        try {
            const selectedLocation = locations.find(l => l.id === storageLocationId)
            const selectedParent = parentSamples.find(s => s.id === parentId)

            const sampleData: Omit<Sample, 'id' | 'createdAt' | 'updatedAt'> = {
                name,
                type,
                quantity: parseFloat(quantity) || 0,
                unit,
                concentration,
                storageLocationId: storageLocationId || undefined,
                storageLocationPath: selectedLocation?.path || selectedLocation?.name,
                parentId: parentId === 'none' ? undefined : parentId,
                parentName: selectedParent?.name,
                meta: description ? { description } : {},
                ownerId: currentUserProfile.id,
                labId: currentUserProfile.labId,
                visibility: 'lab',
            }

            await createSample(sampleData)
            onSampleCreated()
            onOpenChange(false)
            resetForm()
        } catch (error) {
            console.error('Failed to create sample', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setName('')
        setType('cell_line')
        setQuantity('')
        setUnit('vials')
        setConcentration('')
        setStorageLocationId('')
        setParentId('none')
        setDescription('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create New Sample</DialogTitle>
                    <DialogDescription>
                        Add a new biological sample to your inventory.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Sample Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. HEK293-WT"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={type} onValueChange={(v) => setType(v as SampleType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
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
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vials">Vials</SelectItem>
                                    <SelectItem value="ml">mL</SelectItem>
                                    <SelectItem value="ul">µL</SelectItem>
                                    <SelectItem value="mg">mg</SelectItem>
                                    <SelectItem value="ug">µg</SelectItem>
                                    <SelectItem value="g">g</SelectItem>
                                    <SelectItem value="tubes">Tubes</SelectItem>
                                    <SelectItem value="plates">Plates</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="concentration">Concentration (Optional)</Label>
                            <Input
                                id="concentration"
                                value={concentration}
                                onChange={(e) => setConcentration(e.target.value)}
                                placeholder="e.g. 1 mg/ml"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Storage Location</Label>
                            <Select value={storageLocationId} onValueChange={setStorageLocationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name} <span className="text-muted-foreground text-xs">({loc.type})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parent">Parent Sample (Genealogy)</Label>
                            <Select value={parentId} onValueChange={setParentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select parent (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Root Sample)</SelectItem>
                                    {parentSamples.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description / Notes</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Additional details..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Sample
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
