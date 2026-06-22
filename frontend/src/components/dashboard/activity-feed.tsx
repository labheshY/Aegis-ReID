"use client";

import React from 'react';
import { Terminal, ShieldAlert, Wifi, Cpu } from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { cn, formatTime } from '../../lib/utils';

export const ActivityFeed: React.FC = () => {
  const { events, clearEvents } = useTargets();

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-0 text-zinc-300 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 border-none h-4 text-zinc-400" />
          <h3 className="font-semibold text-xs text-white tracking-wider uppercase">Live Activity Terminal</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Status badge */}
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>REALTIME SYNC</span>
          </div>
          <button
            onClick={clearEvents}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase font-bold border-none cursor-pointer"
          >
            Clear logs
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-2 text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-zinc-600 select-none">
            <span>[ SYSTEM IDLE - MONITORING LIVE FEEDS ]</span>
            <span className="text-[9px] mt-1.5 text-zinc-700">Waiting for ReID detection triggers...</span>
          </div>
        ) : (
          events.map((event) => {
            let logColor = "text-zinc-400";
            let prefix = "[INFO]";
            let message = "";

            if (event.eventType === 'lock') {
              logColor = "text-red-400";
              prefix = "[LOCK]";
              message = `ReID Confirmed match for target "${event.targetAlias}" (${event.targetId}) at camera "${event.source}" - Confidence: ${Math.round((event.confidence || 0) * 100)}% | Similarity: ${Math.round((event.similarityScore || 0) * 100)}%`;
            } else if (event.eventType === 'detection') {
              logColor = "text-zinc-300";
              prefix = "[DETC]";
              message = `Person detection registered at camera "${event.source}" - Confidence: ${Math.round(event.confidence * 100)}%`;
            } else if (event.eventType === 'lost') {
              logColor = "text-amber-400";
              prefix = "[LOST]";
              message = `Tracking link severed for target "${event.targetAlias}" (${event.targetId}) at "${event.source}" - decaying state initiated.`;
            } else if (event.eventType === 'acquired') {
              logColor = "text-emerald-400";
              prefix = "[ACQD]";
              message = `Biometric template registration complete for "${event.targetAlias}" (${event.targetId}) - 100 embeddings cataloged.`;
            }

            return (
              <div key={event.id} className={cn("flex items-start gap-3 hover:bg-zinc-900/40 p-1.5 rounded transition-colors", logColor)}>
                <span className="text-zinc-600 select-none font-bold shrink-0">{formatTime(event.timestamp)}</span>
                <span className="font-bold shrink-0">{prefix}</span>
                <span className="break-all">{message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
