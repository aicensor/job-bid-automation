'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { QueuedJob } from '@/lib/queue';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

export default function QueuePage() {
  const [jobs, setJobs] = useState<QueuedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLogs, setAutoLogs] = useState<string[]>([]);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; currentJob?: string } | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleRemove = async (id: string) => {
    await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    fetchQueue();
  };

  const handleClearCompleted = async () => {
    await fetch('/api/queue', { method: 'DELETE' });
    fetchQueue();
  };

  const handleRunAll = async () => {
    setRunning(true);
    setProgress({ current: 0, total: jobs.filter(j => j.status === 'pending').length });

    try {
      const res = await fetch('/api/queue/run', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to start queue');
        setRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) { setRunning(false); return; }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                handleSSEEvent(event, data);
              } catch { /* ignore parse errors */ }
            }
          }
          if (line.startsWith('data: ') && !lines[lines.indexOf(line) - 1]?.startsWith('event: ')) {
            // Handle data-only lines
          }
        }
      }
    } catch (err) {
      console.error('Queue run error:', err);
    }

    setRunning(false);
    setProgress(null);
    fetchQueue();
  };

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case 'start':
        setProgress({ current: 0, total: data.total });
        break;
      case 'processing':
        setProgress(p => ({ ...p!, current: data.index, currentJob: `${data.title} @ ${data.company}` }));
        // Update job status in local state
        setJobs(prev => prev.map(j => j.id === data.jobId ? { ...j, status: 'processing' as const } : j));
        break;
      case 'completed':
        setJobs(prev => prev.map(j => j.id === data.jobId ? {
          ...j, status: 'completed' as const, score: data.score, scoreBefore: data.scoreBefore, resultId: data.resultId,
        } : j));
        break;
      case 'failed':
        setJobs(prev => prev.map(j => j.id === data.jobId ? {
          ...j, status: 'failed' as const, error: data.error,
        } : j));
        break;
      case 'done':
        setProgress(null);
        break;
    }
  };

  const handleAutoQueue = async () => {
    setAutoRunning(true);
    setAutoLogs([]);
    setAutoResult(null);

    try {
      const res = await fetch('/api/queue/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        setAutoLogs(prev => [...prev, `❌ Error: ${data.error}`]);
        setAutoRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setAutoRunning(false); return; }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          const eventLine = lines.find(l => l.startsWith('event: '));
          const dataLine = lines.find(l => l.startsWith('data: '));

          if (eventLine && dataLine) {
            const event = eventLine.slice(7);
            try {
              const data = JSON.parse(dataLine.slice(6));
              if (event === 'progress') {
                setAutoLogs(prev => [...prev, data.message]);
                // Refresh queue table when auto-run completes a job
                if (data.message?.includes('[auto-run] ✅') || data.message?.includes('[auto-run] ❌')) {
                  fetchQueue();
                }
              } else if (event === 'queued') {
                // Jobs were added to queue — refresh table
                setAutoResult(data);
                fetchQueue();
              } else if (event === 'done') {
                setAutoResult(data);
                fetchQueue();
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      setAutoLogs(prev => [...prev, `❌ ${err instanceof Error ? err.message : 'Failed'}`]);
    }

    setAutoRunning(false);
    fetchQueue();
  };

  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const completedCount = jobs.filter(j => j.status === 'completed' || j.status === 'failed').length;
  const estimatedCost = pendingCount * 0.15;

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading queue...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {jobs.length === 0 ? 'No jobs in queue — add jobs from Find Jobs' : `${jobs.length} jobs · ${pendingCount} pending`}
          </p>
        </div>
        {jobs.length > 0 && (
          <div className="flex gap-2">
            {completedCount > 0 && (
              <button
                onClick={handleClearCompleted}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Clear Done ({completedCount})
              </button>
            )}
            {pendingCount > 0 && (
              <button
                onClick={handleRunAll}
                disabled={running}
                className="px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {running ? 'Processing...' : `Run All (${pendingCount} jobs · ~$${estimatedCost.toFixed(2)})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auto-Queue Panel */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Auto-Queue</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Automatically find matching jobs and add to queue
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Configure
            </Link>
            <button
              onClick={handleAutoQueue}
              disabled={autoRunning || running}
              className="px-4 py-1.5 text-sm bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {autoRunning ? 'Searching...' : 'Find & Queue Jobs'}
            </button>
          </div>
        </div>

        {/* Auto-Queue Logs */}
        {autoLogs.length > 0 && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
            {autoLogs.map((log, i) => (
              <p key={i} className="text-xs text-gray-600 font-mono leading-relaxed">{log}</p>
            ))}
          </div>
        )}

        {/* Auto-Queue Result Summary */}
        {autoResult && (
          <div className="mt-3 flex gap-4 text-xs">
            <span className="text-gray-500">Searched: <strong>{autoResult.searched}</strong></span>
            <span className="text-green-600">Added: <strong>{autoResult.added}</strong></span>
            <span className="text-gray-400">Skipped: <strong>{autoResult.skipped}</strong></span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="mb-6 bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-blue-800">
              Processing {progress.current}/{progress.total}
            </span>
            {progress.currentJob && (
              <span className="text-blue-600">{progress.currentJob}</span>
            )}
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Table */}
      {jobs.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Job</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job, i) => {
                const style = STATUS_STYLES[job.status];
                return (
                  <tr key={job.id} className={job.status === 'processing' ? 'bg-blue-50/50' : ''}>
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} · {job.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                        {job.status === 'processing' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
                        {style.label}
                      </span>
                      {job.error && <p className="text-xs text-red-500 mt-1 truncate max-w-xs">{job.error}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {job.score !== null ? (
                        <span className="text-sm font-semibold">
                          {job.scoreBefore ?? '?'} → <span className={job.score >= 75 ? 'text-green-600' : 'text-yellow-600'}>{job.score}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.resultId && (
                          <Link
                            href={`/tailor/${job.resultId}`}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            View
                          </Link>
                        )}
                        {job.applyUrl && (
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 hover:underline"
                          >
                            Apply ↗
                          </a>
                        )}
                        {(job.status === 'pending' || job.status === 'failed') && (
                          <button
                            onClick={() => handleRemove(job.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 text-sm">Queue is empty</p>
          <Link href="/jobs" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Find Jobs to add to queue →
          </Link>
        </div>
      )}
    </div>
  );
}
