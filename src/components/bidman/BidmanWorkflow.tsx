'use client';

import { useState } from 'react';
import JobUrlInput from './JobUrlInput';
import JobPreview from './JobPreview';
import ResumeSelector from './ResumeSelector';
import TailorAction, { type TailorResultSummary } from './TailorAction';
import ScoreBadge from '@/components/shared/ScoreBadge';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';
import { SKILLS_TAXONOMY } from '@/data/skills-taxonomy';

interface ResumeFile {
  name: string;
  size: number;
  mainSkills?: string;
  instructions?: string;
  strictTruthCheck?: boolean;
}

interface BidmanWorkflowProps {
  availableResumes: ResumeFile[];
  bidder?: string;
}

export interface FitResult {
  resumeFile: string;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  llmScore?: number;
  llmReason?: string;
  llmLoading?: boolean;
}

type WorkflowStep = 'input' | 'found' | 'tailoring' | 'done';

const STAGE1_THRESHOLD = 30;
const LLM_THRESHOLD = 40;

// ============================================================================
// Stage 1: Weighted client-side skill matching with taxonomy
// ============================================================================

/** Normalize skill using taxonomy — e.g. "k8s" → "kubernetes" */
function normalize(skill: string): string {
  const lower = skill.toLowerCase().trim();
  if (SKILLS_TAXONOMY[lower]) return lower;
  for (const [canonical, synonyms] of Object.entries(SKILLS_TAXONOMY)) {
    if (synonyms.includes(lower)) return canonical;
  }
  return lower;
}

/** Get all known forms of a skill */
function getAllForms(skill: string): Set<string> {
  const canonical = normalize(skill);
  const forms = new Set<string>([canonical]);
  if (SKILLS_TAXONOMY[canonical]) {
    for (const syn of SKILLS_TAXONOMY[canonical]) forms.add(syn);
  }
  return forms;
}

/** Check if resume skill matches a job skill (using taxonomy) */
function skillMatches(resumeSkill: string, jobSkill: string): boolean {
  const rNorm = normalize(resumeSkill);
  const jNorm = normalize(jobSkill);
  if (rNorm === jNorm) return true;

  // Check if any form of resume skill matches any form of job skill
  const rForms = getAllForms(resumeSkill);
  const jForms = getAllForms(jobSkill);
  for (const rf of rForms) {
    for (const jf of jForms) {
      if (rf === jf) return true;
    }
  }
  return false;
}

/** Extract tech keywords from job title */
function extractTitleSkills(title: string): string[] {
  const words = title.toLowerCase().split(/[\s/,\-–()]+/).filter(Boolean);
  const techWords: string[] = [];
  // Check each word against taxonomy
  for (const word of words) {
    if (SKILLS_TAXONOMY[word] || Object.values(SKILLS_TAXONOMY).some((syns) => syns.includes(word))) {
      techWords.push(word);
    }
  }
  // Also check multi-word combos (e.g., "react native", "machine learning")
  const titleLower = title.toLowerCase();
  for (const canonical of Object.keys(SKILLS_TAXONOMY)) {
    if (canonical.includes(' ') && titleLower.includes(canonical)) {
      techWords.push(canonical);
    }
  }
  return [...new Set(techWords)];
}

