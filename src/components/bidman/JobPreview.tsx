'use client';

import { useState } from 'react';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';

interface JobPreviewProps {
  job: ScrapedJob;
  onClear: () => void;
}

/**
 * Format raw JD text into styled HTML.
 * Detects headings, bullet lists, and paragraphs.
 */
function formatDescription(text: string): string {
  const lines = text.split('\n');
  const parts: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { parts.push('</ul>'); inList = false; }
      continue;
    }

    // Detect section headings (ALL CAPS, ends with ':', short line, or bold-looking)
    const isHeading =
      (line.length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) ||
      (line.length < 80 && line.endsWith(':') && !line.startsWith('-') && !line.startsWith('•')) ||
      /^(about|responsibilities|requirements|qualifications|what you|who you|nice to|benefits|perks|our team|the role|your impact|what we|skills|experience|preferred|minimum|must have|bonus|compensation|salary|why join)/i.test(line);

    if (isHeading) {
      if (inList) { parts.push('</ul>'); inList = false; }
      const clean = line.replace(/:$/, '');
      parts.push(`<h4 class="text-xs font-bold text-gray-800 uppercase tracking-wide mt-4 mb-1.5 border-b border-gray-200 pb-1">${clean}</h4>`);
      continue;
    }

    // Detect bullet points
    const bulletMatch = line.match(/^[\-\u2022\u25CF\u25CB\u2023\u2013\u2014\*]\s*(.+)/);
    if (bulletMatch) {
      if (!inList) { parts.push('<ul class="space-y-1 mb-2">'); inList = true; }
      parts.push(`<li class="flex gap-2 text-[13px] text-gray-700 leading-relaxed"><span class="text-primary mt-0.5 shrink-0">&bull;</span><span>${bulletMatch[1]}</span></li>`);
      continue;
    }

    // Regular paragraph
    if (inList) { parts.push('</ul>'); inList = false; }
    parts.push(`<p class="text-[13px] text-gray-700 leading-relaxed mb-2">${line}</p>`);
  }

  if (inList) parts.push('</ul>');
  return parts.join('\n');
}

export default function JobPreview({ job, onClear }: JobPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-green-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-1">Job Found</p>
          <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {job.company}
            {job.industry && job.industry !== 'Not specified' && (
              <span className="text-gray-400"> &middot; {job.industry}</span>
            )}
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {job.location && job.location !== 'Not specified' && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {job.location}
          </span>
        )}
        {job.workType && job.workType !== 'Not specified' && (
          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
            {job.workType}
          </span>
        )}
        {job.employmentType && job.employmentType !== 'Not specified' && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">
            {job.employmentType}
          </span>
        )}
        {job.salary && (
          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full">
            {job.salary}
          </span>
        )}
      </div>

      {job.mainTechStacks && job.mainTechStacks !== 'Not specified' && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {job.mainTechStacks.split(',').map((tech) => (
              <span
                key={tech.trim()}
                className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-medium"
              >
                {tech.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            expanded
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          <span className="text-sm">{expanded ? '\u25B2' : '\u25BC'}</span>
          {expanded ? 'Hide Description' : 'Show Full Description'}
        </button>
        {expanded && (
          <div
            className="mt-3 p-5 bg-gray-50 rounded-lg max-h-[500px] overflow-y-auto border border-gray-100"
            dangerouslySetInnerHTML={{ __html: formatDescription(job.description) }}
          />
        )}
      </div>

      <div className="mt-3">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          View Original Posting &#x2197;
        </a>
      </div>
    </div>
  );
}
