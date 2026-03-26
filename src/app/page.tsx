import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import QuickStats from '@/components/dashboard/QuickStats';
import RecentResults from '@/components/dashboard/RecentResults';
import EmptyState from '@/components/shared/EmptyState';
import { filenameToId } from '@/lib/format';

function loadResults() {
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
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ id: string; company: string; title: string; scoreBefore: number; scoreAfter: number }>;
}

export default function DashboardPage() {
  const results = loadResults();

  const totalRuns = results.length;
  const avgImprovement = totalRuns > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.scoreAfter - r.scoreBefore), 0) / totalRuns)
    : 0;
  const bestScore = totalRuns > 0
    ? Math.max(...results.map(r => r.scoreAfter))
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resume tailoring overview</p>
        </div>
        <Link
          href="/tailor"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          + New Tailoring
        </Link>
      </div>

      {totalRuns > 0 ? (
        <>
          <QuickStats totalRuns={totalRuns} avgImprovement={avgImprovement} bestScore={bestScore} />
          <h2 className="text-lg font-semibold mb-3">Recent Results</h2>
          <RecentResults results={results.slice(0, 5)} />
        </>
      ) : (
        <EmptyState
          icon={'\u2728'}
          title="No tailored resumes yet"
          description="Create your first tailored resume by pasting a job description."
          action={
            <Link href="/tailor" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm">
              Get Started
            </Link>
          }
        />
      )}
    </div>
  );
}
