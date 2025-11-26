"use client"

import React, { useRef, useEffect } from "react"
import { Shape } from "@/lib/whiteboardService"
import { Lock, Ban, Beaker, AlertTriangle, FileText, Activity, ArrowRight, Circle, Minus, CheckCircle2, XCircle } from "lucide-react"
import { ASSETS } from "./WhiteboardSidebar"
import { UnitOperation } from "@/lib/protocol/types"
import { getOperationDefinition } from "./protocolConfig"
import { useAppContext } from "@/lib/AppContext"

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
    const { inventory, equipment } = useAppContext()

    // Topological sort to compute step numbers
    const computeStepNumbers = (): Map<string, number> => {
        const stepNumbers = new Map<string, number>()
        const protocolNodes = shapes.filter(s => s.type === "protocol_node")

        // Build adjacency list from connections (arrows)
        const outgoing = new Map<string, string[]>()
        const incoming = new Map<string, number>()

        protocolNodes.forEach(node => {
            outgoing.set(node.id, [])
            incoming.set(node.id, 0)
        })

        // Find connections from arrow shapes
        const arrows = shapes.filter(s => ["line", "arrow", "elbow", "curve"].includes(s.type))
        arrows.forEach(arrow => {
            if (arrow.fromNodeId && arrow.toNodeId) {
                const fromNode = protocolNodes.find(n => n.id === arrow.fromNodeId)
                const toNode = protocolNodes.find(n => n.id === arrow.toNodeId)
                if (fromNode && toNode && fromNode.id !== toNode.id) {
                    outgoing.get(fromNode.id)!.push(toNode.id)
                    incoming.set(toNode.id, (incoming.get(toNode.id) || 0) + 1)
                }
            }
        })

        // Group nodes by parallelGroupId
        const parallelGroups = new Map<string, Set<string>>()
        protocolNodes.forEach(node => {
            if (node.parallelGroupId) {
                if (!parallelGroups.has(node.parallelGroupId)) {
                    parallelGroups.set(node.parallelGroupId, new Set())
                }
                parallelGroups.get(node.parallelGroupId)!.add(node.id)
            }
        })

        // Kahn's algorithm for topological sort
        const queue: string[] = []
        protocolNodes.forEach(node => {
            if (incoming.get(node.id) === 0) queue.push(node.id)
        })

        let stepNumber = 1
        const visited = new Set<string>()

        while (queue.length > 0) {
            const batchSize = queue.length
            const currentBatch: string[] = []

            // Process all nodes at current level
            for (let i = 0; i < batchSize; i++) {
                const nodeId = queue.shift()!
                if (visited.has(nodeId)) continue

                currentBatch.push(nodeId)

                // If this node is in a parallel group, add all group members to this batch
                const node = protocolNodes.find(n => n.id === nodeId)
                if (node?.parallelGroupId && parallelGroups.has(node.parallelGroupId)) {
                    const groupNodes = parallelGroups.get(node.parallelGroupId)!
                    groupNodes.forEach(gNodeId => {
                        if (!visited.has(gNodeId)) {
                            currentBatch.push(gNodeId)
                        }
                    })
                }
            }

            // Assign same step number to all nodes in current batch
            currentBatch.forEach(nodeId => {
                if (!visited.has(nodeId)) {
                    stepNumbers.set(nodeId, stepNumber)
                    visited.add(nodeId)

                    // Reduce incoming count for neighbors
                    outgoing.get(nodeId)?.forEach(neighborId => {
                        const count = incoming.get(neighborId)! - 1
                        incoming.set(neighborId, count)
                        if (count === 0 && !visited.has(neighborId)) {
                            queue.push(neighborId)
                        }
                    })
                }
            })

            if (currentBatch.length > 0) stepNumber++
        }

        // Assign numbers to any remaining unconnected nodes
        protocolNodes.forEach(node => {
            if (!stepNumbers.has(node.id)) {
                stepNumbers.set(node.id, stepNumber++)
            }
        })

        return stepNumbers
    }

    const stepNumbers = computeStepNumbers()

    const buildSummaryFromConfig = (operation?: UnitOperation): string => {
        if (!operation) return ""
        const definition = getOperationDefinition(operation.type)

        if (definition.summaryFormatter && operation.parameters) {
            return definition.summaryFormatter(operation.parameters)
        }

        if (definition.summaryFields && operation.parameters) {
            return definition.summaryFields
                .map(key => {
                    const value = operation.parameters?.[key]
                    const unit = operation.parameters?.[`${key}Unit`]
                    return value ? (unit ? `${value}${unit}` : value) : null
                })
                .filter(Boolean)
                .join(' · ')
        }

        return ""
    }

    const renderParallelGroupBackgrounds = () => {
        // Group shapes by parallelGroupId
        const groups = new Map<string, Shape[]>()
        shapes
            .filter(s => s.type === "protocol_node" && s.parallelGroupId)
            .forEach(shape => {
                const groupId = shape.parallelGroupId!
                if (!groups.has(groupId)) groups.set(groupId, [])
                groups.get(groupId)!.push(shape)
            })

        // Render backgrounds for each group
        return Array.from(groups.entries()).map(([groupId, nodes]) => {
            // Calculate bounding box with padding
            const xs = nodes.map(n => n.x)
            const ys = nodes.map(n => n.y)
            const ws = nodes.map(n => n.x + n.width)
            const hs = nodes.map(n => n.y + n.height)

            const minX = Math.min(...xs) - 20
            const minY = Math.min(...ys) - 20
            const maxX = Math.max(...ws) + 20
            const maxY = Math.max(...hs) + 20

            return (
                <g key={`parallel-group-${groupId}`}>
                    <rect
                        x={minX}
                        y={minY}
                        width={maxX - minX}
                        height={maxY - minY}
                        fill="rgba(236, 72, 153, 0.05)"
                        stroke="#ec4899"
                        strokeWidth="2"
                        strokeDasharray="8 4"
                        rx="8"
                        className="pointer-events-none"
                    />
                    <text
                        x={minX + 10}
                        y={minY - 5}
                        fontSize="11"
                        fill="#ec4899"
                        fontWeight="600"
                        className="pointer-events-none"
                    >
                        Parallel Execution
                    </text>
                </g>
            )
        })
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
                const inventoryItem = inventory?.find(item => item.id === shape.linkedEntityId)
                const level = inventoryItem?.inventoryLevel || 'unknown'

                assetContent = (
                    <div className="w-full h-full flex flex-col justify-between p-3 text-slate-800">
                        <div className="flex items-start gap-2">
                            <Beaker className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold leading-tight truncate">{shape.text || "Inventory item"}</div>
                                <div className="text-[10px] text-slate-500 leading-tight truncate">
                                    {inventoryItem ? `Qty: ${inventoryItem.currentQuantity || 0}` : 'Stocked resource'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Inventory</span>
                            {inventoryItem && (
                                level === 'empty' ? (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">
                                        <XCircle className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-semibold">Empty</span>
                                    </span>
                                ) : level === 'low' ? (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-semibold">Low</span>
                                    </span>
                                ) : level === 'full' || level === 'medium' ? (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-semibold capitalize">{level}</span>
                                    </span>
                                ) : null
                            )}
                        </div>
                    </div>
                )
            } else if (shape.linkedEntityType === 'equipment') {
                const equipmentItem = equipment?.find(eq => eq.id === shape.linkedEntityId)

                // Calculate maintenance status
                let maintenanceNeeded = false
                if (equipmentItem && equipmentItem.lastMaintained && equipmentItem.maintenanceDays) {
                    const lastMaintained = new Date(equipmentItem.lastMaintained)
                    const daysSince = Math.floor((Date.now() - lastMaintained.getTime()) / (1000 * 60 * 60 * 24))
                    const threshold = equipmentItem.threshold || 80
                    const percentUsed = (daysSince / equipmentItem.maintenanceDays) * 100
                    maintenanceNeeded = percentUsed >= threshold
                }

                assetContent = (
                    <div className="w-full h-full flex flex-col justify-between p-3 text-slate-800">
                        <div className="flex items-start gap-2">
                            <Activity className="w-4 h-4 text-indigo-700 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold leading-tight truncate">{shape.text || "Equipment"}</div>
                                <div className="text-[10px] text-slate-500 leading-tight truncate">
                                    {equipmentItem ? `${equipmentItem.make || ''} ${equipmentItem.model || ''}`.trim() || 'Device' : 'Device'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">Equipment</span>
                            {equipmentItem && (
                                maintenanceNeeded ? (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-semibold">Maint</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-semibold">Ready</span>
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                )
            } else {
                const asset = ASSETS.find(a => a.id === shape.assetType)
                const Icon = asset?.Icon || Ban
                assetContent = (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-2 gap-1">
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase truncate max-w-[90%] text-center">
                            {asset?.label ?? shape.assetType}
                        </span>
                    </div>
                )
            }
        }

        const protocolOperation = shape.type === "protocol_node" ? shape.protocolData : undefined
        const definition = protocolOperation ? getOperationDefinition(protocolOperation.type) : null
        const ProtocolIcon = definition?.Icon || Beaker
        const protocolSummary = buildSummaryFromConfig(protocolOperation)
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
                        {/* Step Number Badge */}
                        {stepNumbers.has(shape.id) && (
                            <g transform={`translate(${w - 28}, 8)`}>
                                <circle cx="12" cy="12" r="12" fill={accent} opacity="0.9" />
                                <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="11" fontWeight="600">
                                    {stepNumbers.get(shape.id)}
                                </text>
                            </g>
                        )}
                        <foreignObject width={w} height={h} className="pointer-events-none">
                            <div className="w-full h-full flex flex-col justify-between p-2.5 text-slate-700">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: `${accent}` }}>
                                        <ProtocolIcon className="w-4 h-4 opacity-95" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold leading-tight truncate">{protocolOperation?.label || "Protocol Step"}</p>
                                        <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: accent }}>{definition?.label || protocolOperation?.type || "custom"}</p>
                                    </div>
                                </div>
                                {protocolSummary && <p className="text-[11px] text-slate-500 mt-1.5 leading-tight line-clamp-2">{protocolSummary}</p>}
                                {protocolOperation?.objects && protocolOperation.objects.length > 0 && (
                                    <p className="text-[10px] text-slate-500 truncate leading-tight mt-1">With {protocolOperation.objects.join(", ")}</p>
                                )}
                                {shape.parallelGroupId && (
                                    <div className="mt-1 flex items-center gap-1">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-200 font-semibold">∥ Parallel</span>
                                    </div>
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
                    {renderParallelGroupBackgrounds()}
                    {shapes.map(renderShape)}
                    {interaction === "selecting_area" && dragStart && lastMousePos && <rect x={Math.min(dragStart.x, lastMousePos.x)} y={Math.min(dragStart.y, lastMousePos.y)} width={Math.abs(dragStart.x - lastMousePos.x)} height={Math.abs(dragStart.y - lastMousePos.y)} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth={1} />}
                </g>
            </svg>
        </div>
    )
}
