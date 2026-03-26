import Link from 'next/link';
import ScoreBadge from '@/components/shared/ScoreBadge';
import { formatDate, formatImprovement } from '@/lib/format';

interface ResultSummary {
  id: string;
  company: string;
  title: string;
  scoreBefore: number;
  scoreAfter: number;
}

export default function RecentResults({ results }: { results: ResultSummary[] }) {
  return (
    <div className="space-y-3">
      {results.map(r => (
        <Link
          key={r.id}
          href={`/tailor/${r.id}`}
          className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div>
            <p className="font-semibold text-gray-900">{r.title}</p>
            <p className="text-sm text-gray-500">{r.company} &middot; {formatDate(r.id)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{r.scoreBefore}</span>
            <span className="text-gray-300">&rarr;</span>
            <ScoreBadge score={r.scoreAfter} />
            <span className="text-sm font-medium text-blue-600">
              {formatImprovement(r.scoreBefore, r.scoreAfter)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
