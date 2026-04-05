import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import NavLink from '@/components/layout/NavLink';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/bidman');

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 antialiased">
      <aside className="w-60 bg-sidebar-bg text-sidebar-text flex flex-col h-screen shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">{user.username} (admin)</span>
            <LogoutButton />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">Tailor</h1>
          <p className="text-xs text-sidebar-text mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Admin</p>
          <NavLink href="/admin" icon="&#x1F465;" label="Users" />
          <NavLink href="/admin/resumes" icon="&#x1F4C4;" label="Resume Assign" />

          <div className="mt-6">
            <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Resume</p>
            <NavLink href="/tailor" icon="&#x2728;" label="New Tailoring" />
            <NavLink href="/history" icon="&#x1F4CB;" label="History" />
          </div>

          <div className="mt-6">
            <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Job Search</p>
            <NavLink href="/jobs" icon="&#x1F50D;" label="Find Jobs" />
            <NavLink href="/jobs/queue" icon="&#x1F4E5;" label="Job Queue" />
          </div>

          <div className="mt-6">
            <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">System</p>
            <NavLink href="/settings" icon="&#x2699;" label="Settings" />
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-xs text-sidebar-text/50">
          v0.1.0
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
