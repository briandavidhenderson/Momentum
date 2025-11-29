"use client"

import React, { useState, useEffect } from "react"
import { VisibilitySettings, VisibilityLevel } from "@/lib/types/visibility.types"
import { Check, ChevronDown, Globe, Lock, Users, Building2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getLabMembers } from "@/lib/services/profileService"
import { getResearchGroups } from "@/lib/services/researchGroupService"
import { PersonProfile } from "@/lib/types/profile.types"
import { ResearchGroup } from "@/lib/types/researchgroup.types"

interface VisibilitySelectorProps {
    value: VisibilitySettings
    onChange: (settings: VisibilitySettings) => void
    labId: string
    className?: string
    disabled?: boolean
}

export function VisibilitySelector({ value, onChange, labId, className, disabled }: VisibilitySelectorProps) {
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [labMembers, setLabMembers] = useState<PersonProfile[]>([])
    const [researchGroups, setResearchGroups] = useState<ResearchGroup[]>([])
    const [loading, setLoading] = useState(false)

    // Load available users/groups when dialog opens
    useEffect(() => {
        if (isShareDialogOpen && labId) {
            setLoading(true)
            Promise.all([
                getLabMembers(labId),
                getResearchGroups(labId)
            ]).then(([members, groups]) => {
                setLabMembers(members)
                setResearchGroups(groups)
            }).catch(console.error)
                .finally(() => setLoading(false))
        }
    }, [isShareDialogOpen, labId])

    const handleVisibilityChange = (level: VisibilityLevel) => {
        if (level === 'shared') {
            setIsShareDialogOpen(true)
            // Don't change visibility yet, wait for dialog confirmation
        } else {
            onChange({
                ...value,
                visibility: level
            })
        }
    }

    const toggleUser = (userId: string) => {
        const currentUsers = value.sharedWithUsers || []
        const newUsers = currentUsers.includes(userId)
            ? currentUsers.filter(id => id !== userId)
            : [...currentUsers, userId]

        onChange({
            ...value,
            visibility: 'shared', // Ensure visibility is set to shared
            sharedWithUsers: newUsers
        })
    }

    const toggleGroup = (groupId: string) => {
        const currentGroups = value.sharedWithGroups || []
        const newGroups = currentGroups.includes(groupId)
            ? currentGroups.filter(id => id !== groupId)
            : [...currentGroups, groupId]

        onChange({
            ...value,
            visibility: 'shared', // Ensure visibility is set to shared
            sharedWithGroups: newGroups
        })
    }

    const getDisplayName = (profile: PersonProfile) => {
        return `${profile.firstName} ${profile.lastName}`
    }

    const filteredMembers = labMembers.filter(m =>
        getDisplayName(m).toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredGroups = researchGroups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getVisibilityIcon = (level: VisibilityLevel) => {
        switch (level) {
            case 'private': return <Lock className="w-4 h-4" />
            case 'shared': return <Users className="w-4 h-4" />
            case 'lab': return <Building2 className="w-4 h-4" />
            case 'public': return <Globe className="w-4 h-4" />
        }
    }

    const getVisibilityLabel = (level: VisibilityLevel) => {
        switch (level) {
            case 'private': return 'Private'
            case 'shared': return 'Shared'
            case 'lab': return 'Lab'
            case 'public': return 'Public'
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    <Button variant="outline" size="sm" className={`gap-2 ${className}`} disabled={disabled}>
                        {getVisibilityIcon(value.visibility)}
                        <span>{getVisibilityLabel(value.visibility)}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleVisibilityChange('private')}>
                        <Lock className="w-4 h-4 mr-2 text-slate-500" />
                        <div className="flex flex-col">
                            <span>Private</span>
                            <span className="text-xs text-slate-400">Only you can access</span>
                        </div>
                        {value.visibility === 'private' && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVisibilityChange('shared')}>
                        <Users className="w-4 h-4 mr-2 text-slate-500" />
                        <div className="flex flex-col">
                            <span>Shared</span>
                            <span className="text-xs text-slate-400">Specific people/groups</span>
                        </div>
                        {value.visibility === 'shared' && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVisibilityChange('lab')}>
                        <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                        <div className="flex flex-col">
                            <span>Lab</span>
                            <span className="text-xs text-slate-400">All lab members</span>
                        </div>
                        {value.visibility === 'lab' && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share with...</DialogTitle>
                    </DialogHeader>

                    <div className="relative mb-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search people or groups..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-6">
                            {/* Selected Summary */}
                            {((value.sharedWithUsers?.length ?? 0) > 0 || (value.sharedWithGroups?.length ?? 0) > 0) && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Shared With</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {value.sharedWithGroups?.map(gid => {
                                            const group = researchGroups.find(g => g.id === gid)
                                            return group ? (
                                                <Badge key={gid} variant="secondary" className="gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {group.name}
                                                    <button onClick={() => toggleGroup(gid)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                </Badge>
                                            ) : null
                                        })}
                                        {value.sharedWithUsers?.map(uid => {
                                            const user = labMembers.find(m => m.id === uid)
                                            return user ? (
                                                <Badge key={uid} variant="outline" className="gap-1 pl-1">
                                                    <Avatar className="w-4 h-4">
                                                        <AvatarImage src={user.avatarUrl} />
                                                        <AvatarFallback className="text-[8px]">{getDisplayName(user).substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    {getDisplayName(user)}
                                                    <button onClick={() => toggleUser(uid)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                </Badge>
                                            ) : null
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Groups */}
                            {filteredGroups.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Research Groups</h4>
                                    <div className="space-y-1">
                                        {filteredGroups.map(group => (
                                            <div
                                                key={group.id}
                                                className="flex items-center justify-between p-2 rounded hover:bg-slate-100 cursor-pointer"
                                                onClick={() => toggleGroup(group.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{group.name}</div>
                                                        <div className="text-xs text-slate-500">{group.memberCount || 0} members</div>
                                                    </div>
                                                </div>
                                                {value.sharedWithGroups?.includes(group.id) && <Check className="w-4 h-4 text-indigo-600" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* People */}
                            {filteredMembers.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">People</h4>
                                    <div className="space-y-1">
                                        {filteredMembers.map(member => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-2 rounded hover:bg-slate-100 cursor-pointer"
                                                onClick={() => toggleUser(member.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src={member.avatarUrl} />
                                                        <AvatarFallback>{getDisplayName(member).substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="text-sm font-medium">{getDisplayName(member)}</div>
                                                        <div className="text-xs text-slate-500">{member.email}</div>
                                                    </div>
                                                </div>
                                                {value.sharedWithUsers?.includes(member.id) && <Check className="w-4 h-4 text-indigo-600" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={() => setIsShareDialogOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
