"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users,
  UserPlus,
  Radar, 
  Settings, 
  Terminal,
  Video,
  ScanSearch,
  Camera
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTargets } from '../../providers/target-provider';
import { useBackendHealth } from '../../hooks/use-backend-health';
import { useUi } from '../../providers/ui-provider';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter(); // Native router execution engine
  const { cameras } = useTargets();
  const { status, latencyMs } = useBackendHealth();
  const { isSidebarOpen: isOpen, setIsSidebarOpen: setIsOpen } = useUi(); // Global context provider hooks

  const onlineCamerasCount = cameras.filter(c => c.status === 'online').length;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cameras', href: '/cameras', icon: Camera },
    { name: 'Live Cameras', href: '/live-cameras', icon: Video },
    { name: 'Acquisition', href: '/acquisition', icon: ScanSearch },
    { name: 'Face Registry', href: '/face-recognition', icon: UserPlus },
    { name: 'Target Gallery', href: '/targets', icon: Users },
    { name: 'Search & Track', href: '/search', icon: Radar },
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
    <aside 
      className={cn(
        "border-r border-[color:var(--border)] bg-[color:var(--bg-elevated)]/70 backdrop-blur-md flex flex-col h-screen shrink-0 select-none transition-all duration-300 ease-in-out overflow-x-hidden",
        isOpen ? "w-[280px]" : "w-16"
      )}
    >
      {/* Brand Header Box */}
      <div className={cn("h-20 border-b border-[color:var(--border)] flex items-center transition-all px-4 gap-4", isOpen ? "px-6" : "justify-center")}>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={cn(
            "flex items-center gap-4 cursor-pointer hover:bg-[color:var(--glass)]/40 duration-200 rounded-xl select-none w-full p-1",
            isOpen ? "justify-start" : "justify-center"
          )}
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <div className="w-10 h-10 rounded-xl bg-[color:var(--surface)] flex items-center justify-center text-[color:var(--fg)] font-display text-lg shadow-[var(--shadow-sm)] shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
              <path d="M8 12a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <span className="font-display text-base text-[color:var(--fg)] tracking-[var(--tracking-tight)] leading-none">
                Aegis ReID
              </span>
              <span className="text-xs text-[color:var(--fg-muted)] mt-1 tracking-[var(--tracking-wide)] uppercase">
                Command Center
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Loop Container (Completely decoupled from Next.js link prefetch loops) */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-none">
        {isOpen && (
          <div className="text-[11px] font-bold text-[color:var(--fg-muted)] tracking-[var(--tracking-wide)] uppercase px-3 mb-3 font-ui animate-in fade-in duration-200">
            Operations
          </div>
        )}
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <div
              key={item.name}
              title={!isOpen ? item.name : undefined}
              // Direct JavaScript routing ensures instant navigation transitions
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(item.href); 
              }}
              className={cn(
                'flex items-center gap-3 h-11 rounded-xl text-sm font-medium transition-transform transform-gpu cursor-pointer select-none',
                isOpen ? 'px-4 py-3' : 'justify-center px-0 w-10 mx-auto',
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
              {isOpen && <span className="font-ui text-sm truncate animate-in fade-in duration-200">{item.name}</span>}
            </div>
          );
        })}
      </nav>

      {/* Footer System Telemetry Status Module */}
      <div className={cn("border-t border-[color:var(--border)] transition-all", isOpen ? "px-4 py-5" : "p-2 py-5 flex flex-col items-center gap-4")}>
        {isOpen ? (
          <div className="p-3 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] space-y-3 w-full animate-in fade-in duration-200">
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
              <p className="text-[12px] text-[color:var(--fg-muted)] pl-5.5 -mt-1">{latencyMs}ms round-trip</p>
            )}

            <div className="h-[1px] w-full bg-[color:var(--border)]/40 my-1" />
            
            <div className="flex items-center justify-between text-[12px] text-[color:var(--fg-muted)]">
              <span className="flex items-center gap-2 text-sm">
                <Terminal className="w-4 h-4" />
                Nodes
              </span>
              <span className="text-[color:var(--fg)] font-semibold">
                {onlineCamerasCount}/{cameras.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <span className="relative flex h-2.5 w-2.5" title={`API Agent: ${connectionLabel}`}>
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
            
            <div 
              className="w-10 h-10 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] flex flex-col items-center justify-center text-xs font-mono font-bold text-[color:var(--fg-muted)]"
              title={`Active Nodes: ${onlineCamerasCount}/${cameras.length}`}
            >
              <span>{onlineCamerasCount}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
