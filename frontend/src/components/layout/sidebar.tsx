"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ScanFace, 
  Radar, 
  Settings, 
  Terminal, 
  Circle,
  Keyboard,
  Video
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTargets } from '../../providers/target-provider';
import { useBackendHealth } from '../../hooks/use-backend-health';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { cameras } = useTargets();
  const { status, latencyMs } = useBackendHealth();

  const onlineCamerasCount = cameras.filter(c => c.status === 'online').length;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Cameras', href: '/live-cameras', icon: Video },
    { name: 'Cameras', href: '/cameras', icon: Circle },
    { name: 'Target Gallery', href: '/targets', icon: Users },
    { name: 'Acquisition', href: '/acquisition', icon: ScanFace },
    { name: 'Search & Track', href: '/search', icon: Radar },
    { name: 'Face Recognition', href: '/face-recognition', icon: ScanFace },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const connectionLabel =
    status === 'connected' ? 'CONNECTED' : status === 'degraded' ? 'DEGRADED' : 'OFFLINE';
  const connectionColor =
    status === 'connected'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : status === 'degraded'
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <aside className="w-[280px] border-r border-[color:var(--border)] bg-[color:var(--bg-elevated)]/70 backdrop-blur-md flex flex-col h-screen shrink-0 select-none">
      <div className="h-20 border-b border-[color:var(--border)] flex items-center px-6 gap-4">
        <div className="w-10 h-10 rounded-xl bg-[color:var(--surface)] flex items-center justify-center text-[color:var(--fg)] font-display text-lg shadow-[var(--shadow-sm)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/><path d="M8 12a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display text-base text-[color:var(--fg)] tracking-[var(--tracking-tight)] leading-none">
            Aegis ReID
          </span>
          <span className="text-xs text-[color:var(--fg-muted)] mt-1 tracking-[var(--tracking-wide)] uppercase">
            Command Center
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-[color:var(--fg-muted)] tracking-[var(--tracking-wide)] uppercase px-3 mb-3 font-ui">
          Operations
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-transform transform-gpu',
                isActive
                  ? 'bg-[color:var(--surface)] text-[color:var(--fg)] border border-[color:var(--border)]'
                  : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--glass)]'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  isActive ? 'text-[color:var(--primary)]' : 'text-[color:var(--fg-muted)]'
                )}
              />
              <span className="font-ui text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5 border-t border-[color:var(--border)] space-y-4">
        <div className="p-3 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                {status === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                )}
                <span
                  className={cn(
                    'relative inline-flex rounded-full h-2.5 w-2.5',
                    status === 'connected' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                  )}
                />
              </span>
              <span className="text-sm font-ui text-[color:var(--fg-muted)]">API Agent</span>
            </div>
            <span className={cn('text-[10px] font-ui font-semibold px-2 py-1 rounded border', connectionColor)}>
              {connectionLabel}
            </span>
          </div>
          {latencyMs != null && status === 'connected' && (
            <p className="text-[12px] text-[color:var(--fg-muted)] mt-2">{latencyMs}ms round-trip</p>
          )}
          <div className="mt-3 flex items-center justify-between text-[12px] text-[color:var(--fg-muted)]">
            <span className="flex items-center gap-2 text-sm">
              <Terminal className="w-4 h-4" />
              Nodes
            </span>
            <span className="text-[color:var(--fg)] font-semibold">
              {onlineCamerasCount}/{cameras.length}
            </span>
          </div>
        </div>

        <div className="text-[12px] text-[color:var(--fg-muted)] px-1">
          <div className="flex items-center gap-2 mb-2 text-[color:var(--fg-muted)] font-semibold">
            <Keyboard className="w-4 h-4" />
            <span>Shortcuts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Command</span>
            <kbd className="px-2 py-1 text-[11px] bg-transparent border border-[color:var(--border)] rounded text-[color:var(--fg-muted)]">⌘K</kbd>
          </div>
        </div>
      </div>
    </aside>
  );
};
