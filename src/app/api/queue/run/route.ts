import { NextResponse } from 'next/server';
import { getPendingJobs, updateJobStatus } from '@/lib/queue';
import { tailorResume } from '@/core/tailor/pipeline';
import { parseResume } from '@/core/parser/resume-parser';
import { generateDocx } from '@/integrations/docx/generator';
import { defaultConfig } from '@/ai/providers';
import type { Achievement, TailorPreferences } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

// Allow long-running queue processing
export const maxDuration = 600; // 10 minutes

function loadAchievements(): Achievement[] {
  try {
    const p = path.join(process.cwd(), 'data', 'achievement-bank.yaml');
    if (!fs.existsSync(p)) return [];
    const data = yaml.parse(fs.readFileSync(p, 'utf-8'));
    return (data?.achievements || []).map((a: any, i: number) => ({
      id: `ach-${i}`, context: a.context || '', action: a.action || '',
      result: a.result || '', tags: a.tags || [], seniority: a.seniority || 'senior',
    }));
  } catch { return []; }
}

function loadPreferences(): TailorPreferences {
  const defaults: TailorPreferences = {
    tone: 'formal', emphasis: 'both', targetSeniority: 'senior',
    alwaysIncludeSkills: [],
    neverModify: { companyNames: true, dates: true, education: true, certifications: true },
    maxBulletsPerRole: 5, yearsToHighlight: 10,
  };
  try {
    const p = path.join(process.cwd(), 'data', 'preferences.yaml');
    if (!fs.existsSync(p)) return defaults;
    return { ...defaults, ...yaml.parse(fs.readFileSync(p, 'utf-8')) };
  } catch { return defaults; }
}

// POST /api/queue/run — process all pending jobs with SSE progress
export async function POST() {
  const pendingJobs = getPendingJobs();

  if (pendingJobs.length === 0) {
    return NextResponse.json({ error: 'No pending jobs in queue' }, { status: 400 });
  }

  // Find base resume
  const resumeDir = path.join(process.cwd(), 'data', 'base-resume');
  const resumeFiles = fs.readdirSync(resumeDir).filter(f => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.json'));
  if (resumeFiles.length === 0) {
    return NextResponse.json({ error: 'No base resume found in data/base-resume/' }, { status: 400 });
  }
  const resumePath = path.join(resumeDir, resumeFiles[0]);

  const achievements = loadAchievements();
  const preferences = loadPreferences();

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: any) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      send('start', { total: pendingJobs.length });

      // Parse base resume once
      let baseResume;
      try {
        baseResume = await parseResume(resumePath);
      } catch (err) {
        send('error', { message: 'Failed to parse base resume: ' + (err instanceof Error ? err.message : String(err)) });
        controller.close();
        return;
      }

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < pendingJobs.length; i++) {
        const job = pendingJobs[i];

        send('processing', { jobId: job.id, title: job.title, company: job.company, index: i + 1, total: pendingJobs.length });
        updateJobStatus(job.id, { status: 'processing' });

        try {
          // Run tailor pipeline
          const result = await tailorResume({
            baseResume,
            jobDescription: job.description,
            achievements,
            preferences,
            config: { ...defaultConfig, maxIterations: 1 },
          });

          // Save result to disk
          const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
          const outputDir = path.join(process.cwd(), 'data', 'output');
          fs.mkdirSync(outputDir, { recursive: true });

          fs.writeFileSync(path.join(outputDir, `tailored-${timestamp}.json`), JSON.stringify({
            generatedAt: new Date().toISOString(),
            jobInfo: { title: job.title, company: job.company, jobUrl: job.jobUrl, jobId: job.jobId },
            parsedJob: (result as any).parsedJob || null,
            tailoredResume: result.tailoredResume,
            scoreBefore: result.scoreBefore,
            scoreAfter: result.scoreAfter,
            iterations: result.iterations,
            changes: result.changes,
          }, null, 2));

          // Generate DOCX
          await generateDocx(result.tailoredResume, `tailored-${timestamp}`);

          // Update queue
          updateJobStatus(job.id, {
            status: 'completed',
            resultId: timestamp,
            score: result.scoreAfter.overall,
            scoreBefore: result.scoreBefore.overall,
            completedAt: new Date().toISOString(),
          });

          succeeded++;
          send('completed', {
            jobId: job.id,
            title: job.title,
            company: job.company,
            score: result.scoreAfter.overall,
            scoreBefore: result.scoreBefore.overall,
            resultId: timestamp,
            index: i + 1,
          });

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          updateJobStatus(job.id, { status: 'failed', error: errorMsg });
          failed++;
          send('failed', { jobId: job.id, title: job.title, error: errorMsg, index: i + 1 });
        }
      }

      send('done', { processed: pendingJobs.length, succeeded, failed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
