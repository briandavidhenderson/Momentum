import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppContext } from '@/lib/AppContext'
import { createWorkingLab, getWorkingLabs } from '@/lib/services/researchGroupService'
import { ResearchGroup, WorkingLab } from '@/lib/types/researchgroup.types'

interface WorkingLabCreateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group: ResearchGroup
    onLabCreated: (lab: WorkingLab) => void
}

export function WorkingLabCreateDialog({ open, onOpenChange, group, onLabCreated }: WorkingLabCreateDialogProps) {
    const { currentUserProfile } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        building: '',
        roomNumber: '',
        floor: '',
        physicalInstitute: '',
        labNumber: ''
    })

    const [existingLabs, setExistingLabs] = useState<WorkingLab[]>([])

    useEffect(() => {
        if (group?.departmentId) {
            getWorkingLabs({ departmentId: group.departmentId }).then(labs => {
                if (labs) setExistingLabs(labs)
            })
        }
    }, [group?.departmentId])

    const uniquePhysicalInstitutes = React.useMemo(() => {
        const institutes = new Set<string>()
        existingLabs.forEach(l => {
            if (l.physicalInstitute) institutes.add(l.physicalInstitute)
        })
        return Array.from(institutes).sort()
    }, [existingLabs])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentUserProfile) return

        setIsLoading(true)
        try {
            const newLabData: Omit<WorkingLab, 'id' | 'createdAt'> = {
                name: formData.name,
                description: formData.description,
                building: formData.building,
                roomNumber: formData.roomNumber,
                floor: formData.floor,
                physicalInstitute: formData.physicalInstitute,
                labNumber: formData.labNumber,

                // Hierarchy
                researchGroupId: group.id,
                researchGroupName: group.name,
                departmentId: group.departmentId,
                departmentName: group.departmentName,

                // Management
                labManagerIds: [currentUserProfile.id],

                // Initial State
                memberIds: [currentUserProfile.id],
                memberCount: 1,
                isActive: true,
                createdBy: currentUserProfile.id
            }

            const id = await createWorkingLab(newLabData)

            onLabCreated({
                id,
                ...newLabData,
                createdAt: new Date().toISOString()
            } as WorkingLab)

            // Reset form
            setFormData({ name: '', description: '', building: '', roomNumber: '', floor: '', physicalInstitute: '', labNumber: '' })
        } catch (error) {
            console.error('Failed to create working lab:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Physical Lab</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Lab Name</Label>
                        <Input
                            id="name"
                            required
                            placeholder="e.g. Main Wet Lab"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the lab's purpose or equipment..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="physicalInstitute">Physical Institute</Label>
                        <Input
                            id="physicalInstitute"
                            list="dialog-physical-institutes"
                            placeholder="e.g. Trinity Translational Medicine Institute"
                            value={formData.physicalInstitute}
                            onChange={(e) => setFormData({ ...formData, physicalInstitute: e.target.value })}
                        />
                        <datalist id="dialog-physical-institutes">
                            {uniquePhysicalInstitutes.map((inst) => (
                                <option key={inst} value={inst} />
                            ))}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="labNumber">Lab Number</Label>
                            <Input
                                id="labNumber"
                                placeholder="e.g. 2.20"
                                value={formData.labNumber}
                                onChange={(e) => setFormData({ ...formData, labNumber: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="room">Room No. (Optional)</Label>
                            <Input
                                id="room"
                                placeholder="2.04"
                                value={formData.roomNumber}
                                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="building">Building (Optional)</Label>
                            <Input
                                id="building"
                                placeholder="Science Block A"
                                value={formData.building}
                                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="floor">Floor (Optional)</Label>
                            <Input
                                id="floor"
                                placeholder="2"
                                value={formData.floor}
                                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Add Lab' : 'Add Lab'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
