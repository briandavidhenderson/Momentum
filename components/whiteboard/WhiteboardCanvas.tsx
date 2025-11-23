"use client"

import React, { useRef, useEffect } from "react"
import { Shape } from "@/lib/whiteboardService"
import { Lock, Ban, Beaker, AlertTriangle, FileText, Activity, ArrowRight, Circle, Minus } from "lucide-react"
import { ASSETS } from "./WhiteboardSidebar"
import { UnitOperation } from "@/lib/protocol/types"
import { getOperationDefinition } from "./protocolConfig"

interface WhiteboardCanvasProps {
    shapes: Shape[]
    selectedIds: Set<string>
    interaction: "none" | "drawing" | "moving" | "resizing" | "panning" | "selecting_area"
    pan: { x: number, y: number }
    scale: number
    tool: string
    snapToGrid: boolean
    editingId: string | null
    editText: string
    onPointerDown: (e: React.MouseEvent) => void
    onPointerMove: (e: React.MouseEvent) => void
    onPointerUp: () => void
    onDrop: (e: React.DragEvent) => void
    onShapeMouseDown: (e: React.MouseEvent, shape: Shape) => void
    onShapeDoubleClick: (shape: Shape) => void
    onResizeHandleDown: (e: React.MouseEvent, handle: "nw" | "ne" | "sw" | "se") => void
    setEditText: (text: string) => void
    onTextSave: () => void
    svgRef: React.RefObject<SVGSVGElement>
    canvasRef: React.RefObject<HTMLDivElement>
    textInputRef: React.RefObject<HTMLTextAreaElement>
    dragStart: { x: number, y: number } | null
    lastMousePos: { x: number, y: number } | null
}

