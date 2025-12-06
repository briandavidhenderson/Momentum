"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Maximize2, RotateCcw, Filter, Info, User, BookOpen } from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { ForceGraph3DWrapper } from './ForceGraphWrapper'
import { useToast } from "@/components/ui/use-toast"
import { PersonProfile } from '@/lib/types'

// Types for graph data
interface GraphNode {
    id: string
    name: string
    group: number
    val: number // size/influence
    desc?: string
    x?: number
    y?: number
    z?: number
}

interface GraphLink {
    source: string
    target: string
    value: number // strength
}

interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

export function AuthorNetworkView() {
    const { currentUserProfile } = useAppContext()
    const { toast } = useToast()

    const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
    const [loading, setLoading] = useState(true)
    const [activeNode, setActiveNode] = useState<GraphNode | null>(null)

    // Camera ref for resetting view
    const fgRef = useRef<any>()

    useEffect(() => {
        if (currentUserProfile) {
            processData(currentUserProfile)
        }
    }, [currentUserProfile])

    const processData = (profile: PersonProfile) => {
        setLoading(true)
        try {
            const works = profile.orcidWorks || []

            // 1. Extract Authors and calculate stats
            // Map<AuthorName, Count>
            const authorCounts = new Map<string, number>()
            const authorCollaborations = new Map<string, Map<string, number>>()

            // Add self
            const selfName = profile.displayName || "Me"
            authorCounts.set(selfName, works.length) // Base size on total works

            works.forEach((work: any) => {
                // works are currently sanitized raw objects. 
                // We need to see how `parseOrcidRecordToProfileData` formats them.
                // Based on implementation: { title, type, publicationDate, journal, doi, url }
                // It DOES NOT currently extract full author lists because ORCID summaries 
                // often don't include the full contributor list in the `works` summary.
                //
                // However, if we assume we might get better data later, or if we just
                // visualize the works themselves as nodes for now linked to the user?
                //
                // Requirements say: "Maps relationships between authors".
                // LIMITATION: Basic ORCID work summaries often miss co-authors.
                // We will visualize Works linked to the User for now, and distinct Journals/Types.

                // Let's create a graph of: User -> Work -> Journal

                // This is a placeholder logic until we get full co-author data
                // For the demo, we will generate a structure:
                // Center: User
                // Nodes: Works
                // Links: User -> Work
            })

            // MOCK DATA GENERATION FOR VISUALIZATION DEMO
            // (Since we can't reliably get all co-authors from simple ORCID summaries)
            // Real implementation would need full record expansion

            const nodes: GraphNode[] = []
            const links: GraphLink[] = []

            // Center Node (The User)
            nodes.push({
                id: "USER",
                name: selfName,
                group: 1,
                val: 20,
                desc: "Principal Investigator"
            })

            // Works Nodes
            works.forEach((work: any, index: number) => {
                const workId = `WORK_${index}`
                nodes.push({
                    id: workId,
                    name: work.title || "Untitled Work",
                    group: 2,
                    val: 5,
                    desc: work.journal || work.type || "Publication"
                })

                links.push({
                    source: "USER",
                    target: workId,
                    value: 1
                })

                // If journal exists, link work to journal
                if (work.journal) {
                    // Check if journal node exists
                    let journalNode = nodes.find(n => n.id === `JOURNAL_${work.journal}`)
                    if (!journalNode) {
                        journalNode = {
                            id: `JOURNAL_${work.journal}`,
                            name: work.journal,
                            group: 3,
                            val: 10,
                            desc: "Journal"
                        }
                        nodes.push(journalNode)
                    }
                    links.push({
                        source: workId,
                        target: `JOURNAL_${work.journal}`,
                        value: 2
                    })
                }

                // Handle Authors (if present from NBIB import or enriched data)
                if (work.authors && Array.isArray(work.authors)) {
                    work.authors.forEach((authorName: string) => {
                        // Skip if it's the user (approximate match)
                        const isMe = authorName.toLowerCase().includes(profile.lastName.toLowerCase())
                        if (isMe) return

                        const authorId = `AUTHOR_${authorName}`
                        let authorNode = nodes.find(n => n.id === authorId)
                        if (!authorNode) {
                            authorNode = {
                                id: authorId,
                                name: authorName,
                                group: 4, // New Group for Co-Authors
                                val: 3,
                                desc: "Co-Author"
                            }
                            nodes.push(authorNode)
                        }

                        // Link Work -> Author
                        links.push({
                            source: workId,
                            target: authorId,
                            value: 1
                        })

                        // Optional: Link User -> Author (Direct Co-authorship)
                        // This creates a "clique" effect
                        links.push({
                            source: "USER",
                            target: authorId,
                            value: 0.5
                        })
                    })
                }
            })

            // If no works, add some placeholders to show the viz works
            if (works.length === 0) {
                // ... (Optional: Keep empty or show empty state)
            }

            setData({ nodes, links })
        } catch (err) {
            console.error("Failed to process network data", err)
            toast({
                title: "Visualization Error",
                description: "Could not process profile data for visualization.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleNodeClick = (node: GraphNode) => {
        setActiveNode(node)
        // Aim at node
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);

        fgRef.current?.cameraPosition(
            { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
        );
    }

    const handleReset = () => {
        setActiveNode(null)
        fgRef.current?.zoomToFit(1000, 50)
    }

    return (
        <div className="h-full w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Author Network</h2>
                    <p className="text-muted-foreground">
                        Visualizing publication relationships and impact.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset View
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[500px]">
                {/* Main 3D View */}
                <Card className="lg:col-span-3 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="relative flex-1 bg-slate-950 w-full h-full min-h-[400px]">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        )}

                        <ForceGraph3DWrapper
                            ref={fgRef}
                            graphData={data}
                            nodeLabel="name"
                            nodeColor={(node: any) => {
                                if (node.group === 1) return "#fbbf24" // User (Gold)
                                if (node.group === 2) return "#38bdf8" // Work (Cyan)
                                if (node.group === 3) return "#a855f7" // Journal (Purple)
                                if (node.group === 4) return "#f472b6" // Co-Author (Pink)
                                return "#94a3b8"
                            }}
                            nodeVal="val"
                            linkWidth={1}
                            linkOpacity={0.3}
                            backgroundColor="#020617"
                            onNodeClick={handleNodeClick}
                            nodeResolution={16}
                        />

                        <div className="absolute bottom-4 left-4 text-xs text-slate-500 pointer-events-none">
                            Double-click node to focus • Drag to rotate • Scroll to zoom
                        </div>
                    </div>
                </Card>

                {/* Sidebar Info Panel */}
                <Card className="flex flex-col h-full border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Node Details</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        {activeNode ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeNode.group === 1 ? "bg-amber-100 text-amber-600" :
                                        activeNode.group === 2 ? "bg-sky-100 text-sky-600" :
                                            "bg-purple-100 text-purple-600"
                                        }`}>
                                        {activeNode.group === 1 ? <User className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-medium leading-tight">{activeNode.name}</h3>
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                            {activeNode.desc}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="text-sm text-slate-500">
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-slate-50 p-2 rounded">
                                            <span className="block text-xs uppercase text-slate-400 font-semibold">Connections</span>
                                            <span className="text-lg font-mono text-slate-700">
                                                {data.links.filter(l => {
                                                    const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source
                                                    const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target
                                                    return sourceId === activeNode.id || targetId === activeNode.id
                                                }).length}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded">
                                            <span className="block text-xs uppercase text-slate-400 font-semibold">Weight</span>
                                            <span className="text-lg font-mono text-slate-700">{activeNode.val}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-center text-slate-400">
                                <Info className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">Click a node to view details</p>
                            </div>
                        )}

                        <div className="mt-8 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3">Legend</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#fbbf24]"></span>
                                    <span>Researchers (Me)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#38bdf8]"></span>
                                    <span>Works / Papers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#f472b6]"></span>
                                    <span>Co-Authors</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
