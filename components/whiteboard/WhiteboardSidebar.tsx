"use client"

import React, { useState } from "react"
import { Beaker, AlertTriangle, FileText, Activity, Ban, Search, Users, FolderKanban } from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { useProjects, usePeople } from "@/lib/store"
import { LucideIcon } from "lucide-react"

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

interface WhiteboardSidebarProps {
    onDragStart: (e: React.DragEvent, payload: { kind: 'asset' | 'inventory' | 'equipment' | 'project' | 'person', id: string, name?: string }) => void
}

export function WhiteboardSidebar({ onDragStart }: WhiteboardSidebarProps) {
    const [assetTab, setAssetTab] = useState<'assets' | 'inventory' | 'equipment' | 'projects' | 'people'>('assets')
    const [assetSearch, setAssetSearch] = useState("")

    const { inventory, equipment } = useAppContext()
    const projects = useProjects()
    const people = usePeople()

    const filteredInventory = (inventory || []).filter(item => item.productName.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredEquipment = (equipment || []).filter(eq => eq.name.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(assetSearch.toLowerCase()))
    const filteredPeople = people.filter(p => p.name.toLowerCase().includes(assetSearch.toLowerCase()))

    return (
        <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col z-10 h-full">
            <div className="border-b border-slate-200">
                <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Palette</div>
                <div className="px-3 pb-2">
                    <div className="flex flex-wrap gap-1 text-[11px] bg-slate-100 rounded-lg p-0.5">
                        {[
                            { id: "assets", label: "Icons" },
                            { id: "inventory", label: "Inv" },
                            { id: "equipment", label: "Equip" },
                            { id: "projects", label: "Proj" },
                            { id: "people", label: "Ppl" }
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
            </div>
        </div>
    )
}
