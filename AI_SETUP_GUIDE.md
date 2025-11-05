# AI Features Setup Guide

**Date**: 2025-11-05
**Feature**: LLM-powered Lab Notebook Transcription (Option 2)

---

## Overview

This guide covers setting up AI features for the Electronic Lab Notebook (ELN):
- Voice-to-protocol transcription (STT → LLM)
- Photo-to-protocol conversion (OCR → LLM)
- Entity extraction from lab notes
- Confidence-based validation UI

---

## Architecture

### AI Infrastructure Files Created

```
lib/ai/
├── types.ts              # Type definitions for all AI operations
├── providers/
│   └── openai.ts        # OpenAI provider implementation
├── prompts.ts           # Prompt templates for all AI tasks
└── router.ts            # Provider routing and pipeline orchestration
```

### Key Components

1. **AIProvider Interface** - Unified interface for all AI providers
2. **AIRouter** - Routes requests to appropriate providers, handles fallbacks
3. **Pipeline Functions** - High-level workflows (voiceToProtocol, photoToProtocol)
4. **Confidence Scoring** - Every response includes 0-100 confidence score
5. **Cost Tracking** - Built-in cost estimation per request

---

## Environment Setup

### 1. OpenAI API Key

Create or update `.env.local` file:

```bash
# OpenAI API Key (required for AI features)
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...your-key-here

# Optional: Enable AI features flag
NEXT_PUBLIC_AI_FEATURES_ENABLED=true
```

**Get API Key**:
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy key (starts with `sk-proj-` or `sk-`)
4. Add to `.env.local`

**Cost Estimates**:
- Whisper STT: $0.006 per minute of audio
- GPT-4 Vision OCR: $0.01-0.03 per image
- GPT-4 Text: ~$0.03/1K input + $0.06/1K output tokens

### 2. Verify Installation

The AI router will automatically initialize OpenAI provider if key is present:

```typescript
import { defaultRouter } from '@/lib/ai/router'

// Check if AI features are available
const hasSTT = defaultRouter.hasCapability('stt')
const hasOCR = defaultRouter.hasCapability('ocr')
const hasLLM = defaultRouter.hasCapability('llm')

console.log('AI Features:', { hasSTT, hasOCR, hasLLM })
```

---

## Usage Examples

### Voice-to-Protocol (Complete Pipeline)

```typescript
import { voiceToProtocol } from '@/lib/ai/router'

// Record audio file from user
const audioFile: File = // ... from audio recorder

// Run complete pipeline: Audio → Transcript → Protocol
const result = await voiceToProtocol(audioFile, {
  transcribeOptions: {
    language: 'en',
    format: 'segments', // Get timestamped segments
  },
  protocolOptions: {
    temperature: 0.3, // Lower temp for structured output
  },
})

console.log('Transcript:', result.transcript.data.text)
console.log('Protocol:', result.protocol.data)
console.log('Total Cost:', result.totalCost) // USD
console.log('Total Time:', result.totalLatency) // ms

// Check confidence
if (result.protocol.confidence < 70) {
  // Show warning to user
  console.warn('Low confidence - please review carefully')
}
```

### Photo-to-Protocol (OCR Pipeline)

```typescript
import { photoToProtocol } from '@/lib/ai/router'

// Upload photo from camera or file picker
const photoFile: File = // ... from file input

// Run complete pipeline: Image → OCR → Protocol
const result = await photoToProtocol(photoFile, {
  ocrOptions: {
    handwritten: true, // Use high-detail mode for handwriting
  },
})

console.log('OCR Text:', result.ocr.data.text)
console.log('Protocol:', result.protocol.data)

// Show protocol with confidence highlighting
result.protocol.data.steps.forEach((step) => {
  const confidence = step.confidence || result.protocol.confidence
  const highlight = confidence < 70 ? 'yellow' : 'green'
  console.log(`Step ${step.stepNumber}: ${step.instruction} [${confidence}% - ${highlight}]`)
})
```

### Individual Operations

```typescript
import { transcribeAudio, extractTextFromImage, structureProtocol } from '@/lib/ai/router'

// Just transcribe audio
const transcript = await transcribeAudio(audioFile, {
  language: 'en',
  format: 'text',
})

// Just OCR an image
const ocr = await extractTextFromImage(imageFile, {
  handwritten: false, // Typed text
})

// Just structure existing text
const protocol = await structureProtocol(freeFormText, {
  temperature: 0.3,
})

// Extract entities (equipment, reagents, etc.)
import { extractEntities } from '@/lib/ai/router'

const entities = await extractEntities(
  labNotesText,
  ['equipment', 'reagent', 'parameter'],
  { temperature: 0.2 }
)

console.log('Found entities:', entities.data)
```

---

## Response Format

### TranscriptResponse

```typescript
{
  text: "Mix 500 microliters of buffer A with...",
  segments: [
    {
      text: "Mix 500 microliters",
      start: 0.0,   // seconds
      end: 2.5,     // seconds
      confidence: 95
    }
  ],
  language: "en",
  confidence: 95,
  cost: 0.012,     // USD
  latency: 2340,   // ms
  provider: "OpenAI"
}
```

### ProtocolStructure

