import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseResume } from '@/core/parser/resume-parser';
import { parseJobDescription } from '@/core/parser/jd-parser';
import { scoreResume } from '@/core/scorer/composite-scorer';
import { defaultConfig } from '@/ai/providers';
import type { Resume, ParsedJob } from '@/lib/types';

// ============================================================================
// Fit Check API — Uses the same composite scorer as the tailor pipeline
// Parses JD + each resume, then scores them with the full 5-dimension scorer
// ============================================================================

interface FitCheckRequest {
  resumeFiles: string[];
  jobDescription: string;
  mainTechStacks: string;
  jobTitle: string;
}

export interface FitResult {
  resumeFile: string;
  fitScore: number;          // 0-100 (same scale as tailor pipeline)
  missingSkills: string[];   // from ATS scorer
  breakdown: {
    atsKeywordMatch: number;
    semanticSimilarity: number;
    senioritySignals: number;
    readability: number;
    achievementQuality: number;
  };
}

// Cache parsed resumes to avoid re-parsing on repeated checks
const resumeCache = new Map<string, Resume>();

async function getParsedResume(filename: string): Promise<Resume | null> {
  if (resumeCache.has(filename)) return resumeCache.get(filename)!;

  const filePath = path.join(process.cwd(), 'data', 'base-resume', filename);
  if (!fs.existsSync(filePath)) return null;

  try {
    const resume = await parseResume(filePath);
    resumeCache.set(filename, resume);
    return resume;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { resumeFiles, jobDescription, mainTechStacks, jobTitle } = (await req.json()) as FitCheckRequest;

    if (!resumeFiles?.length || !jobDescription) {
      return NextResponse.json({ error: 'resumeFiles and jobDescription required' }, { status: 400 });
    }

    const config = { ...defaultConfig };

    // Step 1: Parse JD (uses LLM)
    const parsedJob = await parseJobDescription(jobDescription, config);

    // Step 2: Parse + score all resumes in parallel
    const results = await Promise.all(
      resumeFiles.map(async (filename): Promise<FitResult> => {
        const resume = await getParsedResume(filename);
        if (!resume) {
          return {
            resumeFile: filename,
            fitScore: 0,
            missingSkills: [],
            breakdown: { atsKeywordMatch: 0, semanticSimilarity: 0, senioritySignals: 0, readability: 0, achievementQuality: 0 },
          };
        }

        const score = await scoreResume(resume, parsedJob, config);

        return {
          resumeFile: filename,
          fitScore: score.overall,
          missingSkills: score.missingKeywords,
          breakdown: score.breakdown,
        };
      })
    );

    // Sort by fit score descending
    results.sort((a, b) => b.fitScore - a.fitScore);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[api/bidman/fit-check] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fit check failed' },
      { status: 500 }
    );
  }
}
