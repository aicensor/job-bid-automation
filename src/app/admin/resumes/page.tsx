import fs from 'fs';
import path from 'path';
import ResumeManager from '@/components/admin/ResumeManager';

interface ResumeFile {
  name: string;
  size: number;
}

function getAvailableResumes(): ResumeFile[] {
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

export default function ResumeAssignPage() {
  const resumes = getAvailableResumes();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resume Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload base resumes and assign them to bidmen with custom instructions
        </p>
      </div>
      <ResumeManager initialResumes={resumes} />
    </div>
  );
}
