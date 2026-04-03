'use client';

import { useState, useEffect, useRef } from 'react';

interface ResumeFile {
  name: string;
  size: number;
}

interface User {
  id: number;
  username: string;
  role: string;
  status: string;
}

interface Assignment {
  id: number;
  user_id: number;
  resume_filename: string;
  tailoring_instructions: string;
  strict_truth_check: number;
}

interface ResumeManagerProps {
  initialResumes: ResumeFile[];
}

export default function ResumeManager({ initialResumes }: ResumeManagerProps) {
  const [resumes, setResumes] = useState<ResumeFile[]>(initialResumes);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [strictChecks, setStrictChecks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        const bidmen = (data as User[]).filter((u) => u.role === 'bidman' && u.status === 'approved');
        setUsers(bidmen);
        setLoading(false);
      });
  }, []);

  // --- Upload ---

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext || '')) {
      setUploadMsg('Only PDF and DOCX files are supported');
      return;
    }

    setUploading(true);
    setUploadMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Add to local list if not already there
      if (!resumes.find((r) => r.name === data.filename)) {
        setResumes([...resumes, { name: data.filename, size: data.size }]);
      }
      setUploadMsg(`Uploaded: ${data.filename}`);
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Assignments ---

  const loadAssignments = async (user: User) => {
    setSelectedUser(user);
    const res = await fetch(`/api/admin/assignments?userId=${user.id}`);
    const data = (await res.json()) as Assignment[];
    setAssignments(data);
    const instrMap: Record<string, string> = {};
    const strictMap: Record<string, boolean> = {};
    data.forEach((a) => {
      instrMap[a.resume_filename] = a.tailoring_instructions || '';
      strictMap[a.resume_filename] = a.strict_truth_check === 1;
    });
    setInstructions(instrMap);
    setStrictChecks(strictMap);
  };

  const toggleResume = async (filename: string, assigned: boolean) => {
    if (!selectedUser) return;
    setSaving(filename);

    if (assigned) {
      await fetch('/api/admin/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, resumeFilename: filename }),
      });
    } else {
      await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, resumeFilename: filename, tailoringInstructions: '', strictTruthCheck: true }),
      });
    }

    await loadAssignments(selectedUser);
    setSaving(null);
  };

  const saveAssignment = async (filename: string) => {
    if (!selectedUser) return;
    setSaving(filename);
    await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedUser.id,
        resumeFilename: filename,
        tailoringInstructions: instructions[filename] || '',
        strictTruthCheck: strictChecks[filename] ?? true,
      }),
    });
    setSaving(null);
  };

  const assignedFilenames = new Set(assignments.map((a) => a.resume_filename));

  return (
    <div className="space-y-6">
      {/* Section 1: Base Resumes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Base Resumes</h3>
          <div className="flex items-center gap-3">
            {uploadMsg && <span className="text-xs text-gray-500">{uploadMsg}</span>}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-xs font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {resumes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No resumes uploaded yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {resumes.map((r) => (
              <div key={r.name} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <span className="text-lg">&#x1F4C4;</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">{(r.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Assign to Bidmen */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Assign to Bidmen</h3>

        {loading ? (
          <p className="text-sm text-gray-400">Loading bidmen...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No approved bidmen yet. Approve users first from the Users page.</p>
        ) : (
          <div className="grid grid-cols-[220px_1fr] gap-6">
            {/* Bidman list */}
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Select Bidman</p>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => loadAssignments(u)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedUser?.id === u.id
                      ? 'bg-primary text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {u.username}
                </button>
              ))}
            </div>

            {/* Resume checkboxes */}
            <div>
              {!selectedUser ? (
                <p className="text-sm text-gray-400 py-4">Select a bidman to manage their resume assignments</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Resumes for <span className="text-gray-600 font-medium">{selectedUser.username}</span>
                  </p>
                  <div className="space-y-3">
                    {resumes.map((r) => {
                      const isAssigned = assignedFilenames.has(r.name);
                      return (
                        <div key={r.name} className={`rounded-lg border p-3 ${isAssigned ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleResume(r.name, isAssigned)}
                              disabled={saving === r.name}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900">{r.name}</span>
                            <span className="text-xs text-gray-400">{(r.size / 1024).toFixed(0)} KB</span>
                          </label>
                          {isAssigned && (
                            <div className="ml-7 mt-2 space-y-2">
                              <textarea
                                value={instructions[r.name] || ''}
                                onChange={(e) => setInstructions({ ...instructions, [r.name]: e.target.value })}
                                placeholder="Custom tailoring instructions for this resume..."
                                className="w-full h-16 px-3 py-2 border border-gray-200 rounded-lg text-xs resize-y outline-none focus:ring-1 focus:ring-primary"
                              />
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={strictChecks[r.name] ?? true}
                                    onChange={(e) => setStrictChecks({ ...strictChecks, [r.name]: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-600">Strict truth checking</span>
                                  <span className="text-[10px] text-gray-400">(uncheck to allow new content/technologies)</span>
                                </label>
                                <button
                                  onClick={() => saveAssignment(r.name)}
                                  disabled={saving === r.name}
                                  className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                                >
                                  {saving === r.name ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
