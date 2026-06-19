"use client";

import React, { useState, useRef, useEffect } from 'react';
import {Tv, Video, Crosshair, Radar, Radio, ChevronDown } from 'lucide-react';
import CameraSelector from '../../components/ui/camera-selector';
import { api } from '../../services/api';
import { useUi } from '../../providers/ui-provider';
import { PageHeader } from '../../components/layout/page-header';
import { cn } from '../../lib/utils';

interface TargetMark {
  id: number;
  x: number;
  y: number;
}

export default function LiveCamerasPage() {
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [targetMarks, setTargetMarks] = useState<TargetMark[]>([]);
  const { addToast } = useUi();
  const imgRef = useRef<HTMLImageElement>(null);

  // Activate camera when selection changes
  useEffect(() => {
    let mounted = true;
    if (!cameraId) return;
    (async () => {
      try {
        await fetch(`/api/v1/cameras/${cameraId}/activate`, { method: 'POST' });
        if (!mounted) return;
        // small delay to allow frames to flow
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error('Failed to activate camera', err);
      }
    })();
    return () => { mounted = false; };
  }, [cameraId]);

  // click-to-acquire
  const onClickStream = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const dispW = rect.width;
    const dispH = rect.height;

    // Visual mark for the UI feedback
    const markId = Date.now();
    setTargetMarks(prev => [...prev, { id: markId, x: clickX, y: clickY }]);
    
    // Auto-remove the visual mark after 2 seconds
    setTimeout(() => {
      setTargetMarks(prev => prev.filter(m => m.id !== markId));
    }, 2000);

    // Map to tracker resolution (default 640x360)
    const TRACKER_W = 640;
    const TRACKER_H = 360;

    const x = Math.round((clickX / dispW) * TRACKER_W);
    const y = Math.round((clickY / dispH) * TRACKER_H);

    try {
      await api.startAcquisition({ x, y });
      addToast({ title: 'Acquisition Started', description: `Extracting biometric signature at [${x}, ${y}]`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Acquisition Failed', description: String(err.message || err), type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="Surveillance Feed"
        title="Live Camera Monitor"
        description="Select a camera node to view the live video stream. Click anywhere on the feed to acquire a new tracking target."
        actions={
          <div className="flex items-center gap-3">
            {/* Node Selector Tag */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 border border-[#1e293b] rounded-lg px-3 py-2 bg-[#0f172a] shadow-inner">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="tracking-wider">NODE SELECTOR</span>
            </div>

            {/* Styled Dropdown Module */}
            <div className="w-38">
              <CameraSelector value={cameraId} onChange={setCameraId} />
            </div>
          </div>
        }
      />
      <div className="aegis-panel p-6 flex flex-col items-center">
        {!cameraId ? (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl text-zinc-500 select-none">
            <Video className="w-12 h-12 mb-4 opacity-50" />
            <span className="font-mono text-sm tracking-wider uppercase">No Camera Selected</span>
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            {/* Top Bar for Camera Panel */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-t-xl border-b-0 select-none">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase">{cameraId} // LIVE FEED</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>STREAMING</span>
                </div>
                <span>|</span>
                <span>CROSSHAIR: ACTIVE</span>
              </div>
            </div>

            {/* Main Video Area */}
            <div 
              className="relative w-full aspect-video bg-black border border-zinc-800 rounded-b-xl overflow-hidden cursor-crosshair group select-none"
              onClick={onClickStream}
            >
              {/* Actual stream image */}
              <img 
                ref={imgRef}
                src={api.getStreamUrlForCamera(cameraId)} 
                alt={`Live stream from ${cameraId}`} 
                className="w-full h-full object-contain pointer-events-none" 
              />
              
              {/* Scanline overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50 mix-blend-overlay" />
              
              {/* Corner brackets */}
              <div className="absolute inset-4 border border-white/5 pointer-events-none" />
              
              {/* Center Crosshair (appears on hover) */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Crosshair className="w-12 h-12 text-white/20 stroke-1" />
              </div>

              {/* Click Marks */}
              {targetMarks.map(mark => (
                <div 
                  key={mark.id}
                  className="absolute pointer-events-none"
                  style={{ 
                    left: mark.x - 20, 
                    top: mark.y - 20,
                    width: 40,
                    height: 40
                  }}
                >
                  <div className="w-full h-full border-2 border-emerald-400 opacity-80 rounded-sm" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Radar className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Helper Text */}
            <p className="mt-4 text-center text-xs text-zinc-500 font-mono">
              System is awaiting manual target designation. Click directly on a subject in the frame to initialize ReID vector tracking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
