"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, ShieldCheck } from 'lucide-react';
import { useUi } from '../../providers/ui-provider';
import { useTargets } from '../../providers/target-provider';
import { formatTime, formatDate } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useUi();
  const { events } = useTargets();
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      setTimeString(formatTime(new Date().toISOString()));
      setDateString(formatDate(new Date().toISOString()));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
      return [{ name: 'Command Center', href: '#' }, { name: 'Overview', href: '#' }];
    }
    const labels: Record<string, string> = {
      targets: 'Target Gallery',
      acquisition: 'Biometric Acquisition',
      search: 'Multi-Cam Search',
      settings: 'Tracker Settings',
      'live-cameras': 'Live Feeds',
      'face-recognition': 'Face Recognition',
      cameras: 'Camera Registry',
    };
    return [
      { name: 'Command Center', href: '/dashboard' },
      ...parts.map((p) => ({
        name: labels[p] ?? p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '),
        href: `/${p}`,
      })),
    ];
  };

  const breadcrumbs = getBreadcrumbs();
  const lockEventsCount = events.filter((e) => e.eventType === 'lock').length;

  return (
    <header className="h-16 border-b border-[color:var(--border)] bg-[color:var(--bg-elevated)]/70 backdrop-blur-md flex items-center justify-between px-6 md:px-8 sticky top-0 z-30 shrink-0">
      <nav className="flex items-center gap-2 font-mono text-[11px] min-w-0">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={`${crumb.name}-${idx}`}>
            {idx > 0 && <span className="text-zinc-700">/</span>}
            <span className={idx === breadcrumbs.length - 1 ? 'font-display text-[15px] text-[color:var(--fg)] font-semibold truncate' : 'text-[13px] text-[color:var(--fg-muted)] font-medium truncate'}>
              {crumb.name}
            </span>
          </React.Fragment>
        ))}
      </nav>

      <div className="flex items-center gap-4 md:gap-5">
        <div className="hidden sm:flex items-center gap-4 border-r border-[color:var(--border)] pr-6">
          <div className="flex flex-col text-right">
            <span className="text-sm font-ui font-semibold text-[color:var(--fg)] tabular-nums tracking-tight">
              {timeString || '--:--:--'}
            </span>
            <span className="text-xs font-ui text-[color:var(--fg-muted)] uppercase tracking-[var(--tracking-wide)]">
              {dateString || '---'}
            </span>
          </div>
          <ShieldCheck className="w-4 h-4 text-[color:var(--primary)]" />
        </div>

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-[color:var(--glass)] hover:bg-[color:var(--glass-hover)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] rounded-xl border border-[color:var(--border)] transition-transform transform-gpu hover:scale-[1.02]"
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:inline">Search targets…</span>
          <kbd className="hidden sm:inline px-2 py-1 text-[11px] bg-transparent border border-[color:var(--border)] rounded text-[color:var(--fg-muted)] ml-1">⌘K</kbd>
        </button>

        <button
          type="button"
          className="p-2 rounded-xl text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {lockEventsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[color:var(--alert)] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          )}
        </button>
      </div>
    </header>
  );
};
