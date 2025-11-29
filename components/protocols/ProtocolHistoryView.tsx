import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GitBranch, GitCommit, GitMerge, History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { getProtocolVersions } from '@/lib/services/protocolService'
import { Protocol, ProtocolVersion } from '@/lib/types'
import { ProtocolBranchDialog } from './ProtocolBranchDialog'
import { cn } from '@/lib/utils'

interface ProtocolHistoryViewProps {
    protocol: Protocol
    onSelectVersion?: (version: ProtocolVersion) => void
}

export function ProtocolHistoryView({ protocol, onSelectVersion }: ProtocolHistoryViewProps) {
    const [versions, setVersions] = useState<ProtocolVersion[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadVersions()
    }, [protocol.id])

    async function loadVersions() {
        setLoading(true)
        try {
            const data = await getProtocolVersions(protocol.id)
            setVersions(data)
        } catch (error) {
            console.error('Error loading protocol versions:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div>Loading history...</div>

    return (
        <Card className="h-full flex flex-col border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Version History
                </CardTitle>
                <CardDescription>
                    {protocol.title}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full pr-4">
                    <div className="relative border-l-2 border-muted ml-3 space-y-8 py-2">
                        {versions.map((version, index) => (
                            <div key={version.id} className="relative pl-6">
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 ring-4 ring-background",
                                    version.id === protocol.activeVersionId ? "bg-primary border-primary" : "bg-muted-foreground border-background"
                                )} />

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-sm font-bold">v{version.versionNumber}</span>
                                        <Badge variant="outline" className="text-xs gap-1">
                                            <GitBranch className="h-3 w-3" />
                                            {version.branchName}
                                        </Badge>
                                        {version.id === protocol.activeVersionId && (
                                            <Badge className="text-[10px] h-5">Active</Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        {version.commitMessage || "No description"}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => onSelectVersion?.(version)}
                                        >
                                            View
                                        </Button>
                                        <ProtocolBranchDialog
                                            protocol={protocol}
                                            currentVersion={version}
                                            onBranchCreated={() => loadVersions()}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
