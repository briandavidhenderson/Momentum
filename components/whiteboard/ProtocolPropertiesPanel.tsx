"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UnitOperation } from "@/lib/protocol/types"
import { PROTOCOL_OPERATIONS, getOperationDefinition } from "./protocolConfig"

interface ProtocolPropertiesPanelProps {
    operation: UnitOperation | null
    onChange: (updated: UnitOperation) => void
}

export function ProtocolPropertiesPanel({ operation, onChange }: ProtocolPropertiesPanelProps) {
    if (!operation) return null

    const definition = getOperationDefinition(operation.type)

    const updateOperation = (updates: Partial<UnitOperation>) => {
        onChange({
            ...operation,
            ...updates,
        })
    }

    const updateParameter = (key: string, value: string) => {
        updateOperation({
            parameters: {
                ...(operation.parameters || {}),
                [key]: value,
            }
        })
    }

    const updateMetadata = (key: string, value: any) => {
        updateOperation({
            metadata: {
                ...(operation.metadata || {}),
                [key]: value,
            }
        })
    }

    const handleObjectsChange = (value: string) => {
        const objects = value.split(",").map(obj => obj.trim()).filter(Boolean)
        updateOperation({ objects })
    }

    const handleTypeChange = (nextType: string) => {
        const nextDefinition = getOperationDefinition(nextType)
        const shouldKeepLabel = operation.label && operation.label !== definition.label
        updateOperation({
            type: nextType,
            label: shouldKeepLabel ? operation.label : nextDefinition.label,
            parameters: { ...(nextDefinition.defaultParameters || {}) }
        })
    }

    const renderParameterFields = () => {
        if (definition.parameterFields.length === 0) return null
        return (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3" style={{ borderColor: `${definition.color}33` }}>
                <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase text-slate-400 tracking-wide">Parameters</Label>
                    <span className="text-[11px] font-semibold" style={{ color: definition.color }}>{definition.label}</span>
                </div>
                {definition.parameterFields.map((field) => {
                    const value = operation.parameters?.[field.key]
                    const stringValue = value === undefined || value === null ? "" : String(value)
                    const commonProps = {
                        placeholder: field.placeholder,
                        value: stringValue,
                        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateParameter(field.key, e.target.value)
                    }
                    return (
                        <div key={field.key} className="space-y-1.5">
                            <Label>{field.label}</Label>
                            {field.type === "textarea" ? (
                                <Textarea rows={3} {...commonProps} />
                            ) : (
                                <Input
                                    type={field.type === "number" ? "number" : "text"}
                                    inputMode={field.type === "number" ? "decimal" : "text"}
                                    {...commonProps}
                                />
                            )}
                            {field.helper && <p className="text-[11px] text-slate-500">{field.helper}</p>}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col">
            <div className="p-4 border-b border-slate-100" style={{ borderColor: definition.color, borderLeftWidth: 4 }}>
                <p className="text-xs uppercase text-slate-500 tracking-wide font-semibold">Protocol Step</p>
                <p className="text-sm text-slate-900 mt-1">{operation.label || "Untitled Step"}</p>
                <p className="text-xs text-slate-500 mt-1">{definition.description}</p>
                <span className="text-[11px] font-semibold mt-2 inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: definition.color }} />
                    {definition.label}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="protocol-label">Label</Label>
                    <Input
                        id="protocol-label"
                        value={operation.label || ""}
                        placeholder="e.g. Incubate at 37°C"
                        onChange={(e) => updateOperation({ label: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="protocol-type">Type</Label>
                    <select
                        id="protocol-type"
                        value={operation.type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {PROTOCOL_OPERATIONS.map(opt => (
                            <option key={opt.type} value={opt.type}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {renderParameterFields()}

                <div className="space-y-1.5">
                    <Label>Objects / Materials</Label>
                    <Input
                        value={(operation.objects || []).join(", ")}
                        onChange={(e) => handleObjectsChange(e.target.value)}
                        placeholder="Buffer X, Sample Y"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="protocol-notes">Notes</Label>
                    <Textarea
                        id="protocol-notes"
                        rows={4}
                        value={operation.metadata?.notes || ""}
                        onChange={(e) => updateMetadata("notes", e.target.value)}
                        placeholder="Add procedural notes..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>Equipment</Label>
                        <Input
                            value={operation.metadata?.equipment || ""}
                            onChange={(e) => updateMetadata("equipment", e.target.value)}
                            placeholder="Incubator #5"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Samples</Label>
                        <Input
                            value={(operation.metadata?.sampleIds || []).join(", ")}
                            onChange={(e) => updateMetadata("sampleIds", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                            placeholder="Sample A, Sample B"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

