'use client';

import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';
import type { Resume } from '@/lib/types';

interface TailorActionProps {
  job: ScrapedJob;
  selectedResume: string;
  onComplete: (result: TailorResultSummary) => void;
  onError: (error: string) => void;
}

export interface TailorResultSummary {
  id: string;
  scoreBefore: number;
  scoreAfter: number;
  tailoredResume: Resume;
}

interface LogEntry {
  elapsed: string;
  step: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

async function downloadPdf(resume: Resume, filename: string) {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, format: 'pdf' }),
  });

  if (!res.ok) throw new Error('PDF generation failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PipelineProgress() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll pipeline status
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/bidman/status');
        const data = await res.json();
        if (data.entries?.length > 0) {
          setEntries(data.entries);
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);

    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => {
      clearInterval(poll);
      clearInterval(timer);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <LoadingSpinner size="md" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">Tailoring your resume...</h3>
          <p className="text-xs text-gray-400">
            Elapsed: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            {' '}&middot; This typically takes 60~180 seconds
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
        {entries.length === 0 ? (
          <p className="text-gray-400">Starting pipeline...</p>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              className={`flex gap-2 ${
                entry.level === 'error'
                  ? 'text-red-600'
                  : entry.level === 'warn'
                    ? 'text-amber-600'
                    : 'text-gray-600'
              }`}
            >
              <span className="text-gray-400 shrink-0 w-14 text-right">{entry.elapsed}</span>
              <span className="text-gray-300">|</span>
              <span className="shrink-0 w-20 text-gray-500 truncate">{entry.step}</span>
              <span>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default function TailorAction({ job, selectedResume, onComplete, onError }: TailorActionProps) {
  const [tailoring, setTailoring] = useState(false);

  const handleTailor = async () => {
    setTailoring(true);
    onError('');

    try {
      const res = await fetch('/api/bidman/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: job.url,
          job,
          resumeFile: selectedResume,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Tailoring failed');
      }

      const pdfFilename = `${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await downloadPdf(data.tailoredResume, pdfFilename);

      onComplete({
        id: data.id,
        scoreBefore: data.scoreBefore,
        scoreAfter: data.scoreAfter,
        tailoredResume: data.tailoredResume,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setTailoring(false);
    }
  };

  if (tailoring) {
    return <PipelineProgress />;
  }

  return (
    <button
      onClick={handleTailor}
      className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
    >
      Tailor Resume for {job.company}
    </button>
  );
}
