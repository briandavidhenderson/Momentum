"use server"

import { NextRequest, NextResponse } from "next/server"
import { structureProtocol as structureProtocolAI } from "@/lib/ai/router"
import { buildWhiteboardProtocol } from "@/lib/protocol/graphBuilder"

interface ParseRequestBody {
    text?: string
    metadata?: Record<string, any>
}

export async function POST(req: NextRequest) {
    const body: ParseRequestBody = await req.json()
    if (!body.text || typeof body.text !== "string") {
        return NextResponse.json({ error: "Missing protocol text" }, { status: 400 })
    }

    try {
        const aiResponse = await structureProtocolAI(body.text, {
            normalizeUnits: true,
        })

        const structured = aiResponse.data
        const protocol = buildWhiteboardProtocol(structured, {
            generatedAt: new Date().toISOString(),
            ...(body.metadata || {}),
            objective: structured.objective,
        })

        return NextResponse.json({
            protocol,
            llmProvider: aiResponse.provider,
            confidence: aiResponse.confidence,
            raw: structured
        })
    } catch (error) {
        console.error("Protocol parse failed", error)
        return NextResponse.json({ error: "Failed to parse protocol" }, { status: 500 })
    }
}

