'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [passwordModal, setPasswordModal] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchUsers();
    setActionLoading(null);
  };

  const deleteUser = async (id: number, username: string) => {
    if (!confirm(`Remove user "${username}"? This cannot be undone.`)) return;
    setActionLoading(id);
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    await fetchUsers();
    setActionLoading(null);
  };

  const changePassword = async () => {
    if (!passwordModal || newPassword.length < 6) return;
    await fetch(`/api/admin/users/${passwordModal.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    setPasswordModal(null);
    setNewPassword('');
  };

  if (loading) return <p className="text-sm text-gray-400">Loading users...</p>;

  const pending = users.filter((u) => u.status === 'pending');
  const active = users.filter((u) => u.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            Pending Approval ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.username}</p>
                  <p className="text-xs text-gray-400">Registered {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(u.id, 'approved')}
                    disabled={actionLoading === u.id}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => deleteUser(u.id, u.username)}
                    disabled={actionLoading === u.id}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All users */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {active.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    u.status === 'approved' ? 'bg-green-100 text-green-700' :
                    u.status === 'disabled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {u.role !== 'admin' && (
                      <>
                        {u.status === 'approved' ? (
                          <button onClick={() => updateStatus(u.id, 'disabled')} className="text-xs text-amber-600 hover:underline">Disable</button>
                        ) : u.status === 'disabled' ? (
                          <button onClick={() => updateStatus(u.id, 'approved')} className="text-xs text-green-600 hover:underline">Enable</button>
                        ) : null}
                      </>
                    )}
                    <button onClick={() => { setPasswordModal(u); setNewPassword(''); }} className="text-xs text-primary hover:underline">Password</button>
                    {u.role !== 'admin' && (
                      <button onClick={() => deleteUser(u.id, u.username)} className="text-xs text-red-500 hover:underline">Remove</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password change modal */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold">Change password for {passwordModal.username}</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPasswordModal(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button
                onClick={changePassword}
                disabled={newPassword.length < 6}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
