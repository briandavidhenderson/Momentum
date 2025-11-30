"use client"

import { useState, useEffect } from 'react'
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
import { StorageLocation, StorageType } from '@/lib/types/sample.types'
import { createStorageLocation, getStorageLocations } from '@/lib/services/sampleService'
import { useAppContext } from '@/lib/AppContext'
import { Loader2 } from 'lucide-react'

interface CreateStorageLocationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onLocationCreated: () => void
}

export function CreateStorageLocationDialog({ open, onOpenChange, onLocationCreated }: CreateStorageLocationDialogProps) {
    const { currentUserProfile } = useAppContext()
    const [loading, setLoading] = useState(false)
    const [existingLocations, setExistingLocations] = useState<StorageLocation[]>([])

    // Form State
    const [name, setName] = useState('')
    const [type, setType] = useState<StorageType>('freezer')
    const [parentId, setParentId] = useState<string>('none')
    const [description, setDescription] = useState('')

    useEffect(() => {
        if (open && currentUserProfile?.labId) {
            loadLocations()
        }
    }, [open, currentUserProfile?.labId])

    async function loadLocations() {
        if (!currentUserProfile?.labId) return
        try {
            const data = await getStorageLocations(currentUserProfile.labId)
            setExistingLocations(data)
        } catch (error) {
            console.error('Failed to load locations', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentUserProfile?.labId) return

        setLoading(true)
        try {
            const parent = existingLocations.find(l => l.id === parentId)
            const path = parent ? `${parent.path || parent.name} / ${name}` : name

            const locationData: Omit<StorageLocation, 'id'> = {
                name,
                type,
                parentId: parentId === 'none' ? undefined : parentId,
                labId: currentUserProfile.labId,
                description,
                path
            }

            await createStorageLocation(locationData)
            onLocationCreated()
            onOpenChange(false)
            resetForm()
        } catch (error) {
            console.error('Failed to create location', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setName('')
        setType('freezer')
        setParentId('none')
        setDescription('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Storage Location</DialogTitle>
                    <DialogDescription>
                        Define a new storage location in your lab hierarchy.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Location Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. -80 Freezer A or Shelf 1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={type} onValueChange={(v) => setType(v as StorageType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="room">Room</SelectItem>
                                    <SelectItem value="freezer">Freezer</SelectItem>
                                    <SelectItem value="fridge">Fridge</SelectItem>
                                    <SelectItem value="shelf">Shelf</SelectItem>
                                    <SelectItem value="rack">Rack</SelectItem>
                                    <SelectItem value="box">Box</SelectItem>
                                    <SelectItem value="cabinet">Cabinet</SelectItem>
                                    <SelectItem value="bench">Bench</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parent">Parent Location</Label>
                            <Select value={parentId} onValueChange={setParentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select parent" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Top Level)</SelectItem>
                                    {existingLocations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name} <span className="text-muted-foreground text-xs">({loc.type})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Located in Room 101"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Location
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
