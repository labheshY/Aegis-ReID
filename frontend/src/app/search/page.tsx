"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Radar, 
  Tv, 
  Maximize2, 
  ShieldAlert, 
  TrendingUp, 
  Activity, 
  Play, 
  Pause,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { useUi } from '../../providers/ui-provider';
import { AvatarCrop } from '../../components/ui/avatar-crop';
import { cn, formatTime } from '../../lib/utils';
import { Target, Camera } from '../../types';

function SearchTrackingPageContent() {
  const searchParams = useSearchParams();
  const targetQueryId = searchParams.get('target');

  const { targets, cameras, events, activeTargetId, setActiveTargetId, activeSearchIds, startSearch, stopSearch } = useTargets();
  const { addToast } = useUi();

  // Selected Target state
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const displayAlias = selectedTarget?.alias ?? `Target ${selectedTarget?.id}`;
  // Synced from URL or default
  useEffect(() => {
    if (targetQueryId) {
      const found = targets.find(t => t.id === targetQueryId);
      if (found) {
        setSelectedTarget(found);
        setActiveTargetId(found.id);
      }
    } else if (targets.length > 0 && !selectedTarget) {
      // default selection
      setSelectedTarget(targets[0]);
      setActiveTargetId(targets[0].id);
    }
  }, [targetQueryId, targets, selectedTarget, setActiveTargetId]);

  const handleSelectTarget = (targetId: string) => {
    const found = targets.find(t => t.id === targetId);
    if (found) {
      setSelectedTarget(found);
      setActiveTargetId(found.id);
      addToast({
        title: "Search target locked",
        description: `Correlating camera feeds for appearance signature: ${found.alias}`,
        type: "info"
      });
    }
  };

  // Canvas-based Security Cameras Grid
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const animationRef = useRef<number | null>(null);

  // Keep track of moving dots for 4 cameras
  // Camera 1: Lobby reception, Camera 2: Main Access Gate, Camera 3: Parking lot east, Camera 4: loading dock
  const camSimulations = useRef([
    {
      camId: "CAM-01",
      name: "Main Access Gate",
      subjects: [
        { id: 'sub-1', x: 50, y: 80, dx: 0.8, dy: 0.4, w: 40, h: 55, label: "Person", isTarget: false },
        { id: 'target', x: 180, y: 120, dx: -0.6, dy: -0.3, w: 45, h: 60, label: "Target Lock", isTarget: true }
      ]
    },
    {
      camId: "CAM-02",
      name: "Parking Structure East",
      subjects: [
        { id: 'sub-2', x: 220, y: 60, dx: -0.4, dy: 0.5, w: 35, h: 50, label: "Person", isTarget: false },
        { id: 'sub-3', x: 80, y: 150, dx: 0.7, dy: -0.2, w: 40, h: 55, label: "Person", isTarget: false }
      ]
    },
    {
      camId: "CAM-03",
      name: "Lobby Reception",
      subjects: [
        { id: 'target', x: 60, y: 100, dx: 0.5, dy: 0.6, w: 45, h: 60, label: "Target Lock", isTarget: true },
        { id: 'sub-4', x: 200, y: 160, dx: -0.9, dy: -0.4, w: 38, h: 52, label: "Person", isTarget: false }
      ]
    },
    {
      camId: "CAM-04",
      name: "Loading Dock Freight",
      subjects: [
        { id: 'sub-5', x: 120, y: 90, dx: 0.3, dy: -0.5, w: 38, h: 50, label: "Person", isTarget: false }
      ]
    }
  ]);

  // Real-time confidence sparkline value array
  const [similarityFeed, setSimilarityFeed] = useState<number[]>([92, 94, 91, 95, 94, 96, 93, 94, 95, 96]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      // Append a small noise/deviation to the lock match confidence (88% to 98%)
      setSimilarityFeed(prev => {
        const nextScore = Math.floor(88 + Math.random() * 11);
        return [...prev.slice(1), nextScore];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Multi-feed canvas rendering animation
  useEffect(() => {
    if (!isPlaying) return;

    const renderFeeds = () => {
      const activeIds = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"];

      activeIds.forEach((camId, idx) => {
        const canvas = canvasRefs.current[camId];
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w_width = canvas.width;
        const h_height = canvas.height;

        // Dark feed color
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, w_width, h_height);

        // Security grid scanline pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w_width; i += 24) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h_height); ctx.stroke();
        }
        for (let i = 0; i < h_height; i += 24) {
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w_width, i); ctx.stroke();
        }

        const sim = camSimulations.current[idx];

        // Animate and draw subjects
        sim.subjects.forEach((sub) => {
          // Bounce coordinates
          sub.x += sub.dx;
          sub.y += sub.dy;

          if (sub.x <= 10 || sub.x + sub.w >= w_width - 10) sub.dx *= -1;
          if (sub.y <= 15 || sub.y + sub.h >= h_height - 15) sub.dy *= -1;

          const isTargetLock = sub.isTarget && selectedTarget;

          // Box color: RED for locked target, GREEN for general person
          ctx.strokeStyle = isTargetLock ? '#ef4444' : '#22c55e';
          ctx.lineWidth = isTargetLock ? 2 : 1;

          // Draw corner frames
          const x = sub.x;
          const y = sub.y;
          const sw = sub.w;
          const sh = sub.h;
          const cLen = 10;

          ctx.beginPath();
          // TL
          ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y);
          // TR
          ctx.moveTo(x + sw - cLen, y); ctx.lineTo(x + sw, y); ctx.lineTo(x + sw, y + cLen);
          // BL
          ctx.moveTo(x, y + sh - cLen); ctx.lineTo(x, y + sh); ctx.lineTo(x + cLen, y + sh);
          // BR
          ctx.moveTo(x + sw - cLen, y + sh); ctx.lineTo(x + sw, y + sh); ctx.lineTo(x + sw, y + sh - cLen);
          ctx.stroke();

          // Render crosshair biometric dots
          ctx.fillStyle = isTargetLock ? '#ef4444' : '#22c55e';
          ctx.beginPath();
          ctx.arc(x + sw/2, y + sh/2, 2, 0, Math.PI * 2);
          ctx.fill();

          // Text overlay
          ctx.font = '8px monospace';
          const label = isTargetLock 
            ? `LOCK: ${displayAlias.toUpperCase()} | ${similarityFeed[similarityFeed.length - 1]}%`
            : "UNTRACKED SUBJECT";
            
          ctx.fillText(label, x, y - 5);
        });

        // Camera labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '8px monospace';
        ctx.fillText(`CAM-0${idx + 1} | ${sim.name.toUpperCase()}`, 12, 20);
        ctx.fillText("INF_SPEED: 8.5ms", 12, 32);

        // Record blinking dot
        if (Math.floor(Date.now() / 500) % 2 === 0) {
          ctx.fillStyle = isPlaying ? '#ef4444' : '#a1a1aa';
          ctx.beginPath();
          ctx.arc(w_width - 15, 17, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(renderFeeds);
    };

    renderFeeds();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, selectedTarget, similarityFeed]);

  // Log events relating to targets
  const targetSpecificEvents = selectedTarget 
    ? events.filter(e => e.targetId === selectedTarget.id || !e.targetId).slice(0, 10)
    : events.slice(0, 10);

  return (
    <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Multi-Cam Search Corridor</h1>
          <p className="text-sm text-zinc-500">Real-time similarity matching and target re-identification engine.</p>
        </div>

        {/* Video controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Streams</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Streams</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: 2x2 Camera Video Feeds Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["CAM-01", "CAM-02", "CAM-03", "CAM-04"].map((camId, idx) => {
              const name = camSimulations.current[idx].name;
              return (
                <div 
                  key={camId}
                  className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-md relative group select-none"
                >
                  <div className="aspect-[16/10] w-full relative">
                    <canvas 
                      ref={el => { canvasRefs.current[camId] = el; }}
                      width={440}
                      height={275}
                      className="w-full h-full object-cover block"
                    />
                    
                    {/* Corner Crosshairs Visual */}
                    <div className="absolute inset-2 border border-white/[0.02] pointer-events-none" />
                  </div>
                  
                  {/* Status Overlay bottom */}
                  <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span className="font-bold text-white uppercase">{camId}: {name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>30.0 FPS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Event Logs inside Search page */}
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs select-none">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-4 mb-4">
              <Activity className="w-4 h-4 text-zinc-800" />
              <h3 className="font-semibold text-sm text-zinc-900 tracking-tight">Active Tracking Log (Target Isolated)</h3>
            </div>

            <div className="space-y-3 font-mono text-[11px] max-h-[140px] overflow-y-auto pr-1">
              {targetSpecificEvents.map((evt) => {
                const isLock = evt.eventType === 'lock';
                const isLost = evt.eventType === 'lost';
                let colorClass = "text-zinc-500";
                let badge = "[DETC]";

                if (isLock) {
                  colorClass = "text-red-600 font-semibold";
                  badge = "[LOCK]";
                } else if (isLost) {
                  colorClass = "text-amber-600 font-semibold";
                  badge = "[LOST]";
                }

                return (
                  <div key={evt.id} className={cn("flex items-center justify-between p-1 hover:bg-zinc-50 rounded", colorClass)}>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">{formatTime(evt.timestamp)}</span>
                      <span className="font-bold shrink-0">{badge}</span>
                      <span>
                        {evt.eventType === 'lock' 
                          ? `ReID Confirmed: ${evt.targetAlias} at ${evt.source} | Similarity: ${Math.round((evt.similarityScore || 0)*100)}%`
                          : evt.eventType === 'lost'
                            ? `Visual anchor lost for ${evt.targetAlias} at ${evt.source}`
                            : `Anonymous capture track registered at ${evt.source}`}
                      </span>
                    </div>
                    <span className="text-zinc-400 shrink-0 font-bold uppercase">{evt.source.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Biometric Telemetry & Target Selector */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Selector Card */}
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs select-none">
            <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-wider font-mono">Isolate Subject Signature</h3>
            
            <div className="mt-4 space-y-2 text-xs">
              <label className="text-[9px] font-bold text-zinc-400 uppercase block">Selected Identity</label>
              <select
                value={selectedTarget?.id || ''}
                onChange={(e) => handleSelectTarget(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-semibold text-zinc-800 font-sans"
              >
                {targets.map(t => (
                  <option key={t.id} value={t.id}>{t.alias} ({t.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Telemetry Sidebar Details */}
          {selectedTarget ? (
            <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs space-y-6 select-none">
              <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-wider font-mono">Telemetry Analytics</h3>
              
              <div className="flex gap-4 items-center">
                <AvatarCrop 
                  seed={parseInt(selectedTarget.id, 10) || 50} 
                  alias={selectedTarget.alias} 
                  status={activeSearchIds.includes(selectedTarget.id) ? 'tracked' : 'idle'} 
                  previewImagePath={selectedTarget.previewImagePath}
                  className="w-20 h-20 rounded-xl shrink-0" 
                />
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Active Target</span>
                  <span className="font-bold text-sm text-zinc-800 block truncate leading-none mt-0.5">{selectedTarget.alias}</span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-1.5">ID: {selectedTarget.id}</span>
                  <span className="text-[10px] font-mono text-zinc-500 block mt-1">Embeddings: {selectedTarget.embeddingsCount}</span>
                </div>
              </div>

              {/* Real-time Similarity Chart Simulation */}
              <div className="border-t border-zinc-100 pt-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-500 font-medium">Match Score Variance</span>
                  </div>
                  <span className="font-mono font-bold text-red-500">{similarityFeed[similarityFeed.length - 1]}% ReID</span>
                </div>

                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl h-24 flex items-end justify-between relative overflow-hidden">
                  {/* Grid Lines inside graph */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_16px] pointer-events-none" />
                  
                  {/* Render sparkline bars */}
                  {similarityFeed.map((score, idx) => {
                    const normalizedHeight = ((score - 70) / 30) * 100; // between 0 and 100
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "w-3 rounded-t-sm transition-all duration-500 bg-red-500/80 hover:bg-red-500 relative group",
                          !isPlaying && "bg-zinc-600/80"
                        )}
                        style={{ height: `${Math.max(normalizedHeight, 15)}%` }}
                        title={`${score}%`}
                      />
                    );
                  })}

                  <div className="absolute top-2 left-2 flex font-mono text-[7px] text-zinc-500 uppercase tracking-widest pointer-events-none">
                    <span>Threshold: 85%</span>
                  </div>
                </div>
              </div>

              {/* Status details */}
              <div className="border-t border-zinc-100 pt-5 space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Active Search Status</span>
                  <span className={cn(
                    "font-mono font-bold px-1.5 py-0.5 rounded text-[10px] uppercase",
                    activeSearchIds.includes(selectedTarget.id) 
                      ? "bg-red-50 text-red-700 border border-red-100 animate-pulse" 
                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  )}>
                    {activeSearchIds.includes(selectedTarget.id) ? 'ACTIVE LOCK' : 'STANDBY / IDLE'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">Confidence Threshold</span>
                  <span className="font-mono font-semibold text-zinc-800">85% Min</span>
                </div>

                {/* Direct Search Toggle Button */}
                <div className="pt-4 border-t border-zinc-100 flex gap-2">
                  {activeSearchIds.includes(selectedTarget.id) ? (
                    <button
                      onClick={() => stopSearch(selectedTarget.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold cursor-pointer border border-red-200"
                    >
                      <Radar className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      <span>Stop Active Search</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => startSearch(selectedTarget.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold cursor-pointer border-none"
                    >
                      <Radar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Start Live Search</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-150 rounded-2xl p-8 text-center text-zinc-400 font-mono text-xs select-none">
              <EyeOff className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
              <span>Register/select target to display active telemetry.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchTrackingPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 font-mono text-sm p-8">Loading search console…</div>}>
      <SearchTrackingPageContent />
    </Suspense>
  );
}
