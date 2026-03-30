'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';

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

    try {
      // Try server-side scraping first
      const res = await fetch('/api/jobs/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape job posting');
      }

      onJobFound(data as ScrapedJob);
    } catch {
      // Server scraping failed — show manual paste fallback
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

      onJobFound(data as ScrapedJob);
      setShowManualInput(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
        <p className="text-xs text-gray-400 mt-2">
          Supports LinkedIn, Indeed, Glassdoor, company career pages, and most job boards
        </p>
      </form>

      {/* Manual paste fallback when server scraping fails */}
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
