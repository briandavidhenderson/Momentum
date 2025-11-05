/**
 * AI Provider Types and Interfaces
 * Supports multiple AI providers (OpenAI, Anthropic, etc.) with pluggable routing
 */

export type AICapability = 'stt' | 'ocr' | 'vlm' | 'llm'

export type PrivacyTier = 'cloud' | 'org-only' | 'device-only'

export interface AIPolicy {
  privacyTier: PrivacyTier
  maxCost?: number // in USD
  confidenceThreshold?: number // 0-100
  fallback?: string // provider name to fall back to
  maxRetries?: number
}

export interface AIResponse<T = any> {
  data: T
  confidence: number // 0-100
  provider: string
  cost?: number // in USD
  latency: number // in ms
  tokensUsed?: number
}

export interface TranscriptResponse {
  text: string
  segments?: TranscriptSegment[]
  language?: string
}

export interface TranscriptSegment {
  text: string
  start: number // seconds
  end: number // seconds
  confidence?: number
}

export interface OCRResponse {
  text: string
  blocks?: OCRBlock[]
  confidence: number
}

export interface OCRBlock {
  text: string
  bbox?: { x: number; y: number; width: number; height: number }
  confidence: number
}

export interface VLMResponse {
  description: string
  entities?: ExtractedEntity[]
  confidence: number
}

export interface ExtractedEntity {
  type: 'equipment' | 'reagent' | 'parameter' | 'procedure' | 'material'
  name: string
  fields: Record<string, any>
  confidence: number
  span?: { start: number; end: number } // character positions in source text
}

export interface ProtocolStructure {
  objective?: string
  materials: Material[]
  equipment: EquipmentItem[]
  steps: ProtocolStep[]
  qc?: string
  troubleshooting?: string
  safetyNotes?: string[]
  confidence: number
}

export interface Material {
  name: string
  supplier?: string
  catalogNumber?: string
  lotNumber?: string
  amount?: string
  concentration?: string
  storageConditions?: string
  confidence: number
}

export interface EquipmentItem {
  name: string
  make?: string
  model?: string
  serialNumber?: string
  settings?: Record<string, any>
  confidence: number
}

export interface ProtocolStep {
  stepNumber: number
  action: string
  parameters?: StepParameter[]
  duration?: string
  temperature?: string
  speed?: string
  notes?: string
  safetyFlags?: string[]
  confidence: number
}

export interface StepParameter {
  name: string
  value: string
  unit?: string
  confidence: number
}

/**
 * Base interface for AI providers
 */
export interface AIProvider {
  name: string
  capabilities: AICapability[]

  /**
   * Speech-to-Text transcription
   */
  transcribeAudio?(audio: File, options?: TranscribeOptions): Promise<AIResponse<TranscriptResponse>>

  /**
   * Optical Character Recognition (typed + handwritten)
   */
  extractTextFromImage?(image: File, options?: OCROptions): Promise<AIResponse<OCRResponse>>

  /**
   * Vision-Language Model understanding
   */
  analyzeImage?(image: File, prompt: string, options?: VLMOptions): Promise<AIResponse<VLMResponse>>

  /**
   * Text generation and structuring
   */
  generateText?(prompt: string, options?: LLMOptions): Promise<AIResponse<string>>

  /**
   * Structure lab protocol from free-form text
   */
  structureProtocol?(text: string, options?: ProtocolOptions): Promise<AIResponse<ProtocolStructure>>

  /**
   * Extract entities (equipment, reagents, parameters) from text
   */
  extractEntities?(text: string, entityTypes: string[], options?: EntityOptions): Promise<AIResponse<ExtractedEntity[]>>
}

export interface TranscribeOptions {
  language?: string
  format?: 'text' | 'srt' | 'vtt' | 'segments'
  temperature?: number // 0-1, higher = more creative
}

export interface OCROptions {
  languages?: string[]
  handwritten?: boolean
}

export interface VLMOptions {
  maxTokens?: number
  temperature?: number
  detail?: 'low' | 'high' | 'auto'
}

export interface LLMOptions {
  maxTokens?: number
  temperature?: number
  model?: string
  systemPrompt?: string
}

export interface ProtocolOptions extends LLMOptions {
  extractConfidence?: boolean
  normalizeUnits?: boolean
}

export interface EntityOptions extends LLMOptions {
  fuzzyMatch?: boolean
  linkToInventory?: boolean
}

/**
 * AI Provider Error
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public capability: AICapability,
    public originalError?: any,
    public retryable: boolean = true
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

/**
 * Cost tracking
 */
export interface CostEstimate {
  provider: string
  capability: AICapability
  estimatedCost: number // USD
  tokensEstimate?: number
  confidence: number
}

/**
 * Metrics for observability
 */
export interface AIMetrics {
  provider: string
  capability: AICapability
  timestamp: Date
  latency: number
  tokensUsed?: number
  cost: number
  success: boolean
  confidence?: number
  userFeedback?: 'accept' | 'reject' | 'edit'
}
