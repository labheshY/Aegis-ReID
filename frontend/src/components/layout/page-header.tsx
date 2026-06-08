"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between select-none",
      className
    )}
  >
    <div className="space-y-1.5">
      {badge && (
        <span className="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400/90 border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 rounded-md">
          {badge}
        </span>
      )}
      <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">{title}</h1>
      {description && (
        <p className="text-sm text-zinc-500 max-w-2xl leading-relaxed">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
