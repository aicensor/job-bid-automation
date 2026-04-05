'use client';

import { useState, useEffect, useCallback } from 'react';

interface JobDetailData {
  jobId: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
  workType?: string;
  employmentType?: string;
  seniorityLevel?: string;
  postedDate?: string;
  applicantCount?: string;
  salary?: string;
  description: string;
  descriptionHtml: string;
  jobUrl: string;
  applyUrl?: string;
  applyType?: 'external' | 'easy_apply';
}

interface JobDetailPanelProps {
  jobId: string | null;
  externalOnly?: boolean;
  onTailor: (jobDetail: JobDetailData) => void;
}

export default function JobDetailPanel({ jobId, externalOnly, onTailor }: JobDetailPanelProps) {
  const [detail, setDetail] = useState<JobDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setDetail(null);
      return;
    }

    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Failed to fetch job detail');
        const data = await res.json();
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading job');
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center text-gray-400 text-sm h-full min-h-[400px]">
        Select a job to view details
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse text-sm text-gray-500">Loading job details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!detail) return null;

  const isEasyApply = detail.applyType !== 'external';
  const showWarning = externalOnly && isEasyApply;

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${showWarning ? 'border-gray-300 opacity-60' : 'border-gray-200'}`}>
      {/* Easy Apply Warning */}
      {showWarning && (
        <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800">
          ⚠️ This is an <strong>Easy Apply</strong> job — no external application link available. Skip to another job.
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">{detail.title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {detail.company} · {detail.location}
        </p>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {detail.workType && (
            <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded font-medium">
              {detail.workType}
            </span>
          )}
          {detail.employmentType && (
            <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded font-medium">
              {detail.employmentType}
            </span>
          )}
          {detail.seniorityLevel && (
            <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded font-medium">
              {detail.seniorityLevel}
            </span>
          )}
          {detail.salary && (
            <span className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded font-medium">
              {detail.salary}
            </span>
          )}
          {detail.applicantCount && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {detail.applicantCount}
            </span>
          )}
          {/* Apply Type Badge */}
          {detail.applyType === 'external' ? (
            <span className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded font-medium">
              External Apply
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs bg-sky-50 text-sky-700 rounded font-medium">
              Easy Apply
            </span>
          )}
        </div>

        {/* Job Link (for bid bot) */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="text-[10px] text-gray-400 uppercase font-semibold shrink-0 w-14">LinkedIn</span>
            <input
              readOnly
              value={`https://www.linkedin.com/jobs/view/${detail.jobId}`}
              className="flex-1 text-xs text-gray-600 bg-transparent outline-none font-mono truncate"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <CopyLinkButton url={`https://www.linkedin.com/jobs/view/${detail.jobId}`} />
          </div>
          {detail.applyType === 'external' && detail.applyUrl && (
            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
              <span className="text-[10px] text-orange-500 uppercase font-semibold shrink-0 w-14">Apply</span>
              <input
                readOnly
                value={detail.applyUrl}
                className="flex-1 text-xs text-orange-700 bg-transparent outline-none font-mono truncate"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <CopyLinkButton url={detail.applyUrl} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onTailor(detail)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tailor Resume
          </button>
          <AddToQueueButton detail={detail} />
          <a
            href={detail.applyUrl || detail.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            LinkedIn ↗
          </a>
        </div>
      </div>

      {/* Description */}
      <div className="p-5 max-h-[600px] overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Job Description</h3>
        <div
          className="prose prose-sm max-w-none text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: detail.descriptionHtml || detail.description }}
        />
      </div>
    </div>
  );
}

// --- Add to Queue Button ---
function AddToQueueButton({ detail }: { detail: JobDetailData }) {
  const [state, setState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');

  const handleAdd = async () => {
    setState('adding');
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: detail.jobId,
          title: detail.title,
          company: detail.company,
          location: detail.location,
          jobUrl: detail.jobUrl,
          applyUrl: detail.applyUrl,
          description: detail.description,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setState('added');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleAdd}
      disabled={state === 'adding'}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        state === 'added'
          ? 'bg-green-100 text-green-700 border border-green-300'
          : state === 'error'
            ? 'bg-red-100 text-red-700 border border-red-300'
            : 'bg-purple-600 text-white hover:bg-purple-700'
      }`}
    >
      {state === 'adding' ? 'Adding...' : state === 'added' ? '✓ Queued!' : state === 'error' ? 'Already in Queue' : 'Add to Queue'}
    </button>
  );
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// --- Copy Link Button ---
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 px-3 py-1 text-xs font-medium rounded transition-colors ${
        copied
          ? 'bg-green-100 text-green-700'
          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy Link'}
    </button>
  );
}
