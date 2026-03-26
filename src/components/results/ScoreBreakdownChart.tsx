import { scoreBgColor } from '@/lib/format';

interface BreakdownItem {
  label: string;
  before: number;
  after: number;
}

interface ScoreBreakdownChartProps {
  before: Record<string, number>;
  after: Record<string, number>;
}

const LABELS: Record<string, string> = {
  atsKeywordMatch: 'ATS Keywords',
  semanticSimilarity: 'Semantic Match',
  senioritySignals: 'Seniority Signals',
  readability: 'Readability',
  achievementQuality: 'Achievement Quality',
};

export default function ScoreBreakdownChart({ before, after }: ScoreBreakdownChartProps) {
  const items: BreakdownItem[] = Object.keys(LABELS).map(key => ({
    label: LABELS[key],
    before: (before as any)?.[key] ?? 0,
    after: (after as any)?.[key] ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Breakdown</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{item.label}</span>
              <span>{item.before} &rarr; {item.after}</span>
            </div>
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
              {/* Before bar (gray, behind) */}
              <div
                className="absolute inset-y-0 left-0 bg-gray-300 rounded-full opacity-50"
                style={{ width: `${item.before}%` }}
              />
              {/* After bar (colored, on top) */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${scoreBgColor(item.after)}`}
                style={{ width: `${item.after}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
