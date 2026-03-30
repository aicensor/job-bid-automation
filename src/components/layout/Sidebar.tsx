import NavLink from './NavLink';

export default function Sidebar() {
  return (
    <aside className="w-60 bg-sidebar-bg text-sidebar-text flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <h1 className="text-lg font-bold text-white tracking-tight">Tailor</h1>
        <p className="text-xs text-sidebar-text mt-0.5">Resume Generator</p>
      </div>

      {/* Phase 1 Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Resume</p>
        <NavLink href="/" icon="&#x1F4CA;" label="Dashboard" />
        <NavLink href="/tailor" icon="&#x2728;" label="New Tailoring" />
        <NavLink href="/history" icon="&#x1F4CB;" label="History" />

        {/* Bidman */}
        <div className="mt-6">
          <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Bidman</p>
          <NavLink href="/bidman" icon="&#x1F3AF;" label="Bid" />
          <NavLink href="/bidman/log" icon="&#x1F4D1;" label="Log" />
        </div>

        {/* Phase 2 */}
        <div className="mt-6">
          <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">Job Search</p>
          <NavLink href="/jobs" icon="&#x1F50D;" label="Find Jobs" />
          <NavLink href="/jobs/queue" icon="&#x1F4E5;" label="Job Queue" />
          <NavLink href="/applications" icon="&#x1F4E4;" label="Applications" disabled />
        </div>

        <div className="mt-6">
          <p className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/50 mb-2">System</p>
          <NavLink href="/settings" icon="&#x2699;" label="Settings" />
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 text-xs text-sidebar-text/50">
        v0.1.0
      </div>
    </aside>
  );
}
