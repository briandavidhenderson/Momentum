/**
 * AI Router
 * Routes AI requests to appropriate providers based on capabilities
 * Handles fallbacks and provider selection
 */

import type {
  AIProvider,
  AICapability,
  AIResponse,
  TranscriptResponse,
  OCRResponse,
  VLMResponse,
  ProtocolStructure,
  ExtractedEntity,
  TranscribeOptions,
  OCROptions,
  VLMOptions,
  LLMOptions,
  ProtocolOptions,
  EntityOptions,
} from './types'

import { OpenAIProvider } from './providers/openai'
import { GeminiProvider } from './providers/gemini'

/**
 * AI Router Configuration
 */
export interface AIRouterConfig {
  providers: AIProvider[]
  defaultProvider?: string
  fallbackOrder?: Record<AICapability, string[]>
  costOptimization?: boolean
}

/**
 * AI Router Class
 * Manages multiple AI providers and routes requests
 */
export class AIRouter {
  private providers: Map<string, AIProvider>
  private config: AIRouterConfig

  constructor(config: Partial<AIRouterConfig> = {}) {
    this.providers = new Map()

    // Default configuration
    this.config = {
      providers: config.providers || [],
      defaultProvider: config.defaultProvider || 'OpenAI',
      fallbackOrder: config.fallbackOrder || {
        stt: ['OpenAI'],
        ocr: ['OpenAI'],
        vlm: ['OpenAI'],
        llm: ['OpenAI'],
      },
      costOptimization: config.costOptimization ?? false,
    }

    // Initialize default providers
    this.initializeProviders()
  }

  /**
   * Initialize providers from config
   */
  private initializeProviders() {
    // Add OpenAI by default
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (openaiKey) {
      const openai = new OpenAIProvider(openaiKey)
      this.providers.set(openai.name, openai)
    }

    // Add any additional providers from config
    for (const provider of this.config.providers) {
      this.providers.set(provider.name, provider)
    }
  }

