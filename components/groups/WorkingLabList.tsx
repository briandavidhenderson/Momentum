import React, { useEffect, useState } from 'react'
import { Plus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ResearchGroup, WorkingLab } from '@/lib/types/researchgroup.types'
import { getWorkingLabs } from '@/lib/services/groupService'
import { WorkingLabCreateDialog } from './WorkingLabCreateDialog'

interface WorkingLabListProps {
    group: ResearchGroup
}

export function WorkingLabList({ group }: WorkingLabListProps) {
    const [labs, setLabs] = useState<WorkingLab[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const filteredLabs = labs.filter(lab =>
        lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lab.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lab.physicalInstitute?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        async function loadLabs() {
            setIsLoading(true)
            const data = await getWorkingLabs(group.id)
            setLabs(data)
            setIsLoading(false)
        }
        loadLabs()
    }, [group.id])

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Physical Locations</h3>
                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lab
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <Input
                    placeholder="Search labs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            {isLoading ? (
                <div>Loading labs...</div>
            ) : filteredLabs.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <MapPin className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-center">
                            {searchTerm ? "No labs found matching your search." : "No physical labs defined for this group yet."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {filteredLabs.map((lab) => (
                        <Card key={lab.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{lab.name}</CardTitle>
                                <CardDescription>
                                    {lab.physicalInstitute && <div className="font-medium text-slate-700">{lab.physicalInstitute}</div>}
                                    <div>
                                        {lab.labNumber && `Lab ${lab.labNumber}`}
                                        {lab.labNumber && (lab.building || lab.roomNumber) && " • "}
                                        {lab.building && `${lab.building}`}
                                        {lab.building && lab.roomNumber && ", "}
                                        {lab.roomNumber && `Room ${lab.roomNumber}`}
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    {lab.description || "No description."}
                                </div>
                                {lab.facilities && lab.facilities.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {lab.facilities.map((facility, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                                                {facility}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <WorkingLabCreateDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                group={group}
                onLabCreated={(newLab) => {
                    setLabs([...labs, newLab])
                    setIsCreateDialogOpen(false)
                }}
            />
        </div>
    )
}
