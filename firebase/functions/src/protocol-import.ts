import * as functions from "firebase-functions/v1"
import pdfParse from "pdf-parse"
import Busboy from "busboy"
import cors from "cors"
import { randomUUID } from "crypto"
import { defineSecret } from "firebase-functions/params"

const corsHandler = cors({ origin: true })
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY")

interface UploadedFile {
  buffer: Buffer
  fileName?: string
  mimeType?: string
  size: number
}

interface StepParameter {
  name: string
  value: string
  unit?: string
}

interface ProtocolStep {
  stepNumber?: number
  action: string
  duration?: string | number
  temperature?: string | number
  speed?: string | number
  notes?: string
  safetyFlags?: string[]
  parameters?: StepParameter[]
}

interface ProtocolStructure {
  objective?: string
  steps: ProtocolStep[]
  confidence?: number
}

interface UnitOperation {
  id: string
  type: string
  label?: string
  parameters?: Record<string, any>
  objects?: string[]
  inputs?: string[]
  outputs?: string[]
  metadata?: Record<string, any>
}

interface ProtocolNode extends UnitOperation {
  x: number
  y: number
  width?: number
  height?: number
}

interface ProtocolConnection {
  from: string
  to: string
}

interface ProtocolExport {
  metadata?: Record<string, any>
  nodes: ProtocolNode[]
  connections: ProtocolConnection[]
}

const NODE_WIDTH = 240
const NODE_HEIGHT = 140
const NODE_SPACING_X = 280
const NODE_START_X = 120
const NODE_BASELINE_Y = 200

const WHITEBOARD_PROTOCOL_PROMPT = `You are a lab protocol visualization assistant. Convert the provided experimental procedure into a structured protocol for a whiteboard editor.

Return strict JSON with this structure:
{
  "objective": "Goal of the experiment",
  "confidence": 0-100,
  "steps": [
    {
      "stepNumber": 1,
      "action": "Incubate",
      "duration": "15 min",
      "temperature": "37 °C",
      "speed": "500 rpm",
      "notes": "Additional guidance or safety info",
      "safetyFlags": ["Gloves", "Biosafety cabinet"],
      "parameters": [
        { "name": "time", "value": "15", "unit": "min" },
        { "name": "temperature", "value": "37", "unit": "°C" }
      ]
    }
  ]
}

Guidelines:
- Preserve chronological order.
- Every step must have an "action" verb (mix, heat, incubate, centrifuge, pipette, measure, thermocycle, custom).
- Include all key parameters (time, temperature, volume, speed, cycle count, etc.).
- Include safety notes when mentioned.
- If information is missing, omit it rather than guessing.
- The response must be valid JSON with no additional commentary.`

function sanitizeType(action?: string) {
  if (!action) return "custom"
  return action.toLowerCase().replace(/\s+/g, "_")
}

function reduceParameters(step: ProtocolStep) {
  const params: Record<string, any> = {}
  step.parameters?.forEach(param => {
    if (!param.name) return
    params[param.name] = param.value
    if (param.unit) params[`${param.name}Unit`] = param.unit
  })

  if (step.duration) params.time = step.duration
  if (step.temperature) params.temperature = step.temperature
  if (step.speed) params.speed = step.speed

  return params
}

function buildUnitOperation(step: ProtocolStep): UnitOperation {
  const parameters = reduceParameters(step)

  return {
    id: `step-${step.stepNumber || randomUUID()}`,
    type: sanitizeType(step.action),
    label: step.action || "Protocol Step",
    parameters,
    objects: [],
    outputs: [],
    inputs: [],
    metadata: {
      notes: step.notes,
      safetyFlags: step.safetyFlags,
    }
  }
}

function buildWhiteboardProtocol(
  structured: ProtocolStructure,
  metadataOverrides?: Record<string, any>
): ProtocolExport {
  const steps = structured.steps || []
  const operations = steps.map(buildUnitOperation)

  const nodes: ProtocolNode[] = operations.map((operation, index) => ({
    ...operation,
    x: NODE_START_X + index * NODE_SPACING_X,
    y: NODE_BASELINE_Y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT
  }))

  const connections: ProtocolConnection[] = nodes.flatMap((node, idx) => {
    const next = nodes[idx + 1]
    if (!next) return []
    return [{ from: node.id, to: next.id }]
  })

  return {
    metadata: {
      schemaVersion: 1,
      ...metadataOverrides,
    },
    nodes,
    connections
  }
}

function parseJsonFromString(raw: string) {
  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed)
  }

  const match = trimmed.match(/\{[\s\S]*\}/)
  if (match) {
    return JSON.parse(match[0])
  }

  throw new Error("LLM response did not contain JSON")
}

async function callOpenAI(text: string): Promise<ProtocolStructure> {
  const apiKey = OPENAI_API_KEY.value()

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY param not configured.")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        { role: "system", content: WHITEBOARD_PROTOCOL_PROMPT },
        { role: "user", content: text },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("OpenAI response missing content")
  }

  const parsed = parseJsonFromString(content) as ProtocolStructure
  parsed.steps = parsed.steps || []
  return parsed
}

function parseMultipart(req: functions.Request): Promise<{ fields: Record<string, string>; file: UploadedFile | null }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    const fields: Record<string, string> = {}
    let uploadedFile: UploadedFile | null = null

    busboy.on("file", (_fieldname, file, info) => {
      const chunks: Buffer[] = []
      file.on("data", (data) => {
        chunks.push(data)
      })
      file.on("end", () => {
        uploadedFile = {
          buffer: Buffer.concat(chunks),
          fileName: info.filename,
          mimeType: info.mimeType,
          size: chunks.reduce((sum, chunk) => sum + chunk.length, 0),
        }
      })
    })

    busboy.on("field", (name, value) => {
      fields[name] = value
    })

    busboy.on("error", reject)
    busboy.on("finish", () => resolve({ fields, file: uploadedFile }))

    const rawBody = (req as functions.Request & { rawBody?: Buffer }).rawBody
    if (rawBody) {
      busboy.end(rawBody)
    } else {
      req.pipe(busboy)
    }
  })
}

export const importProtocolFromPdf = functions
  .region("us-central1")
  .runWith({ memory: "1GB", timeoutSeconds: 120, secrets: [OPENAI_API_KEY] })
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.status(204).send("")
        return
      }

      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" })
        return
      }

      try {
        const { fields, file } = await parseMultipart(req)

        if (!file) {
          res.status(400).json({ error: "PDF file is required under 'file' field." })
          return
        }

        if (file.size > MAX_FILE_SIZE) {
          res.status(413).json({ error: "PDF exceeds 15MB limit." })
          return
        }

        const pdfData = await pdfParse(file.buffer)
        const fallbackText = fields.text || ""
        const combinedText = `${pdfData.text?.trim() || ""}\n\n${fallbackText}`.trim()

        if (!combinedText) {
          res.status(400).json({ error: "Unable to extract text from PDF." })
          return
        }

        const structured = await callOpenAI(combinedText)
        const protocol = buildWhiteboardProtocol(structured, {
          name: fields.name || file.fileName || "Imported Protocol",
          description: fields.description || "",
          sourceFile: file.fileName,
          generatedAt: new Date().toISOString(),
          objective: structured.objective,
        })

        res.json({
          protocol,
          llmProvider: "openai",
          confidence: structured.confidence || 80,
        })
      } catch (error) {
        console.error("Failed to import protocol", error)
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process document" })
      }
    })
  })

