import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { ArrowLeft, MapPin, Users, Settings, Building2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { ResearchGroup } from '@/lib/types/researchgroup.types'
import { WorkingLabList } from './WorkingLabList'
import { useAppContext } from '@/lib/AppContext'
import { GroupMembershipPanel } from './GroupMembershipPanel'
import { JoinGroupButton } from './JoinGroupButton'
import { approveJoinRequest, getMembershipStatus, getResearchGroup, leaveGroup, rejectJoinRequest, removeMember, requestJoinGroup } from '@/lib/services/groupService'

interface GroupDetailProps {
    group: ResearchGroup
    onBack: () => void
    onGroupUpdated?: (group: ResearchGroup) => void
}

export function GroupDetail({ group, onBack, onGroupUpdated }: GroupDetailProps) {
    const { allProfiles, currentUserProfile } = useAppContext()
    const [activeGroup, setActiveGroup] = useState<ResearchGroup>(group)
    const [actionTarget, setActionTarget] = useState<string | null>(null)

    useEffect(() => {
        setActiveGroup(group)
    }, [group])

    const refreshGroup = useCallback(async () => {
        const latest = await getResearchGroup(activeGroup.id)
        if (latest) {
            setActiveGroup(latest)
            onGroupUpdated?.(latest)
        }
    }, [activeGroup.id, onGroupUpdated])

    const membership = useMemo(() => currentUserProfile
        ? getMembershipStatus(activeGroup, currentUserProfile.id)
        : { isAdmin: false, isMember: false, isPending: false },
        [activeGroup, currentUserProfile]
    )

    const handleJoin = async () => {
        if (!currentUserProfile) return
        setActionTarget('join')
        try {
            await requestJoinGroup(activeGroup.id, currentUserProfile.id)
            await refreshGroup()
        } finally {
            setActionTarget(null)
        }
    }

    const handleLeave = async () => {
        if (!currentUserProfile) return
        setActionTarget('leave')
        try {
            await leaveGroup(activeGroup.id, currentUserProfile.id)
            await refreshGroup()
        } finally {
            setActionTarget(null)
        }
    }

    const handleApprove = async (userId: string) => {
        if (!currentUserProfile) return
        setActionTarget(userId)
        try {
            await approveJoinRequest(activeGroup.id, userId, currentUserProfile.id)
            await refreshGroup()
        } finally {
            setActionTarget(null)
        }
    }

    const handleReject = async (userId: string) => {
        if (!currentUserProfile) return
        setActionTarget(userId)
        try {
            await rejectJoinRequest(activeGroup.id, userId, currentUserProfile.id)
            await refreshGroup()
        } finally {
            setActionTarget(null)
        }
    }

    const handleRemove = async (userId: string) => {
        if (!currentUserProfile) return
        setActionTarget(userId)
        try {
            await removeMember(activeGroup.id, userId, currentUserProfile.id)
            await refreshGroup()
        } finally {
            setActionTarget(null)
        }
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{activeGroup.name}</h2>
                        <p className="text-muted-foreground">{activeGroup.departmentName}</p>
                    </div>
                </div>
                <JoinGroupButton
                    membership={membership}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    loading={actionTarget === 'join' || actionTarget === 'leave'}
                />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Users className="h-5 w-5 text-brand-500" />
                        <div>
                            <div className="text-sm text-muted-foreground">Members</div>
                            <div className="text-xl font-semibold">{activeGroup.memberCount || activeGroup.memberIds.length}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-brand-500" />
                        <div>
                            <div className="text-sm text-muted-foreground">Labs</div>
                            <div className="text-xl font-semibold">{activeGroup.workingLabIds?.length || 0}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-brand-500" />
                        <div>
                            <div className="text-sm text-muted-foreground">Visibility</div>
                            <div className="text-xl font-semibold">{activeGroup.isPublic ? 'Organisation' : 'Private'}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Content */}
            <Tabs defaultValue="labs" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="labs" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Physical Labs
                    </TabsTrigger>
                    <TabsTrigger value="members" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Members
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="labs">
                    <WorkingLabList group={activeGroup} />
                </TabsContent>

                <TabsContent value="members">
                    <GroupMembershipPanel
                        group={activeGroup}
                        people={allProfiles}
                        currentUserId={currentUserProfile?.id}
                        isAdmin={membership.isAdmin}
                        loadingId={actionTarget}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRemove={handleRemove}
                    />
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4" />
                                <span>Self-join is {activeGroup.allowSelfJoin ? 'enabled' : 'disabled'} for this group.</span>
                            </div>
                            {activeGroup.website && (
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4" />
                                    <a href={activeGroup.website} className="text-brand-500 underline" target="_blank" rel="noreferrer">
                                        {activeGroup.website}
                                    </a>
                                </div>
                            )}
                            {activeGroup.contactEmail && (
                                <div>Contact: {activeGroup.contactEmail}</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
