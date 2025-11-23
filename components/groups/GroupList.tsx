import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Users, MapPin, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppContext } from '@/lib/AppContext'
import { ResearchGroup } from '@/lib/types/researchgroup.types'
import { getResearchGroups, requestJoinGroup, getMembershipStatus } from '@/lib/services/groupService'
import { GroupCreateDialog } from './GroupCreateDialog'
import { GroupDetail } from './GroupDetail'

export function GroupList() {
    const { currentUserProfile } = useAppContext()
    const [groups, setGroups] = useState<ResearchGroup[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null)
    const [selectedGroup, setSelectedGroup] = useState<ResearchGroup | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const loadGroups = useCallback(async () => {
        if (!currentUserProfile?.labId) {
            setGroups([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        const data = await getResearchGroups(currentUserProfile.labId)
        setGroups(data)
        setIsLoading(false)
    }, [currentUserProfile?.labId])

    useEffect(() => {
        loadGroups()
    }, [loadGroups])

    const handleJoin = async (groupId: string) => {
        if (!currentUserProfile) return
        setJoiningGroupId(groupId)
        try {
            await requestJoinGroup(groupId, currentUserProfile.id)
            await loadGroups()
        } catch (error) {
            console.error('Failed to join group', error)
        } finally {
            setJoiningGroupId(null)
        }
    }

    if (selectedGroup) {
        return (
            <GroupDetail
                group={selectedGroup}
                onBack={() => setSelectedGroup(null)}
                onGroupUpdated={(updatedGroup) => {
                    setSelectedGroup(updatedGroup)
                    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
                }}
            />
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Research Groups</h2>
                    <p className="text-muted-foreground">
                        Manage research communities and their physical labs.
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Group
                </Button>
            </div>

            {isLoading ? (
                <div>Loading groups...</div>
            ) : groups.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <Users className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Research Groups</h3>
                        <p className="text-muted-foreground mb-4 text-center max-w-sm">
                            Create a research group to organize your team and manage physical lab spaces.
                        </p>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                            Create First Group
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => {
                        const membership = currentUserProfile
                            ? getMembershipStatus(group, currentUserProfile.id)
                            : { isAdmin: false, isMember: false, isPending: false }
                        return (
                            <Card
                                key={group.id}
                                className="cursor-pointer hover:border-brand-500 transition-colors"
                                onClick={() => setSelectedGroup(group)}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-start">
                                        <span className="flex items-center gap-2">
                                            {group.name}
                                            {membership.isAdmin && (
                                                <Badge variant="secondary" className="text-[11px]">Admin</Badge>
                                            )}
                                            {!membership.isAdmin && membership.isMember && (
                                                <Badge variant="outline" className="text-[11px]">Member</Badge>
                                            )}
                                            {membership.isPending && (
                                                <Badge variant="outline" className="text-[11px]">Pending</Badge>
                                            )}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {group.description || "No description provided."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                <span>{group.memberCount || 0} Members</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                <span>{group.workingLabIds?.length || 0} Labs</span>
                                            </div>
                                        </div>
                                        {currentUserProfile && !membership.isMember && !membership.isPending && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleJoin(group.id)
                                                }}
                                                disabled={joiningGroupId === group.id}
                                            >
                                                {joiningGroupId === group.id ? 'Joining...' : 'Join'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <GroupCreateDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onGroupCreated={(newGroup: ResearchGroup) => {
                    setGroups([...groups, newGroup])
                    setIsCreateDialogOpen(false)
                }}
            />
        </div>
    )
}
