import type { TailorResult, Resume, Achievement, TailorPreferences, PipelineConfig } from '@/lib/types';
import { tailorResume } from '@/core/tailor/pipeline';

// ============================================================================
// LinkedIn Bot Adapter — Bridge between LinkedIn bot and resume tailoring
// ============================================================================

export interface LinkedInBotRequest {
  jobId: string;
  jobUrl: string;
  jobDescription: string;
  company: string;
  title: string;
}

export interface LinkedInBotResponse {
  success: boolean;
  pdfPath?: string;
  score: number;
  scoreBefore: number;
  iterations: number;
  error?: string;
}

/**
 * Handle incoming request from LinkedIn job bid bot
 * Receives a JD, generates a tailored resume, returns PDF path
 */
export async function handleLinkedInBotRequest(
  request: LinkedInBotRequest,
  baseResume: Resume,
  achievements: Achievement[],
  preferences: TailorPreferences,
  config: PipelineConfig
): Promise<LinkedInBotResponse> {
  try {
    console.log(`[linkedin-adapter] Tailoring for: ${request.title} at ${request.company}`);

    // Run the full tailoring pipeline
    const result: TailorResult = await tailorResume({
      baseResume,
      jobDescription: request.jobDescription,
      achievements,
      preferences,
      config,
    });

    // Generate PDF
    const { generatePdf } = await import('@/integrations/pdf/generator');
    const pdfPath = await generatePdf(
      result.tailoredResume,
      `${sanitizeFilename(request.company)}_${sanitizeFilename(request.title)}`
    );

    console.log(`[linkedin-adapter] Generated: ${pdfPath} (score: ${result.scoreAfter.overall})`);

    return {
      success: true,
      pdfPath,
      score: result.scoreAfter.overall,
      scoreBefore: result.scoreBefore.overall,
      iterations: result.iterations,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[linkedin-adapter] Failed: ${message}`);

    return {
      success: false,
      score: 0,
      scoreBefore: 0,
      iterations: 0,
      error: message,
    };
  }
}

/**
 * Webhook endpoint handler for LinkedIn bot
 * POST /api/tailor with LinkedInBotRequest body
 */
export async function webhookHandler(body: LinkedInBotRequest): Promise<LinkedInBotResponse> {
  // TODO: Load base resume, achievements, preferences from storage
  // This will be connected to the Next.js API route

  throw new Error('Not implemented — connect to storage layer');
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);
}
