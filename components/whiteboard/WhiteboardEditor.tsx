"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
    MousePointer2, Square, Circle, Diamond, Type,
    Undo, Redo, Trash2, MoreVertical, Beaker, FileText, AlertTriangle,
    Triangle, Hexagon, Star, Minus, Share2, Ban,
    AlignLeft, AlignCenter, AlignRight,
    Bold, Italic, Underline, ArrowUpFromLine, ArrowDownFromLine, AlignVerticalJustifyCenter,
    Group, Ungroup, Lock, Unlock, Hand,
    ArrowRight, MoveRight, Spline, CornerDownRight, Activity,
    Grid3X3, Copy, Layers, ChevronsUp, ChevronsDown, LucideIcon, Save
} from "lucide-react"
import { Shape, createWhiteboard, updateWhiteboard, WhiteboardData } from "@/lib/whiteboardService"
import { WhiteboardCanvas } from "./WhiteboardCanvas"
import { WhiteboardSidebar } from "./WhiteboardSidebar"
import { useAuth } from "@/lib/hooks/useAuth"
import { useToast } from "@/components/ui/toast"

// --- TYPES ---

type ToolType = "select" | "hand" | "rect" | "circle" | "diamond" | "triangle" | "hexagon" | "star" | "text" | "line" | "arrow" | "elbow" | "curve"
type ShapeType = "rect" | "circle" | "diamond" | "triangle" | "hexagon" | "star" | "text" | "asset" | "line" | "arrow" | "elbow" | "curve"
type ResizeHandle = "nw" | "ne" | "sw" | "se" | null
type InteractionMode = "none" | "drawing" | "moving" | "resizing" | "panning" | "selecting_area"

interface Point {
    x: number
    y: number
}

const COLORS = [
    { hex: "#ffffff", name: "White" },
    { hex: "#f8fafc", name: "Slate 50" },
    { hex: "#94a3b8", name: "Slate 400" },
    { hex: "#1e293b", name: "Slate 800" },
    { hex: "#ef4444", name: "Red" },
    { hex: "#f97316", name: "Orange" },
    { hex: "#f59e0b", name: "Amber" },
    { hex: "#84cc16", name: "Lime" },
    { hex: "#10b981", name: "Emerald" },
    { hex: "#06b6d4", name: "Cyan" },
    { hex: "#3b82f6", name: "Blue" },
    { hex: "#6366f1", name: "Indigo" },
    { hex: "#8b5cf6", name: "Violet" },
    { hex: "#d946ef", name: "Fuchsia" },
    { hex: "#f43f5e", name: "Rose" },
]

interface WhiteboardEditorProps {
    initialData?: WhiteboardData
    whiteboardId?: string
}

