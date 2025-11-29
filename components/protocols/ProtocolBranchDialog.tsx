import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createProtocolVersion } from '@/lib/services/protocolService'
import { Protocol, ProtocolVersion } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/hooks/useAuth'

interface ProtocolBranchDialogProps {
    protocol: Protocol
    currentVersion: ProtocolVersion
    onBranchCreated?: (newVersionId: string) => void
}

export function ProtocolBranchDialog({ protocol, currentVersion, onBranchCreated }: ProtocolBranchDialogProps) {
    const [open, setOpen] = useState(false)
    const [branchName, setBranchName] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const { currentUser } = useAuth()

    const handleCreateBranch = async () => {
        if (!branchName.trim()) {
            toast({ title: 'Branch name required', variant: 'destructive' })
            return
        }
        if (!currentUser) return

        setLoading(true)
        try {
            // Create a new version that is identical to the current one but on a new branch
            const newVersionData = {
                versionNumber: `${currentVersion.versionNumber}-${branchName}`, // Simple versioning for now
                parentVersionId: currentVersion.id,
                steps: currentVersion.steps,
                authorId: currentUser.uid,
                commitMessage: message || `Created branch ${branchName}`,
                branchName: branchName
            }

            const newVersionId = await createProtocolVersion(protocol.id, newVersionData, false)

            toast({ title: 'Branch created successfully' })
            setOpen(false)
            onBranchCreated?.(newVersionId)
        } catch (error) {
            console.error('Error creating branch:', error)
            toast({ title: 'Failed to create branch', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <GitBranch className="mr-2 h-4 w-4" />
                    Branch
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Branch</DialogTitle>
                    <DialogDescription>
                        Create a divergent path for this protocol to experiment with changes.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={branchName}
                            onChange={(e) => setBranchName(e.target.value)}
                            placeholder="feature/new-reagent"
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="message" className="text-right">
                            Message
                        </Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Why are you creating this branch?"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleCreateBranch} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Branch'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