```typescript
{
  objective: "Perform DNA extraction from bacterial culture",
  materials: [
    {
      name: "Lysis Buffer",
      catalogNumber: "L1234",
      supplier: "Sigma-Aldrich",
      quantity: "500 μL",
      notes: "Store at 4°C"
    }
  ],
  equipment: [
    {
      name: "Microcentrifuge",
      model: "Eppendorf 5424R",
      settings: "14,000 rpm, 4°C"
    }
  ],
  steps: [
    {
      stepNumber: 1,
      instruction: "Add 500 μL lysis buffer to cell pellet",
      duration: "5 minutes",
      temperature: "Room temperature",
      notes: "Vortex gently to resuspend",
      checkpoints: ["Pellet should be fully resuspended"]
    }
  ],
  qc: "Check A260/A280 ratio (should be 1.8-2.0)",
  troubleshooting: "If ratio is low, repeat precipitation step",
  confidence: 85
}
```

---

## Error Handling

All AI operations throw `AIProviderError` with retry information:

```typescript
import { AIProviderError } from '@/lib/ai/types'

try {
  const result = await voiceToProtocol(audioFile)
} catch (error) {
  if (error instanceof AIProviderError) {
    console.error('AI Error:', {
      message: error.message,
      provider: error.provider,
      capability: error.capability,
      retryable: error.retryable,
      originalError: error.originalError,
    })

    if (error.retryable) {
      // Show retry button to user
    } else {
      // Show permanent error message
    }
  }
}
```

---

## Integration Checklist

### Phase 1: Infrastructure ✅ Complete

- [x] Create AI type system (lib/ai/types.ts)
- [x] Implement OpenAI provider (lib/ai/providers/openai.ts)
- [x] Create prompt templates (lib/ai/prompts.ts)
- [x] Build AI router (lib/ai/router.ts)
- [x] Document setup process

### Phase 2: Voice Recording Component ⬜ Next

- [ ] Create VoiceRecorder component
- [ ] Audio capture with MediaRecorder API
- [ ] Recording controls (start/stop/pause)
- [ ] Duration display and waveform visualization
- [ ] Audio file export to WAV/MP3

### Phase 3: ELN Integration ⬜ Pending

- [ ] Add voice note button to ElectronicLabNotebook
- [ ] Integrate VoiceRecorder component
- [ ] Show transcript preview
- [ ] Display structured protocol
- [ ] Add photo upload button
- [ ] Photo-to-protocol flow

### Phase 4: Confidence UI ⬜ Pending

- [ ] Confidence-based highlighting (green/yellow/red)
- [ ] Inline editing for low-confidence spans
- [ ] Accept/reject suggestions
- [ ] Cost tracking display
- [ ] Error handling and retries

### Phase 5: Testing ⬜ Pending

- [ ] Test voice-to-protocol with sample audio
- [ ] Test photo-to-protocol with handwritten notes
- [ ] Test photo-to-protocol with typed text
- [ ] Test entity extraction
- [ ] Verify cost estimates
- [ ] Test error handling and retries

---

## Cost Optimization Tips

1. **Cache Transcripts**: Store transcript results to avoid re-transcribing
2. **Batch Requests**: Process multiple items together when possible
3. **Use Segments Sparingly**: Only request segments when needed (adds cost)
4. **Optimize Prompts**: Shorter, clearer prompts reduce token usage
5. **Reuse Structured Data**: Don't re-structure the same protocol multiple times
6. **Monitor Usage**: Track costs per user/session with built-in cost tracking

---

## Security Considerations

1. **API Key Protection**:
   - Never commit `.env.local` to git
   - Use `NEXT_PUBLIC_` prefix only for client-side keys
   - Consider using server-side API routes for sensitive operations

2. **User Data**:
   - Audio/images are sent to OpenAI API
   - Review OpenAI's data usage policy
   - Consider data retention policies
   - Inform users that AI features use external services

3. **Rate Limiting**:
   - Implement rate limits per user
   - Add cooldown between requests
   - Show cost estimates before processing

---

## Troubleshooting

### "No API key provided" Error

**Cause**: `NEXT_PUBLIC_OPENAI_API_KEY` not set or not loaded

**Fix**:
1. Verify `.env.local` exists in project root
2. Restart Next.js dev server after adding env vars
3. Check key starts with `sk-`

### "Provider 'OpenAI' not found" Error

**Cause**: OpenAI provider failed to initialize

**Fix**:
1. Check API key is valid
2. Verify internet connectivity
3. Check OpenAI API status: https://status.openai.com/

### High Latency Issues

**Expected Latencies**:
- STT (Whisper): 2-10 seconds for 1-5 min audio
- OCR (GPT-4V): 3-8 seconds per image
- Protocol Structuring: 5-15 seconds depending on complexity

**If higher**:
- Check network speed
- Consider using smaller audio files
- Reduce image resolution for faster upload

### Low Confidence Scores

**Common Causes**:
- Poor audio quality (background noise, mumbling)
- Unclear handwriting in photos
- Ambiguous or incomplete information
- Technical jargon not in training data

**Solutions**:
- Encourage clear speech at moderate pace
- Use good lighting for photos
- Provide more context in notes
- Add domain-specific terms to prompts

---

## Next Steps

**Ready to implement**:
1. Create VoiceRecorder component (components/VoiceRecorder.tsx)
2. Create PhotoUploader component (components/PhotoUploader.tsx)
3. Add AI features to ElectronicLabNotebook component
4. Build confidence highlighting UI
5. Add cost tracking display

**See**: [P0_IMPLEMENTATION_PROGRESS.md](P0_IMPLEMENTATION_PROGRESS.md) for current implementation status

---

**Last Updated**: 2025-11-05
**Status**: Phase 1 Complete, Ready for Phase 2
