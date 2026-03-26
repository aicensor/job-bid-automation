import 'dotenv/config';
import { resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse as parseYaml } from 'yaml';

// ============================================================================
// CLI Entry Point — Quick test of the full pipeline
// Usage: npm run tailor -- --resume data/base-resume/resume.pdf --jd "paste JD here"
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse CLI args
  const resumePath = getArg(args, '--resume') || findDefaultResume();
  const jdArg = getArg(args, '--jd');
  let jdText: string;
  if (jdArg && require('fs').existsSync(resolve(process.cwd(), jdArg))) {
    jdText = readFileSync(resolve(process.cwd(), jdArg), 'utf-8');
    console.log(`📝 Loaded JD from file: ${jdArg}`);
  } else {
    jdText = jdArg || getDefaultJD();
  }
  const scoreOnly = args.includes('--score-only');

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  TAILOR RESUME GENERATOR — CLI                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  // Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set. Copy .env.example to .env and add your key.');
    process.exit(1);
  }

  // Load preferences
  const prefsPath = resolve(process.cwd(), 'data/preferences.yaml');
  const prefsRaw = readFileSync(prefsPath, 'utf-8');
  const prefs = parseYaml(prefsRaw);

  // Load achievement bank
  const achPath = resolve(process.cwd(), 'data/achievement-bank.yaml');
  const achRaw = readFileSync(achPath, 'utf-8');
  const achData = parseYaml(achRaw);

  // Flatten achievements from categories
  const achievements = flattenAchievements(achData);
  console.log(`📋 Loaded ${achievements.length} achievements from bank`);

  // Parse resume
  console.log(`\n📄 Parsing resume: ${resumePath}`);
  const { parseResume } = await import('../core/parser/resume-parser.js');
  const baseResume = await parseResume(resolve(process.cwd(), resumePath));
  console.log(`  → ${baseResume.experience.length} work experiences found`);
  console.log(`  → ${baseResume.skills.flatMap((s: any) => s.skills).length} skills found`);

  if (scoreOnly) {
    // Score only mode
    const { parseJobDescription } = await import('../core/parser/jd-parser.js');
    const { scoreResume } = await import('../core/scorer/composite-scorer.js');
    const { defaultConfig } = await import('../ai/providers.js');

    const parsedJob = await parseJobDescription(jdText, defaultConfig);
    const score = await scoreResume(baseResume, parsedJob, defaultConfig);

    console.log('\n📊 Score Results:');
    console.log(`  Overall:             ${score.overall}/100`);
    console.log(`  ATS Keyword Match:   ${score.breakdown.atsKeywordMatch}/100`);
    console.log(`  Semantic Similarity: ${score.breakdown.semanticSimilarity}/100`);
    console.log(`  Seniority Signals:   ${score.breakdown.senioritySignals}/100`);
    console.log(`  Readability:         ${score.breakdown.readability}/100`);
    console.log(`  Achievement Quality: ${score.breakdown.achievementQuality}/100`);
    console.log(`\n🔑 Missing Keywords: ${score.missingKeywords.join(', ')}`);
    return;
  }

  // Full tailoring pipeline
  const { tailorResume } = await import('../core/tailor/pipeline.js');

  const result = await tailorResume({
    baseResume,
    jobDescription: jdText,
    achievements,
    preferences: {
      tone: prefs.tone || 'balanced',
      emphasis: prefs.emphasis || 'both',
      targetSeniority: prefs.targetSeniority || 'senior',
      alwaysIncludeSkills: prefs.alwaysIncludeSkills || [],
      neverModify: prefs.neverModify || {
        companyNames: true,
        dates: true,
        education: true,
        certifications: true,
      },
      maxBulletsPerRole: prefs.maxBulletsPerRole || 5,
      yearsToHighlight: prefs.yearsToHighlight || 4,
    },
    config: prefs.pipeline,
  });

  // Save result
  const outputDir = resolve(process.cwd(), 'data/output');
  mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = resolve(outputDir, `tailored-${timestamp}.json`);
  writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(`\n💾 Saved to: ${outputPath}`);
  console.log(`\n📊 Score: ${result.scoreBefore.overall} → ${result.scoreAfter.overall} (+${result.scoreAfter.overall - result.scoreBefore.overall})`);
}

// --- Helpers ---

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function findDefaultResume(): string {
  const { readdirSync } = require('fs');
  const dir = resolve(process.cwd(), 'data/base-resume');
  const files = readdirSync(dir) as string[];
  const resume = files.find((f: string) => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.json'));
  if (!resume) {
    console.error('❌ No resume found in data/base-resume/');
    process.exit(1);
  }
  return `data/base-resume/${resume}`;
}

function getDefaultJD(): string {
  return `Senior Software Engineer - Full Stack

About Us:
We are a fast-growing fintech company building the next generation of payment infrastructure.

What you'll do:
- Design and implement scalable microservices using Node.js, TypeScript, and Go
- Build responsive web applications with React and Next.js
- Architect and optimize PostgreSQL and Redis data layers
- Lead technical design reviews and mentor junior engineers
- Drive CI/CD pipeline improvements using GitHub Actions and Kubernetes
- Collaborate with product managers to define technical requirements

What we're looking for:
- 7+ years of software engineering experience
- Strong proficiency in TypeScript, React, Node.js
- Experience with cloud infrastructure (AWS or GCP)
- Experience designing and building RESTful APIs and microservices
- Strong understanding of system design and distributed systems
- Experience with SQL and NoSQL databases
- Excellent communication skills and ability to work cross-functionally

Nice to have:
- Experience with Go or Rust
- Knowledge of event-driven architectures (Kafka, RabbitMQ)
- Experience with container orchestration (Kubernetes, Docker)
- Experience in fintech or payments domain
- Contributions to open source projects`;
}

function flattenAchievements(data: any): any[] {
  const achievements: any[] = [];
  if (!data?.categories) return achievements;

  for (const [_catKey, category] of Object.entries(data.categories) as any[]) {
    if (!category?.achievements) continue;
    for (const ach of category.achievements) {
      achievements.push({
        id: ach.id,
        context: ach.bullet?.split(',')[0] || '',
        action: ach.bullet || '',
        result: ach.bullet || '',
        tags: ach.tags || [],
        seniority: ach.seniority || 'senior',
      });
    }
  }

  return achievements;
}

// Run
main().catch(err => {
  console.error('❌ Pipeline failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
