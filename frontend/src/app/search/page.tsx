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
  UserCheck,
  ChevronDown,
  Cpu
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { useUi } from '../../providers/ui-provider';
import { AvatarCrop } from '../../components/ui/avatar-crop';
import { cn, formatTime } from '../../lib/utils';
import { Target, Camera } from '../../types';
import { PageHeader } from '../../components/layout/page-header';
import { api } from '../../services/api'

function SearchTrackingPageContent() {
  const searchParams = useSearchParams();
  const targetQueryId = searchParams.get('target');

  const { 
    targets, 
    cameras, 
    events, 
    activeTargetId, 
    setActiveTargetId, 
    activeSearchIds, 
    startSearch, 
    stopSearch,
    searchCameras,
    setSearchCameras,
    searchSimilarityFeed,
    setSearchSimilarityFeed,
    searchIsPlaying,
    setSearchIsPlaying,
    searchTrackingMode,
    setSearchTrackingMode
  } = useTargets();
  const { addToast } = useUi();

  // Selected Target state (Only used when the URL forces a change or first load, otherwise rely on provider state)
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // Initialize from global state if navigating back
  useEffect(() => {
    if (activeTargetId && !targetQueryId) {
      const found = targets.find(t => t.id === activeTargetId);
      if (found) setSelectedTarget(found);
    }
  }, [activeTargetId, targets, targetQueryId]);

  const displayAlias = selectedTarget?.alias ?? `Target ${selectedTarget?.id}`;

  // Synced from URL or default
  useEffect(() => {
    if (targetQueryId) {
      const found = targets.find(t => t.id === targetQueryId);
      if (found) {
        setSelectedTarget(found);
        setActiveTargetId(found.id);
      }
    } else if (targets.length > 0 && !selectedTarget && !activeTargetId) {
      // default selection
      setSelectedTarget(targets[0]);
      setActiveTargetId(targets[0].id);
    }
  }, [targetQueryId, targets, selectedTarget, activeTargetId, setActiveTargetId]);

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

  // // Canvas-based Security Cameras Grid
  // const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  // const animationRef = useRef<number | null>(null);

  // // Dynamic simulation cache for arbitrary cameras
  // const simCache = useRef<{ [key: string]: { subjects: any[] } }>({});

  // useEffect(() => {
  //   if (!searchIsPlaying) return;
  //   const interval = setInterval(() => {
  //     // Append a small noise/deviation to the lock match confidence (88% to 98%)
  //     setSearchSimilarityFeed(prev => {
  //       const nextScore = Math.floor(88 + Math.random() * 11);
  //       return [...prev.slice(1), nextScore];
  //     });
  //   }, 1500);
  //   return () => clearInterval(interval);
  // }, [searchIsPlaying, setSearchSimilarityFeed]);

  // // Multi-feed canvas rendering animation
  // useEffect(() => {
  //   if (!searchIsPlaying) return;

  //   const renderFeeds = () => {
  //     searchCameras.forEach((camId, idx) => {
  //       const canvas = canvasRefs.current[camId];
  //       if (!canvas) return;
  //       const ctx = canvas.getContext('2d');
  //       if (!ctx) return;

  //       const w_width = canvas.width;
  //       const h_height = canvas.height;

  //       // Dark feed color
  //       ctx.fillStyle = '#09090b';
  //       ctx.fillRect(0, 0, w_width, h_height);

  //       // Security grid scanline pattern
  //       ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  //       ctx.lineWidth = 1;
  //       for (let i = 0; i < w_width; i += 24) {
  //         ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h_height); ctx.stroke();
  //       }
  //       for (let i = 0; i < h_height; i += 24) {
  //         ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w_width, i); ctx.stroke();
  //       }

  //       let sim = simCache.current[camId];
  //       if (!sim) {
  //         // Initialize pseudo-random positions for this camera
  //         sim = {
  //           subjects: [
  //             { id: 'sub-1', x: 30 + Math.random() * 100, y: 30 + Math.random() * 100, dx: Math.random() > 0.5 ? 0.8 : -0.8, dy: Math.random() > 0.5 ? 0.4 : -0.4, w: 40, h: 55, label: "Person", isTarget: false },
  //             { id: 'target', x: 100 + Math.random() * 100, y: 100 + Math.random() * 100, dx: Math.random() > 0.5 ? 0.6 : -0.6, dy: Math.random() > 0.5 ? 0.3 : -0.3, w: 45, h: 60, label: "Target Lock", isTarget: Math.random() > 0.3 }
  //           ]
  //         };
  //         simCache.current[camId] = sim;
  //       }

  //       // Adjust dimensions based on mode
  //       let renderWModifier = 1;
  //       let renderHModifier = 1;
  //       let yOffset = 0;
        
  //       if (searchTrackingMode === 'face') {
  //         renderWModifier = 0.45;
  //         renderHModifier = 0.35;
  //         yOffset = -15; // Shift up to head area
  //       } else if (searchTrackingMode === 'hybrid') {
  //         renderWModifier = 0.8;
  //         renderHModifier = 0.8;
  //         yOffset = -5;
  //       }

  //       // Animate and draw subjects
  //       sim.subjects.forEach((sub) => {
  //         // Bounce coordinates
  //         sub.x += sub.dx;
  //         sub.y += sub.dy;

  //         if (sub.x <= 10 || sub.x + sub.w >= w_width - 10) sub.dx *= -1;
  //         if (sub.y <= 15 || sub.y + sub.h >= h_height - 15) sub.dy *= -1;

  //         const isTargetLock = sub.isTarget && selectedTarget;

  //         // Box color: RED for locked target, GREEN for general person
  //         ctx.strokeStyle = isTargetLock ? '#ef4444' : '#22c55e';
  //         ctx.lineWidth = isTargetLock ? 2 : 1;

  //         // Draw corner frames
  //         const sw = sub.w * renderWModifier;
  //         const sh = sub.h * renderHModifier;
  //         const x = sub.x + (sub.w - sw) / 2;
  //         const y = sub.y + yOffset;
  //         const cLen = searchTrackingMode === 'face' ? 6 : 10;

  //         ctx.beginPath();
  //         // TL
  //         ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y);
  //         // TR
  //         ctx.moveTo(x + sw - cLen, y); ctx.lineTo(x + sw, y); ctx.lineTo(x + sw, y + cLen);
  //         // BL
  //         ctx.moveTo(x, y + sh - cLen); ctx.lineTo(x, y + sh); ctx.lineTo(x + cLen, y + sh);
  //         // BR
  //         ctx.moveTo(x + sw - cLen, y + sh); ctx.lineTo(x + sw, y + sh); ctx.lineTo(x + sw, y + sh - cLen);
  //         ctx.stroke();

  //         // Render crosshair biometric dots
  //         ctx.fillStyle = isTargetLock ? '#ef4444' : '#22c55e';
  //         ctx.beginPath();
  //         ctx.arc(x + sw/2, y + sh/2, 2, 0, Math.PI * 2);
  //         ctx.fill();

  //         // Text overlay
  //         ctx.font = '8px monospace';
  //         const modeLabel = searchTrackingMode === 'face' ? 'FACE' : searchTrackingMode === 'hybrid' ? 'FUSION' : 'BODY';
  //         const label = isTargetLock 
  //           ? `[${modeLabel}_LOCK]: ${displayAlias.toUpperCase()} | ${searchSimilarityFeed[searchSimilarityFeed.length - 1]}%`
  //           : "UNTRACKED";
            
  //         ctx.fillText(label, x, y - 5);
  //       });

  //       // Camera labels
  //       const camInfo = cameras.find(c => c.id === camId);
  //       const name = camInfo?.name || camId;
        
  //       ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  //       ctx.font = '8px monospace';
  //       ctx.fillText(`CAM | ${name.toUpperCase()}`, 12, 20);
  //       ctx.fillText("INF_SPEED: 8.5ms", 12, 32);

  //       // Record blinking dot
  //       if (Math.floor(Date.now() / 500) % 2 === 0) {
  //         ctx.fillStyle = searchIsPlaying ? '#ef4444' : '#a1a1aa';
  //         ctx.beginPath();
  //         ctx.arc(w_width - 15, 17, 3, 0, Math.PI * 2);
  //         ctx.fill();
  //       }
  //     });

  //     animationRef.current = requestAnimationFrame(renderFeeds);
  //   };

  //   renderFeeds();

  //   return () => {
  //     if (animationRef.current) cancelAnimationFrame(animationRef.current);
  //   };
  // }, [searchIsPlaying, selectedTarget, searchSimilarityFeed, searchCameras, cameras, displayAlias]);

  // Log events relating to targets
  const targetSpecificEvents = selectedTarget 
    ? events.filter(e => e.targetId === selectedTarget.id || !e.targetId).slice(0, 10)
    : events.slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="Live Telemetry"
        title="Operations Overview"
        description="Real-time ReID pipeline status, camera mesh health, and biometric processing metrics from your FastAPI agent."
        actions={
          <div className="flex items-center gap-2">
            
            {/* Stream Controls Wrapper */}
            <div className="flex items-center gap-1 bg-[#0f172a] border border-[#1e293b] rounded-lg p-1 shadow-inner">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b] rounded-md transition-all cursor-pointer"
                title={isSidebarOpen ? "Hide Telemetry" : "Show Telemetry"}
              >
                {isSidebarOpen ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isSidebarOpen ? "Expand Grid" : "Show Stats"}
                </span>
              </button>

              {/* Vertical Divider */}
              <div className="h-4 w-[1px] bg-[#1e293b] my-auto mx-1" />

              <button
                onClick={() => setSearchIsPlaying(!searchIsPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b] rounded-md transition-all cursor-pointer"
              >
                {searchIsPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pause Streams</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resume Streams</span>
                  </>
                )}
              </button>
            </div>

            {/* Nodes Active / Grid Configuration Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>{searchCameras.length} Nodes Active</span>
              </button>

              {/* Dropdown Menu content */}
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-3">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">
                  Grid Configuration
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {cameras.length === 0 ? (
                    <div className="text-xs text-zinc-500 italic py-2">
                      No cameras registered.
                    </div>
                  ) : (
                    cameras.map((cam) => {
                      const isActive = searchCameras.includes(cam.id);
                      return (
                        <label
                          key={cam.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-[#1e293b] rounded-md cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {
                              if (isActive) {
                                setSearchCameras((prev) =>
                                  prev.filter((id) => id !== cam.id)
                                );
                              } else {
                                setSearchCameras((prev) => [...prev, cam.id]);
                              }
                            }}
                            className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer w-3.5 h-3.5"
                          />
                          <span className="text-xs font-medium text-zinc-300 truncate">
                            {cam.name || cam.id}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        }
      />

      <div className={cn("grid gap-8 items-start", isSidebarOpen ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1")}>
        {/* Left Side: Dynamic Camera Video Feeds Grid */}
        <div className={cn("space-y-4", isSidebarOpen ? "lg:col-span-8" : "w-full")}>
          {searchCameras.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-16 flex flex-col items-center justify-center text-zinc-600 select-none">
              <Tv className="w-12 h-12 mb-4 opacity-30" />
              <span className="font-semibold">No Cameras Active</span>
              <span className="text-xs mt-1">Use the "Nodes Active" menu to add camera feeds to the grid.</span>
            </div>
          ) : (
            <div className={cn("grid gap-4", searchCameras.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
              {searchCameras.map((camId) => {
                const camInfo = cameras.find(c => c.id === camId);
                const name = camInfo?.name || camId;
                return (
                  <div
                    key={camId}
                    className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-md relative group select-none"
                  >
                    {/* Stream Container */}
                    <div className="relative aspect-video bg-black">
                      <img
                        src={api.getStreamUrlForCamera(camId)}
                        alt={`Live stream from ${name}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />

                      {/* Corner Crosshairs */}
                      <div className="absolute inset-2 border border-white/[0.02] pointer-events-none" />
                    </div>

                    {/* Status Bar */}
                    <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                      <span className="font-bold text-white uppercase truncate pr-2">
                        {name}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>LIVE</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Core Event Logs inside Search page */}
          <div className="aegis-panel p-6 select-none">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Active Tracking Log (Target Isolated)</h3>
            </div>

            {/* Terminal Event Log Stream */}
            <div className="space-y-2 font-mono text-[11px] max-h-[140px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {targetSpecificEvents.length === 0 ? (
                <div className="text-zinc-600 italic p-1">No tracking events recorded yet.</div>
              ) : (
                targetSpecificEvents.map((evt) => {
                  const isLock = evt.eventType === 'lock';
                  const isLost = evt.eventType === 'lost';
                  
                  let colorClass = "text-zinc-400";
                  let badgeClass = "text-cyan-500/80";
                  let badge = "[DETC]";

                  if (isLock) {
                    colorClass = "text-zinc-200 font-medium";
                    badgeClass = "text-red-400 font-bold";
                    badge = "[LOCK]";
                  } else if (isLost) {
                    colorClass = "text-zinc-300";
                    badgeClass = "text-amber-400 font-bold";
                    badge = "[LOST]";
                  }

                  return (
                    <div 
                      key={evt.id} 
                      className="flex items-center justify-between p-1.5 hover:bg-white/[0.02] rounded border border-transparent hover:border-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Timestamp */}
                        <span className="text-zinc-600 shrink-0">{formatTime(evt.timestamp)}</span>
                        
                        {/* Event Cyber Badge */}
                        <span className={cn("shrink-0 tracking-wider", badgeClass)}>{badge}</span>
                        
                        {/* Event Payload Text */}
                        <span className={cn("truncate", colorClass)}>
                          {evt.eventType === 'lock' 
                            ? `ReID Confirmed: ${evt.targetAlias} at ${evt.source} | Similarity: ${Math.round((evt.similarityScore || 0)*100)}%`
                            : evt.eventType === 'lost'
                              ? `Visual anchor lost for ${evt.targetAlias} at ${evt.source}`
                              : `Anonymous capture track registered at ${evt.source}`}
                        </span>
                      </div>
                      
                      {/* Terminal Origin Node */}
                      <span className="text-zinc-500 shrink-0 font-bold uppercase text-[10px] pl-3">
                        {evt.source.split(' ')[0]}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Biometric Telemetry & Target Selector */}
        {isSidebarOpen && (
          <div className="lg:col-span-4 space-y-6">
          
          {/* Target Selector Card */}
          <div className="aegis-panel p-6 select-none">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Isolate Subject Signature</h3>
            </div>
            
            {/* Input Group */}
            <div className="space-y-1.5 text-sm">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Selected Identity
              </label>
              
              {/* Custom Dropdown Container */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === 'identity' ? null : 'identity')}
                  className="flex items-center gap-1.5 px-3 h-10 w-full border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-xl text-xs font-mono text-zinc-300 transition-colors cursor-pointer shadow-sm"
                >
                  <span className="text-[11px] text-zinc-500 font-medium shrink-0">Identity:</span>
                  <span className="text-[11px] font-semibold text-cyan-400 flex-1 text-left truncate">
                    {selectedTarget ? `${selectedTarget.alias} (${selectedTarget.id})` : 'Select Target...'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
                </button>

                {activeMenu === 'identity' && (
                  <>
                    {/* Click outside backdrop overlay */}
                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                    
                    {/* Options Menu Panel */}
                    <div className="absolute left-0 mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5">
                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 font-mono">
                        {targets.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { handleSelectTarget(t.id); setActiveMenu(null); }}
                            className={cn(
                              "flex w-full items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                              selectedTarget?.id === t.id 
                                ? "bg-zinc-900 text-cyan-400" 
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                            )}
                          >
                            <span className="truncate">{t.alias} <span className="text-[10px] text-zinc-500">({t.id})</span></span>
                            {selectedTarget?.id === t.id && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry Sidebar Details */}
          {selectedTarget ? (
            <div className="aegis-panel p-6 select-none space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4">
                <Radar className={cn(
                  "w-4 h-4", 
                  activeSearchIds.includes(selectedTarget.id) ? "text-red-400 animate-pulse" : "text-cyan-400"
                )} />
                <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Telemetry Analytics</h3>
              </div>
              
              {/* Target Info */}
              <div className="flex gap-4 items-center bg-zinc-950/40 p-3 rounded-xl border border-white/[0.02]">
                <AvatarCrop 
                  seed={parseInt(selectedTarget.id, 10) || 50} 
                  alias={selectedTarget.alias} 
                  status={activeSearchIds.includes(selectedTarget.id) ? 'tracked' : 'idle'} 
                  previewImagePath={selectedTarget.previewImagePath}
                  className="w-16 h-16 rounded-xl shrink-0 border border-zinc-800" 
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Active Target</span>
                  <span className="font-semibold text-sm text-zinc-100 block truncate mt-0.5">{selectedTarget.alias}</span>
                  <div className="flex gap-3 text-[10px] font-mono text-zinc-400 mt-1.5">
                    <span>ID: <span className="text-zinc-300">{selectedTarget.id}</span></span>
                    <span className="text-zinc-600">|</span>
                    <span>Embeddings: <span className="text-cyan-400">{selectedTarget.embeddingsCount}</span></span>
                  </div>
                </div>
              </div>

              {/* Real-time Similarity Chart Simulation */}
              <div className="border-t border-white/[0.06] pt-5 space-y-4">
                {/* Custom Dropdown Container */}
                <div className="flex justify-between items-center text-xs pb-3 border-b border-white/[0.04]">
                  <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider block">Tracking Heuristic</span>
                  
                  <div className="relative w-40">
                    <button 
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === 'heuristic' ? null : 'heuristic')}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-zinc-300 text-[10px] cursor-pointer w-full transition-colors hover:bg-zinc-900"
                    >
                      <span className="truncate font-semibold text-cyan-400">
                        {searchTrackingMode === 'person' && 'Full-Body ReID'}
                        {searchTrackingMode === 'face' && 'Face Biometrics'}
                        {searchTrackingMode === 'hybrid' && 'Hybrid Fusion'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-1.5" />
                    </button>

                    {activeMenu === 'heuristic' && (
                      <>
                        {/* Click outside backdrop overlay */}
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                        
                        {/* Options Menu Panel */}
                        <div className="absolute right-0 mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5">
                          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 font-mono text-[10px]">
                            {[
                              { value: 'person', label: 'Full-Body ReID' },
                              { value: 'face', label: 'Face Biometrics' },
                              { value: 'hybrid', label: 'Hybrid Fusion' }
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => { 
                                  setSearchTrackingMode(opt.value as 'face' | 'person' | 'hybrid'); 
                                  setActiveMenu(null); 
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between p-2 rounded-md font-medium transition-colors text-left cursor-pointer",
                                  searchTrackingMode === opt.value 
                                    ? "bg-zinc-900 text-cyan-400" 
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                                )}
                              >
                                <span className="truncate">{opt.label}</span>
                                {searchTrackingMode === opt.value && (
                                  <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)] shrink-0 ml-2" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Match Score Variance Stats Block */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-500 font-medium">Match Score Variance</span>
                  </div>
                  <span className="font-mono font-bold text-red-500">{searchSimilarityFeed[searchSimilarityFeed.length - 1]}% ReID</span>
                </div>
                {/* Sparkline Visualisation */}
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl h-24 flex items-end justify-between relative overflow-hidden">
                  {/* Grid Lines inside graph */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_16px] pointer-events-none" />
                  {/* Render sparkline bars */}
                  {searchSimilarityFeed.map((score, idx) => {
                    const normalizedHeight = ((score - 70) / 30) * 100;
                    const isActive = activeSearchIds.includes(selectedTarget.id);
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "w-3 rounded-t-xs transition-all duration-500 relative group",
                          !searchIsPlaying 
                            ? "bg-zinc-800" 
                            : isActive 
                              ? "bg-red-500/40 hover:bg-red-400" 
                              : "bg-cyan-500/40 hover:bg-cyan-400"
                        )}
                        style={{ height: `${Math.max(normalizedHeight, 15)}%` }}
                        title={`${score}%`}
                      />
                    );
                  })}
                  <div className="absolute top-2 left-3 flex font-mono text-[8px] text-zinc-600 uppercase tracking-widest pointer-events-none">
                    <span>Threshold: 85%</span>
                  </div>
                </div>
              </div>
              {/* Status Details & Actions */}
              <div className="border-t border-white/[0.06] pt-4 space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Search Status</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider",
                    activeSearchIds.includes(selectedTarget.id) 
                      ? "bg-red-950/40 text-red-400 border-red-900/50 animate-pulse" 
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  )}>
                    {activeSearchIds.includes(selectedTarget.id) ? 'CRIT_LOCK' : 'SYS_IDLE'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Confidence Threshold</span>
                  <span className="text-zinc-200 font-semibold">85% MIN</span>
                </div>

                {/* Control Toggle Button */}
                <div className="pt-2">
                  {activeSearchIds.includes(selectedTarget.id) ? (
                    <button
                      onClick={() => stopSearch(selectedTarget.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-xl text-xs font-semibold cursor-pointer border border-red-900/50 transition-colors font-mono uppercase tracking-wider"
                    >
                      <Radar className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      <span>Abort Active Search</span>
                    </button>
                  ) : ( 
                    <button
                      onClick={() => startSearch(selectedTarget.id, searchTrackingMode)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 rounded-xl text-xs font-bold cursor-pointer border-none transition-colors uppercase tracking-wider"
                    >
                      <Radar className="w-3.5 h-3.5 text-zinc-950" />
                      <span>Initialize Search</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aegis-panel p-8 text-center text-zinc-500 font-mono text-xs select-none">
              <EyeOff className="w-6 h-6 text-zinc-700 mx-auto mb-3" />
              <span>No target payload active. Select a node to begin stream.</span>
            </div>
          )}

      </div>)}
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
