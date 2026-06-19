// Save exactly as: /app/cameras/loading.tsx
import React from 'react';

export default function CamerasLoading() {
  return (
    <div className="flex flex-col gap-3 p-6 animate-pulse w-full h-full justify-center items-center">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping" />
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
      </div>
      <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
        Connecting to Node Agent...
      </span>
    </div>
  );
}
