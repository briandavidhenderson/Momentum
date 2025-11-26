import { NextRequest, NextResponse } from "next/server"
import pdfParse from "pdf-parse"
import { structureProtocol } from "@/lib/ai/router"
import { WHITEBOARD_PROTOCOL_PROMPT } from "@/lib/ai/prompts"
import { buildWhiteboardProtocol } from "@/lib/protocol/graphBuilder"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get("file")
        const fallbackText = formData.get("text")?.toString() || ""
        const protocolName = formData.get("name")?.toString() || "Imported Protocol"
        const description = formData.get("description")?.toString()

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ error: "A PDF file is required under field 'file'." }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "PDF exceeds 15MB limit." }, { status: 413 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const pdfBuffer = Buffer.from(arrayBuffer)
        const pdfData = await pdfParse(pdfBuffer)
        const combinedText = `${pdfData.text?.trim() || ""}\n\n${fallbackText}`

        if (!combinedText.trim()) {
            return NextResponse.json({ error: "Could not extract text from the PDF." }, { status: 400 })
        }

        const aiResponse = await structureProtocol(combinedText, {
            systemPrompt: WHITEBOARD_PROTOCOL_PROMPT,
            maxTokens: 4000,
        })

        const protocol = buildWhiteboardProtocol(aiResponse.data, {
            name: protocolName,
            description,
            sourceFile: file instanceof File ? file.name : undefined,
            generatedAt: new Date().toISOString(),
            objective: aiResponse.data.objective,
        })

        return NextResponse.json({
            protocol,
            llmProvider: aiResponse.provider,
            confidence: aiResponse.confidence,
            rawTextPreview: combinedText.slice(0, 4000),
        })
    } catch (error) {
        console.error("Failed to import protocol from PDF", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to process document"
        return NextResponse.json({
            error: "Failed to process document",
            details: errorMessage
        }, { status: 500 })
    }
}

