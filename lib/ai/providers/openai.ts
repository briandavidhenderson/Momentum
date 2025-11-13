/**
 * OpenAI Provider Implementation
 * Supports: STT (Whisper), Vision (GPT-4V), LLM (GPT-4/3.5)
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

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  capabilities: AICapability[] = ['stt', 'ocr', 'vlm', 'llm']

  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[OpenAI] No API key provided')
    }
  }

  /**
   * STT: Transcribe audio using Whisper
   */
  async transcribeAudio(
    audio: File,
    options: TranscribeOptions = {}
  ): Promise<AIResponse<TranscriptResponse>> {
    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append('file', audio)
      formData.append('model', 'whisper-1')

      if (options.language) {
        formData.append('language', options.language)
      }

      if (options.format === 'segments') {
        formData.append('response_format', 'verbose_json')
      } else {
        formData.append('response_format', options.format || 'text')
      }

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 429) {
          throw new Error(`OpenAI rate limit exceeded. Please wait a moment and try again.`)
        }
        throw new Error(`OpenAI API error (${response.status}): ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      // Parse response based on format
      let transcriptData: TranscriptResponse

      if (options.format === 'segments' && data.segments) {
        transcriptData = {
          text: data.text,
          segments: data.segments.map((seg: any) => ({
            text: seg.text,
            start: seg.start,
            end: seg.end,
            confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : 0.95,
          })),
          language: data.language,
        }
      } else {
        transcriptData = {
          text: typeof data === 'string' ? data : data.text,
          language: data.language,
        }
      }

      // Estimate cost: $0.006/minute
      const durationMinutes = audio.size / (1024 * 1024 * 0.5) // rough estimate
      const cost = durationMinutes * 0.006

      return {
        data: transcriptData,
        confidence: 95, // Whisper is generally very accurate
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
   * OCR: Extract text from image using GPT-4 Vision
   */
  async extractTextFromImage(
    image: File,
    options: OCROptions = {}
  ): Promise<AIResponse<OCRResponse>> {
    const startTime = Date.now()

    try {
      // Convert image to base64
      const base64Image = await this.fileToBase64(image)

      const prompt = options.handwritten
        ? IMAGE_OCR_PROMPT.HANDWRITTEN
        : IMAGE_OCR_PROMPT.TYPED

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                    detail: options.handwritten ? 'high' : 'auto',
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      const text = data.choices[0]?.message?.content || ''

      // Cost: ~$0.01-0.03 per image depending on detail
      const cost = options.handwritten ? 0.03 : 0.01

      return {
        data: {
          text,
          confidence: 85, // Vision models are good but not perfect for OCR
        },
        confidence: 85,
        provider: this.name,
        cost,
        latency,
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      throw new AIProviderError(
        `Failed to extract text from image: ${(error as Error).message}`,
        this.name,
        'ocr',
        error,
        true
      )
    }
  }

  /**
   * LLM: Structure protocol from free-form text
   */
  async structureProtocol(
    text: string,
    options: ProtocolOptions = {}
  ): Promise<AIResponse<ProtocolStructure>> {
    const startTime = Date.now()

    try {
      const systemPrompt = options.systemPrompt || PROTOCOL_STRUCTURING_PROMPT

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.3, // Lower temp for structured output
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      const content = data.choices[0]?.message?.content || '{}'
      const structured = JSON.parse(content)

      // Cost estimation: GPT-4 ~$0.03/1K input + $0.06/1K output tokens
      const inputTokens = data.usage?.prompt_tokens || 0
      const outputTokens = data.usage?.completion_tokens || 0
      const cost = (inputTokens * 0.03 + outputTokens * 0.06) / 1000

      return {
        data: {
          ...structured,
          confidence: structured.confidence || 80,
        },
        confidence: structured.confidence || 80,
        provider: this.name,
        cost,
        latency,
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      throw new AIProviderError(
        `Failed to structure protocol: ${(error as Error).message}`,
        this.name,
        'llm',
        error,
        true
      )
    }
  }

  /**
   * LLM: Extract entities from text
   */
  async extractEntities(
    text: string,
    entityTypes: string[],
    options: EntityOptions = {}
  ): Promise<AIResponse<ExtractedEntity[]>> {
    const startTime = Date.now()

    try {
      const systemPrompt = ENTITY_EXTRACTION_PROMPT(entityTypes)

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature ?? 0.2,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      const content = data.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)

      const cost = ((data.usage?.prompt_tokens || 0) * 0.03 +
        (data.usage?.completion_tokens || 0) * 0.06) / 1000

      return {
        data: parsed.entities || [],
        confidence: parsed.confidence || 75,
        provider: this.name,
        cost,
        latency,
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      throw new AIProviderError(
        `Failed to extract entities: ${(error as Error).message}`,
        this.name,
        'llm',
        error,
        true
      )
    }
  }

  /**
   * Helper: Convert File to base64 data URL
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * General text generation
   */
  async generateText(
    prompt: string,
    options: LLMOptions = {}
  ): Promise<AIResponse<string>> {
    const startTime = Date.now()

    try {
      const messages = options.systemPrompt
        ? [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: prompt },
          ]
        : [{ role: 'user', content: prompt }]

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4-turbo-preview',
          messages,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      const text = data.choices[0]?.message?.content || ''

      const cost = ((data.usage?.prompt_tokens || 0) * 0.03 +
        (data.usage?.completion_tokens || 0) * 0.06) / 1000

      return {
        data: text,
        confidence: 90,
        provider: this.name,
        cost,
        latency,
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      throw new AIProviderError(
        `Failed to generate text: ${(error as Error).message}`,
        this.name,
        'llm',
        error,
        true
      )
    }
  }
}
