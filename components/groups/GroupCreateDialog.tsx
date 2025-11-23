import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppContext } from '@/lib/AppContext'
import { createResearchGroup, CreateResearchGroupInput } from '@/lib/services/groupService'
import { ResearchGroup } from '@/lib/types/researchgroup.types'

interface GroupCreateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onGroupCreated: (group: ResearchGroup) => void
}

export function GroupCreateDialog({ open, onOpenChange, onGroupCreated }: GroupCreateDialogProps) {
    const { currentUserProfile } = useAppContext()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        website: '',
        contactEmail: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentUserProfile) return

        setIsLoading(true)
        try {
            const newGroupData: CreateResearchGroupInput = {
                name: formData.name.trim(),
                description: formData.description,
                website: formData.website,
                contactEmail: formData.contactEmail || currentUserProfile.email,

                // Hierarchy
                departmentId: currentUserProfile.labId,
                departmentName: currentUserProfile.labName,
                schoolFacultyId: currentUserProfile.instituteId,
                schoolFacultyName: currentUserProfile.instituteName,
                organisationId: currentUserProfile.organisationId,
                organisationName: currentUserProfile.organisationName,

                // Leadership (Creator is initial PI/Coordinator)
                principalInvestigators: currentUserProfile.isPrincipalInvestigator ? [currentUserProfile.id] : [],
                coordinatorIds: [currentUserProfile.id],

                // Initial State
                workingLabIds: [],
                createdBy: currentUserProfile.id,
                allowSelfJoin: true,
                isPublic: true,
            }

            const group = await createResearchGroup(newGroupData)

            onGroupCreated(group as ResearchGroup)

            // Reset form
            setFormData({ name: '', description: '', website: '', contactEmail: '' })
        } catch (error) {
            console.error('Failed to create group:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Research Group</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Group Name</Label>
                        <Input
                            id="name"
                            required
                            placeholder="e.g. Advanced Materials Group"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Briefly describe the group's research focus..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website (Optional)</Label>
                            <Input
                                id="website"
                                placeholder="https://..."
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Contact Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="group@example.com"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Group'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
