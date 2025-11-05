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
