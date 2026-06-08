"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ScanFace, Radar, Settings, Trash2, Command, X } from 'lucide-react';
import { useUi } from '../../providers/ui-provider';
import { useTargets } from '../../providers/target-provider';
import { cn } from '../../lib/utils';

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, addToast } = useUi();
  const { targets, clearEvents } = useTargets();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCommandPaletteOpen(false);
      }
    };
    if (commandPaletteOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Generate lists
  const filteredTargets = query 
    ? targets.filter(t => (String(t.alias ?? '').toLowerCase().includes(query.toLowerCase()) || String(t.id ?? '').toLowerCase().includes(query.toLowerCase())))
    : targets.slice(0, 3);

  const navigationCommands = [
    { name: 'Go to Dashboard', href: '/dashboard', icon: Command },
    { name: 'Open Target Gallery', href: '/targets', icon: Users },
    { name: 'Biometric Acquisition Feed', href: '/acquisition', icon: ScanFace },
    { name: 'Multi-Cam Tracking Corridor', href: '/search', icon: Radar },
    { name: 'Adjust System Settings', href: '/settings', icon: Settings },
  ].filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

  const utilityCommands = [
    { 
      name: 'Clear Live Tracking Logs', 
      action: () => {
        clearEvents();
        addToast({ title: "Detections Database Wiped", description: "All real-time logging records have been purged.", type: "info" });
      }, 
      icon: Trash2 
    }
  ].filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...navigationCommands.map(c => ({ type: 'nav', name: c.name, data: c.href, icon: c.icon })),
    ...filteredTargets.map(t => ({ type: 'target', name: `Track: ${t.alias} (${t.id})`, data: t.id, icon: Users })),
    ...utilityCommands.map(u => ({ type: 'util', name: u.name, data: u.action, icon: u.icon }))
  ];

  // Key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(allItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          triggerAction(allItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, selectedIndex, allItems]);

  const triggerAction = (item: typeof allItems[0]) => {
    if (item.type === 'nav') {
      router.push(item.data as string);
    } else if (item.type === 'target') {
      router.push(`/search?target=${item.data}`);
    } else if (item.type === 'util') {
      (item.data as () => void)();
    }
    setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-zinc-950/40 backdrop-blur-xs">
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[480px] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Area */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-150 relative">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Type a command or target name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full text-sm text-zinc-900 border-none outline-none placeholder-zinc-400 font-sans"
          />
          <button 
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[100px]">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-400">
              No results matching query. Try typing another command.
            </div>
          ) : (
            <>
              {allItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                
                return (
                  <button
                    key={idx}
                    onClick={() => triggerAction(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-colors border-none cursor-pointer",
                      isSelected 
                        ? "bg-zinc-100 text-zinc-900 font-semibold" 
                        : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4", isSelected ? "text-zinc-900" : "text-zinc-400")} />
                      <span>{item.name}</span>
                    </div>
                    {item.type === 'target' && (
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase",
                        isSelected 
                          ? "bg-white border-zinc-300 text-zinc-800" 
                          : "bg-zinc-50 border-zinc-150 text-zinc-400"
                      )}>
                        Target Match
                      </span>
                    )}
                    {item.type === 'nav' && (
                      <span className="text-[10px] font-mono text-zinc-400">Jump</span>
                    )}
                    {item.type === 'util' && (
                      <span className="text-[10px] font-mono text-red-500 font-bold uppercase">System Command</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-150 flex items-center justify-between font-mono text-[10px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Esc to exit</span>
        </div>
      </div>
    </div>
  );
};
