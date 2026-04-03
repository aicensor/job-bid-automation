import fs from 'fs';
import path from 'path';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb, type DbResumeAssignment } from '@/lib/db';
import BidmanWorkflow from '@/components/bidman/BidmanWorkflow';
import EmptyState from '@/components/shared/EmptyState';

interface ResumeFile {
  name: string;
  size: number;
  instructions: string;
  strictTruthCheck: boolean;
}

function getAssignedResumes(userId: number): ResumeFile[] {
  const db = getDb();
  const assignments = db
    .prepare('SELECT resume_filename, tailoring_instructions, strict_truth_check FROM resume_assignments WHERE user_id = ?')
    .all(userId) as DbResumeAssignment[];

  const dir = path.join(process.cwd(), 'data', 'base-resume');
  if (!fs.existsSync(dir)) return [];

  return assignments
    .filter((a) => fs.existsSync(path.join(dir, a.resume_filename)))
    .map((a) => ({
      name: a.resume_filename,
      size: fs.statSync(path.join(dir, a.resume_filename)).size,
      instructions: a.tailoring_instructions || '',
      strictTruthCheck: a.strict_truth_check === 1,
    }));
}

export default async function BidmanPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const resumes = getAssignedResumes(user.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bidman</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a job URL, select a resume, and generate a tailored PDF
        </p>
      </div>

      {resumes.length > 0 ? (
        <BidmanWorkflow availableResumes={resumes} bidder={user.username} />
      ) : (
        <EmptyState
          icon={'\u26A0\uFE0F'}
          title="No resumes assigned"
          description="Your admin has not assigned any resumes to you yet. Please contact your admin."
        />
      )}
    </div>
  );
}
