/**
 * Google Gemini Provider Implementation
 * Supports: Vision (Gemini Pro Vision), LLM (Gemini Pro), Multimodal
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
  GenerationConfig,
} from '@google/generative-ai'

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
} from '../types'

import { AIProviderError } from '../types'

import {
  PROTOCOL_STRUCTURING_PROMPT,
  ENTITY_EXTRACTION_PROMPT,
  IMAGE_OCR_PROMPT,
} from '../prompts'

import { logger } from '../../logger'

export class GeminiProvider implements AIProvider {
  name = 'Gemini'
  capabilities: AICapability[] = ['stt', 'ocr', 'vlm', 'llm']

  private genAI: GoogleGenerativeAI
  private model: GenerativeModel
  private visionModel: GenerativeModel
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    if (!this.apiKey) {
      logger.warn('Gemini: No API key provided')
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey)
    // Use gemini-1.5-flash as default for speed and cost
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  /**
   * STT: Transcribe audio using Gemini's multimodal capabilities
   */
  async transcribeAudio(
    audio: File,
    options: TranscribeOptions = {}
  ): Promise<AIResponse<TranscriptResponse>> {
    const startTime = Date.now()

    try {
      // Convert audio to base64
      const base64Audio = await this.fileToBase64(audio)

      const audioPart: Part = {
        inlineData: {
          data: base64Audio,
          mimeType: audio.type || 'audio/mp3',
        },
      }

      const promptText = options.language
        ? `Transcribe this audio file exactly as spoken. The language is ${options.language}. Return only the transcription text, no other commentary.`
        : "Transcribe this audio file exactly as spoken. Return only the transcription text, no other commentary."

      const result = await this.model.generateContent([promptText, audioPart])
      const response = await result.response
      const text = response.text()

      const latency = Date.now() - startTime
      const cost = 0.0001 // Placeholder estimate

      return {
        data: {
          text: text.trim(),
          language: options.language || 'en',
        },
        confidence: 90,
        provider: this.name,
        cost,
        latency,
      }
    } catch (error) {
      throw new AIProviderError(
        `Failed to transcribe audio: ${(error as Error).message}`,
        this.name,
        'stt',
        error,
        true
      )
    }
  }

  /**
   * OCR: Extract text from images using Gemini Pro Vision
   */
  async extractTextFromImage(
    image: File,
    options: OCROptions = {}
  ): Promise<AIResponse<OCRResponse>> {
    const startTime = Date.now()

    try {
      const base64Image = await this.fileToBase64(image)

      const imagePart: Part = {
        inlineData: {
          data: base64Image,
          mimeType: image.type,
        },
      }

      const promptText = options.handwritten
        ? IMAGE_OCR_PROMPT.HANDWRITTEN
        : IMAGE_OCR_PROMPT.TYPED

      const result = await this.visionModel.generateContent([promptText, imagePart])
      const response = await result.response
      const extractedText = response.text()

      const latency = Date.now() - startTime
      const cost = 0.00001

      return {
        data: {
          text: extractedText,
          confidence: 0.95,
        },
        confidence: 95,
        provider: this.name,
        cost,
        latency,
      }
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.name,
        'ocr'
      )
    }
  }

  /**
   * VLM: Analyze images with custom prompts using Gemini Pro Vision
   */
  async analyzeImage(
    image: File,
    prompt: string,
    options: VLMOptions = {}
  ): Promise<AIResponse<VLMResponse>> {
    const startTime = Date.now()

    try {
      const base64Image = await this.fileToBase64(image)

      const imagePart: Part = {
        inlineData: {
          data: base64Image,
          mimeType: image.type,
        },
      }

      const generationConfig: GenerationConfig = {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
      }

      const model = options.temperature ? this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig
      }) : this.visionModel

      const result = await model.generateContent([prompt, imagePart])
      const response = await result.response
      const description = response.text()

      const latency = Date.now() - startTime
      const cost = 0.00001

      return {
        data: {
          description,
          confidence: 0.9,
        },
        confidence: 90,
        provider: this.name,
        cost,
        latency,
      }
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.name,
        'vlm'
      )
    }
  }

  /**
   * LLM: Generate text using Gemini Pro
   */
  async generateText(
    prompt: string,
    options: LLMOptions = {}
  ): Promise<AIResponse<string>> {
    const startTime = Date.now()

    try {
      const generationConfig: GenerationConfig = {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
        responseMimeType: options.responseMimeType,
      }

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      const latency = Date.now() - startTime

      // Estimate tokens
      const estimatedTokens = Math.ceil((prompt.length + text.length) / 4)
      const cost = (estimatedTokens / 1000) * 0.00001

      return {
        data: text,
        confidence: 90,
        provider: this.name,
        cost,
        latency,
        tokensUsed: estimatedTokens,
      }
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.name,
        'llm'
      )
    }
  }

  /**
   * Structure protocol from text using Gemini Pro with JSON mode
   */
  async structureProtocol(
    text: string,
    options: ProtocolOptions = {}
  ): Promise<AIResponse<ProtocolStructure>> {
    const startTime = Date.now()
    const prompt = PROTOCOL_STRUCTURING_PROMPT.replace('{TEXT}', text)

    try {
      // Use JSON mode for structured output
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const jsonText = response.text()

      const structured = JSON.parse(jsonText)
      const latency = Date.now() - startTime

      return {
        data: structured,
        confidence: 0.9,
        provider: this.name,
        cost: 0.0001,
        latency,
        tokensUsed: 0,
      }
    } catch (error) {
      throw new AIProviderError(
        'Failed to parse structured protocol from Gemini response',
        this.name,
        'llm'
      )
    }
  }

  /**
   * Extract entities from text using Gemini Pro with JSON mode
   */
  async extractEntities(
    text: string,
    entityTypes: string[],
    options: EntityOptions = {}
  ): Promise<AIResponse<ExtractedEntity[]>> {
    const startTime = Date.now()
    const prompt = ENTITY_EXTRACTION_PROMPT(entityTypes) + '\n\nText:\n' + text

    try {
      // Use JSON mode for structured output
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const jsonText = response.text()

      const parsed = JSON.parse(jsonText)
      const entities = parsed.entities || parsed // Handle both {entities: [...]} and [...] formats

      const latency = Date.now() - startTime

      return {
        data: Array.isArray(entities) ? entities : [],
        confidence: 0.9,
        provider: this.name,
        cost: 0.0001,
        latency,
        tokensUsed: 0,
      }
    } catch (error) {
      throw new AIProviderError(
        'Failed to parse entities from Gemini response',
        this.name,
        'llm'
      )
    }
  }

  /**
   * Helper: Convert File to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
