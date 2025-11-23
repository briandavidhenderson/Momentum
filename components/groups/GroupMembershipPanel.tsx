import { useMemo } from 'react'
import { Users, ShieldCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ResearchGroup } from '@/lib/types/researchgroup.types'
import type { PersonProfile } from '@/lib/types'

interface GroupMembershipPanelProps {
    group: ResearchGroup
    people: PersonProfile[]
    currentUserId?: string
    isAdmin: boolean
    loadingId?: string | null
    onApprove: (userId: string) => Promise<void>
    onReject: (userId: string) => Promise<void>
    onRemove: (userId: string) => Promise<void>
}

const getDisplayName = (person?: PersonProfile, fallback?: string) => {
    if (!person) return fallback || 'Unknown member'
    return `${person.firstName} ${person.lastName}`.trim() || fallback || 'Unknown member'
}

export function GroupMembershipPanel({
    group,
    people,
    currentUserId,
    isAdmin,
    loadingId,
    onApprove,
    onReject,
    onRemove,
}: GroupMembershipPanelProps) {
    const adminProfiles = useMemo(
        () => group.adminIds.map(id => people.find(p => p.id === id) || ({ id } as PersonProfile)),
        [group.adminIds, people]
    )
    const memberProfiles = useMemo(
        () => group.memberIds
            .filter(id => !group.adminIds.includes(id))
            .map(id => people.find(p => p.id === id) || ({ id } as PersonProfile)),
        [group.memberIds, group.adminIds, people]
    )
    const pendingProfiles = useMemo(
        () => group.pendingMemberIds.map(id => people.find(p => p.id === id) || ({ id } as PersonProfile)),
        [group.pendingMemberIds, people]
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="font-semibold">Admins</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
                {adminProfiles.length === 0 && (
                    <div className="text-sm text-muted-foreground">No admins assigned yet.</div>
                )}
                {adminProfiles.map((person) => (
                    <div key={person.id} className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                        <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                                {getDisplayName(person, person.id)}
                                {person.id === currentUserId && (
                                    <Badge variant="secondary" className="text-[11px]">You</Badge>
                                )}
                            </div>
                            {person.positionDisplayName && (
                                <div className="text-xs text-muted-foreground">{person.positionDisplayName}</div>
                            )}
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1 text-[11px]">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                        </Badge>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 pt-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="font-semibold">Members</div>
                <Badge variant="secondary">{memberProfiles.length}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
                {memberProfiles.length === 0 && (
                    <div className="text-sm text-muted-foreground">No members yet.</div>
                )}
                {memberProfiles.map((person) => (
                    <div key={person.id} className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                        <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                                {getDisplayName(person, person.id)}
                                {person.id === currentUserId && (
                                    <Badge variant="secondary" className="text-[11px]">You</Badge>
                                )}
                            </div>
                            {person.positionDisplayName && (
                                <div className="text-xs text-muted-foreground">{person.positionDisplayName}</div>
                            )}
                        </div>
                        {isAdmin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRemove(person.id)}
                                disabled={loadingId === person.id}
                            >
                                {loadingId === person.id ? 'Removing...' : 'Remove'}
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 pt-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="font-semibold">Pending requests</div>
                <Badge variant="secondary">{pendingProfiles.length}</Badge>
            </div>
            {pendingProfiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No pending join requests.</div>
            ) : (
                <div className="space-y-2">
                    {pendingProfiles.map((person) => (
                        <div key={person.id} className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                            <div className="space-y-1">
                                <div className="font-medium flex items-center gap-2">
                                    {getDisplayName(person, person.id)}
                                    {person.id === currentUserId && (
                                        <Badge variant="secondary" className="text-[11px]">You</Badge>
                                    )}
                                </div>
                                {person.positionDisplayName && (
                                    <div className="text-xs text-muted-foreground">{person.positionDisplayName}</div>
                                )}
                            </div>
                            {isAdmin ? (
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onReject(person.id)}
                                        disabled={loadingId === person.id}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => onApprove(person.id)}
                                        disabled={loadingId === person.id}
                                    >
                                        {loadingId === person.id ? 'Approving...' : 'Approve'}
                                    </Button>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-[11px]">Awaiting admin review</Badge>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
