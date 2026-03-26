import { NextRequest, NextResponse } from 'next/server';
import { tailorResume } from '@/core/tailor/pipeline';
import { parseResume } from '@/core/parser/resume-parser';
import type { Resume, Achievement, TailorPreferences, PipelineConfig } from '@/lib/types';
import { defaultConfig } from '@/ai/providers';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

// Allow up to 5 minutes for the pipeline to complete
export const maxDuration = 300;

// Default preferences when not provided
const DEFAULT_PREFERENCES: TailorPreferences = {
  tone: 'formal',
  emphasis: 'both',
  targetSeniority: 'senior',
  alwaysIncludeSkills: [],
  neverModify: {
    companyNames: true,
    dates: true,
    education: true,
    certifications: true,
  },
  maxBulletsPerRole: 5,
  yearsToHighlight: 10,
};

function loadAchievements(): Achievement[] {
  try {
    const achPath = path.join(process.cwd(), 'data', 'achievement-bank.yaml');
    if (!fs.existsSync(achPath)) return [];
    const content = fs.readFileSync(achPath, 'utf-8');
    const data = yaml.parse(content);
    return (data?.achievements || []).map((a: any, i: number) => ({
      id: `ach-${i}`,
      context: a.context || '',
      action: a.action || '',
      result: a.result || '',
      tags: a.tags || [],
      seniority: a.seniority || 'senior',
    }));
  } catch {
    return [];
  }
}

function loadPreferences(): TailorPreferences {
  try {
    const prefPath = path.join(process.cwd(), 'data', 'preferences.yaml');
    if (!fs.existsSync(prefPath)) return DEFAULT_PREFERENCES;
    const content = fs.readFileSync(prefPath, 'utf-8');
    const data = yaml.parse(content);
    return { ...DEFAULT_PREFERENCES, ...data };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

// ============================================================================
// POST /api/tailor — Main tailoring endpoint
// Input: resumeFile (filename) + job description  OR  baseResume (JSON) + job description
// Output: tailored resume + scores (also saves to disk)
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      baseResume,
      resumeFile,
      jobDescription,
      jobInfo,
      achievements: providedAchievements,
      preferences: providedPreferences,
      config = {},
    } = body as {
      baseResume?: Resume;
      resumeFile?: string;
      jobDescription: string;
      jobInfo?: { title?: string; company?: string; jobUrl?: string; jobId?: string };
      achievements?: Achievement[];
      preferences?: TailorPreferences;
      config?: Partial<PipelineConfig>;
    };

    // Validate JD
    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Missing required field: jobDescription' },
        { status: 400 }
      );
    }

    // Resolve resume: either from JSON body or parse from file
    let resume: Resume;
    if (baseResume) {
      resume = baseResume;
    } else if (resumeFile) {
      const filePath = path.join(process.cwd(), 'data', 'base-resume', resumeFile);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `Resume file not found: ${resumeFile}` }, { status: 404 });
      }
      resume = await parseResume(filePath);
    } else {
      return NextResponse.json({ error: 'Provide either baseResume (JSON) or resumeFile (filename)' }, { status: 400 });
    }

    // Load achievements and preferences (from files or request body)
    const achievements = providedAchievements || loadAchievements();
    const preferences = providedPreferences || loadPreferences();

    const result = await tailorResume({
      baseResume: resume,
      jobDescription,
      achievements,
      preferences,
      config: { ...defaultConfig, ...config },
    });

    // Save result to disk with timestamp ID
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const id = timestamp;
    const outputDir = path.join(process.cwd(), 'data', 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `tailored-${id}.json`);

    fs.writeFileSync(outputPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      jobInfo: jobInfo || null,
      parsedJob: (result as any).parsedJob || null,
      tailoredResume: result.tailoredResume,
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
      iterations: result.iterations,
      changes: result.changes,
    }, null, 2));

    return NextResponse.json({
      success: true,
      id,
      tailoredResume: result.tailoredResume,
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
      iterations: result.iterations,
      changes: result.changes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/tailor] Error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
