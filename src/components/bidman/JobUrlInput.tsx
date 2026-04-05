'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';

interface HistoryEntry {
  id: number;
  job_url: string;
  job_title: string;
  company: string;
  tech_stacks: string;
  industry: string;
  job_data: string;
  created_at: string;
}

interface JobUrlInputProps {
  onJobFound: (job: ScrapedJob) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function JobUrlInput({ onJobFound, onError, disabled }: JobUrlInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/bidman/job-history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setHistory(data);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { loadHistory(); }, []);

  const saveToHistory = async (job: ScrapedJob) => {
    try {
      await fetch('/api/bidman/job-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: job.url,
          jobTitle: job.title,
          company: job.company,
          techStacks: job.mainTechStacks || '',
          industry: job.industry || '',
          jobData: job,
        }),
      });
      loadHistory();
    } catch { /* ignore */ }
  };

  const clearHistory = async () => {
    await fetch('/api/bidman/job-history', { method: 'DELETE' });
    setHistory([]);
    setShowHistory(false);
  };

  const handleJobFound = (job: ScrapedJob) => {
    saveToHistory(job);
    onJobFound(job);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      onError('Please enter a job URL');
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      onError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    onError('');
    setShowManualInput(false);
    setShowHistory(false);

    try {
      const res = await fetch('/api/jobs/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape job posting');
      }

      handleJobFound(data as ScrapedJob);
    } catch {
      setShowManualInput(true);
      onError('');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    const trimmedText = manualText.trim();
    if (!trimmedText) {
      onError('Please paste the job description');
      return;
    }

    setLoading(true);
    onError('');

    try {
      const res = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText, url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse job description');
      }

      handleJobFound(data as ScrapedJob);
      setShowManualInput(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setShowHistory(false);
    setUrl(entry.job_url);
    try {
      const job = JSON.parse(entry.job_data) as ScrapedJob;
      onJobFound(job);
    } catch {
      onError('Failed to load job from history');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Job URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/view/... or any job posting URL"
            disabled={disabled || loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={disabled || loading || !url.trim()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
          >
            {loading && !showManualInput ? (
              <>
                <LoadingSpinner size="sm" />
                Finding...
              </>
            ) : (
              'Find Job'
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">
            Supports LinkedIn, Indeed, Glassdoor, company career pages, and most job boards
          </p>
          {history.length > 0 && !disabled && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-primary hover:underline shrink-0"
            >
              {showHistory ? 'Hide History' : `History (${history.length})`}
            </button>
          )}
        </div>
      </form>

      {/* Job search history */}
      {showHistory && history.length > 0 && (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">Recent Jobs</p>
            <button onClick={clearHistory} className="text-[10px] text-red-400 hover:text-red-600">Clear All</button>
          </div>
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleSelectHistory(entry)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.job_title}</p>
                    <p className="text-xs text-gray-500">
                      {entry.company}
                      {entry.industry && <span className="text-gray-400"> &middot; {entry.industry}</span>}
                    </p>
                    {entry.tech_stacks && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tech_stacks.split(',').slice(0, 5).map((t) => (
                          <span key={t.trim()} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap mt-0.5">
                    {formatDate(entry.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual paste fallback */}
      {showManualInput && (
        <div className="border-t border-gray-100 pt-4">
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 mb-3">
            <p className="text-sm text-amber-800 font-medium">Could not access the job page directly</p>
            <p className="text-xs text-amber-600 mt-1">
              Please open the URL in your browser, select all the job description text (Ctrl+A), copy it (Ctrl+C), and paste it below.
            </p>
          </div>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Paste the full job description here..."
            disabled={loading}
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-y disabled:bg-gray-50"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">
              {manualText.length > 0 ? `${manualText.split(/\s+/).filter(Boolean).length} words` : 'Paste job description text'}
            </p>
            <button
              onClick={handleManualSubmit}
              disabled={loading || !manualText.trim()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Parsing...
                </>
              ) : (
                'Parse Job'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
