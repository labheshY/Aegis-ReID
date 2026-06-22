"use client";

import React from 'react';
import { Camera, ArrowRight, Activity } from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { AvatarCrop } from '../ui/avatar-crop';
import { cn, formatTime } from '../../lib/utils';
import Link from 'next/link';

export const RecentDetections: React.FC = () => {
  const { events, targets } = useTargets();

  const detections = events
    .filter((e) => e.eventType === 'lock' || e.eventType === 'detection')
    .slice(0, 5);

  const getTargetDetails = (targetId?: string) => {
    if (!targetId) return { seed: 99, previewImagePath: undefined };
    const found = targets.find((t) => t.id === targetId);
    return {
      seed: found ? parseInt(found.id, 10) || 50 : 50,
      previewImagePath: found ? found.previewImagePath : undefined,
    };
  };

  return (
    <div className="aegis-panel p-5 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Recent Detections</h3>
        </div>
        <Link
          href="/search"
          className="text-xs font-semibold text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1 group"
        >
          <span>Live Feed</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {detections.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-zinc-600 font-mono text-xs text-center">
            <span>No detections yet.</span>
            <span className="text-zinc-700 mt-1">Start a search session to populate this feed.</span>
          </div>
        ) : (
          detections.map((item) => {
            const isLock = item.eventType === 'lock';
            const alias = item.targetAlias || 'Anonymous Person';
            const { seed, previewImagePath } = getTargetDetails(item.targetId);

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl border transition-all duration-300',
                  isLock
                    ? 'bg-red-500/[0.06] border-red-500/20 hover:border-red-500/35'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                )}
              >
                <AvatarCrop
                  seed={seed}
                  alias={alias}
                  status={isLock ? 'tracked' : 'idle'}
                  previewImagePath={previewImagePath}
                  className="w-12 h-12 rounded-lg"
                  confidence={item.confidence}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-100 truncate">{alias}</span>
                    <span className="text-[10px] font-mono text-zinc-600 tabular-nums">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-500">
                    <Camera className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span className="truncate">{item.source}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {isLock ? (
                      <>
                        <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded uppercase">
                          ReID Lock
                        </span>
                        {item.similarityScore != null && (
                          <span className="text-[9px] font-mono text-zinc-500">
                            {Math.round(item.similarityScore * 100)}% match
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded uppercase">
                        Detection
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
