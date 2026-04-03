import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import NavLink from '@/components/layout/NavLink';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function BidmanLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 antialiased">
      {/* Bidman Sidebar */}
      <aside className="w-60 bg-sidebar-bg text-sidebar-text flex flex-col h-screen shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">{user.username}</span>
            <LogoutButton />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">Tailor</h1>
          <p className="text-xs text-sidebar-text mt-0.5">Resume Generator</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Bidman</p>
          <NavLink href="/bidman" icon="&#x1F3AF;" label="Bid" />
          <NavLink href="/bidman/log" icon="&#x1F4D1;" label="Log" />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
