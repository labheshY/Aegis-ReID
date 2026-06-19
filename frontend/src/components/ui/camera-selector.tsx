"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Tv, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function CameraSelector({ 
  value, 
  onChange 
}: { 
  value: string | null; 
  onChange: (id: string | null) => void 
}) {
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getCameras().then((list) => {
      if (!mounted) return;
      setCameras(list);
    });
    return () => { mounted = false; };
  }, []);

  const selectedCamera = cameras.find((c) => c.id === value);

  return (
    <div className="relative group w-full">
      {/* Custom Trigger Button */}
      <button className="relative flex w-full items-center justify-center h-8 px-3 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer shadow-sm">
        
        {/* Left Aligned: TV Icon */}
        <Tv className="absolute left-3 w-3.5 h-3.5 text-cyan-400 shrink-0" />

        {/* Centered: Label Text */}
        <div className="max-w-[65%] truncate px-1">
          <span className="truncate text-[11px] font-semibold leading-none tracking-wide text-zinc-300 block text-center">
            {selectedCamera ? selectedCamera.name : "Default"}
          </span>
        </div>

        {/* Right Aligned: Arrow Icon */}
        <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />

      </button>

      {/* Dropdown Options List */}
      <div className="absolute right-0 top-full mt-1.5 w-full bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 p-2">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1.5 tracking-wider border-b border-[#1e293b] mb-1">
          Available Nodes
        </h4>
        <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Default Option */}
          <button
            onClick={() => onChange(null)}
            className={cn(
              "flex w-full items-center justify-between gap-2 p-2 rounded-md text-xs font-medium transition-colors cursor-pointer text-left",
              value === null
                ? "bg-[#1e293b] text-cyan-400 font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
            )}
          >
            <span>Default</span>
            {value === null && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
          </button>

          {/* Dynamic API Camera Options */}
          {cameras.map((cam) => {
            const isSelected = cam.id === value;
            return (
              <button
                key={cam.id}
                onClick={() => onChange(cam.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 p-2 rounded-md text-xs font-medium transition-colors cursor-pointer text-left",
                  isSelected
                    ? "bg-[#1e293b] text-cyan-400 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
                )}
              >
                <span className="truncate">{cam.name || cam.id}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