export function WhiteboardEditor({ initialData, whiteboardId }: WhiteboardEditorProps) {
    const { currentUser, currentUserProfile } = useAuth()
    const { success, error } = useToast()

    // -- STATE --
    const [shapes, setShapes] = useState<Shape[]>(initialData?.shapes || [])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [tool, setTool] = useState<ToolType>("select")
    const [snapToGrid, setSnapToGrid] = useState(false)

    // Interaction State
    const [interaction, setInteraction] = useState<InteractionMode>("none")
    const [dragStart, setDragStart] = useState<Point | null>(null)
    const [lastMousePos, setLastMousePos] = useState<Point | null>(null)
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)

    // Text Editing
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState("")

    // Viewport
    const [scale, setScale] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })

    const canvasRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const textInputRef = useRef<HTMLTextAreaElement>(null)

    const isLineSelected = Array.from(selectedIds).some(id => {
        const s = shapes.find(shape => shape.id === id);
        return s && ["line", "arrow", "elbow", "curve"].includes(s.type);
    });

    // -- HELPERS --
    const generateId = () => Math.random().toString(36).substr(2, 9)

    const snap = (val: number) => snapToGrid ? Math.round(val / 20) * 20 : val

    const getCanvasPos = (e: React.MouseEvent | MouseEvent): Point => {
        if (!svgRef.current) return { x: 0, y: 0 }
        const rect = svgRef.current.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left - pan.x) / scale,
            y: (e.clientY - rect.top - pan.y) / scale
        }
    }

    const getClientPos = (e: React.MouseEvent | MouseEvent): Point => ({ x: e.clientX, y: e.clientY })

    // -- ACTIONS --

    const handlePointerDown = (e: React.MouseEvent) => {
        if (editingId) return

        const rawCanvasPos = getCanvasPos(e)
        const canvasPos = tool !== "select" && tool !== "hand" ? { x: snap(rawCanvasPos.x), y: snap(rawCanvasPos.y) } : rawCanvasPos
        const clientPos = getClientPos(e)

        if (tool === "hand" || e.button === 1) {
            setInteraction("panning")
            setLastMousePos(clientPos)
            return
        }

        if (interaction === "resizing") return

        if (tool === "select") {
            if (e.target === svgRef.current || (e.target as Element).id === "canvas-bg") {
                if (!e.shiftKey) setSelectedIds(new Set())
                setInteraction("selecting_area")
                setDragStart(canvasPos)
                setLastMousePos(canvasPos)
            }
            return
        }

        setInteraction("drawing")
        const newId = generateId()

        const isLineType = ["line", "arrow", "elbow", "curve"].includes(tool)

        const baseShape: Shape = {
            id: newId, type: tool as ShapeType, x: canvasPos.x, y: canvasPos.y, width: 0, height: 0,
            fill: "transparent", stroke: "#1e293b", strokeWidth: 2,
            text: tool === "text" ? "Double click to edit" : "",
            fontSize: 16, textAlign: 'center', textAlignVertical: 'middle',
            // Line Defaults
            lineStartMarker: 'none',
            lineEndMarker: isLineType && tool !== 'line' ? 'arrow' : 'none',
            lineStyle: 'solid'
        }

        if (tool === "text") {
            baseShape.width = 160; baseShape.height = 40; baseShape.fill = "transparent"; baseShape.stroke = "transparent"
        } else if (isLineType) {
            baseShape.fill = "none"
        } else {
            baseShape.fill = "#ffffff"
        }

        setShapes(prev => [...prev, baseShape])
        setSelectedIds(new Set([newId]))
        setDragStart(canvasPos)
    }

    const handleShapeMouseDown = (e: React.MouseEvent, shape: Shape) => {
        e.stopPropagation()
        if (tool !== "select") return

        if (shape.locked) {
            if (!e.shiftKey) setSelectedIds(new Set([shape.id]))
            return
        }

        const idsToSelect = new Set(selectedIds)
        const targetIds = shape.groupId ? shapes.filter(s => s.groupId === shape.groupId).map(s => s.id) : [shape.id]

        if (e.shiftKey) {
            if (targetIds.every(id => selectedIds.has(id))) {
                targetIds.forEach(id => idsToSelect.delete(id))
            } else {
                targetIds.forEach(id => idsToSelect.add(id))
            }
        } else {
            if (!selectedIds.has(shape.id)) {
                idsToSelect.clear()
                targetIds.forEach(id => idsToSelect.add(id))
            }
        }

        setSelectedIds(idsToSelect)
        setInteraction("moving")
        setLastMousePos(getCanvasPos(e))
    }

    const handlePointerMove = (e: React.MouseEvent) => {
        if (interaction === "none") return

        const rawCanvasPos = getCanvasPos(e)
        const canvasPos = interaction === "moving" || interaction === "resizing" || interaction === "drawing"
            ? { x: snapToGrid && interaction !== "moving" ? snap(rawCanvasPos.x) : rawCanvasPos.x, y: snapToGrid && interaction !== "moving" ? snap(rawCanvasPos.y) : rawCanvasPos.y }
            : rawCanvasPos

        const clientPos = getClientPos(e)

        if (interaction === "panning" && lastMousePos) {
            const dx = clientPos.x - lastMousePos.x
            const dy = clientPos.y - lastMousePos.y
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
            setLastMousePos(clientPos)
            return
        }

        if (interaction === "moving" && lastMousePos) {
            let dx = rawCanvasPos.x - lastMousePos.x
            let dy = rawCanvasPos.y - lastMousePos.y

            if (snapToGrid && selectedIds.size > 0) {
                const leader = shapes.find(s => s.id === Array.from(selectedIds)[0])
                if (leader) {
                    const targetX = snap(leader.x + dx)
                    const targetY = snap(leader.y + dy)
                    dx = targetX - leader.x
                    dy = targetY - leader.y
                }
            }

            setShapes(prev => prev.map(s => {
                if (selectedIds.has(s.id) && !s.locked) {
                    return { ...s, x: s.x + dx, y: s.y + dy }
                }
                return s
            }))
            setLastMousePos(rawCanvasPos)
            return
        }

        if (interaction === "resizing" && resizeHandle && selectedIds.size === 1) {
            setShapes(prev => prev.map(s => {
                if (!selectedIds.has(s.id) || s.locked) return s

                let { x, y, width, height } = s

                if (resizeHandle === 'se') { width = canvasPos.x - x; height = canvasPos.y - y }
                if (resizeHandle === 'sw') { width = (x + width) - canvasPos.x; x = canvasPos.x; height = canvasPos.y - y }
                if (resizeHandle === 'ne') { height = (y + height) - canvasPos.y; y = canvasPos.y; width = canvasPos.x - x }
                if (resizeHandle === 'nw') {
                    const oldMaxX = x + width
                    const oldMaxY = y + height
                    x = canvasPos.x; y = canvasPos.y
                    width = oldMaxX - x; height = oldMaxY - y
                }

                return { ...s, x, y, width, height }
            }))
            return
        }

        if (interaction === "drawing" && dragStart) {
            setShapes(prev => {
                const newShapes = [...prev]
                const lastIdx = newShapes.length - 1
                const s = newShapes[lastIdx]
                if (!s) return prev

                s.width = canvasPos.x - dragStart.x
                s.height = canvasPos.y - dragStart.y
                return newShapes
            })
        }
    }

    const handlePointerUp = () => {
        if (interaction === "selecting_area" && dragStart && lastMousePos) {
            const x = Math.min(dragStart.x, lastMousePos.x)
            const y = Math.min(dragStart.y, lastMousePos.y)
            const w = Math.abs(dragStart.x - lastMousePos.x)
            const h = Math.abs(dragStart.y - lastMousePos.y)

            const newSelection = new Set<string>()
            shapes.forEach(s => {
                const sx = s.width >= 0 ? s.x : s.x + s.width
                const sy = s.height >= 0 ? s.y : s.y + s.height
                const sw = Math.abs(s.width)
                const sh = Math.abs(s.height)

                if (sx < x + w && sx + sw > x && sy < y + h && sy + sh > y) {
                    newSelection.add(s.id)
                }
            })
            setSelectedIds(newSelection)
        }

        setInteraction("none")
        setDragStart(null)
        setLastMousePos(null)
        setResizeHandle(null)
        if (tool !== "select" && tool !== "hand") setTool("select")
    }

    // -- WHEEL ZOOM --
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const delta = -e.deltaY * 0.001
                setScale(s => Math.min(Math.max(0.1, s + delta), 5))
            } else {
                setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
            }
        }
        const canvas = canvasRef.current
        if (canvas) canvas.addEventListener("wheel", handleWheel, { passive: false })
        return () => canvas?.removeEventListener("wheel", handleWheel)
    }, [])

    // -- ADVANCED FUNCTIONS --
    const duplicateSelected = useCallback(() => {
        if (selectedIds.size === 0) return
        const newSelection = new Set<string>()

        setShapes(prev => {
            const clones = prev.filter(s => selectedIds.has(s.id)).map(s => {
                const newId = generateId()
                newSelection.add(newId)
                return { ...s, id: newId, x: s.x + 20, y: s.y + 20, groupId: undefined }
            })
            return [...prev, ...clones]
        })
        setSelectedIds(newSelection)
    }, [selectedIds])

    const bringToFront = () => {
        if (selectedIds.size === 0) return
        setShapes(prev => {
            const moving = prev.filter(s => selectedIds.has(s.id))
            const others = prev.filter(s => !selectedIds.has(s.id))
            return [...others, ...moving]
        })
    }

    const sendToBack = () => {
        if (selectedIds.size === 0) return
        setShapes(prev => {
            const moving = prev.filter(s => selectedIds.has(s.id))
            const others = prev.filter(s => !selectedIds.has(s.id))
            return [...moving, ...others]
        })
    }

    const groupSelected = () => {
        if (selectedIds.size < 2) return
        const newGroupId = generateId()
        setShapes(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, groupId: newGroupId } : s))
    }

    const ungroupSelected = () => {
        setShapes(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, groupId: undefined } : s))
    }

    const toggleLock = () => {
        setShapes(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, locked: !s.locked } : s))
    }

    // -- TEXT EDITING --
    const handleDoubleClick = (shape: Shape) => {
        if (shape.locked) return
        setEditingId(shape.id)
        setEditText(shape.text || "")
        setTimeout(() => textInputRef.current?.focus(), 10)
    }

    const handleTextSave = () => {
        if (editingId) {
            setShapes(prev => prev.map(s => s.id === editingId ? { ...s, text: editText } : s))
            setEditingId(null)
        }
    }

    // -- KEYBOARD --
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingId) return

            // Nudging
            if (selectedIds.size > 0 && (e.key.startsWith("Arrow"))) {
                e.preventDefault()
                const delta = e.shiftKey ? 10 : 1
                const dx = e.key === "ArrowLeft" ? -delta : e.key === "ArrowRight" ? delta : 0
                const dy = e.key === "ArrowUp" ? -delta : e.key === "ArrowDown" ? delta : 0
                setShapes(prev => prev.map(s => selectedIds.has(s.id) && !s.locked ? { ...s, x: s.x + dx, y: s.y + dy } : s))
                return
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
                setShapes(prev => prev.filter(s => !selectedIds.has(s.id)))
                setSelectedIds(new Set())
            }

            // Shortcuts
            if (e.metaKey || e.ctrlKey) {
                if (e.key === 'g') {
                    e.preventDefault()
                    if (e.shiftKey) ungroupSelected()
                    else groupSelected()
                }
                if (e.key === 'd') {
                    e.preventDefault()
                    duplicateSelected()
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [selectedIds, editingId, duplicateSelected])

    // -- ASSET DRAG --
    const handleDragStart = (e: React.DragEvent, payload: { kind: 'asset' | 'inventory' | 'equipment' | 'project' | 'person', id: string, name?: string }) => {
        e.dataTransfer.setData("application/x-protocolviz", JSON.stringify(payload))
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const raw = e.dataTransfer.getData("application/x-protocolviz")
        if (!raw) return

        let payload: { kind: 'asset' | 'inventory' | 'equipment' | 'project' | 'person', id: string, name?: string }
        try { payload = JSON.parse(raw) } catch { return }

        const pos = getCanvasPos(e as unknown as React.MouseEvent)

        setShapes(prev => {
            const newId = generateId()
            let shape: Shape

            if (payload.kind === 'asset') {
                shape = {
                    id: newId, type: "asset", x: pos.x - 30, y: pos.y - 30, width: 60, height: 60,
                    fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1, assetType: payload.id,
                    textAlign: 'center', textAlignVertical: 'bottom', fontSize: 10
                }
            } else if (payload.kind === 'inventory') {
                shape = {
                    id: newId, type: "asset", x: pos.x - 70, y: pos.y - 28, width: 140, height: 56,
                    fill: "#ffffff", stroke: "#0f766e", strokeWidth: 1.5,
                    textAlign: 'left', textAlignVertical: 'middle', fontSize: 11,
                    linkedEntityType: 'inventory', linkedEntityId: payload.id,
                    text: payload.name
                }
            } else if (payload.kind === 'equipment') {
                shape = {
                    id: newId, type: "asset", x: pos.x - 80, y: pos.y - 28, width: 160, height: 56,
                    fill: "#eef2ff", stroke: "#4f46e5", strokeWidth: 1.5,
                    textAlign: 'left', textAlignVertical: 'middle', fontSize: 11,
                    linkedEntityType: 'equipment', linkedEntityId: payload.id,
                    text: payload.name
                }
            } else {
                // Generic fallback for projects/people for now
                shape = {
                    id: newId, type: "rect", x: pos.x - 60, y: pos.y - 20, width: 120, height: 40,
                    fill: "#ffffff", stroke: "#334155", strokeWidth: 1,
                    textAlign: 'center', textAlignVertical: 'middle', fontSize: 12,
                    text: payload.name || payload.kind
                }
            }

            return [...prev, shape]
        })
    }

    const updateSelectedShapes = (updates: Partial<Shape>) => {
        setShapes(prev => prev.map(s => selectedIds.has(s.id) && !s.locked ? { ...s, ...updates } : s))
    }

    // -- SAVE --
    const handleSave = async () => {
        if (!currentUserProfile?.labId) {
            error("No lab ID found")
            return
        }
        try {
            if (whiteboardId) {
                await updateWhiteboard(whiteboardId, { shapes })
                success("Whiteboard saved successfully")
            } else {
                const newId = await createWhiteboard({
                    name: "New Whiteboard",
                    shapes,
                    createdBy: currentUser?.uid || "unknown",
                    labId: currentUserProfile.labId
                })
                success("New whiteboard created")
                // In a real app we might redirect or update URL here
            }
        } catch (err) {
            console.error(err)
            error("Failed to save whiteboard")
        }
    }

    return (
        <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans text-slate-900">

            {/* --- TOOLBAR --- */}
            <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 z-20 shadow-sm overflow-y-auto no-scrollbar">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mb-4 shadow-lg shrink-0">WB</div>
                {[
                    { id: "select", icon: <MousePointer2 size={20} />, label: "Select" },
                    { id: "hand", icon: <Hand size={20} />, label: "Pan (Space)" },
                    { id: "text", icon: <Type size={20} />, label: "Text" },
                    { id: "rect", icon: <Square size={20} />, label: "Rectangle" },
                    { id: "circle", icon: <Circle size={20} />, label: "Circle" },
                    { id: "diamond", icon: <Diamond size={20} />, label: "Diamond" },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTool(t.id as ToolType)} className={`p-3 rounded-xl transition-all shrink-0 ${tool === t.id ? "bg-indigo-50 text-indigo-600 shadow-inner" : "text-slate-400 hover:bg-slate-50"}`} title={t.label}> {t.icon} </button>
                ))}
                <div className="w-full h-px bg-slate-200 my-1" />
                {[
                    { id: "arrow", icon: <ArrowRight size={20} />, label: "Straight" },
                    { id: "elbow", icon: <CornerDownRight size={20} />, label: "Elbow" },
                    { id: "curve", icon: <Spline size={20} />, label: "Curve" },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTool(t.id as ToolType)} className={`p-3 rounded-xl transition-all shrink-0 ${tool === t.id ? "bg-indigo-50 text-indigo-600 shadow-inner" : "text-slate-400 hover:bg-slate-50"}`} title={t.label}> {t.icon} </button>
                ))}
                <div className="w-full h-px bg-slate-200 my-1" />
                <button onClick={handleSave} className="p-3 rounded-xl transition-all shrink-0 text-slate-400 hover:bg-slate-50" title="Save"> <Save size={20} /> </button>
            </div>

            {/* --- SIDEBAR --- */}
            <WhiteboardSidebar onDragStart={handleDragStart} />

            {/* --- CANVAS --- */}
            <div className="flex-1 relative flex flex-col">
                <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
                    <div className="font-bold text-lg text-slate-800">Protocol Viz</div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSnapToGrid(!snapToGrid)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${snapToGrid ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}> <Grid3X3 size={14} /> Snap: {snapToGrid ? 'ON' : 'OFF'}</button>
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-1.5 hover:bg-white rounded-md text-slate-500"> <Minus size={14} /></button>
                            <span className="text-xs font-mono w-12 text-center"> {Math.round(scale * 100)}% </span>
                            <button onClick={() => setScale(s => Math.min(5, s + 0.1))} className="p-1.5 hover:bg-white rounded-md text-slate-500"> <MoreVertical size={14} className="rotate-90" /> </button>
                        </div>
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">Share</button>
                    </div>
                </div>

                <WhiteboardCanvas
                    shapes={shapes}
                    selectedIds={selectedIds}
                    interaction={interaction}
                    pan={pan}
                    scale={scale}
                    tool={tool}
                    snapToGrid={snapToGrid}
                    editingId={editingId}
                    editText={editText}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onDrop={handleDrop}
                    onShapeMouseDown={handleShapeMouseDown}
                    onShapeDoubleClick={handleDoubleClick}
                    onResizeHandleDown={(e, handle) => { setResizeHandle(handle); setInteraction("resizing") }}
                    setEditText={setEditText}
                    onTextSave={handleTextSave}
                    svgRef={svgRef}
                    canvasRef={canvasRef}
                    textInputRef={textInputRef}
                    dragStart={dragStart}
                    lastMousePos={lastMousePos}
                />

                {selectedIds.size > 0 && !editingId && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-3 rounded-2xl shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in slide-in-from-bottom-4 z-50 min-w-[400px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">{selectedIds.size} Selected</span>
                            <div className="flex gap-1">
                                <button onClick={duplicateSelected} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title="Duplicate (Ctrl+D)"> <Copy size={16} /></button>
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <button onClick={bringToFront} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title="Bring to Front"> <ChevronsUp size={16} /></button>
                                <button onClick={sendToBack} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title="Send to Back"> <ChevronsDown size={16} /></button>
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <button onClick={groupSelected} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title="Group (Ctrl+G)"> <Group size={16} /></button>
                                <button onClick={ungroupSelected} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title="Ungroup"> <Ungroup size={16} /></button>
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <button onClick={toggleLock} className={`p-1.5 hover:bg-slate-100 rounded ${shapes.find(s => selectedIds.has(s.id))?.locked ? 'text-red-500 bg-red-50' : 'text-slate-600'}`} title="Lock"> <Lock size={16} /></button>
                            </div>
                        </div>
                        {!shapes.some(s => selectedIds.has(s.id) && s.locked) && (
                            <div className="flex gap-6">
                                <div className="space-y-2">
                                    <div className="text-[10px] text-slate-400 font-bold">STYLE</div>
                                    <div className="flex gap-1 flex-wrap w-32">
                                        <button onClick={() => updateSelectedShapes({ fill: 'transparent' })} className="w-5 h-5 border border-slate-300 rounded flex items-center justify-center"> <Ban size={10} /></button>
                                        {COLORS.slice(0, 7).map(c => <button key={c.hex} onClick={() => updateSelectedShapes({ fill: c.hex })} className="w-5 h-5 rounded border border-slate-200" style={{ background: c.hex }} />)}
                                    </div>
                                    <div className="flex gap-1 flex-wrap w-32">
                                        <div className="text-[10px] text-slate-400 w-full">Border</div>
                                        {COLORS.slice(3, 10).map(c => <button key={c.hex} onClick={() => updateSelectedShapes({ stroke: c.hex })} className="w-5 h-5 rounded border-2 border-white ring-1 ring-slate-200" style={{ background: c.hex }} />)}
                                    </div>
                                </div>
                                {isLineSelected && (
                                    <>
                                        <div className="w-px bg-slate-100" />
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-slate-400 font-bold">LINE</div>
                                            <div className="flex gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] text-slate-400">Start</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => updateSelectedShapes({ lineStartMarker: 'none' })} className="p-1 border rounded hover:bg-slate-50"> <Minus size={10} /></button>
                                                        <button onClick={() => updateSelectedShapes({ lineStartMarker: 'circle' })} className="p-1 border rounded hover:bg-slate-50"> <Circle size={10} /></button>
                                                        <button onClick={() => updateSelectedShapes({ lineStartMarker: 'arrow' })} className="p-1 border rounded hover:bg-slate-50"> <ArrowRight size={10} className="rotate-180" /> </button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] text-slate-400">End</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => updateSelectedShapes({ lineEndMarker: 'none' })} className="p-1 border rounded hover:bg-slate-50"> <Minus size={10} /></button>
                                                        <button onClick={() => updateSelectedShapes({ lineEndMarker: 'circle' })} className="p-1 border rounded hover:bg-slate-50"> <Circle size={10} /></button>
                                                        <button onClick={() => updateSelectedShapes({ lineEndMarker: 'arrow' })} className="p-1 border rounded hover:bg-slate-50"> <ArrowRight size={10} /> </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
