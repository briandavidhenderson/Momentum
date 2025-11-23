import React, { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useGroupContext } from '@/lib/GroupContext'
import { useAppContext } from '@/lib/AppContext'
import { getResearchGroups } from '@/lib/services/groupService'
import { ResearchGroup } from '@/lib/types/researchgroup.types'

export function GroupSelector() {
    const { selectedGroupId, setSelectedGroupId } = useGroupContext()
    const { currentUserProfile } = useAppContext()
    const [groups, setGroups] = useState<ResearchGroup[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        async function loadGroups() {
            if (currentUserProfile?.labId) {
                setLoading(true)
                const data = await getResearchGroups(currentUserProfile.labId)
                setGroups(data)
                setLoading(false)
            }
        }
        loadGroups()
    }, [currentUserProfile?.labId])

    return (
        <Select
            value={selectedGroupId || "all"}
            onValueChange={(value) => setSelectedGroupId(value === "all" ? null : value)}
        >
            <SelectTrigger className="w-[200px] h-9 text-xs">
                <div className="flex items-center gap-2 truncate">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <SelectValue placeholder="Filter by Group..." />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Research Groups</SelectLabel>
                    <SelectItem value="all" className="text-xs">
                        All Groups (No Filter)
                    </SelectItem>
                    {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id} className="text-xs">
                            {group.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
