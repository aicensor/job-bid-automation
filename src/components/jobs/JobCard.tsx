'use client';

import { useState } from 'react';

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

interface JobCardProps {
  jobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  postedDate: string;
  salary?: string;
  jobUrl: string;
  applyUrl?: string;
  applyType?: string;
  selected: boolean;
  onSelect: (jobId: string) => void;
}

export default function JobCard({
  jobId, title, company, companyLogo, location, postedDate, salary, jobUrl, applyUrl, applyType, selected, onSelect,
}: JobCardProps) {
  const [copied, setCopied] = useState(false);

  // Copy the external apply URL if available, otherwise LinkedIn URL
  const copyUrl = applyUrl || `https://www.linkedin.com/jobs/view/${jobId}`;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(copyUrl).catch(() => fallbackCopy(copyUrl));
    } else {
      fallbackCopy(copyUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => onSelect(jobId)}
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Company Logo */}
        {companyLogo && (
          <img
            src={companyLogo}
            alt={company}
            className="w-10 h-10 rounded-lg object-contain bg-gray-100 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>

          {/* Company */}
          <p className="text-sm text-gray-600 mt-0.5">{company}</p>

          {/* Location + Date */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
            <span>{location}</span>
            {postedDate && (
              <>
                <span>·</span>
                <span>{postedDate}</span>
              </>
            )}
          </div>

          {/* Salary */}
          {salary && (
            <p className="mt-1.5 text-xs font-medium text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded">
              {salary}
            </p>
          )}
        </div>
      </div>

      {/* External Apply Link */}
      {applyUrl && (
        <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-orange-50 rounded text-xs font-mono text-orange-700 truncate">
          <span className="shrink-0 text-[10px] font-semibold text-orange-500 uppercase">Apply</span>
          <span className="truncate">{applyUrl.replace(/^https?:\/\//, '').split('?')[0]}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={handleCopyLink}
          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : applyUrl
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {copied ? '✓ Copied!' : applyUrl ? 'Copy Apply Link' : 'Copy Link'}
        </button>
        <a
          href={applyUrl || jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs text-orange-600 hover:underline"
        >
          Apply ↗
        </a>
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs text-gray-400 hover:underline"
        >
          LinkedIn
        </a>
      </div>
    </div>
  );
}
