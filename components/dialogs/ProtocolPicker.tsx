import React, { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, FileText } from "lucide-react"
import { Protocol } from "@/lib/types/protocol.types"
import { getProtocols } from "@/lib/services/protocolService"
import { useAuth } from "@/lib/hooks/useAuth"

interface ProtocolPickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (protocol: Protocol) => void
}

export function ProtocolPicker({ open, onOpenChange, onSelect }: ProtocolPickerProps) {
    const { currentUserProfile } = useAuth()
    const [protocols, setProtocols] = useState<Protocol[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const loadProtocols = useCallback(async () => {
        if (!currentUserProfile?.labId) return
        setLoading(true)
        try {
            const data = await getProtocols(currentUserProfile.labId)
            setProtocols(data)
        } catch (error) {
            console.error("Failed to load protocols", error)
        } finally {
            setLoading(false)
        }
    }, [currentUserProfile?.labId])

    useEffect(() => {
        if (open && currentUserProfile?.labId) {
            loadProtocols()
        }
    }, [open, currentUserProfile, loadProtocols])

    const filteredProtocols = protocols.filter(protocol =>
        protocol.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Protocol</DialogTitle>
                    <DialogDescription>
                        Choose a protocol to link to this experiment.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search protocols..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredProtocols.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No protocols found.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredProtocols.map((protocol) => (
                                <div
                                    key={protocol.id}
                                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        onSelect(protocol)
                                        onOpenChange(false)
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{protocol.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                v{protocol.version}
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">Select</Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
