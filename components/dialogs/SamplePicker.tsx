import React, { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, TestTube2 } from "lucide-react"
import { Sample } from "@/lib/types/sample.types"
import { getSamples } from "@/lib/services/sampleService"
import { useAuth } from "@/lib/hooks/useAuth"

interface SamplePickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (sample: Sample) => void
}

export function SamplePicker({ open, onOpenChange, onSelect }: SamplePickerProps) {
    const { currentUserProfile } = useAuth()
    const [samples, setSamples] = useState<Sample[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const loadSamples = useCallback(async () => {
        if (!currentUserProfile?.labId) return
        setLoading(true)
        try {
            const data = await getSamples(currentUserProfile.labId)
            setSamples(data)
        } catch (error) {
            console.error("Failed to load samples", error)
        } finally {
            setLoading(false)
        }
    }, [currentUserProfile?.labId])

    useEffect(() => {
        if (open && currentUserProfile?.labId) {
            loadSamples()
        }
    }, [open, currentUserProfile, loadSamples])

    const filteredSamples = samples.filter(sample =>
        sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Sample</DialogTitle>
                    <DialogDescription>
                        Choose a sample to link to this experiment.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search samples..."
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
                    ) : filteredSamples.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No samples found.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredSamples.map((sample) => (
                                <div
                                    key={sample.id}
                                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        onSelect(sample)
                                        onOpenChange(false)
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <TestTube2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{sample.name}</div>
                                            <div className="text-xs text-muted-foreground capitalize">
                                                {sample.type.replace('_', ' ')} • {sample.quantity} {sample.unit}
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
