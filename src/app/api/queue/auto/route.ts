import { NextRequest, NextResponse } from 'next/server';
import { runAutoQueue, loadAutoQueueConfig } from '@/lib/auto-queue';
import { getPendingJobs, updateJobStatus } from '@/lib/queue';
import { tailorResume } from '@/core/tailor/pipeline';
import { parseResume } from '@/core/parser/resume-parser';
import { generateDocx } from '@/integrations/docx/generator';
import { defaultConfig } from '@/ai/providers';
import type { Achievement, TailorPreferences } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

// Allow long-running auto-queue + auto-run
export const maxDuration = 600;

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

// POST /api/queue/auto — run auto-queue (search + filter + add to queue + optionally auto-run)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Allow overriding config from request body
    const baseConfig = loadAutoQueueConfig();
    const config = {
      ...baseConfig,
      search: { ...baseConfig.search, ...body.search },
      filter: { ...baseConfig.filter, ...body.filter },
      autoRun: { ...baseConfig.autoRun, ...body.autoRun },
    };

    // SSE stream for progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: any) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        send('start', { config: config.search });

        // Phase 1: Find and queue jobs
        const result = await runAutoQueue(config, (msg) => {
          send('progress', { message: msg });
        });

        send('queued', result);

        // Phase 2: Auto-run if enabled and jobs were added
        if (config.autoRun.enabled && result.added > 0) {
          send('progress', { message: `[auto-run] Starting tailoring for ${result.added} queued jobs...` });

          // Find base resume
          const resumeDir = path.join(process.cwd(), 'data', 'base-resume');
          const resumeFiles = fs.readdirSync(resumeDir).filter(f => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.json'));
          if (resumeFiles.length === 0) {
            send('progress', { message: '[auto-run] ❌ No base resume found' });
            send('done', result);
            controller.close();
            return;
          }

          const resumePath = path.join(resumeDir, resumeFiles[0]);
          const achievements = loadAchievements();
          const preferences = loadPreferences();

          let baseResume;
          try {
            baseResume = await parseResume(resumePath);
          } catch (err) {
            send('progress', { message: `[auto-run] ❌ Failed to parse resume: ${err instanceof Error ? err.message : String(err)}` });
            send('done', result);
            controller.close();
            return;
          }

          const pendingJobs = getPendingJobs();
          let succeeded = 0;
          let failed = 0;

          for (let i = 0; i < pendingJobs.length; i++) {
            const job = pendingJobs[i];
            const label = `${job.title} @ ${job.company}`;
            const progress = `[${i + 1}/${pendingJobs.length}]`;

            send('progress', { message: `${progress} 🔄 Starting: ${label}` });
            updateJobStatus(job.id, { status: 'processing' });

            try {
              send('progress', { message: `${progress} 📄 Parsing job description...` });

              // Override console.log to capture pipeline steps
              const origLog = console.log;
              console.log = (...args: any[]) => {
                const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
                if (msg.includes('[Step') || msg.includes('→')) {
                  send('progress', { message: `${progress}   ${msg.trim()}` });
                }
                origLog(...args);
              };

              const tailorResult = await tailorResume({
                baseResume,
                jobDescription: job.description,
                achievements,
                preferences,
                config: { ...defaultConfig, maxIterations: 1 },
              });

              console.log = origLog;

              send('progress', { message: `${progress} 💾 Saving result...` });

              // Save result
              const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
              const outputDir = path.join(process.cwd(), 'data', 'output');
              fs.mkdirSync(outputDir, { recursive: true });

              fs.writeFileSync(path.join(outputDir, `tailored-${timestamp}.json`), JSON.stringify({
                generatedAt: new Date().toISOString(),
                jobInfo: { title: job.title, company: job.company, jobUrl: job.jobUrl, jobId: job.jobId },
                parsedJob: (tailorResult as any).parsedJob || null,
                tailoredResume: tailorResult.tailoredResume,
                scoreBefore: tailorResult.scoreBefore,
                scoreAfter: tailorResult.scoreAfter,
                iterations: tailorResult.iterations,
                changes: tailorResult.changes,
              }, null, 2));

              send('progress', { message: `${progress} 📝 Generating DOCX...` });
              await generateDocx(tailorResult.tailoredResume, `tailored-${timestamp}`);

              updateJobStatus(job.id, {
                status: 'completed',
                resultId: timestamp,
                score: tailorResult.scoreAfter.overall,
                scoreBefore: tailorResult.scoreBefore.overall,
                completedAt: new Date().toISOString(),
              });

              succeeded++;
              send('progress', { message: `[auto-run] ✅ ${label}: ${tailorResult.scoreBefore.overall} → ${tailorResult.scoreAfter.overall}` });

            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              // Restore console.log in case of error
              console.log = console.log;
              updateJobStatus(job.id, { status: 'failed', error: errorMsg });
              failed++;
              send('progress', { message: `[auto-run] ❌ ${label}: ${errorMsg}` });
            }
          }

          send('progress', { message: `[auto-run] Done: ${succeeded} succeeded, ${failed} failed` });
        }

        send('done', result);
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Auto-queue failed' },
      { status: 500 }
    );
  }
}

// GET /api/queue/auto — get current auto-queue config
export async function GET() {
  const config = loadAutoQueueConfig();
  return NextResponse.json(config);
}
