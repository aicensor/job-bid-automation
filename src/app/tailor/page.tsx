import { Suspense } from 'react';
import fs from 'fs';
import path from 'path';
import TailorForm from '@/components/tailor/TailorForm';
import EmptyState from '@/components/shared/EmptyState';

interface ResumeFile {
  name: string;
  size: number;
}

function getBaseResumes(): ResumeFile[] {
  const dir = path.join(process.cwd(), 'data', 'base-resume');
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.json'))
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(dir, f)).size,
    }));
}

export default function TailorPage() {
  const resumes = getBaseResumes();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Tailoring</h1>
        <p className="text-sm text-gray-500 mt-1">Paste a job description or select a job from Find Jobs</p>
      </div>

      {resumes.length > 0 ? (
        <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
          <TailorForm
            baseResumeFile={resumes[0].name}
            availableResumes={resumes}
          />
        </Suspense>
      ) : (
        <EmptyState
          icon={'\u26A0\uFE0F'}
          title="No base resume found"
          description="Add your resume (PDF, DOCX, or JSON) to data/base-resume/ directory, or upload one below."
        />
      )}
    </div>
  );
}
