"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  sparkline?: number[];
  accent?: 'cyan' | 'emerald' | 'amber' | 'rose';
}

const accentMap = {
  cyan: 'from-cyan-500/20 to-transparent border-cyan-500/20 text-cyan-400',
  emerald: 'from-emerald-500/20 to-transparent border-emerald-500/20 text-emerald-400',
  amber: 'from-amber-500/20 to-transparent border-amber-500/20 text-amber-400',
  rose: 'from-rose-500/20 to-transparent border-rose-500/20 text-rose-400',
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  className,
  sparkline,
  accent = 'cyan',
}) => {
  return (
    <div
      className={cn(
        'aegis-panel p-5 relative aegis-stat-glow flex flex-col justify-between min-h-[148px] transition-all duration-300 hover:border-white/[0.12]',
        className
      )}
    >
      <div className="flex items-start justify-between relative z-10">
        <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
          {title}
        </span>
        <div
          className={cn(
            'p-2 rounded-xl border bg-gradient-to-br',
            accentMap[accent]
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2 relative z-10">
        <span className="text-3xl font-bold tracking-tight text-zinc-50 tabular-nums leading-none">
          {value}
        </span>
        {trend && trendValue && (
          <span
            className={cn(
              'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase',
              trend === 'up' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
              trend === 'down' && 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
              trend === 'neutral' && 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            )}
          >
            {trendValue}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 relative z-10">
        <span className="text-xs text-zinc-500 leading-none">{subtext}</span>
        {sparkline && sparkline.length > 1 && (
          <svg className="w-16 h-6 fill-none overflow-visible shrink-0 opacity-80" viewBox="0 0 60 20">
            <path
              d={sparkline
                .map((val, idx) => {
                  const x = (idx / (sparkline.length - 1)) * 60;
                  const min = Math.min(...sparkline);
                  const max = Math.max(...sparkline);
                  const range = max - min || 1;
                  const y = 18 - ((val - min) / range) * 16;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              className={cn(
                'stroke-[1.5]',
                trend === 'up' ? 'stroke-emerald-500' : trend === 'down' ? 'stroke-rose-500' : 'stroke-zinc-600'
              )}
            />
          </svg>
        )}
      </div>
    </div>
  );
};
