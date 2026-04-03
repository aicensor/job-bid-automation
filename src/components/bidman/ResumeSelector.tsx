'use client';

import type { FitResult } from '@/app/api/bidman/fit-check/route';

interface ResumeFile {
  name: string;
  size: number;
}

interface ResumeSelectorProps {
  resumes: ResumeFile[];
  selected: string;
  onSelect: (name: string) => void;
  disabled?: boolean;
  fitResults?: FitResult[];
  fitThreshold?: number;
}

function FitBadge({ fit, threshold }: { fit: FitResult; threshold: number }) {
  const isGood = fit.fitScore >= 70;
  const isMedium = fit.fitScore >= threshold && fit.fitScore < 70;
  const isLow = fit.fitScore < threshold;

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={`text-xs px-2 py-0.5 rounded font-medium ${
          isGood
            ? 'bg-green-100 text-green-700'
            : isMedium
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
        }`}
      >
        {fit.fitScore}/100
      </span>
      {isLow && fit.missingSkills.length > 0 && (
        <span className="text-[10px] text-red-500 text-right max-w-[220px] truncate">
          Missing: {fit.missingSkills.slice(0, 4).join(', ')}
          {fit.missingSkills.length > 4 ? ` +${fit.missingSkills.length - 4}` : ''}
        </span>
      )}
    </div>
  );
}

export default function ResumeSelector({
  resumes,
  selected,
  onSelect,
  disabled,
  fitResults = [],
  fitThreshold = 40,
}: ResumeSelectorProps) {
  const fitMap = new Map(fitResults.map((f) => [f.resumeFile, f]));
  const bestResume = fitResults.length > 0 ? fitResults[0].resumeFile : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-700">
          Select Resume
        </label>
        {fitResults.length > 0 && (
          <span className="text-[10px] text-gray-400">Sorted by job fit</span>
        )}
      </div>
      <div className="space-y-2">
        {/* Sort resumes by fit score if available */}
        {[...resumes]
          .sort((a, b) => {
            const fitA = fitMap.get(a.name)?.fitScore ?? 0;
            const fitB = fitMap.get(b.name)?.fitScore ?? 0;
            return fitB - fitA;
          })
          .map((resume) => {
            const fit = fitMap.get(resume.name);
            const isBest = bestResume === resume.name && fitResults.length > 1;

            return (
              <label
                key={resume.name}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed border-gray-100'
                    : selected === resume.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="resume"
                  value={resume.name}
                  checked={selected === resume.name}
                  onChange={() => onSelect(resume.name)}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{resume.name}</p>
                    {isBest && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                        Best Match
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{(resume.size / 1024).toFixed(0)} KB</p>
                </div>
                {fit && <FitBadge fit={fit} threshold={fitThreshold} />}
              </label>
            );
          })}
      </div>
    </div>
  );
}
