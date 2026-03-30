import fs from 'fs';
import path from 'path';
import BidmanWorkflow from '@/components/bidman/BidmanWorkflow';
import EmptyState from '@/components/shared/EmptyState';

interface ResumeFile {
  name: string;
  size: number;
}

function getBaseResumes(): ResumeFile[] {
  const dir = path.join(process.cwd(), 'data', 'base-resume');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.json'))
    .map((f) => ({
      name: f,
      size: fs.statSync(path.join(dir, f)).size,
    }));
}

export default function BidmanPage() {
  const resumes = getBaseResumes();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bidman</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a job URL, select a resume, and generate a tailored PDF
        </p>
      </div>

      {resumes.length > 0 ? (
        <BidmanWorkflow availableResumes={resumes} />
      ) : (
        <EmptyState
          icon={'\u26A0\uFE0F'}
          title="No base resumes found"
          description="Add resume files (PDF, DOCX) to the data/base-resume/ directory."
        />
      )}
    </div>
  );
}
