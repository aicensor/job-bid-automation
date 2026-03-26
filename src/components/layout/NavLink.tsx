'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  icon: string;
  label: string;
  disabled?: boolean;
}

export default function NavLink({ href, icon, label, disabled }: NavLinkProps) {
  const pathname = usePathname();
  // Exact match for short paths to avoid /jobs matching /jobs/queue
  const isActive = href === '/'
    ? pathname === '/'
    : pathname === href || (href !== '/jobs' && pathname.startsWith(href + '/'));

  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-text/40 cursor-not-allowed" title="Coming Soon">
        <span className="text-lg w-6 text-center">{icon}</span>
        <span className="text-sm">{label}</span>
        <span className="ml-auto text-[10px] bg-sidebar-text/10 px-1.5 py-0.5 rounded">Soon</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-white/10 text-sidebar-active font-medium'
          : 'text-sidebar-text hover:bg-white/5 hover:text-sidebar-active'
      }`}
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}
