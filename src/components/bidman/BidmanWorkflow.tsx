'use client';

import { useState } from 'react';
import JobUrlInput from './JobUrlInput';
import JobPreview from './JobPreview';
import ResumeSelector from './ResumeSelector';
import TailorAction, { type TailorResultSummary } from './TailorAction';
import ScoreBadge from '@/components/shared/ScoreBadge';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';

interface ResumeFile {
  name: string;
  size: number;
}

interface BidmanWorkflowProps {
  availableResumes: ResumeFile[];
}

type WorkflowStep = 'input' | 'found' | 'tailoring' | 'done';

export default function BidmanWorkflow({ availableResumes }: BidmanWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>('input');
  const [job, setJob] = useState<ScrapedJob | null>(null);
  const [selectedResume, setSelectedResume] = useState(availableResumes[0]?.name || '');
  const [result, setResult] = useState<TailorResultSummary | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleJobFound = (scrapedJob: ScrapedJob) => {
    setJob(scrapedJob);
    setStep('found');
    setError('');
  };

  const handleClear = () => {
    setJob(null);
    setResult(null);
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
          />

          {/* Step 3: Tailor Button / Progress */}
          {step === 'found' && (
            <TailorAction
              job={job}
              selectedResume={selectedResume}
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
