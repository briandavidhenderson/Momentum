"use client"

import React, { useState } from "react"
import { Beaker, AlertTriangle, FileText, Activity, Ban, Search, Users, FolderKanban, TestTube2, PlayCircle } from "lucide-react"
import { LucideIcon } from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { useProjects, usePeople } from "@/lib/store"
import { useBuffers } from "@/lib/hooks/useBuffers"
import { PROTOCOL_OPERATIONS } from "./protocolConfig"
import { subscribeToLabActiveExecutions } from "@/lib/services/protocolExecutionService"
import { ProtocolExecution } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"

export interface AssetDef {
    id: string
    Icon: LucideIcon
    label: string
}

export const ASSETS: AssetDef[] = [
    { id: "beaker", Icon: Beaker, label: "Reagent" },
    { id: "warning", Icon: AlertTriangle, label: "Hazard" },
    { id: "note", Icon: FileText, label: "Protocol" },
]

export type DragPayload = {
    kind: 'asset' | 'inventory' | 'equipment' | 'project' | 'person' | 'protocol' | 'buffer' | 'execution'
    id: string
    name?: string
    operationType?: string
}

interface WhiteboardSidebarProps {
    onDragStart: (e: React.DragEvent, payload: DragPayload) => void
}

export function WhiteboardSidebar({ onDragStart }: WhiteboardSidebarProps) {
    const [assetTab, setAssetTab] = useState<'protocol' | 'assets' | 'inventory' | 'equipment' | 'buffers' | 'projects' | 'people' | 'executions'>('assets')
    const [assetSearch, setAssetSearch] = useState("")
    const [activeExecutions, setActiveExecutions] = useState<ProtocolExecution[]>([])
    const { currentUserProfile } = useAuth()

    React.useEffect(() => {
        if (!currentUserProfile?.labId) return
        const unsubscribe = subscribeToLabActiveExecutions(currentUserProfile.labId, (executions) => {
            setActiveExecutions(executions)
        })
        return () => unsubscribe()
    }, [currentUserProfile?.labId])

    const { inventory, equipment } = useAppContext()
    const projects = useProjects()
    const people = usePeople()
    const { buffers } = useBuffers()

    const filteredInventory = (inventory || []).filter(item => item.productName.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredEquipment = (equipment || []).filter(eq => eq.name.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredBuffers = buffers.filter(b => b.name.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredPeople = people.filter(p => p.name.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredProtocolOps = PROTOCOL_OPERATIONS.filter(op => op.label.toLowerCase().includes(assetSearch.toLowerCase()) || op.description.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredExecutions = activeExecutions.filter(ex => ex.protocolTitle.toLowerCase().includes(assetSearch.toLowerCase()))

    console.log("Rendering WhiteboardSidebar. Active executions:", activeExecutions.length)
    return (
        <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col z-10 h-full">
            <div className="border-b border-slate-200">
                <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Palette</div>
                <div className="px-3 pb-2">
                    <div className="flex flex-wrap gap-1 text-[11px] bg-slate-100 rounded-lg p-0.5">
                        {[
                            { id: "protocol", label: "Protocol" },
                            { id: "assets", label: "Icons" },
                            { id: "inventory", label: "Inv" },
                            { id: "equipment", label: "Equip" },
                            { id: "buffers", label: "Buffers" },
                            { id: "projects", label: "Proj" },
                            { id: "people", label: "Ppl" },
                            { id: "executions", label: "Runs" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setAssetTab(tab.id as any)}
                                className={`flex-1 py-1.5 px-2 rounded-md text-center transition ${assetTab === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-2 text-slate-400 w-3 h-3" />
                        <input
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
                {assetTab === "protocol" && (
                    <div className="space-y-3">
                        {filteredProtocolOps.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400">
                                No protocol operations found
                            </div>
                        ) : (
                            filteredProtocolOps.map((op) => (
                                <div
                                    key={op.type}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, { kind: "protocol", id: op.type, name: op.label, operationType: op.type })}
                                    className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md cursor-grab flex items-center gap-3"
                                    style={{ borderColor: `${op.color}40` }}
                                >
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: `${op.color}1a` }}>
                                        <op.Icon className="w-5 h-5" style={{ color: op.color }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">{op.label}</p>
                                        <p className="text-xs text-slate-500">{op.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {assetTab === "assets" && (
                    <div className="grid grid-cols-2 gap-3">
                        {ASSETS.map((a) => (
                            <div
                                key={a.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, { kind: "asset", id: a.id })}
                                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col items-center gap-2"
                            >
                                <a.Icon className="text-slate-600 w-6 h-6" />
                                <span className="text-xs text-slate-500">{a.label}</span>
                            </div>
                        ))}
                    </div>
                )}
                {assetTab === "inventory" && (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredInventory.length === 0 ? (
                            <div className="col-span-2 text-center py-8 text-xs text-slate-400">
                                No inventory items found
                            </div>
                        ) : (
                            filteredInventory.map((item) => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, { kind: "inventory", id: item.id, name: item.productName })}
                                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col items-center gap-2.5"
                                >
                                    <Beaker className="text-slate-600 w-6 h-6 flex-shrink-0 mb-0.5" />
                                    <span className="text-xs text-slate-500 text-center line-clamp-2 leading-tight">{item.productName}</span>
                                    <span className="text-[10px] text-slate-500 text-center truncate w-full mt-0.5">{item.catNum || "No catalog number"}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {assetTab === "equipment" && (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredEquipment.length === 0 ? (
                            <div className="col-span-2 text-center py-8 text-xs text-slate-400">
                                No equipment found
                            </div>
                        ) : (
                            filteredEquipment.map((eq) => (
                                <div
                                    key={eq.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, { kind: "equipment", id: eq.id, name: eq.name })}
                                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col items-center gap-2.5"
                                >
                                    <Activity className="text-slate-600 w-6 h-6 flex-shrink-0 mb-0.5" />
                                    <span className="text-xs text-slate-500 text-center line-clamp-2 leading-tight">{eq.name}</span>
                                    <span className="text-[10px] text-slate-500 text-center truncate w-full mt-0.5">
                                        {eq.make && eq.model ? `${eq.make} ${eq.model}` : eq.make || eq.model || "No model info"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {assetTab === "buffers" && (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredBuffers.length === 0 ? (
                            <div className="col-span-2 text-center py-8 text-xs text-slate-400">
                                No buffers found
                            </div>
                        ) : (
                            filteredBuffers.map((buffer) => (
                                <div
                                    key={buffer.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, { kind: "buffer", id: buffer.id, name: buffer.name })}
                                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col items-center gap-2.5"
                                >
                                    <TestTube2 className="text-emerald-600 w-6 h-6 flex-shrink-0 mb-0.5" />
                                    <span className="text-xs text-slate-500 text-center line-clamp-2 leading-tight">{buffer.name}</span>
                                    <span className="text-[10px] text-slate-500 text-center truncate w-full mt-0.5">
                                        {buffer.components.length} component{buffer.components.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {assetTab === "projects" && (
                    <div className="space-y-2">
                        {filteredProjects.map((p) => (
                            <div
                                key={p.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, { kind: "project", id: p.id, name: p.name })}
                                className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col gap-1 text-xs"
                            >
                                <div className="flex items-center gap-1">
                                    <FolderKanban className="w-3 h-3 text-blue-600" />
                                    <span className="font-medium truncate">{p.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">{p.status}</div>
                            </div>
                        ))}
                    </div>
                )}
                {assetTab === "people" && (
                    <div className="space-y-2">
                        {filteredPeople.map((p) => (
                            <div
                                key={p.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, { kind: "person", id: p.id, name: p.name })}
                                className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col gap-1 text-xs"
                            >
                                <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-purple-600" />
                                    <span className="font-medium truncate">{p.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">{p.role}</div>
                            </div>
                        ))}
                    </div>
                )}
                {assetTab === "executions" && (
                    <div className="space-y-2">
                        {filteredExecutions.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400">
                                No active executions found
                            </div>
                        ) : (
                            filteredExecutions.map((ex) => (
                                <div
                                    key={ex.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, { kind: "execution", id: ex.id, name: ex.protocolTitle })}
                                    className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab flex flex-col gap-1 text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <PlayCircle className="w-4 h-4 text-green-600" />
                                        <span className="font-medium truncate">{ex.protocolTitle}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                        <span>Step {ex.currentStepIndex + 1}</span>
                                        <span className="capitalize">{ex.status}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
