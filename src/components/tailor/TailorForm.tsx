'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TailorProgress from './TailorProgress';

interface JobInfo {
  title: string;
  company: string;
  location?: string;
  description: string;
  jobUrl?: string;
  jobId?: string;
}

interface ResumeFile {
  name: string;
  size: number;
}

interface TailorFormProps {
  baseResumeFile: string;
  availableResumes: ResumeFile[];
}

export default function TailorForm({ baseResumeFile, availableResumes }: TailorFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobDescription, setJobDescription] = useState('');
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [selectedResume, setSelectedResume] = useState(baseResumeFile);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill JD when coming from Find Jobs page
  useEffect(() => {
    if (searchParams.get('fromJob') === 'true') {
      try {
        const stored = sessionStorage.getItem('tailorJob');
        if (stored) {
          const job: JobInfo = JSON.parse(stored);
          setJobInfo(job);
          setJobDescription(job.description);
          // Clean up
          sessionStorage.removeItem('tailorJob');
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [searchParams]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext || '')) {
      setError('Only PDF and DOCX files are supported');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }

    // Upload to server
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setSelectedResume(data.filename);
      setUploadedFile(file);
      setError('');
    } catch {
      setError('Failed to upload resume');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      setError('Please paste a job description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          resumeFile: selectedResume,
          jobInfo: jobInfo ? {
            title: jobInfo.title,
            company: jobInfo.company,
            jobUrl: jobInfo.jobUrl,
            jobId: jobInfo.jobId,
          } : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Tailoring failed');
      }

      router.push(`/tailor/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (loading) {
    return <TailorProgress />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job Info Banner (when coming from Find Jobs) */}
      {jobInfo && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-900">{jobInfo.title}</p>
              <p className="text-xs text-orange-700 mt-0.5">
                {jobInfo.company}{jobInfo.location ? ` · ${jobInfo.location}` : ''}
              </p>
            </div>
            {jobInfo.jobUrl && (
              <a
                href={jobInfo.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-600 hover:underline shrink-0"
              >
                View Job ↗
              </a>
            )}
          </div>
          <p className="text-[10px] text-orange-500 mt-2 uppercase font-semibold">Job description auto-filled below</p>
        </div>
      )}

      {/* Job Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here...&#10;&#10;Include: job title, requirements, responsibilities, tech stack, qualifications"
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-y"
        />
        <p className="text-xs text-gray-400 mt-2">
          {jobDescription.length > 0 ? `${jobDescription.split(/\s+/).length} words` : 'Tip: More detail = better tailoring'}
        </p>
      </div>

      {/* Base Resume Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Base Resume
        </label>

        <div className="space-y-2">
          {/* Existing resumes */}
          {availableResumes.map((resume) => (
            <label
              key={resume.name}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedResume === resume.name && !uploadedFile
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="resume"
                value={resume.name}
                checked={selectedResume === resume.name && !uploadedFile}
                onChange={() => { setSelectedResume(resume.name); setUploadedFile(null); }}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{resume.name}</p>
                <p className="text-xs text-gray-500">{(resume.size / 1024).toFixed(0)} KB</p>
              </div>
              {selectedResume === resume.name && !uploadedFile && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Active</span>
              )}
            </label>
          ))}

          {/* Uploaded file */}
          {uploadedFile && (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-green-500 bg-green-50 cursor-pointer">
              <input type="radio" name="resume" checked readOnly className="text-green-600" />
              <span className="text-lg">📎</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">{uploadedFile.name}</p>
                <p className="text-xs text-green-700">{(uploadedFile.size / 1024).toFixed(0)} KB · Uploaded</p>
              </div>
              <button
                type="button"
                onClick={() => { setUploadedFile(null); setSelectedResume(baseResumeFile); }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </label>
          )}

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <span>+</span> Upload a different resume (PDF or DOCX)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!jobDescription.trim()}
        className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {jobInfo ? `Tailor Resume for ${jobInfo.company}` : 'Tailor Resume'}
      </button>
    </form>
  );
}
