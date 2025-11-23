"use client"

import {
    Activity,
    Gauge,
    Pipette,
    FlaskConical,
    Thermometer,
    Snowflake,
    Timer,
    LineChart,
    Beaker
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import { UnitOperationType } from "@/lib/protocol/types"

export type ParameterInputType = "text" | "number" | "textarea"

export interface ProtocolParameterField {
    key: string
    label: string
    type: ParameterInputType
    placeholder?: string
    helper?: string
}

export interface ProtocolOperationDefinition {
    type: UnitOperationType | string
    label: string
    description: string
    color: string
    Icon: LucideIcon
    parameterFields: ProtocolParameterField[]
    defaultParameters?: Record<string, any>
}

const base = {
    mix: {
        color: "#2563eb",
        Icon: FlaskConical
    },
    heat: {
        color: "#f97316",
        Icon: Thermometer
    },
    cool: {
        color: "#0ea5e9",
        Icon: Snowflake
    },
    incubate: {
        color: "#ef4444",
        Icon: Timer
    },
    centrifuge: {
        color: "#a855f7",
        Icon: Gauge
    },
    pipette: {
        color: "#10b981",
        Icon: Pipette
    },
    measure: {
        color: "#14b8a6",
        Icon: LineChart
    },
    thermocycle: {
        color: "#d946ef",
        Icon: Activity
    },
    custom: {
        color: "#475569",
        Icon: Beaker
    }
} as const

export const PROTOCOL_OPERATIONS: ProtocolOperationDefinition[] = [
    {
        type: "mix",
        label: "Mix / Agitate",
        description: "Combine reagents or samples",
        color: base.mix.color,
        Icon: base.mix.Icon,
        parameterFields: [
            { key: "time", label: "Duration (min)", type: "number", placeholder: "5" },
            { key: "speed", label: "Speed / Mode", type: "text", placeholder: "gentle / vortex" }
        ],
        defaultParameters: { time: 5, timeUnit: "min", speed: "gentle" }
    },
    {
        type: "heat",
        label: "Heat",
        description: "Increase temperature",
        color: base.heat.color,
        Icon: base.heat.Icon,
        parameterFields: [
            { key: "temperature", label: "Target Temp (°C)", type: "number", placeholder: "95" },
            { key: "time", label: "Hold Time (min)", type: "number", placeholder: "10" }
        ],
        defaultParameters: { temperature: 95, temperatureUnit: "°C", time: 10, timeUnit: "min" }
    },
    {
        type: "cool",
        label: "Cool / Chill",
        description: "Reduce temperature",
        color: base.cool.color,
        Icon: base.cool.Icon,
        parameterFields: [
            { key: "temperature", label: "Target Temp (°C)", type: "number", placeholder: "4" },
            { key: "time", label: "Duration (min)", type: "number", placeholder: "15" }
        ],
        defaultParameters: { temperature: 4, temperatureUnit: "°C", time: 15, timeUnit: "min" }
    },
    {
        type: "incubate",
        label: "Incubate",
        description: "Hold at temperature",
        color: base.incubate.color,
        Icon: base.incubate.Icon,
        parameterFields: [
            { key: "temperature", label: "Temperature (°C)", type: "number", placeholder: "37" },
            { key: "time", label: "Duration (min)", type: "number", placeholder: "30" },
            { key: "atmosphere", label: "Atmosphere", type: "text", placeholder: "CO₂, dark, shaking..." }
        ],
        defaultParameters: { temperature: 37, temperatureUnit: "°C", time: 30, timeUnit: "min" }
    },
    {
        type: "centrifuge",
        label: "Centrifuge",
        description: "Spin down samples",
        color: base.centrifuge.color,
        Icon: base.centrifuge.Icon,
        parameterFields: [
            { key: "speed", label: "Speed (rpm or g)", type: "text", placeholder: "5000 rpm" },
            { key: "time", label: "Duration (min)", type: "number", placeholder: "5" },
            { key: "temperature", label: "Temperature (°C)", type: "number", placeholder: "4" }
        ],
        defaultParameters: { speed: "5000", speedUnit: "rpm", time: 5, timeUnit: "min", temperature: 4, temperatureUnit: "°C" }
    },
    {
        type: "pipette",
        label: "Pipette / Transfer",
        description: "Move liquids between vessels",
        color: base.pipette.color,
        Icon: base.pipette.Icon,
        parameterFields: [
            { key: "volume", label: "Volume", type: "number", placeholder: "10" },
            { key: "volumeUnit", label: "Volume Unit", type: "text", placeholder: "µL" },
            { key: "from", label: "From", type: "text", placeholder: "Tube A" },
            { key: "to", label: "To", type: "text", placeholder: "Tube B" }
        ],
        defaultParameters: { volume: 10, volumeUnit: "µL" }
    },
    {
        type: "measure",
        label: "Measurement",
        description: "Collect a readout",
        color: base.measure.color,
        Icon: base.measure.Icon,
        parameterFields: [
            { key: "measurementType", label: "Measurement Type", type: "text", placeholder: "Absorbance" },
            { key: "wavelength", label: "Wavelength / Filter", type: "text", placeholder: "600 nm" },
            { key: "instrument", label: "Instrument Mode", type: "text", placeholder: "Plate reader" }
        ],
        defaultParameters: { measurementType: "Absorbance" }
    },
    {
        type: "thermocycle",
        label: "Thermocycle",
        description: "PCR or cycling program",
        color: base.thermocycle.color,
        Icon: base.thermocycle.Icon,
        parameterFields: [
            { key: "cycleCount", label: "# of Cycles", type: "number", placeholder: "30" },
            { key: "denatureTemp", label: "Denature Temp (°C)", type: "number", placeholder: "95" },
            { key: "denatureTime", label: "Denature Time (sec)", type: "number", placeholder: "30" },
            { key: "annealTemp", label: "Anneal Temp (°C)", type: "number", placeholder: "60" },
            { key: "annealTime", label: "Anneal Time (sec)", type: "number", placeholder: "30" },
            { key: "extensionTemp", label: "Extension Temp (°C)", type: "number", placeholder: "72" },
            { key: "extensionTime", label: "Extension Time (sec)", type: "number", placeholder: "60" },
            { key: "holdTemp", label: "Final Hold Temp (°C)", type: "number", placeholder: "4" }
        ],
        defaultParameters: {
            cycleCount: 30,
            denatureTemp: 95,
            denatureTime: 30,
            annealTemp: 60,
            annealTime: 30,
            extensionTemp: 72,
            extensionTime: 60,
            holdTemp: 4
        }
    },
    {
        type: "custom",
        label: "Custom Step",
        description: "Free-form operation",
        color: base.custom.color,
        Icon: base.custom.Icon,
        parameterFields: [
            { key: "time", label: "Duration", type: "text", placeholder: "15 min" },
            { key: "temperature", label: "Temperature", type: "text", placeholder: "Room temp" },
            { key: "details", label: "Details", type: "textarea", placeholder: "Add procedural notes or specifics" }
        ]
    }
]

export const getOperationDefinition = (type: string): ProtocolOperationDefinition => {
    return PROTOCOL_OPERATIONS.find(def => def.type === type) || PROTOCOL_OPERATIONS.find(def => def.type === "custom")!
}

