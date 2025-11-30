"use client"

import React, { useState, useEffect } from "react"
import { WhiteboardEditor } from "@/components/whiteboard/WhiteboardEditor"
import { WhiteboardData, getWhiteboardsForLab, createWhiteboard, deleteWhiteboard, updateWhiteboard } from "@/lib/whiteboardService"
import { useAuth } from "@/lib/hooks/useAuth"
import { Plus, Trash2, Layout, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { formatDistanceToNow } from "date-fns"

export function WhiteboardView() {
    const { currentUser, currentUserProfile, isLoadingProfile } = useAuth()
    const { success, error } = useToast()
    const [whiteboards, setWhiteboards] = useState<WhiteboardData[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedWhiteboard, setSelectedWhiteboard] = useState<WhiteboardData | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const loadWhiteboards = React.useCallback(async (labId: string) => {
        setLoading(true)
        try {
            const data = await getWhiteboardsForLab(labId)
            setWhiteboards(data)
        } catch (err) {
            console.error("Failed to load whiteboards", err)
            error("Failed to load whiteboards")
        } finally {
            setLoading(false)
        }
    }, [error])

    useEffect(() => {
        if (isLoadingProfile) return

        if (currentUserProfile?.labId) {
            loadWhiteboards(currentUserProfile.labId)
        } else {
            setLoading(false)
        }
    }, [currentUserProfile, isLoadingProfile, loadWhiteboards])

    const handleCreate = async () => {
        if (!currentUserProfile?.labId || !currentUser) return
        setIsCreating(true)
        try {
            const newId = await createWhiteboard({
                name: `Untitled Whiteboard ${new Date().toLocaleDateString()}`,
                shapes: [],
                createdBy: currentUser.uid,
                labId: currentUserProfile.labId,
                visibility: 'private'
            })
            const newBoard: WhiteboardData = {
                id: newId,
                name: `Untitled Whiteboard ${new Date().toLocaleDateString()}`,
                shapes: [],
                createdBy: currentUser.uid,
                labId: currentUserProfile.labId,
                visibility: 'private',
                createdAt: new Date(),
                updatedAt: new Date()
            }
            setWhiteboards(prev => [newBoard, ...prev])
            setSelectedWhiteboard(newBoard)
            success("New whiteboard created")
        } catch (err) {
            console.error("Failed to create whiteboard", err)
            error("Failed to create whiteboard")
        } finally {
            setIsCreating(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm("Are you sure you want to delete this whiteboard?")) return

        try {
            await deleteWhiteboard(id)
            setWhiteboards(prev => prev.filter(b => b.id !== id))
            if (selectedWhiteboard?.id === id) {
                setSelectedWhiteboard(null)
            }
            success("Whiteboard deleted")
        } catch (err) {
            console.error("Failed to delete whiteboard", err)
            error("Failed to delete whiteboard")
        }
    }

    // Handle browser back button
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state?.whiteboardId) {
                const board = whiteboards.find(b => b.id === event.state.whiteboardId)
                if (board) setSelectedWhiteboard(board)
            } else {
                setSelectedWhiteboard(null)
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [whiteboards])

    const handleSelectBoard = (board: WhiteboardData) => {
        setSelectedWhiteboard(board)
        window.history.pushState({ whiteboardId: board.id }, '', `#whiteboard=${board.id}`)
    }

    const handleBack = () => {
        window.history.back()
    }

    if (selectedWhiteboard) {
        return (
            <div className="h-screen flex flex-col">
                <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <input
                            className="font-semibold text-lg border rounded px-2 py-1"
                            value={selectedWhiteboard.name}
                            onChange={async (e) => {
                                const name = e.target.value
                                setSelectedWhiteboard({ ...selectedWhiteboard, name })
                                try {
                                    await updateWhiteboard(selectedWhiteboard.id!, { name })
                                } catch (err) {
                                    console.error("Failed to rename whiteboard", err)
                                    error("Failed to rename whiteboard")
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <WhiteboardEditor
                        initialData={selectedWhiteboard}
                        whiteboardId={selectedWhiteboard.id}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Whiteboards</h1>
                        <p className="text-slate-500 mt-1">Visualize your protocols and workflows</p>
                    </div>
                    <Button onClick={handleCreate} disabled={isCreating || !currentUserProfile?.labId}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        New Whiteboard
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : whiteboards.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                        <Layout className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No whiteboards yet</h3>
                        <p className="text-slate-500 mb-4">Create your first whiteboard to get started</p>
                        <Button onClick={handleCreate} variant="outline">Create Whiteboard</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {whiteboards.map((board) => (
                            <Card key={board.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => handleSelectBoard(board)}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-semibold truncate">{board.name}</CardTitle>
                                        {board.visibility === 'lab' ? (
                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-bold tracking-wider">Lab</span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-bold tracking-wider">Private</span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-32 bg-slate-100 rounded-md flex items-center justify-center relative overflow-hidden">
                                        {/* Mini preview could go here */}
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                                        <span className="text-slate-400 text-xs">{board.shapes?.length || 0} elements</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between text-xs text-slate-500 pt-2">
                                    <span>{board.updatedAt?.seconds ? formatDistanceToNow(new Date(board.updatedAt.seconds * 1000), { addSuffix: true }) : 'Just now'}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(e, board.id!)}>
                                        <Trash2 size={14} />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
