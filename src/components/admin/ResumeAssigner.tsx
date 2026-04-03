'use client';

import { useState, useEffect } from 'react';

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
}

interface ResumeAssignerProps {
  availableResumes: string[];
}

export default function ResumeAssigner({ availableResumes }: ResumeAssignerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        const bidmen = (data as User[]).filter((u) => u.role === 'bidman' && u.status === 'approved');
        setUsers(bidmen);
        setLoading(false);
      });
  }, []);

  const loadAssignments = async (user: User) => {
    setSelectedUser(user);
    const res = await fetch(`/api/admin/assignments?userId=${user.id}`);
    const data = (await res.json()) as Assignment[];
    setAssignments(data);
    const instrMap: Record<string, string> = {};
    data.forEach((a) => { instrMap[a.resume_filename] = a.tailoring_instructions || ''; });
    setInstructions(instrMap);
  };

  const toggleResume = async (filename: string, assigned: boolean) => {
    if (!selectedUser) return;
    setSaving(true);

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
        body: JSON.stringify({
          userId: selectedUser.id,
          resumeFilename: filename,
          tailoringInstructions: '',
        }),
      });
    }

    await loadAssignments(selectedUser);
    setSaving(false);
  };

  const saveInstructions = async (filename: string) => {
    if (!selectedUser) return;
    setSaving(true);
    await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedUser.id,
        resumeFilename: filename,
        tailoringInstructions: instructions[filename] || '',
      }),
    });
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No approved bidmen yet. Approve users first.</p>
      </div>
    );
  }

  const assignedFilenames = new Set(assignments.map((a) => a.resume_filename));

  return (
    <div className="grid grid-cols-[240px_1fr] gap-6">
      {/* User list */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Bidmen</p>
        <div className="space-y-1">
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
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {!selectedUser ? (
          <p className="text-sm text-gray-400">Select a bidman to manage their resume assignments</p>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Resumes for {selectedUser.username}
            </h3>
            <div className="space-y-3">
              {availableResumes.map((filename) => {
                const isAssigned = assignedFilenames.has(filename);
                return (
                  <div key={filename} className={`rounded-lg border p-4 ${isAssigned ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleResume(filename, isAssigned)}
                        disabled={saving}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">{filename}</span>
                    </div>
                    {isAssigned && (
                      <div className="ml-7">
                        <label className="text-xs text-gray-500 block mb-1">Custom tailoring instructions</label>
                        <textarea
                          value={instructions[filename] || ''}
                          onChange={(e) => setInstructions({ ...instructions, [filename]: e.target.value })}
                          onBlur={() => saveInstructions(filename)}
                          placeholder="e.g. Emphasize leadership experience, focus on backend skills..."
                          className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg text-xs resize-y outline-none focus:ring-1 focus:ring-primary"
                        />
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
  );
}
