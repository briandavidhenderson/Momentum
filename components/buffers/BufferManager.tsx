import { useState } from "react"
import { useBuffers } from "@/lib/hooks/useBuffers"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Search, Plus, FlaskConical, Edit2, Trash2, Loader2 } from "lucide-react"
import { BufferEditor } from "./BufferEditor"
import { Buffer } from "@/lib/protocol/types"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

export function BufferManager() {
    const { currentUserProfile } = useAuth()
    const { buffers, loading, addBuffer, editBuffer, removeBuffer } = useBuffers()
    const [searchTerm, setSearchTerm] = useState("")
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingBuffer, setEditingBuffer] = useState<Buffer | null>(null)
    const { toast } = useToast()

    const filteredBuffers = buffers.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.components.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleCreate = async (data: any) => {
        try {
            await addBuffer(data)
            setIsCreateOpen(false)
            toast({ title: "Success", description: "Buffer recipe created." })
        } catch (error) {
            toast({ title: "Error", description: "Failed to create buffer.", variant: "destructive" })
        }
    }

    const handleUpdate = async (data: any) => {
        if (!editingBuffer) return
        try {
            await editBuffer(editingBuffer.id, data)
            setEditingBuffer(null)
            toast({ title: "Success", description: "Buffer recipe updated." })
        } catch (error) {
            toast({ title: "Error", description: "Failed to update buffer.", variant: "destructive" })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this recipe?")) return
        try {
            await removeBuffer(id)
            toast({ title: "Success", description: "Buffer recipe deleted." })
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete buffer.", variant: "destructive" })
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Buffer Recipes</h2>
                    <p className="text-muted-foreground">Manage chemical solutions and media recipes.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Recipe
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search buffers or ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 max-w-md"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuffers.map(buffer => (
                    <Card key={buffer.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 text-blue-500" />
                                {buffer.name}
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingBuffer(buffer)}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(buffer.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {buffer.description || "No description provided."}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                                {buffer.components.slice(0, 3).map((comp, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                        {comp.name}
                                    </Badge>
                                ))}
                                {buffer.components.length > 3 && (
                                    <Badge variant="outline" className="text-xs">+{buffer.components.length - 3}</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                                <span>Vol: {buffer.finalVolume} {buffer.finalVolumeUnit}</span>
                                {buffer.pH && <span>pH: {buffer.pH}</span>}
                                {buffer.storage && <span>{buffer.storage}</span>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <BufferEditor
                    onSave={handleCreate}
                    onCancel={() => setIsCreateOpen(false)}
                    labId={currentUserProfile?.labId || ""}
                />
            </Dialog>

            <Dialog open={!!editingBuffer} onOpenChange={(open) => !open && setEditingBuffer(null)}>
                {editingBuffer && (
                    <BufferEditor
                        buffer={editingBuffer}
                        onSave={handleUpdate}
                        onCancel={() => setEditingBuffer(null)}
                        labId={currentUserProfile?.labId || ""}
                    />
                )}
            </Dialog>
        </div>
    )
}