  /**
   * Get provider by name
   */
  private getProvider(name: string): AIProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider '${name}' not found or not configured`)
    }
    return provider
  }

  /**
   * Select best provider for a capability
   */
  private selectProvider(
    capability: AICapability,
    preferredProvider?: string
  ): AIProvider {
    // Try preferred provider first
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider)
      if (provider && provider.capabilities.includes(capability)) {
        return provider
      }
    }

    // Try default provider
    const defaultProvider = this.providers.get(this.config.defaultProvider || '')
    if (defaultProvider && defaultProvider.capabilities.includes(capability)) {
      return defaultProvider
    }

    // Try fallback order
    const fallbacks = this.config.fallbackOrder?.[capability] || []
    for (const providerName of fallbacks) {
      const provider = this.providers.get(providerName)
      if (provider && provider.capabilities.includes(capability)) {
        return provider
      }
    }

    // Try any provider with the capability
    for (const provider of this.providers.values()) {
      if (provider.capabilities.includes(capability)) {
        return provider
      }
    }

    throw new Error(`No provider available for capability '${capability}'`)
  }

  /**
   * Transcribe audio to text (STT)
   */
  async transcribeAudio(
    audio: File,
    options: TranscribeOptions & { provider?: string } = {}
  ): Promise<AIResponse<TranscriptResponse>> {
    const { provider: preferredProvider, ...transcribeOptions } = options
    const provider = this.selectProvider('stt', preferredProvider)

    if (!provider.transcribeAudio) {
      throw new Error(`Provider '${provider.name}' does not support STT`)
    }

    return provider.transcribeAudio(audio, transcribeOptions)
  }

  /**
   * Extract text from image (OCR)
   */
  async extractTextFromImage(
    image: File,
    options: OCROptions & { provider?: string } = {}
  ): Promise<AIResponse<OCRResponse>> {
    const { provider: preferredProvider, ...ocrOptions } = options
    const provider = this.selectProvider('ocr', preferredProvider)

    if (!provider.extractTextFromImage) {
      throw new Error(`Provider '${provider.name}' does not support OCR`)
    }

    return provider.extractTextFromImage(image, ocrOptions)
  }

  /**
   * Analyze image with prompt (VLM)
   */
  async analyzeImage(
    image: File,
    prompt: string,
    options: VLMOptions & { provider?: string } = {}
  ): Promise<AIResponse<VLMResponse>> {
    const { provider: preferredProvider, ...vlmOptions } = options
    const provider = this.selectProvider('vlm', preferredProvider)

    if (!provider.analyzeImage) {
      throw new Error(`Provider '${provider.name}' does not support VLM`)
    }

    return provider.analyzeImage(image, prompt, vlmOptions)
  }

  /**
   * Generate text (LLM)
   */
  async generateText(
    prompt: string,
    options: LLMOptions & { provider?: string } = {}
  ): Promise<AIResponse<string>> {
    const { provider: preferredProvider, ...llmOptions } = options
    const provider = this.selectProvider('llm', preferredProvider)

    if (!provider.generateText) {
      throw new Error(`Provider '${provider.name}' does not support LLM`)
    }

    return provider.generateText(prompt, llmOptions)
  }

  /**
   * Structure protocol from text
   */
  async structureProtocol(
    text: string,
    options: ProtocolOptions & { provider?: string } = {}
  ): Promise<AIResponse<ProtocolStructure>> {
    const { provider: preferredProvider, ...protocolOptions } = options
    const provider = this.selectProvider('llm', preferredProvider)

    if (!provider.structureProtocol) {
      throw new Error(`Provider '${provider.name}' does not support protocol structuring`)
    }

    return provider.structureProtocol(text, protocolOptions)
  }

  /**
   * Extract entities from text
   */
  async extractEntities(
    text: string,
    entityTypes: string[],
    options: EntityOptions & { provider?: string } = {}
  ): Promise<AIResponse<ExtractedEntity[]>> {
    const { provider: preferredProvider, ...entityOptions } = options
    const provider = this.selectProvider('llm', preferredProvider)

    if (!provider.extractEntities) {
      throw new Error(`Provider '${provider.name}' does not support entity extraction`)
    }

    return provider.extractEntities(text, entityTypes, entityOptions)
  }

  /**
   * Voice-to-Protocol Pipeline
   * Complete pipeline: Audio → Transcript → Structured Protocol
   */
  async voiceToProtocol(
    audio: File,
    options: {
      transcribeOptions?: TranscribeOptions
      protocolOptions?: ProtocolOptions
      provider?: string
    } = {}
  ): Promise<{
    transcript: AIResponse<TranscriptResponse>
    protocol: AIResponse<ProtocolStructure>
    totalCost: number
    totalLatency: number
  }> {
    // Step 1: Transcribe audio
    const transcript = await this.transcribeAudio(audio, {
      ...options.transcribeOptions,
      provider: options.provider,
    })

    // Step 2: Structure protocol from transcript
    const protocol = await this.structureProtocol(transcript.data.text, {
      ...options.protocolOptions,
      provider: options.provider,
    })

    return {
      transcript,
      protocol,
      totalCost: (transcript.cost || 0) + (protocol.cost || 0),
      totalLatency: transcript.latency + protocol.latency,
    }
  }

  /**
   * Photo-to-Protocol Pipeline
   * Complete pipeline: Image → OCR → Structured Protocol
   */
  async photoToProtocol(
    image: File,
    options: {
      ocrOptions?: OCROptions
      protocolOptions?: ProtocolOptions
      provider?: string
    } = {}
  ): Promise<{
    ocr: AIResponse<OCRResponse>
    protocol: AIResponse<ProtocolStructure>
    totalCost: number
    totalLatency: number
  }> {
    // Step 1: Extract text from image
    const ocr = await this.extractTextFromImage(image, {
      ...options.ocrOptions,
      provider: options.provider,
    })

    // Step 2: Structure protocol from OCR text
    const protocol = await this.structureProtocol(ocr.data.text, {
      ...options.protocolOptions,
      provider: options.provider,
    })

    return {
      ocr,
      protocol,
      totalCost: (ocr.cost || 0) + (protocol.cost || 0),
      totalLatency: ocr.latency + protocol.latency,
    }
  }

  /**
   * Get available providers and their capabilities
   */
  getAvailableProviders(): Array<{
    name: string
    capabilities: AICapability[]
  }> {
    return Array.from(this.providers.values()).map((provider) => ({
      name: provider.name,
      capabilities: [...provider.capabilities],
    }))
  }

  /**
   * Check if a capability is available
   */
  hasCapability(capability: AICapability): boolean {
    for (const provider of this.providers.values()) {
      if (provider.capabilities.includes(capability)) {
        return true
      }
    }
    return false
  }
}

/**
 * Default router instance with Gemini provider
 * Can be imported and used directly
 */
const geminiKey = 'AIzaSyDhpoQh3TcaXfoAzpAXjKNMck7Djj6Mi9o'
const geminiProvider = new GeminiProvider(geminiKey)
const openaiProvider = new OpenAIProvider() // Fallback for STT

export const defaultRouter = new AIRouter({
  providers: [geminiProvider, openaiProvider],
  defaultProvider: 'Gemini',
  fallbackOrder: {
    stt: ['OpenAI'], // Gemini doesn't support STT, use OpenAI
    ocr: ['Gemini', 'OpenAI'],
    vlm: ['Gemini', 'OpenAI'],
    llm: ['Gemini', 'OpenAI'],
  }
})

/**
 * Convenience functions using default router
 */
export const transcribeAudio = (audio: File, options?: TranscribeOptions) =>
  defaultRouter.transcribeAudio(audio, options)

export const extractTextFromImage = (image: File, options?: OCROptions) =>
  defaultRouter.extractTextFromImage(image, options)

export const analyzeImage = (image: File, prompt: string, options?: VLMOptions) =>
  defaultRouter.analyzeImage(image, prompt, options)

export const generateText = (prompt: string, options?: LLMOptions) =>
  defaultRouter.generateText(prompt, options)

export const structureProtocol = (text: string, options?: ProtocolOptions) =>
  defaultRouter.structureProtocol(text, options)

export const extractEntities = (
  text: string,
  entityTypes: string[],
  options?: EntityOptions
) => defaultRouter.extractEntities(text, entityTypes, options)

export const voiceToProtocol = (
  audio: File,
  options?: {
    transcribeOptions?: TranscribeOptions
    protocolOptions?: ProtocolOptions
  }
) => defaultRouter.voiceToProtocol(audio, options)

export const photoToProtocol = (
  image: File,
  options?: {
    ocrOptions?: OCROptions
    protocolOptions?: ProtocolOptions
  }
) => defaultRouter.photoToProtocol(image, options)

/**
 * Extract structure and function from a single ELN item
 * Automatically determines the best approach based on item type
 */
export async function extractItemStructure(
  file: File,
  itemType: string
): Promise<AIResponse<{
  text?: string
  structuredData?: Record<string, any>
  entities?: Array<{ type: string; value: string; confidence?: number }>
  summary?: string
}>> {
  try {
    // Handle different file types
    if (itemType === 'voice' || file.type.startsWith('audio/')) {
      const transcript = await defaultRouter.transcribeAudio(file)
      const entities = await defaultRouter.extractEntities(
        transcript.data.text,
        ['chemical', 'equipment', 'measurement', 'procedure', 'reagent']
      )

      return {
        data: {
          text: transcript.data.text,
          entities: entities.data.map(e => ({
            type: e.type,
            value: e.name,
            confidence: e.confidence
          })),
          summary: transcript.data.text.substring(0, 200) + '...'
        },
        provider: transcript.provider,
        confidence: transcript.confidence,
        latency: transcript.latency + entities.latency,
        cost: (transcript.cost || 0) + (entities.cost || 0)
      }
    } else if (itemType === 'image' || itemType === 'photo' || file.type.startsWith('image/')) {
      const ocr = await defaultRouter.extractTextFromImage(file)
      const entities = await defaultRouter.extractEntities(
        ocr.data.text,
        ['chemical', 'equipment', 'measurement', 'procedure', 'reagent']
      )

      return {
        data: {
          text: ocr.data.text,
          entities: entities.data.map(e => ({
            type: e.type,
            value: e.name,
            confidence: e.confidence
          })),
          summary: ocr.data.text.substring(0, 200) + '...'
        },
        provider: ocr.provider,
        confidence: ocr.confidence,
        latency: ocr.latency + entities.latency,
        cost: (ocr.cost || 0) + (entities.cost || 0)
      }
    } else if (itemType === 'document') {
      // For documents, we'd need to extract text first (could use OCR or text extraction)
      // For now, return placeholder
      return {
        data: {
          text: 'Document text extraction not yet implemented',
          summary: 'Document uploaded'
        },
        provider: 'local',
        confidence: 100,
        latency: 0
      }
    } else if (itemType === 'data') {
      // Handle data files (CSV, Excel, JSON, text)
      try {
        const text = await file.text()

        // Try to parse as JSON
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(text)
          const summary = `JSON data file with ${Object.keys(jsonData).length} top-level keys`

          return {
            data: {
              text,
              structuredData: jsonData,
              summary
            },
            provider: 'local',
            confidence: 100,
            latency: 0
          }
        }

        // For CSV/text files, extract basic stats
        const lines = text.split('\n').filter(line => line.trim())
        const summary = `Data file with ${lines.length} lines`

        // Try to extract entities from the text
        const entities = await defaultRouter.extractEntities(
          text.substring(0, 5000), // Limit to first 5000 chars for entity extraction
          ['chemical', 'equipment', 'measurement', 'procedure', 'reagent']
        )

        return {
          data: {
            text,
            entities: entities.data.map(e => ({
              type: e.type,
              value: e.name,
              confidence: e.confidence
            })),
            summary
          },
          provider: 'local',
          confidence: 100,
          latency: entities.latency,
          cost: entities.cost || 0
        }
      } catch (error) {
        logger.error('Error parsing data file', error)
        return {
          data: {
            text: 'Failed to parse data file',
            summary: 'Data file uploaded but could not be parsed'
          },
          provider: 'local',
          confidence: 50,
          latency: 0
        }
      }
    } else if (itemType === 'video') {
      // Video files - for now just return metadata
      return {
        data: {
          text: 'Video content extraction not yet implemented',
          summary: `Video file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
        },
        provider: 'local',
        confidence: 100,
        latency: 0
      }
    } else {
      throw new Error(`Unsupported item type: ${itemType}`)
    }
  } catch (error) {
    throw new Error(`Failed to extract structure: ${error}`)
  }
}

