import { NextRequest, NextResponse } from 'next/server';
import { scoreResume } from '@/core/scorer/composite-scorer';
import { parseJobDescription } from '@/core/parser/jd-parser';
import { runQualityGates } from '@/core/validators/quality-gates';
import type { Resume, PipelineConfig } from '@/lib/types';
import { defaultConfig } from '@/ai/providers';

// ============================================================================
// POST /api/score — Score a resume against a job description
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { resume, jobDescription, config = {} } = body as {
      resume: Resume;
      jobDescription: string;
      config?: Partial<PipelineConfig>;
    };

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: resume, jobDescription' },
        { status: 400 }
      );
    }

    const pipelineConfig = { ...defaultConfig, ...config };

    // Parse JD
    const parsedJob = await parseJobDescription(jobDescription, pipelineConfig);

    // Score
    const score = await scoreResume(resume, parsedJob, pipelineConfig);

    // Quality gates
    const gates = runQualityGates(resume, score);

    return NextResponse.json({
      score,
      gates,
      parsedJob: {
        company: parsedJob.company,
        title: parsedJob.title,
        keywords: parsedJob.keywords,
        requiredSkills: parsedJob.requiredSkills,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
