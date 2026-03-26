import ScoreBadge from '@/components/shared/ScoreBadge';
import { formatImprovement } from '@/lib/format';

interface ScoreComparisonProps {
  before: number;
  after: number;
  iterations: number;
}

export default function ScoreComparison({ before, after, iterations }: ScoreComparisonProps) {
  const improvement = after - before;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Before</p>
        <ScoreBadge score={before} size="lg" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">After</p>
        <ScoreBadge score={after} size="lg" />
        <p className={`text-sm font-semibold mt-2 ${improvement > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
          {formatImprovement(before, after)} points
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Iterations</p>
        <p className="text-3xl font-bold text-gray-900">{iterations}</p>
      </div>
    </div>
  );
}