export function WhiteboardCanvas({
    shapes,
    selectedIds,
    interaction,
    pan,
    scale,
    tool,
    snapToGrid,
    editingId,
    editText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDrop,
    onShapeMouseDown,
    onShapeDoubleClick,
    onResizeHandleDown,
    setEditText,
    onTextSave,
    svgRef,
    canvasRef,
    textInputRef,
    dragStart,
    lastMousePos
}: WhiteboardCanvasProps) {

    const formatSummary = (operation?: UnitOperation) => {
        if (!operation?.parameters) return ""
        const { time, timeUnit, temperature, temperatureUnit, cycleCount } = operation.parameters as Record<string, any>
        const summary: string[] = []
        if (temperature) summary.push(`${temperature}${temperatureUnit || "°C"}`)
        if (time) summary.push(`${time}${timeUnit || "min"}`)
        if (cycleCount) summary.push(`${cycleCount} cycles`)
        return summary.join(" · ")
    }

    // -- RENDER SHAPE --
    const renderShape = (shape: Shape) => {
        const isSelected = selectedIds.has(shape.id)
        const isEditing = editingId === shape.id
        const isPrimarySelection = isSelected && selectedIds.size === 1

        const x = shape.width < 0 ? shape.x + shape.width : shape.x
        const y = shape.height < 0 ? shape.y + shape.height : shape.y
        const w = Math.max(Math.abs(shape.width), 1)
        const h = Math.max(Math.abs(shape.height), 1)

        const commonProps = {
            stroke: shape.stroke, strokeWidth: shape.strokeWidth, fill: shape.fill,
            strokeDasharray: shape.lineStyle === 'dashed' ? "8 8" : shape.lineStyle === 'dotted' ? "2 4" : "none",
            className: `cursor-pointer transition-opacity ${shape.locked ? 'cursor-not-allowed' : 'hover:opacity-90'}`,
            onMouseDown: (e: React.MouseEvent) => onShapeMouseDown(e, shape),
            onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); onShapeDoubleClick(shape) }
        }

        // Markers
        const MarkerDefs = (
            <defs>
                <marker id={`arrow-${shape.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L9,3 z" fill={shape.stroke} />
                </marker>
                <marker id={`circle-${shape.id}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
                    <circle cx="4" cy="4" r="3" fill={shape.stroke} />
                </marker>
            </defs>
        )
        const getMarkers = () => ({
            markerStart: shape.lineStartMarker && shape.lineStartMarker !== 'none' ? `url(#${shape.lineStartMarker}-${shape.id})` : undefined,
            markerEnd: shape.lineEndMarker && shape.lineEndMarker !== 'none' ? `url(#${shape.lineEndMarker}-${shape.id})` : undefined,
        })

        // Selection UI
        const SelectionUI = isSelected && !isEditing ? (
            <g className="pointer-events-none">
                <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} fill="none" stroke={shape.locked ? "#ef4444" : "#3b82f6"} strokeWidth={1.5} strokeDasharray={shape.locked ? "none" : "4 4"} />
                {isPrimarySelection && !shape.locked && (
                    <>
                        <rect x={x - 6} y={y - 6} width={8} height={8} fill="white" stroke="#3b82f6" className="pointer-events-auto cursor-nw-resize" onMouseDown={(e) => { e.stopPropagation(); onResizeHandleDown(e, "nw") }} />
                        <rect x={x + w - 2} y={y - 6} width={8} height={8} fill="white" stroke="#3b82f6" className="pointer-events-auto cursor-ne-resize" onMouseDown={(e) => { e.stopPropagation(); onResizeHandleDown(e, "ne") }} />
                        <rect x={x - 6} y={y + h - 2} width={8} height={8} fill="white" stroke="#3b82f6" className="pointer-events-auto cursor-sw-resize" onMouseDown={(e) => { e.stopPropagation(); onResizeHandleDown(e, "sw") }} />
                        <rect x={x + w - 2} y={y + h - 2} width={8} height={8} fill="white" stroke="#3b82f6" className="pointer-events-auto cursor-se-resize" onMouseDown={(e) => { e.stopPropagation(); onResizeHandleDown(e, "se") }} />
                    </>
                )}
                {shape.locked && <Lock x={x + w + 5} y={y} size={14} className="text-red-500" />}
            </g>
        ) : null

        // Text Positioning
        let tx = x + w / 2, ty = y + h / 2, textAnchor: "start" | "middle" | "end" = "middle", dominantBaseline: "hanging" | "middle" | "auto" = "middle"
        if (shape.textAlign === 'left') { tx = x + 10; textAnchor = "start" }
        if (shape.textAlign === 'right') { tx = x + w - 10; textAnchor = "end" }
        if (shape.textAlignVertical === 'top') { ty = y + 10; dominantBaseline = "hanging" }
        if (shape.textAlignVertical === 'bottom') { ty = y + h - 10; dominantBaseline = "auto" }

        const TextElement = shape.text && !isEditing ? (
            <text x={tx} y={ty} dominantBaseline={dominantBaseline} textAnchor={textAnchor}
                fontSize={shape.fontSize || 16} fontFamily="sans-serif"
                fontWeight={shape.textBold ? "bold" : "normal"} fontStyle={shape.textItalic ? "italic" : "normal"} textDecoration={shape.textUnderline ? "underline" : "none"}
                fill="#1e293b" pointerEvents="none" style={{ whiteSpace: 'pre-wrap' }}>
                {shape.text}
            </text>
        ) : null

        const EditOverlay = isEditing ? (
            <foreignObject x={x} y={y} width={w} height={h}>
                <div className={`w-full h-full flex flex-col ${shape.textAlignVertical === 'top' ? 'justify-start pt-2' : shape.textAlignVertical === 'bottom' ? 'justify-end pb-2' : 'justify-center'}`}>
                    <textarea ref={textInputRef} value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={onTextSave} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onTextSave(); } }}
                        className="bg-transparent resize-none outline-none text-slate-900 overflow-hidden w-full px-2"
                        style={{ fontSize: `${shape.fontSize || 16}px`, lineHeight: '1.2', textAlign: shape.textAlign || 'center', fontWeight: shape.textBold ? "bold" : "normal", fontStyle: shape.textItalic ? "italic" : "normal", textDecoration: shape.textUnderline ? "underline" : "none" }}
                        placeholder="Type..." />
                </div>
            </foreignObject>
        ) : null

        // Paths
        const linePath = `M ${shape.x} ${shape.y} L ${shape.x + shape.width} ${shape.y + shape.height}`
        const elbowPath = `M ${shape.x} ${shape.y} H ${shape.x + shape.width / 2} V ${shape.y + shape.height} H ${shape.x + shape.width}`
        const curvePath = `M ${shape.x} ${shape.y} C ${shape.x + shape.width / 2} ${shape.y}, ${shape.x + shape.width / 2} ${shape.y + shape.height}, ${shape.x + shape.width} ${shape.y + shape.height}`

        // Asset Content
        let assetContent: any = null
        if (shape.type === 'asset') {
            if (shape.linkedEntityType === 'inventory') {
                // Placeholder for now, will be enriched by parent or context if needed, 
                // but for canvas rendering we might just use the stored data if we had it, 
                // or just render a generic placeholder if we don't want to fetch inside the loop.
                // Ideally, the shape should contain enough info to render, or we fetch data in the parent.
                // For this refactor, I'll keep it simple and assume we might not have full live data 
                // inside the canvas render loop without prop drilling everything.
                // However, the original code used global constants. 
                // We will use a simple fallback display.
                assetContent = (
                    <div className="w-full h-full flex flex-col justify-center gap-0.5 p-2">
                        <div className="flex items-center gap-1"> <Beaker className="w-3 h-3 text-sky-600" /> <span className="text-[11px] font-semibold truncate"> {shape.text || "Reagent"} </span></div>
                        <div className="flex justify-between text-[10px] text-slate-500"> <span>Inventory Item</span></div>
                    </div>
                )
            } else if (shape.linkedEntityType === 'equipment') {
                assetContent = (
                    <div className="w-full h-full flex flex-col justify-center gap-0.5 p-2">
                        <div className="flex items-center gap-1"> <Activity className="w-3 h-3 text-indigo-600" /> <span className="text-[11px] font-semibold truncate"> {shape.text || "Equipment"} </span></div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-0.5"> <span>Device</span></div>
                    </div>
                )
            } else {
                const asset = ASSETS.find(a => a.id === shape.assetType)
                const Icon = asset?.Icon || Ban
                assetContent = (<div className="w-full h-full flex flex-col items-center justify-center text-slate-500"> <Icon className="w-6 h-6" /> <span className="text-[10px] font-bold mt-1 uppercase"> {asset?.label ?? shape.assetType} </span></div>)
            }
        }

        const protocolOperation = shape.type === "protocol_node" ? shape.protocolData : undefined
        const definition = protocolOperation ? getOperationDefinition(protocolOperation.type) : null
        const ProtocolIcon = definition?.Icon || Beaker
        const protocolSummary = formatSummary(protocolOperation)
        const accent = definition?.color || "#cbd5e1"

        const content = (
            <>
                {shape.type === "rect" && <rect x={x} y={y} width={w} height={h} rx={4} {...commonProps} />}
                {shape.type === "circle" && <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...commonProps} />}
                {shape.type === "triangle" && <polygon points={`${x + w / 2},${y} ${x},${y + h} ${x + w},${y + h}`} {...commonProps} />}
                {shape.type === "diamond" && <polygon points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`} {...commonProps} />}
                {shape.type === "hexagon" && <polygon points={`${x + w / 4},${y} ${x + w - w / 4},${y} ${x + w},${y + h / 2} ${x + w - w / 4},${y + h} ${x + w / 4},${y + h} ${x},${y + h / 2}`} {...commonProps} />}
                {shape.type === "star" && <polygon points={Array.from({ length: 10 }).map((_, i) => { const r = i % 2 === 0 ? Math.min(w, h) / 2 : Math.min(w, h) / 5; const a = Math.PI / 2 + i * Math.PI / 5; return `${(x + w / 2) - r * Math.cos(a)},${(y + h / 2) - r * Math.sin(a)}` }).join(" ")} {...commonProps} />}

                {(shape.type === "line" || shape.type === "arrow") && <path d={linePath} {...commonProps} fill="none" {...getMarkers()} />}
                {shape.type === "elbow" && <path d={elbowPath} {...commonProps} fill="none" {...getMarkers()} />}
                {shape.type === "curve" && <path d={curvePath} {...commonProps} fill="none" {...getMarkers()} />}

                {shape.type === "text" && !isEditing && (() => {
                    const { stroke, fill, ...propsRest } = commonProps;
                    return <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} {...propsRest} fill="transparent" stroke="none" />
                })()}
                {shape.type === "protocol_node" && (
                    <g transform={`translate(${x}, ${y})`} className={commonProps.className} onMouseDown={commonProps.onMouseDown} onDoubleClick={commonProps.onDoubleClick}>
                        <rect width={w} height={h} rx={16} fill="#ffffff" stroke={accent} strokeWidth={1.6} />
                        <foreignObject width={w} height={h} className="pointer-events-none">
                            <div className="w-full h-full flex flex-col justify-between p-3 text-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: `${accent}` }}>
                                        <ProtocolIcon className="w-5 h-5 opacity-95" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold leading-tight">{protocolOperation?.label || "Protocol Step"}</p>
                                        <p className="text-[11px] uppercase tracking-wide" style={{ color: accent }}>{definition?.label || protocolOperation?.type || "custom"}</p>
                                    </div>
                                </div>
                                {protocolSummary && <p className="text-xs text-slate-500 mt-2">{protocolSummary}</p>}
                                {protocolOperation?.objects && protocolOperation.objects.length > 0 && (
                                    <p className="text-[11px] text-slate-500 truncate">With {protocolOperation.objects.join(", ")}</p>
                                )}
                            </div>
                        </foreignObject>
                    </g>
                )}
                {
                    shape.type === "asset" && (
                        <g transform={`translate(${x}, ${y})`} className={commonProps.className} onMouseDown={commonProps.onMouseDown} onDoubleClick={commonProps.onDoubleClick}>
                            <rect width={w} height={h} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} rx={8} />
                            <foreignObject width={w} height={h} className="pointer-events-none"> {assetContent} </foreignObject>
                        </g>
                    )
                }
            </>
        )

        return <g key={shape.id}> {MarkerDefs}{content} {TextElement} {EditOverlay} {SelectionUI} </g>
    }

    return (
        <div ref={canvasRef} className={`flex-1 bg-slate-100 relative overflow-hidden ${tool === 'hand' || interaction === 'panning' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>

            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />

            <svg ref={svgRef} className="w-full h-full absolute inset-0" id="canvas-bg">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                    {shapes.map(renderShape)}
                    {interaction === "selecting_area" && dragStart && lastMousePos && <rect x={Math.min(dragStart.x, lastMousePos.x)} y={Math.min(dragStart.y, lastMousePos.y)} width={Math.abs(dragStart.x - lastMousePos.x)} height={Math.abs(dragStart.y - lastMousePos.y)} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth={1} />}
                </g>
            </svg>
        </div>
    )
}
