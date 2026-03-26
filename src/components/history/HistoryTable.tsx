import Link from 'next/link';
import ScoreBadge from '@/components/shared/ScoreBadge';
import { formatDate, formatImprovement } from '@/lib/format';

interface HistoryItem {
  id: string;
  company: string;
  title: string;
  scoreBefore: number;
  scoreAfter: number;
  iterations: number;
}

export default function HistoryTable({ items }: { items: HistoryItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Before</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">After</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Change</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Iterations</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(item.id)}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.title}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.company}</td>
              <td className="px-4 py-3 text-center"><ScoreBadge score={item.scoreBefore} size="sm" /></td>
              <td className="px-4 py-3 text-center"><ScoreBadge score={item.scoreAfter} size="sm" /></td>
              <td className="px-4 py-3 text-center text-sm font-medium text-blue-600">
                {formatImprovement(item.scoreBefore, item.scoreAfter)}
              </td>
              <td className="px-4 py-3 text-center text-sm text-gray-500">{item.iterations}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/tailor/${item.id}`} className="text-sm text-primary hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
