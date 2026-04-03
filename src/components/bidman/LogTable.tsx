'use client';

import { useState, useEffect } from 'react';
import type { TailorLogEntry } from '@/lib/bidman-log';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ScoreBadge from '@/components/shared/ScoreBadge';

export default function LogTable() {
  const [entries, setEntries] = useState<TailorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bidman/log')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEntries(data.reverse()); // newest first
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (entry: TailorLogEntry) => {
    setDownloading(entry.tailoredResumeId);
    try {
      // Load the tailored resume from the saved result
      const resultRes = await fetch(`/api/bidman/log?resultId=${entry.tailoredResumeId}`);
      if (!resultRes.ok) throw new Error('Result not found');
      const resultData = await resultRes.json();

      // Export as PDF via existing endpoint
      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resultData.tailoredResume, format: 'pdf' }),
      });
      if (!exportRes.ok) throw new Error('PDF generation failed');

      const blob = await exportRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entry.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${entry.jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" label="Loading logs..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return null; // parent page will show EmptyState
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">No</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Job Title</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Tech Stacks</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Industry</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-20">Score</th>
              {/* Bidder column hidden — bidman only sees own logs */}
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.no} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{entry.no}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{entry.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{entry.jobTitle}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {entry.mainTechStacks.split(',').filter(Boolean).map((tech) => (
                      <span
                        key={tech.trim()}
                        className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded"
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{entry.companyName}</td>
                <td className="px-4 py-3 text-gray-500">{entry.industry}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <ScoreBadge score={entry.scoreBefore} size="sm" />
                    <span className="text-gray-300">&rarr;</span>
                    <ScoreBadge score={entry.scoreAfter} size="sm" />
                  </div>
                </td>
                {/* Bidder column hidden */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={entry.jobLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                      title="View job posting"
                    >
                      Job
                    </a>
                    <button
                      onClick={() => handleDownload(entry)}
                      disabled={downloading === entry.tailoredResumeId}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                      title="Download tailored PDF"
                    >
                      {downloading === entry.tailoredResumeId ? '...' : 'PDF'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
