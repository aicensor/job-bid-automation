import fs from 'fs';
import path from 'path';
import HistoryTable from '@/components/history/HistoryTable';
import EmptyState from '@/components/shared/EmptyState';
import Link from 'next/link';
import { filenameToId } from '@/lib/format';

function loadHistory() {
  const outputDir = path.join(process.cwd(), 'data', 'output');
  if (!fs.existsSync(outputDir)) return [];

  return fs.readdirSync(outputDir)
    .filter(f => f.startsWith('tailored-') && f.endsWith('.json'))
    .sort().reverse()
    .map(filename => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(outputDir, filename), 'utf-8'));
        return {
          id: filenameToId(filename),
          company: data.tailoredResume?.experience?.[0]?.company || data.parsedJob?.company || 'Unknown',
          title: data.parsedJob?.title || data.tailoredResume?.experience?.[0]?.title || 'Unknown',
          scoreBefore: data.scoreBefore?.overall ?? 0,
          scoreAfter: data.scoreAfter?.overall ?? 0,
          iterations: data.iterations ?? 0,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ id: string; company: string; title: string; scoreBefore: number; scoreAfter: number; iterations: number }>;
}

export default function HistoryPage() {
  const items = loadHistory();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} tailored resume{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/tailor"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          + New Tailoring
        </Link>
      </div>

      {items.length > 0 ? (
        <HistoryTable items={items} />
      ) : (
        <EmptyState
          icon={'\u{1F4CB}'}
          title="No history yet"
          description="Your tailored resumes will appear here after generation."
        />
      )}
    </div>
  );
}