/**
 * Generate comprehensive experiment report from multiple items
 * Analyzes all items and creates structured report with background, protocols, and results
 */
export async function generateExperimentReport(
  items: Array<{
    type: string
    extractedText?: string
    structuredData?: Record<string, any>
    description?: string
  }>,
  experimentTitle: string,
  experimentDescription?: string
): Promise<AIResponse<{
  background: string
  protocols: string
  results: string
  conclusion: string
}>> {
  try {
    // Compile all extracted text and structured data
    const compiledText = items
      .map((item, idx) => {
        let content = `\n\n=== Item ${idx + 1} (${item.type}) ===\n`
        if (item.description) content += `Description: ${item.description}\n`
        if (item.extractedText) content += `Content: ${item.extractedText}\n`
        if (item.structuredData) content += `Data: ${JSON.stringify(item.structuredData, null, 2)}\n`
        return content
      })
      .join('\n')

    const prompt = `You are a scientific researcher analyzing experimental data. Generate a comprehensive lab report from the following experimental data.

Experiment Title: ${experimentTitle}
${experimentDescription ? `Experiment Description: ${experimentDescription}\n` : ''}

Experimental Data:
${compiledText}

Please generate a structured report with the following sections:

1. BACKGROUND: Provide context for the experiment, including scientific rationale, relevant background information, and objectives. Infer from the experimental data what the scientific question or hypothesis might be.

2. PROTOCOLS: Extract and organize all experimental protocols, procedures, and methods described in the data. Include materials, reagents, equipment, and step-by-step procedures.

3. RESULTS: Summarize all observations, measurements, and data presented. Highlight key findings and patterns.

4. CONCLUSION: Synthesize the findings, discuss their implications, and suggest next steps or future work.

Format your response as JSON with these four keys: background, protocols, results, conclusion.
Each should be a string containing well-formatted markdown text.`

    const response = await defaultRouter.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 4000
    })

    // Parse JSON response
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = response.data.trim()
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      } else {
        // Try to find JSON object without code block markers
        const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonObjMatch) {
          jsonText = jsonObjMatch[0]
        }
      }

      const reportData = JSON.parse(jsonText)

      // Validate that we have all required sections
      if (!reportData.background || !reportData.protocols || !reportData.results || !reportData.conclusion) {
        throw new Error('Missing required report sections')
      }

      return {
        data: reportData,
        provider: response.provider,
        confidence: response.confidence,
        latency: response.latency,
        cost: response.cost
      }
    } catch (parseError) {
      logger.error('Failed to parse report JSON', parseError, {
        rawResponsePreview: response.data.substring(0, 500)
      })

      // If JSON parsing fails, try to split by markdown headers
      const sections = response.data.split(/#{1,2}\s+(?:BACKGROUND|Background|PROTOCOLS|Protocols|RESULTS|Results|CONCLUSION|Conclusion)/gi)

      if (sections.length >= 4) {
        return {
          data: {
            background: sections[1]?.trim() || '',
            protocols: sections[2]?.trim() || '',
            results: sections[3]?.trim() || '',
            conclusion: sections[4]?.trim() || ''
          },
          provider: response.provider,
          confidence: response.confidence,
          latency: response.latency,
          cost: response.cost
        }
      }

      // Last resort: return the full text in background
      return {
        data: {
          background: response.data,
          protocols: 'Unable to parse protocols section',
          results: 'Unable to parse results section',
          conclusion: 'Unable to parse conclusion section'
        },
        provider: response.provider,
        confidence: response.confidence,
        latency: response.latency,
        cost: response.cost
      }
    }
  } catch (error) {
    throw new Error(`Failed to generate report: ${error}`)
  }
}
