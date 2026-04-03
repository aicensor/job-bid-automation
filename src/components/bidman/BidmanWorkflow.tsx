'use client';

import { useState } from 'react';
import JobUrlInput from './JobUrlInput';
import JobPreview from './JobPreview';
import ResumeSelector from './ResumeSelector';
import TailorAction, { type TailorResultSummary } from './TailorAction';
import ScoreBadge from '@/components/shared/ScoreBadge';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';
import type { FitResult } from '@/app/api/bidman/fit-check/route';

interface ResumeFile {
  name: string;
  size: number;
  instructions?: string;
  strictTruthCheck?: boolean;
}

interface BidmanWorkflowProps {
  availableResumes: ResumeFile[];
  bidder?: string;
}

type WorkflowStep = 'input' | 'checking' | 'found' | 'tailoring' | 'done';

const FIT_THRESHOLD = 40; // below this = "low fit" warning

export default function BidmanWorkflow({ availableResumes, bidder }: BidmanWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>('input');
  const [job, setJob] = useState<ScrapedJob | null>(null);
  const [selectedResume, setSelectedResume] = useState(availableResumes[0]?.name || '');
  const [result, setResult] = useState<TailorResultSummary | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [fitResults, setFitResults] = useState<FitResult[]>([]);
  const [fitLoading, setFitLoading] = useState(false);
  const [lowFitAcknowledged, setLowFitAcknowledged] = useState(false);

  const runFitCheck = async (scrapedJob: ScrapedJob) => {
    setFitLoading(true);
    try {
      const res = await fetch('/api/bidman/fit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeFiles: availableResumes.map((r) => r.name),
          jobDescription: scrapedJob.description,
          mainTechStacks: scrapedJob.mainTechStacks || '',
          jobTitle: scrapedJob.title,
        }),
      });
      if (res.ok) {
        const results = (await res.json()) as FitResult[];
        setFitResults(results);
        // Auto-select best match
        if (results.length > 0 && results[0].fitScore > 0) {
          setSelectedResume(results[0].resumeFile);
        }
      }
    } catch {
      // Fit check is non-critical, proceed without it
    } finally {
      setFitLoading(false);
    }
  };

  const handleJobFound = async (scrapedJob: ScrapedJob) => {
    setJob(scrapedJob);
    setError('');
    setLowFitAcknowledged(false);
    setStep('checking');
    await runFitCheck(scrapedJob);
    setStep('found');
  };

  const handleClear = () => {
    setJob(null);
    setResult(null);
    setFitResults([]);
    setLowFitAcknowledged(false);
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
  const selectedFit = fitResults.find((f) => f.resumeFile === selectedResume);
  const allLowFit = bestFit ? bestFit.fitScore < FIT_THRESHOLD : false;
  const canProceed = !allLowFit || lowFitAcknowledged;

  return (
    <div className="space-y-4">
      {/* Step 1: URL Input */}
      <JobUrlInput
        onJobFound={handleJobFound}
        onError={setError}
        disabled={step === 'tailoring' || step === 'checking'}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Fit checking indicator */}
      {step === 'checking' && job && (
        <>
          <JobPreview job={job} onClear={handleClear} />
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm text-blue-700">Scoring resume-job fit...</p>
              <p className="text-[10px] text-blue-500 mt-0.5">Running ATS scorer against your resumes (10-30s)</p>
            </div>
          </div>
        </>
      )}

      {/* Step 2: Job Preview + Resume Selection */}
      {job && (step === 'found' || step === 'tailoring' || step === 'done') && (
        <>
          <JobPreview job={job} onClear={handleClear} />

          <ResumeSelector
            resumes={availableResumes}
            selected={selectedResume}
            onSelect={setSelectedResume}
            disabled={step === 'tailoring' || step === 'done'}
            fitResults={fitResults}
            fitThreshold={FIT_THRESHOLD}
          />

          {/* Low fit warning for all resumes */}
          {allLowFit && !lowFitAcknowledged && step === 'found' && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                None of your assigned resumes are a strong fit for this role
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Best match is <span className="font-medium">{bestFit?.resumeFile}</span> scoring {bestFit?.fitScore}/100.
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

      {/* Step 4: Done — Score + New Bid */}
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
