import { Button } from '@/components/ui/button'
import { ResearchGroupMembershipStatus } from '@/lib/types/researchgroup.types'

interface JoinGroupButtonProps {
    membership: ResearchGroupMembershipStatus
    onJoin: () => Promise<void>
    onLeave: () => Promise<void>
    loading?: boolean
}

export function JoinGroupButton({ membership, onJoin, onLeave, loading }: JoinGroupButtonProps) {
    if (membership.isMember) {
        return (
            <Button variant="outline" size="sm" onClick={onLeave} disabled={loading}>
                {loading ? 'Leaving...' : 'Leave group'}
            </Button>
        )
    }

    if (membership.isPending) {
        return (
            <Button variant="secondary" size="sm" disabled>
                Request pending
            </Button>
        )
    }

    return (
        <Button size="sm" onClick={onJoin} disabled={loading}>
            {loading ? 'Joining...' : 'Join group'}
        </Button>
    )
}
