'use client';

import type { FitResult } from './BidmanWorkflow';

interface ResumeFile {
  name: string;
  size: number;
  mainSkills?: string;
}

interface ResumeSelectorProps {
  resumes: ResumeFile[];
  selected: string;
  onSelect: (name: string) => void;
  disabled?: boolean;
  fitResults?: FitResult[];
  fitThreshold?: number;
  llmChecking?: boolean;
}

function FitBadge({ fit, threshold }: { fit: FitResult; threshold: number }) {
  const displayScore = fit.llmScore ?? fit.fitScore;
  const isGood = displayScore >= 70;
  const isMedium = displayScore >= threshold && displayScore < 70;
  const isLow = displayScore < threshold;

  return (
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <div className="flex items-center gap-1.5">
        {/* Stage 1: skill match */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            fit.fitScore >= 70 ? 'bg-green-100 text-green-600' :
            fit.fitScore >= threshold ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-500'
          }`}
          title="Skill match"
        >
          Skills {fit.fitScore}%
        </span>
        {/* Stage 2: LLM score */}
        {fit.llmLoading && (
          <span className="text-[10px] text-blue-500 flex items-center gap-1">
            <span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            AI
          </span>
        )}
        {fit.llmScore !== undefined && !fit.llmLoading && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              fit.llmScore >= 70 ? 'bg-green-100 text-green-600' :
              fit.llmScore >= 40 ? 'bg-yellow-100 text-yellow-600' :
              'bg-red-100 text-red-500'
            }`}
            title={fit.llmReason || 'AI fit score'}
          >
            AI {fit.llmScore}%
          </span>
        )}
      </div>
      {fit.llmReason && !fit.llmLoading && (
        <span className="text-[10px] text-gray-400 text-right max-w-[220px] truncate" title={fit.llmReason}>
          {fit.llmReason}
        </span>
      )}
      {isLow && !fit.llmReason && fit.missingSkills.length > 0 && (
        <span className="text-[10px] text-red-500 text-right max-w-[220px] truncate">
          Missing: {fit.missingSkills.slice(0, 3).join(', ')}
          {fit.missingSkills.length > 3 ? ` +${fit.missingSkills.length - 3}` : ''}
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
  fitThreshold = 30,
  llmChecking = false,
}: ResumeSelectorProps) {
  const fitMap = new Map(fitResults.map((f) => [f.resumeFile, f]));
  const bestResume = fitResults.length > 0 ? fitResults[0].resumeFile : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-700">
          Select Resume
        </label>
        <div className="flex items-center gap-2">
          {llmChecking && (
            <span className="text-[10px] text-blue-500 flex items-center gap-1">
              <span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              AI scoring...
            </span>
          )}
          {fitResults.length > 0 && (
            <span className="text-[10px] text-gray-400">Sorted by fit</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {[...resumes]
          .sort((a, b) => {
            const fitA = fitMap.get(a.name);
            const fitB = fitMap.get(b.name);
            const scoreA = fitA ? (fitA.llmScore ?? fitA.fitScore) : 0;
            const scoreB = fitB ? (fitB.llmScore ?? fitB.fitScore) : 0;
            return scoreB - scoreA;
          })
          .map((resume) => {
            const fit = fitMap.get(resume.name);
            const isBest = bestResume === resume.name && fitResults.length > 1;
            const skills = (resume.mainSkills || '').split(',').map((s) => s.trim()).filter(Boolean);
            const displayScore = fit ? (fit.llmScore ?? fit.fitScore) : null;
            const isRedBadge = fit != null && displayScore != null && displayScore < fitThreshold;
            const isDisabled = disabled || isRedBadge;

            return (
              <label
                key={resume.name}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed border-gray-100'
                    : selected === resume.name
                      ? 'border-blue-500 bg-blue-50 cursor-pointer'
                      : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="resume"
                  value={resume.name}
                  checked={selected === resume.name}
                  onChange={() => onSelect(resume.name)}
                  disabled={isDisabled}
                  className="text-blue-600 focus:ring-blue-500 shrink-0"
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
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {fit && <FitBadge fit={fit} threshold={fitThreshold} />}
              </label>
            );
          })}
      </div>
    </div>
  );
}
