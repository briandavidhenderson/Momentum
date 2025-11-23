/**
 * Google Gemini Provider Implementation
 * Supports: Vision (Gemini Pro Vision), LLM (Gemini Pro), Multimodal
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

  private apiKey: string
  private baseURL = 'https://generativelanguage.googleapis.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    if (!this.apiKey) {
      logger.warn('Gemini: No API key provided')
    }
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

      const promptText = options.language
        ? `Transcribe this audio file exactly as spoken. The language is ${options.language}. Return only the transcription text, no other commentary.`
        : "Transcribe this audio file exactly as spoken. Return only the transcription text, no other commentary."

      const response = await fetch(
        `${this.baseURL}/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    data: base64Audio,
                    mimeType: audio.type || 'audio/mp3' // Default to mp3 if type missing
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192, // Allow long transcriptions
            }
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Gemini API error')
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      const latency = Date.now() - startTime

      // Estimate cost (Gemini Flash audio input is cheap)
      const cost = 0.0001 // Placeholder estimate

      return {
        data: {
          text: text.trim(),
          language: options.language || 'en', // Gemini doesn't explicitly return detected language in this mode
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
      // Convert image to base64
      const base64Image = await this.fileToBase64(image)

      // Select appropriate OCR prompt
      const promptText = options.handwritten
        ? IMAGE_OCR_PROMPT.HANDWRITTEN
        : IMAGE_OCR_PROMPT.TYPED

      const response = await fetch(
        `${this.baseURL}/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    data: base64Image,
                    mimeType: image.type
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            }
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Gemini API error')
      }

      const data = await response.json()
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      const latency = Date.now() - startTime

      // Estimate cost (Gemini Flash is very cheap: ~$0.00001 per image)
      const cost = 0.00001

      return {
        data: {
          text: extractedText,
          confidence: 0.95, // Gemini doesn't provide confidence scores
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
      // Convert image to base64
      const base64Image = await this.fileToBase64(image)

      const response = await fetch(
        `${this.baseURL}/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: base64Image,
                    mimeType: image.type
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: options.maxTokens || 2048,
            }
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Gemini API error')
      }

      const data = await response.json()
      const description = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      const latency = Date.now() - startTime
      const cost = 0.00001 // Very cheap with Flash model

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
      const response = await fetch(
        `${this.baseURL}/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: options.maxTokens || 2048,
            }
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Gemini API error')
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      const latency = Date.now() - startTime

      // Estimate tokens and cost (Gemini Flash: ~$0.00001 per 1K tokens)
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
   * Structure protocol from text using Gemini Pro
   */
  async structureProtocol(
    text: string,
    options: ProtocolOptions = {}
  ): Promise<AIResponse<ProtocolStructure>> {
    const prompt = PROTOCOL_STRUCTURING_PROMPT.replace('{TEXT}', text)
    const result = await this.generateText(prompt, {
      temperature: 0.1,
      maxTokens: 2048,
    })

    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = result.data
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1]
      }

      const structured = JSON.parse(jsonText)

      return {
        data: structured,
        confidence: result.confidence,
        provider: this.name,
        cost: result.cost,
        latency: result.latency,
        tokensUsed: result.tokensUsed,
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
   * Extract entities from text using Gemini Pro
   */
  async extractEntities(
    text: string,
    entityTypes: string[],
    options: EntityOptions = {}
  ): Promise<AIResponse<ExtractedEntity[]>> {
    const prompt = ENTITY_EXTRACTION_PROMPT(entityTypes) + '\n\nText:\n' + text

    const result = await this.generateText(prompt, {
      temperature: 0.1,
      maxTokens: 1024,
    })

    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = result.data
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1]
      }

      const entities = JSON.parse(jsonText)

      return {
        data: Array.isArray(entities) ? entities : [],
        confidence: result.confidence,
        provider: this.name,
        cost: result.cost,
        latency: result.latency,
        tokensUsed: result.tokensUsed,
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
