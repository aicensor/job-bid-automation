'use client';

import { useState } from 'react';
import type { ScrapedJob } from '@/core/scraper/universal-scraper';

interface JobPreviewProps {
  job: ScrapedJob;
  onClear: () => void;
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
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? 'Hide Description' : 'Show Description'}
        </button>
        {expanded && (
          <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
            {job.description}
          </div>
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