function checkFitStage1(resumes: ResumeFile[], job: ScrapedJob): FitResult[] {
  const techStacks = (job.mainTechStacks || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const titleSkills = extractTitleSkills(job.title);

  // Build job skill tiers — what the job PRIMARILY wants
  const titleNorms = new Set(titleSkills.map(normalize));
  const primaryStacks = techStacks.slice(0, 3).map((s) => s.toLowerCase());
  const secondaryStacks = techStacks.slice(3).map((s) => s.toLowerCase());
  const primaryFiltered = primaryStacks.filter((s) => !titleNorms.has(normalize(s)));
  const secondaryFiltered = secondaryStacks.filter((s) => !titleNorms.has(normalize(s)));

  if (titleSkills.length === 0 && techStacks.length === 0) {
    return resumes.map((r) => ({
      resumeFile: r.name,
      fitScore: 50,
      matchedSkills: [],
      missingSkills: [],
    }));
  }

  return resumes
    .map((r) => {
      const resumeSkills = (r.mainSkills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (resumeSkills.length === 0) {
        return { resumeFile: r.name, fitScore: 0, matchedSkills: [], missingSkills: [] };
      }

      // For each resume main skill, check WHERE it appears in the job:
      //   Title match → 100 points (job is fundamentally about this skill)
      //   Primary tech (top 3) → 70 points (core requirement)
      //   Secondary tech → 30 points (nice to have, not what the job IS about)
      //   No match → 0
      // Final score = average across resume's main skills
      const matched: string[] = [];
      const missing: string[] = [];
      let totalPoints = 0;

      for (const rSkill of resumeSkills) {
        const inTitle = titleSkills.some((ts) => skillMatches(rSkill, ts));
        const inPrimary = primaryFiltered.some((ps) => skillMatches(rSkill, ps));
        const inSecondary = secondaryFiltered.some((ss) => skillMatches(rSkill, ss));

        if (inTitle) {
          totalPoints += 100;
          matched.push(rSkill + ' (title)');
        } else if (inPrimary) {
          totalPoints += 70;
          matched.push(rSkill);
        } else if (inSecondary) {
          totalPoints += 30;
          matched.push(rSkill);
        } else {
          missing.push(rSkill);
        }
      }

      const fitScore = Math.round(totalPoints / resumeSkills.length);
      return { resumeFile: r.name, fitScore, matchedSkills: matched, missingSkills: missing };
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

// ============================================================================
// Component
// ============================================================================

export default function BidmanWorkflow({ availableResumes, bidder }: BidmanWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>('input');
  const [job, setJob] = useState<ScrapedJob | null>(null);
  const [selectedResume, setSelectedResume] = useState(availableResumes[0]?.name || '');
  const [result, setResult] = useState<TailorResultSummary | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [fitResults, setFitResults] = useState<FitResult[]>([]);
  const [lowFitAcknowledged, setLowFitAcknowledged] = useState(false);
  const [llmChecking, setLlmChecking] = useState(false);

  // Stage 2: LLM fit check for resumes that pass Stage 1
  const runLlmCheck = async (scrapedJob: ScrapedJob, stage1Results: FitResult[]) => {
    const passing = stage1Results.filter((r) => r.fitScore >= STAGE1_THRESHOLD);
    if (passing.length === 0) return;

    setLlmChecking(true);

    // Run LLM check for each passing resume
    const updated = [...stage1Results];

    for (const fit of passing) {
      const resume = availableResumes.find((r) => r.name === fit.resumeFile);
      if (!resume?.mainSkills) continue;

      const idx = updated.findIndex((r) => r.resumeFile === fit.resumeFile);
      if (idx === -1) continue;

      // Mark as loading
      updated[idx] = { ...updated[idx], llmLoading: true };
      setFitResults([...updated]);

      try {
        const res = await fetch('/api/bidman/fit-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mainSkills: resume.mainSkills,
            jobTitle: scrapedJob.title,
            jobDescription: scrapedJob.description,
            mainTechStacks: scrapedJob.mainTechStacks || '',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          updated[idx] = {
            ...updated[idx],
            llmScore: data.score,
            llmReason: data.reason,
            llmLoading: false,
          };
        } else {
          updated[idx] = { ...updated[idx], llmLoading: false };
        }
      } catch {
        updated[idx] = { ...updated[idx], llmLoading: false };
      }

      setFitResults([...updated]);
    }

    // Re-sort: use LLM score when available, else Stage 1 score
    updated.sort((a, b) => {
      const scoreA = a.llmScore ?? a.fitScore;
      const scoreB = b.llmScore ?? b.fitScore;
      return scoreB - scoreA;
    });
    setFitResults([...updated]);

    // Auto-select best after LLM
    if (updated.length > 0) {
      setSelectedResume(updated[0].resumeFile);
    }

    setLlmChecking(false);
  };

  const handleJobFound = (scrapedJob: ScrapedJob) => {
    setJob(scrapedJob);
    setError('');
    setLowFitAcknowledged(false);

    // Stage 1: instant skill match
    const stage1 = checkFitStage1(availableResumes, scrapedJob);
    setFitResults(stage1);

    // Auto-select best from Stage 1
    if (stage1.length > 0 && stage1[0].fitScore > 0) {
      setSelectedResume(stage1[0].resumeFile);
    }

    setStep('found');

    // Stage 2: LLM check for passing resumes (async, non-blocking)
    runLlmCheck(scrapedJob, stage1);
  };

  const handleClear = () => {
    setJob(null);
    setResult(null);
    setFitResults([]);
    setLowFitAcknowledged(false);
    setLlmChecking(false);
    setStep('input');
    setError('');
  };

  const handleComplete = (res: TailorResultSummary) => {
    setResult(res);
    setStep('done');
  };

  const handleDownloadAgain = async () => {
    if (!result?.tailoredResume || !job) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: result.tailoredResume, format: 'pdf' }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const bestFit = fitResults.length > 0 ? fitResults[0] : null;
  const bestScore = bestFit ? (bestFit.llmScore ?? bestFit.fitScore) : 0;
  const allLowFit = bestScore < STAGE1_THRESHOLD;
  const canProceed = !allLowFit || lowFitAcknowledged;

  return (
    <div className="space-y-4">
      {/* Step 1: URL Input */}
      <JobUrlInput
        onJobFound={handleJobFound}
        onError={setError}
        disabled={step === 'tailoring'}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 2: Job Preview + Resume Selection */}
      {job && step !== 'input' && (
        <>
          <JobPreview job={job} onClear={handleClear} />

          <ResumeSelector
            resumes={availableResumes}
            selected={selectedResume}
            onSelect={setSelectedResume}
            disabled={step === 'tailoring' || step === 'done'}
            fitResults={fitResults}
            fitThreshold={STAGE1_THRESHOLD}
            llmChecking={llmChecking}
          />

          {/* Low fit warning */}
          {allLowFit && !lowFitAcknowledged && step === 'found' && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                None of your assigned resumes are a strong fit for this role
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Best match is <span className="font-medium">{bestFit?.resumeFile}</span> at {bestScore}% fit.
                {bestFit && bestFit.missingSkills.length > 0 && (
                  <> Missing: {bestFit.missingSkills.slice(0, 5).join(', ')}{bestFit.missingSkills.length > 5 ? ` +${bestFit.missingSkills.length - 5} more` : ''}</>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLowFitAcknowledged(true)}
                  className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  Proceed Anyway
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Try Different Job
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tailor Button / Progress */}
          {step === 'found' && canProceed && (
            <TailorAction
              job={job}
              selectedResume={selectedResume}
              tailoringInstructions={availableResumes.find((r) => r.name === selectedResume)?.instructions}
              strictTruthCheck={availableResumes.find((r) => r.name === selectedResume)?.strictTruthCheck}
              bidder={bidder}
              onComplete={handleComplete}
              onError={setError}
            />
          )}
        </>
      )}

      {/* Step 4: Done */}
      {step === 'done' && result && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
          <p className="text-lg font-bold text-green-800 mb-2">Resume Ready!</p>
          <p className="text-sm text-green-700 mb-4">PDF has been downloaded automatically.</p>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Before</p>
              <ScoreBadge score={result.scoreBefore} />
            </div>
            <span className="text-gray-400 text-lg">&rarr;</span>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">After</p>
              <ScoreBadge score={result.scoreAfter} />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleDownloadAgain}
              disabled={downloading}
              className="px-4 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {downloading ? 'Generating...' : 'Download Again'}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              New Bid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
