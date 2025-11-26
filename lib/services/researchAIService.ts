import { analyzeScientificContent, generateSummary } from '@/lib/ai/geminiAgent';
import { updateResearchPin } from './researchService';
import { logger } from '../logger';
import type { ResearchPin } from '../types';

/**
 * Analyze a research pin with AI
 * Sets isThinking=true during analysis with 60s timeout
 * @param pin The pin to analyze
 * @returns Promise that resolves when analysis is complete
 * @throws Error if analysis fails or times out
 */
export async function analyzeResearchPin(pin: ResearchPin): Promise<void> {
  try {
    // Set thinking state
    await updateResearchPin(pin.id, { isThinking: true });

    // Set 60-second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI analysis timeout after 60 seconds')), 60000)
    );

    // Perform analysis
    const analysisPromise = performAnalysis(pin);

    // Race between analysis and timeout
    const { analysis, summary } = await Promise.race([
      analysisPromise,
      timeoutPromise
    ]);

    // Update pin with AI analysis results
    await updateResearchPin(pin.id, {
      aiAnalysis: analysis,
      aiSummary: summary,
      isThinking: false,
    });

    logger.info('AI analysis complete', { pinId: pin.id });
  } catch (error) {
    logger.error('Error during AI analysis', error);
    // Clear thinking state on error
    await updateResearchPin(pin.id, { isThinking: false });
    throw error;
  }
}

/**
 * Perform the actual AI analysis based on pin type
 */
async function performAnalysis(pin: ResearchPin): Promise<{ analysis?: string; summary?: string }> {
  let analysis: string | undefined;
  let summary: string | undefined;

  if (pin.type === 'figure' && pin.imageUrl) {
    // Analyze image
    const imageBlob = await fetch(pin.imageUrl).then(r => r.blob());
    const imageFile = new File([imageBlob], 'image.jpg');

    analysis = await analyzeScientificContent({
      content: imageFile,
      contentType: 'image',
      context: pin.title || pin.content,
    });
    summary = await generateSummary(analysis, 'text');

  } else if (pin.type === 'paper' && pin.pdfText) {
    // Analyze PDF text
    analysis = await analyzeScientificContent({
      content: pin.pdfText,
      contentType: 'pdf',
      context: pin.title,
    });
    summary = await generateSummary(analysis, 'pdf');

  } else if (pin.type === 'video' && pin.url) {
    // Analyze YouTube video metadata
    analysis = await analyzeScientificContent({
      content: `YouTube video: ${pin.url}\n${pin.title || ''}\n${pin.content || ''}`,
      contentType: 'text',
      context: 'YouTube video analysis',
    });
    summary = await generateSummary(analysis, 'text');

  } else if (pin.content) {
    // Analyze text content
    analysis = await analyzeScientificContent({
      content: pin.content,
      contentType: 'text',
      context: pin.title,
    });
    summary = await generateSummary(analysis, 'text');
  }

  return { analysis, summary };
}
