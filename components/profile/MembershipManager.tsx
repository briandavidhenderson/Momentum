"use client"

import { useState, useEffect, useMemo } from "react"
import { PersonProfile } from "@/lib/types"
import { ResearchGroup, WorkingLab } from "@/lib/types/researchgroup.types"
import {
    getResearchGroups,
    getWorkingLabs,
    createResearchGroup,
    createWorkingLab,
    addMemberToResearchGroup,
    removeMemberFromResearchGroup,
    addMemberToWorkingLab,
    removeMemberFromWorkingLab,
    subscribeToResearchGroups,
    subscribeToWorkingLabs
} from "@/lib/services/researchGroupService"
import { updateProfile } from "@/lib/firestoreService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { Users, Building, Plus, Search, X, LogOut, Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"
import { VisibilitySelector } from "@/components/ui/VisibilitySelector"
import { VisibilitySettings } from "@/lib/types/visibility.types"

interface MembershipManagerProps {
    currentUserProfile: PersonProfile
    onUpdate?: () => void
}

export function MembershipManager({ currentUserProfile, onUpdate }: MembershipManagerProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<"groups" | "labs">("groups")

    // Data state
    const [researchGroups, setResearchGroups] = useState<ResearchGroup[]>([])
    const [workingLabs, setWorkingLabs] = useState<WorkingLab[]>([])
    const [loading, setLoading] = useState(true)

    // Dialog states
    const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false)
    const [isJoinLabOpen, setIsJoinLabOpen] = useState(false)
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
    const [isCreateLabOpen, setIsCreateLabOpen] = useState(false)

    // Search/Filter state
    const [searchTerm, setSearchTerm] = useState("")

    // Form states
    const [newGroupName, setNewGroupName] = useState("")
    const [newGroupDesc, setNewGroupDesc] = useState("")
    const [newLabName, setNewLabName] = useState("")
    const [newLabDesc, setNewLabDesc] = useState("")
    const [newLabPhysicalInstitute, setNewLabPhysicalInstitute] = useState("")
    const [newLabNumber, setNewLabNumber] = useState("")
    const [newLabBuilding, setNewLabBuilding] = useState("")
    const [newLabRoom, setNewLabRoom] = useState("")
    const [newLabFloor, setNewLabFloor] = useState("")
    const [selectedGroupId, setSelectedGroupId] = useState<string>("")
    const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
        visibility: 'lab', // Default to lab visibility for groups
        sharedWithUsers: [],
        sharedWithGroups: []
    })

    const uniquePhysicalInstitutes = useMemo(() => {
        const institutes = new Set<string>()
        workingLabs.forEach(l => {
            if (l.physicalInstitute) institutes.add(l.physicalInstitute)
        })
        return Array.from(institutes).sort()
    }, [workingLabs])

    // Load data
    useEffect(() => {
        if (!currentUserProfile?.labId) return

        const unsubscribeGroups = subscribeToResearchGroups(null, (groups) => {
            setResearchGroups(groups)
        })

        const unsubscribeLabs = subscribeToWorkingLabs(null, (labs) => {
            setWorkingLabs(labs)
        })

        setLoading(false)

        return () => {
            unsubscribeGroups()
            unsubscribeLabs()
        }
    }, [currentUserProfile?.labId])

    // Filtered lists
    const myGroups = researchGroups.filter(g => currentUserProfile.researchGroupIds?.includes(g.id))
    const availableGroups = researchGroups.filter(g => !currentUserProfile.researchGroupIds?.includes(g.id))

    const myLabs = workingLabs.filter(l => currentUserProfile.workingLabIds?.includes(l.id))
    const availableLabs = workingLabs.filter(l => !currentUserProfile.workingLabIds?.includes(l.id))

    // Handlers
    const handleJoinGroup = async (group: ResearchGroup) => {
        try {
            // 1. Add to group members
            await addMemberToResearchGroup(group.id, currentUserProfile.id)

            // 2. Update profile
            const currentIds = currentUserProfile.researchGroupIds || []
            await updateProfile(currentUserProfile.id, {
                researchGroupIds: [...currentIds, group.id]
            })

            toast({
                title: "Joined Group",
                description: `You have joined ${group.name}`,
            })

            setIsJoinGroupOpen(false)
            if (onUpdate) onUpdate()
        } catch (error) {
            logger.error("Error joining group", error)
            toast({
                title: "Error",
                description: "Failed to join group",
                variant: "destructive",
            })
        }
    }

    const handleLeaveGroup = async (group: ResearchGroup) => {
        if (!confirm(`Are you sure you want to leave ${group.name}?`)) return

        try {
            // 1. Remove from group members
            await removeMemberFromResearchGroup(group.id, currentUserProfile.id)

            // 2. Update profile
            const currentIds = currentUserProfile.researchGroupIds || []
            await updateProfile(currentUserProfile.id, {
                researchGroupIds: currentIds.filter(id => id !== group.id)
            })

            toast({
                title: "Left Group",
                description: `You have left ${group.name}`,
            })

            if (onUpdate) onUpdate()
        } catch (error) {
            logger.error("Error leaving group", error)
            toast({
                title: "Error",
                description: "Failed to leave group",
                variant: "destructive",
            })
        }
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return

        try {
            const groupId = await createResearchGroup({
                name: newGroupName,
                description: newGroupDesc,
                departmentId: currentUserProfile.labId, // Using labId as departmentId
                departmentName: currentUserProfile.labName,
                schoolFacultyId: currentUserProfile.instituteId,
                schoolFacultyName: currentUserProfile.instituteName,
                organisationId: currentUserProfile.organisationId,
                organisationName: currentUserProfile.organisationName,
                principalInvestigators: currentUserProfile.isPrincipalInvestigator ? [currentUserProfile.id] : [],
                coordinatorIds: [],
                memberIds: [currentUserProfile.id], // Creator is auto-added
                adminIds: [currentUserProfile.id],
                pendingMemberIds: [],
                createdBy: currentUserProfile.id,
                isPublic: visibilitySettings.visibility === 'lab' || visibilitySettings.visibility === 'public', // Backward compatibility
                allowSelfJoin: visibilitySettings.visibility === 'lab', // Default logic, can be refined
                visibility: visibilitySettings.visibility,
                sharedWithUsers: visibilitySettings.sharedWithUsers,
                sharedWithGroups: visibilitySettings.sharedWithGroups
            })

            // Update profile to include new group
            const currentIds = currentUserProfile.researchGroupIds || []
            await updateProfile(currentUserProfile.id, {
                researchGroupIds: [...currentIds, groupId]
            })

            toast({
                title: "Group Created",
                description: "Research group created successfully",
            })

            setIsCreateGroupOpen(false)
            setNewGroupName("")
            setNewGroupDesc("")
            setVisibilitySettings({
                visibility: 'lab',
                sharedWithUsers: [],
                sharedWithGroups: []
            })
            if (onUpdate) onUpdate()
        } catch (error) {
            logger.error("Error creating group", error)
            toast({
                title: "Error",
                description: "Failed to create group",
                variant: "destructive",
            })
        }
    }

    const handleJoinLab = async (lab: WorkingLab) => {
        try {
            // 1. Add to lab members
            await addMemberToWorkingLab(lab.id, currentUserProfile.id)

            // 2. Update profile
            const currentIds = currentUserProfile.workingLabIds || []
            await updateProfile(currentUserProfile.id, {
                workingLabIds: [...currentIds, lab.id]
            })

            toast({
                title: "Joined Lab",
                description: `You have joined ${lab.name}`,
            })

            setIsJoinLabOpen(false)
            if (onUpdate) onUpdate()
        } catch (error) {
            logger.error("Error joining lab", error)
            toast({
                title: "Error",
                description: "Failed to join lab",
                variant: "destructive",
            })
        }
    }

    const handleLeaveLab = async (lab: WorkingLab) => {
        if (!confirm(`Are you sure you want to leave ${lab.name}?`)) return

        try {
            // 1. Remove from lab members
            await removeMemberFromWorkingLab(lab.id, currentUserProfile.id)

            // 2. Update profile
            const currentIds = currentUserProfile.workingLabIds || []
            await updateProfile(currentUserProfile.id, {
                workingLabIds: currentIds.filter(id => id !== lab.id)
            })

            toast({
                title: "Left Lab",
                description: `You have left ${lab.name}`,
            })

            if (onUpdate) onUpdate()
        } catch (error) {
            logger.error("Error leaving lab", error)
            toast({
                title: "Error",
                description: "Failed to leave lab",
                variant: "destructive",
            })
        }
    }

    const handleCreateLab = async () => {
        if (!newLabName.trim() || !selectedGroupId) return

        const selectedGroup = researchGroups.find(g => g.id === selectedGroupId)
        if (!selectedGroup) return

        try {
            const labId = await createWorkingLab({
                name: newLabName,
                description: newLabDesc,
                physicalInstitute: newLabPhysicalInstitute,
                labNumber: newLabNumber,
                building: newLabBuilding,
                roomNumber: newLabRoom,
                floor: newLabFloor,
                researchGroupId: selectedGroup.id,
                researchGroupName: selectedGroup.name,
                departmentId: currentUserProfile.labId,
                departmentName: currentUserProfile.labName,
                labManagerIds: [],
                memberIds: [],
                createdBy: currentUserProfile.id,
                isActive: true
            })

            // Auto-join the creator to the lab
            await addMemberToWorkingLab(labId, currentUserProfile.id)

            // Update profile
            const currentIds = currentUserProfile.workingLabIds || []
            await updateProfile(currentUserProfile.id, {
                workingLabIds: [...currentIds, labId]
            })

            toast({
                title: "Lab Created",
                description: "Working lab created successfully",
            })

            setIsCreateLabOpen(false)
            setNewLabName("")
            setNewLabDesc("")
            setNewLabPhysicalInstitute("")
            setNewLabNumber("")
            setNewLabBuilding("")
            setNewLabRoom("")
            setNewLabFloor("")
            setSelectedGroupId("")
            if (onUpdate) onUpdate()
        } catch (error) {
            logger.error("Error creating lab", error)
            toast({
                title: "Error",
                description: "Failed to create lab",
                variant: "destructive",
            })
        }
    }

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Memberships</h2>
                    <p className="text-muted-foreground">Manage your research groups and working labs</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList>
                    <TabsTrigger value="groups" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Research Groups
                    </TabsTrigger>
                    <TabsTrigger value="labs" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Working Labs
                    </TabsTrigger>
                </TabsList>

                {/* RESEARCH GROUPS TAB */}
                <TabsContent value="groups" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">My Research Groups</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsJoinGroupOpen(true)}>
                                <Search className="h-4 w-4 mr-2" />
                                Join Group
                            </Button>
                            <Button onClick={() => setIsCreateGroupOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Group
                            </Button>
                        </div>
                    </div>

                    {myGroups.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                You haven't joined any research groups yet.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {myGroups.map(group => (
                                <Card key={group.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{group.name}</CardTitle>
                                        <CardDescription>{group.departmentName}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {group.description || "No description provided."}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            {group.memberCount || 0} members
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleLeaveGroup(group)}
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Leave Group
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* WORKING LABS TAB */}
                <TabsContent value="labs" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">My Working Labs</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsJoinLabOpen(true)}>
                                <Search className="h-4 w-4 mr-2" />
                                Join Lab
                            </Button>
                            <Button onClick={() => setIsCreateLabOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Lab
                            </Button>
                        </div>
                    </div>

                    {myLabs.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                You haven't joined any working labs yet.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {myLabs.map(lab => (
                                <Card key={lab.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{lab.name}</CardTitle>
                                        <CardDescription>{lab.researchGroupName}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {lab.description || "No description provided."}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                            <Building className="h-3 w-3" />
                                            {lab.building || "No location"}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleLeaveLab(lab)}
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Leave Lab
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* DIALOGS */}

            {/* Join Group Dialog */}
            <Dialog open={isJoinGroupOpen} onOpenChange={setIsJoinGroupOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Join Research Group</DialogTitle>
                        <DialogDescription>
                            Find and join research groups in your department
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Search groups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {availableGroups
                                .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(group => (
                                    <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                        <div>
                                            <h4 className="font-medium">{group.name}</h4>
                                            <p className="text-sm text-muted-foreground">{group.description}</p>
                                        </div>
                                        <Button size="sm" onClick={() => handleJoinGroup(group)}>Join</Button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Group Dialog */}
            <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Research Group</DialogTitle>
                        <DialogDescription>
                            Create a new virtual research group for your team
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Group Name</Label>
                            <Input
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="e.g., Immunology Group"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={newGroupDesc}
                                onChange={(e) => setNewGroupDesc(e.target.value)}
                                placeholder="Brief description of research focus"
                            />
                        </div>
                        <div>
                            <Label>Visibility & Access</Label>
                            <VisibilitySelector
                                value={visibilitySettings}
                                onChange={setVisibilitySettings}
                                labId={currentUserProfile.labId}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>Create Group</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Join Lab Dialog */}
            <Dialog open={isJoinLabOpen} onOpenChange={setIsJoinLabOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Join Working Lab</DialogTitle>
                        <DialogDescription>
                            Find and join physical laboratory spaces
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Search labs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {availableLabs
                                .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(lab => (
                                    <div key={lab.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                        <div>
                                            <h4 className="font-medium">{lab.name}</h4>
                                            <p className="text-sm text-muted-foreground">{lab.researchGroupName}</p>
                                        </div>
                                        <Button size="sm" onClick={() => handleJoinLab(lab)}>Join</Button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Lab Dialog */}
            <Dialog open={isCreateLabOpen} onOpenChange={setIsCreateLabOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Working Lab</DialogTitle>
                        <DialogDescription>
                            Add a new physical laboratory space
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Lab Name</Label>
                            <Input
                                value={newLabName}
                                onChange={(e) => setNewLabName(e.target.value)}
                                placeholder="e.g., Lab 3.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Associated Research Group</Label>
                            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select research group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {researchGroups.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={newLabDesc}
                                onChange={(e) => setNewLabDesc(e.target.value)}
                                placeholder="Location details, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Physical Institute</Label>
                            <Input
                                list="institutes-list"
                                value={newLabPhysicalInstitute}
                                onChange={(e) => setNewLabPhysicalInstitute(e.target.value)}
                                placeholder="e.g., Institute of Medical Research"
                            />
                            <datalist id="institutes-list">
                                {uniquePhysicalInstitutes.map((inst, i) => (
                                    <option key={i} value={inst} />
                                ))}
                            </datalist>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Lab Number</Label>
                                <Input
                                    value={newLabNumber}
                                    onChange={(e) => setNewLabNumber(e.target.value)}
                                    placeholder="e.g., 3.01"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Building</Label>
                                <Input
                                    value={newLabBuilding}
                                    onChange={(e) => setNewLabBuilding(e.target.value)}
                                    placeholder="e.g., Main Block"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Room Number</Label>
                                <Input
                                    value={newLabRoom}
                                    onChange={(e) => setNewLabRoom(e.target.value)}
                                    placeholder="e.g., 301"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Floor</Label>
                                <Input
                                    value={newLabFloor}
                                    onChange={(e) => setNewLabFloor(e.target.value)}
                                    placeholder="e.g., 3"
                                />
                            </div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateLabOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateLab} disabled={!newLabName.trim() || !selectedGroupId}>Create Lab</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
