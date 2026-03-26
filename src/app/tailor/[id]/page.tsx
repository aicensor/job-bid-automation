import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { idToFilename, formatDate } from '@/lib/format';
import { buildResumeHtml } from '@/lib/resume-html';
import ScoreComparison from '@/components/results/ScoreComparison';
import ScoreBreakdownChart from '@/components/results/ScoreBreakdownChart';
import ResumePreview from '@/components/results/ResumePreview';
import ChangesList from '@/components/results/ChangesList';

interface PageProps {
  params: Promise<{ id: string }>;
}

function loadResult(id: string) {
  const outputDir = path.join(process.cwd(), 'data', 'output');
  const filepath = path.join(outputDir, idToFilename(id));

  if (!fs.existsSync(filepath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

function resumeToText(resume: any): string {
  const lines: string[] = [];
  lines.push(resume.contact?.name || '');
  lines.push([resume.contact?.email, resume.contact?.phone, resume.contact?.location].filter(Boolean).join(' | '));
  lines.push('');
  if (resume.summary) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push(resume.summary);
    lines.push('');
  }
  if (resume.experience) {
    lines.push('PROFESSIONAL EXPERIENCE');
    for (const exp of resume.experience) {
      lines.push(`${exp.title} | ${exp.company} | ${exp.startDate} - ${exp.endDate}`);
      for (const b of exp.bullets) lines.push(`  - ${b.replace(/\*\*/g, '')}`);
      lines.push('');
    }
  }
  if (resume.skills) {
    lines.push('TECHNICAL SKILLS');
    for (const s of resume.skills) lines.push(`${s.category}: ${s.skills.join(', ')}`);
    lines.push('');
  }
  if (resume.education) {
    lines.push('EDUCATION');
    for (const e of resume.education) lines.push(`${e.degree} in ${e.field} | ${e.institution} | ${e.graduationDate}`);
  }
  return lines.join('\n');
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const data = loadResult(id);

  if (!data) notFound();

  const resume = data.tailoredResume;
  const html = buildResumeHtml(resume);
  const resumeText = resumeToText(resume);
  const title = data.parsedJob?.title || resume.experience?.[0]?.title || 'Tailored Resume';
  const company = data.parsedJob?.company || resume.experience?.[0]?.company || '';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/history" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">&larr; Back to History</Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{company} &middot; {formatDate(id)}</p>
        </div>
      </div>

      {/* Scores */}
      <ScoreComparison
        before={data.scoreBefore?.overall ?? 0}
        after={data.scoreAfter?.overall ?? 0}
        iterations={data.iterations ?? 0}
      />

      {/* Breakdown */}
      {data.scoreBefore?.breakdown && data.scoreAfter?.breakdown && (
        <ScoreBreakdownChart
          before={data.scoreBefore.breakdown}
          after={data.scoreAfter.breakdown}
        />
      )}

      {/* Resume Preview */}
      <div className="mb-6">
        <ResumePreview
          html={html}
          resumeJson={JSON.stringify(resume, null, 2)}
          resumeText={resumeText}
        />
      </div>

      {/* Changes */}
      {data.changes && <ChangesList changes={data.changes} />}

      {/* Missing Keywords */}
      {data.scoreAfter?.missingKeywords && data.scoreAfter.missingKeywords.length > 0 && (
        <div className="mt-6 bg-yellow-50 rounded-xl border border-yellow-100 p-6">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">Still Missing Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {data.scoreAfter.missingKeywords.map((kw: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
