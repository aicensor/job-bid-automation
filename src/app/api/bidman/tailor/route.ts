import { NextRequest, NextResponse } from 'next/server';
import { tailorResume } from '@/core/tailor/pipeline';
import { parseResume } from '@/core/parser/resume-parser';
import { appendLogEntry } from '@/lib/bidman-log';
import { pushLogEntry } from '@/integrations/google-sheets/sync';
import { defaultConfig } from '@/ai/providers';
import type { Achievement, TailorPreferences } from '@/lib/types';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export const maxDuration = 300; // 5 minutes

// ============================================================================
// POST /api/bidman/tailor
// Input: { jobUrl, job (ScrapedJob), resumeFile }
// Output: { id, scoreBefore, scoreAfter, tailoredResume }
// Side effects: saves result JSON, appends to bidman log
// PDF download is handled client-side via POST /api/export
// ============================================================================

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
  const defaults: TailorPreferences = {
    tone: 'formal',
    emphasis: 'both',
    targetSeniority: 'senior',
    alwaysIncludeSkills: [],
    neverModify: { companyNames: true, dates: true, education: true, certifications: true },
    maxBulletsPerRole: 5,
    yearsToHighlight: 10,
  };
  try {
    const prefPath = path.join(process.cwd(), 'data', 'preferences.yaml');
    if (!fs.existsSync(prefPath)) return defaults;
    const content = fs.readFileSync(prefPath, 'utf-8');
    return { ...defaults, ...yaml.parse(content) };
  } catch {
    return defaults;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobUrl, job, resumeFile } = body as {
      jobUrl: string;
      job: ScrapedJob;
      resumeFile: string;
    };

    if (!job || !resumeFile) {
      return NextResponse.json(
        { error: 'Missing required fields: job, resumeFile' },
        { status: 400 }
      );
    }

    // 1. Parse resume
    const filePath = path.join(process.cwd(), 'data', 'base-resume', resumeFile);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Resume not found: ${resumeFile}` }, { status: 404 });
    }
    const resume = await parseResume(filePath);

    // 2. Run tailoring pipeline
    const achievements = loadAchievements();
    const preferences = loadPreferences();

    const result = await tailorResume({
      baseResume: resume,
      jobDescription: job.description,
      achievements,
      preferences,
      config: defaultConfig,
    });

    // 3. Save result JSON
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const id = timestamp;
    const outputDir = path.join(process.cwd(), 'data', 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, `tailored-${id}.json`),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          jobInfo: { title: job.title, company: job.company, jobUrl, industry: job.industry, mainTechStacks: job.mainTechStacks },
          tailoredResume: result.tailoredResume,
          scoreBefore: result.scoreBefore,
          scoreAfter: result.scoreAfter,
          iterations: result.iterations,
          changes: result.changes,
        },
        null,
        2
      )
    );

    // 4. Append to bidman log
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;

    const logEntry = appendLogEntry({
      date: dateStr,
      jobTitle: job.title,
      mainTechStacks: job.mainTechStacks || '',
      companyName: job.company,
      industry: job.industry || '',
      jobLink: jobUrl,
      bidder: '',
      tailoredResumeId: id,
      tailoredResumePath: '',
      originalResume: resumeFile,
      scoreBefore: result.scoreBefore.overall,
      scoreAfter: result.scoreAfter.overall,
    });

    // 5. Push to Google Sheets (fire-and-forget)
    pushLogEntry(logEntry).catch(() => {});

    // 6. Return result with tailored resume for client-side PDF export
    return NextResponse.json({
      success: true,
      id,
      scoreBefore: result.scoreBefore.overall,
      scoreAfter: result.scoreAfter.overall,
      tailoredResume: result.tailoredResume,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/bidman/tailor] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
