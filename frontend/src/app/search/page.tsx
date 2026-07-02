"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Radar, 
  Tv, 
  Maximize2, 
  TrendingUp, 
  Activity, 
  Play, 
  Pause,
  EyeOff,
  ChevronDown,
  Cpu
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { useUi } from '../../providers/ui-provider';
import { AvatarCrop } from '../../components/ui/avatar-crop';
import { cn, formatTime } from '../../lib/utils';
import { Target } from '../../types';
import { PageHeader } from '../../components/layout/page-header';
import { api } from '../../services/api';

function getContainedViewport(containerWidth: number, containerHeight: number) {
  const contentWidth = 640;
  const contentHeight = 360;
  const scale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
    scaleX: width / contentWidth,
    scaleY: height / contentHeight,
  };
}

function CameraStreamNode({
  camId,
  name,
  matches,
  streamImgRef,
  canvasRef,
  searchIsPlaying,
  frozenFrame,
}: {
  camId: string;
  name: string;
  matches: any[];
  streamImgRef: React.RefObject<HTMLImageElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  searchIsPlaying: boolean;
  frozenFrame: string | null;
}) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    matches.forEach((match) => {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;

      const [x1, y1, x2, y2] = match.bbox;

      const viewport = getContainedViewport(width, height);
      const x = viewport.x + x1 * viewport.scaleX;
      const y = viewport.y + y1 * viewport.scaleY;
      const w = (x2 - x1) * viewport.scaleX;
      const h = (y2 - y1) * viewport.scaleY;

      const cornerLen = Math.min(14, w * 0.2, h * 0.2);

      ctx.beginPath();
      // Top-left
      ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y);
      // Top-right
      ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen);
      // Bottom-left
      ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h);
      // Bottom-right
      ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();

      // Label tag
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ef4444';
      const labelText = `[ TARGET: ${match.alias} | ${Math.round(match.similarity * 100)}% ]`;
      ctx.fillText(labelText, x, y - 6);
    });
  }, [matches]);

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-md relative group select-none">
      <div className="relative overflow-hidden aspect-video bg-black">
        <img ref={streamImgRef} crossOrigin="anonymous" src={api.getStreamUrlForCamera(camId)} alt={`Live stream from ${name}`} className="w-full h-full object-contain" draggable={false} />
        {!searchIsPlaying && frozenFrame && <img src={frozenFrame} alt="" className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full z-[5] pointer-events-none" />
        <div className="absolute inset-2 border border-white/[0.02] pointer-events-none" />
      </div>
      <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
        <span className="font-bold text-white uppercase truncate pr-2">{name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
}

function StreamPlaybackControls({
  searchIsPlaying,
  onToggle,
}: {
  searchIsPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b] rounded-md transition-all cursor-pointer"
    >
      {searchIsPlaying ? (
        <><Pause className="w-3.5 h-3.5" /><span className="hidden sm:inline">Pause Streams</span></>
      ) : (
        <><Play className="w-3.5 h-3.5" /><span className="hidden sm:inline">Resume Streams</span></>
      )}
    </button>
  );
}

function SearchTrackingPageContent() {
  const searchParams = useSearchParams();
  const targetQueryId = searchParams.get('targetId') || searchParams.get('target');
  const modeQuery = searchParams.get('mode') as 'person' | 'face' | 'hybrid' | null;

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
    searchTrackingMode,
    setSearchTrackingMode
  } = useTargets();
  const { addToast } = useUi();

  const [faceProfiles, setFaceProfiles] = useState<any[]>([]);
  const [searchIsPlaying, setSearchIsPlaying] = useState(true);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const streamImgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleStreamPlaybackToggle = () => {
    if (searchIsPlaying) {
      try {
        const img = streamImgRef.current;
        const canvas = canvasRef.current;
        if (img && canvas) {
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              setFrozenFrame(blobUrl);
            }
          }, 'image/jpeg');
        }
      } catch (error) {
        console.warn("CORS/Tainted Canvas fallback activated. Toggling visual freeze state only.", error);
      }
    } else {
      if (frozenFrame) URL.revokeObjectURL(frozenFrame);
      setFrozenFrame(null);
    }
    setSearchIsPlaying(!searchIsPlaying);
  };

  useEffect(() => {
    return () => {
      if (frozenFrame) URL.revokeObjectURL(frozenFrame);
    };
  }, [frozenFrame]);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch('/api/v1/faces');
        const json = await res.json();
        setFaceProfiles(json.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfiles();
  }, []);

  const [selectedPersonTarget, setSelectedPersonTarget] = useState<Target | null>(null);
  const [selectedFaceTarget, setSelectedFaceTarget] = useState<any | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    // Wait until we have targets to do the initialization, though if they are empty and finished loading we might not want to wait forever.
    // For simplicity, assuming if we have either we can try to initialize.
    if (targets.length === 0 && faceProfiles.length === 0) return;

    if (modeQuery) {
      setSearchTrackingMode(modeQuery);
    }

    let personTarget = null;
    let faceTarget = null;

    if (targetQueryId) {
      const pTarget = targets.find(t => t.id === targetQueryId);
      if (pTarget) personTarget = pTarget;
      
      const fTarget = faceProfiles.find(f => f.id === targetQueryId);
      if (fTarget) faceTarget = fTarget;
    }

    if (modeQuery === 'person' && personTarget) {
      setSelectedPersonTarget(personTarget);
      setActiveTargetId(personTarget.id);
      startSearch(personTarget.id, 'person');
      initRef.current = true;
    } else if (modeQuery === 'face' && faceTarget) {
      setSelectedFaceTarget(faceTarget);
      startSearch(faceTarget.id, 'face');
      initRef.current = true;
    } else {
      if (targets.length > 0 && !selectedPersonTarget) {
        setSelectedPersonTarget(targets[0]);
        setActiveTargetId(targets[0].id);
      }
      initRef.current = true;
    }
  }, [targetQueryId, modeQuery, targets, faceProfiles, startSearch, setActiveTargetId, setSearchTrackingMode, selectedPersonTarget]);

  // Derived active state
  const activeSelectedId = searchTrackingMode === 'face' ? selectedFaceTarget?.id : selectedPersonTarget?.id;
  const isSearching = activeSelectedId ? activeSearchIds.includes(activeSelectedId) : false;

  const [searchMatches, setSearchMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!isSearching) {
      setSearchMatches([]);
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await api.getSearchMatches();
        if (res.success) {
          setSearchMatches(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isSearching]);

  const displayAlias = searchTrackingMode === 'face' 
    ? selectedFaceTarget?.alias 
    : selectedPersonTarget?.alias;

  // When actively searching, show all events (they're all from the active search context).
  // When not searching, filter to events for the selected target (or untagged events).
  const targetSpecificEvents = isSearching
    ? events.slice(0, 10)
    : (selectedPersonTarget || selectedFaceTarget)
      ? events.filter(e => e.targetId === activeSelectedId || !e.targetId).slice(0, 10)
      : events.slice(0, 10);

  const handleSelectPerson = (t: Target) => {
    setSelectedPersonTarget(t);
    setActiveTargetId(t.id);
  };

  const handleSelectFace = (f: any) => {
    setSelectedFaceTarget(f);
  };

  const IdentitySelector = ({ label, selected, options, onSelect, menuKey }: any) => (
    <div className="space-y-1.5 text-sm">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
        {label}
      </label>
      <div className="relative">
        <button 
          type="button"
          onClick={() => setActiveMenu(activeMenu === menuKey ? null : menuKey)}
          className="flex items-center gap-1.5 px-3 h-10 w-full border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-xl text-xs font-mono text-zinc-300 transition-colors cursor-pointer shadow-sm"
        >
          <span className="text-[11px] text-zinc-500 font-medium shrink-0">Identity:</span>
          <span className="text-[11px] font-semibold text-cyan-400 flex-1 text-left truncate">
            {selected ? `${selected.alias} (${selected.id})` : 'Select Target...'}
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
        </button>

        {activeMenu === menuKey && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
            <div className="absolute left-0 mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5">
              <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 font-mono">
                {options.length === 0 && (
                  <div className="text-xs text-zinc-500 p-2 italic">No profiles found</div>
                )}
                {options.map((opt: any) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onSelect(opt); setActiveMenu(null); }}
                    className={cn(
                      "flex w-full items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                      selected?.id === opt.id 
                        ? "bg-zinc-900 text-cyan-400" 
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                    )}
                  >
                    <span className="truncate">{opt.alias} <span className="text-[10px] text-zinc-500">({opt.id})</span></span>
                    {selected?.id === opt.id && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="Live Telemetry"
        title="Operations Overview"
        description="Real-time ReID pipeline status, camera mesh health, and biometric processing metrics from your FastAPI agent."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0f172a] border border-[#1e293b] rounded-lg p-1 shadow-inner">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b] rounded-md transition-all cursor-pointer"
                title={isSidebarOpen ? "Hide Telemetry" : "Show Telemetry"}
              >
                {isSidebarOpen ? <Maximize2 className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isSidebarOpen ? "Expand Grid" : "Show Stats"}</span>
              </button>
              <div className="h-4 w-[1px] bg-[#1e293b] my-auto mx-1" />
              <StreamPlaybackControls searchIsPlaying={searchIsPlaying} onToggle={handleStreamPlaybackToggle} />
            </div>

            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>{searchCameras.length} Nodes Active</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-3">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">Grid Configuration</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {cameras.length === 0 ? (
                    <div className="text-xs text-zinc-500 italic py-2">No cameras registered.</div>
                  ) : (
                    cameras.map((cam) => {
                      const isActive = searchCameras.includes(cam.id);
                      return (
                        <label key={cam.id} className="flex items-center gap-2 p-1.5 hover:bg-[#1e293b] rounded-md cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {
                              if (isActive) setSearchCameras(prev => prev.filter(id => id !== cam.id));
                              else setSearchCameras(prev => [...prev, cam.id]);
                            }}
                            className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer w-3.5 h-3.5"
                          />
                          <span className="text-xs font-medium text-zinc-300 truncate">{cam.name || cam.id}</span>
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
                const matches = searchMatches.filter(m => m.camera_id === camId);
                return (
                  <CameraStreamNode
                    key={camId}
                    camId={camId}
                    name={name}
                    matches={matches}
                    streamImgRef={streamImgRef}
                    canvasRef={canvasRef}
                    searchIsPlaying={searchIsPlaying}
                    frozenFrame={frozenFrame}
                  />
                );
              })}
            </div>
          )}

          <div className="aegis-panel p-6 select-none">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Active Tracking Log (Target Isolated)</h3>
            </div>
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
                    <div key={evt.id} className="flex items-center justify-between p-1.5 hover:bg-white/[0.02] rounded border border-transparent hover:border-white/[0.04] transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-zinc-600 shrink-0">{formatTime(evt.timestamp)}</span>
                        <span className={cn("shrink-0 tracking-wider", badgeClass)}>{badge}</span>
                        <span className={cn("truncate", colorClass)}>
                          {evt.eventType === 'lock' 
                            ? `ReID Confirmed: ${evt.targetAlias || 'Target'} at ${evt.source}` + (evt.similarityScore ? ` | Similarity: ${Math.round(evt.similarityScore * 100)}%` : '')
                            : evt.eventType === 'lost'
                              ? `Visual anchor lost for ${evt.targetAlias || 'Target'} at ${evt.source}`
                              : '' /* Removed the generic 'Anonymous capture' default completely */}
                        </span>
                      </div>
                      <span className="text-zinc-500 shrink-0 font-bold uppercase text-[10px] pl-3">
                        {evt.source?.split(' ')[0] ?? ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {isSidebarOpen && (
          <div className="lg:col-span-4 space-y-6">
            <div className="aegis-panel p-6 select-none">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Isolate Subject Signature</h3>
              </div>
              
              <div className="space-y-1.5 text-sm mb-5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tracking Heuristic</label>
                <div className="relative">
                    <button 
                        type="button"
                        onClick={() => setActiveMenu(activeMenu === 'heuristic' ? null : 'heuristic')}
                        className="flex items-center gap-1.5 px-3 h-10 w-full border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 rounded-xl text-xs font-mono text-zinc-300 transition-colors cursor-pointer shadow-sm"
                    >
                        <span className="text-[11px] font-semibold text-cyan-400 flex-1 text-left truncate">
                        {searchTrackingMode === 'person' && 'Full-Body ReID'}
                        {searchTrackingMode === 'face' && 'Face Biometrics'}
                        {searchTrackingMode === 'hybrid' && 'Hybrid Fusion'}
                        </span>
                        <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
                    </button>

                    {activeMenu === 'heuristic' && (
                        <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                        <div className="absolute left-0 mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5">
                            <div className="space-y-0.5 font-mono text-[10px]">
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

              <div className="space-y-3">
                {searchTrackingMode === 'person' && (
                  <IdentitySelector label="Select Person Identity" selected={selectedPersonTarget} options={targets} onSelect={handleSelectPerson} menuKey="person-ident" />
                )}
                {searchTrackingMode === 'face' && (
                  <IdentitySelector label="Select Face Identity" selected={selectedFaceTarget} options={faceProfiles} onSelect={handleSelectFace} menuKey="face-ident" />
                )}
                {searchTrackingMode === 'hybrid' && (
                  <>
                    <IdentitySelector label="Select Person Identity" selected={selectedPersonTarget} options={targets} onSelect={handleSelectPerson} menuKey="person-ident" />
                    <IdentitySelector label="Select Face Identity" selected={selectedFaceTarget} options={faceProfiles} onSelect={handleSelectFace} menuKey="face-ident" />
                  </>
                )}
              </div>
            </div>

            {(selectedPersonTarget || selectedFaceTarget) ? (
              <div className="aegis-panel p-6 select-none space-y-6">
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4">
                  <Radar className={cn("w-4 h-4", isSearching ? "text-red-400 animate-pulse" : "text-cyan-400")} />
                  <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Telemetry Analytics</h3>
                </div>
                
                {searchTrackingMode === 'person' && selectedPersonTarget && (
                  <div className="flex gap-4 items-center bg-zinc-950/40 p-3 rounded-xl border border-white/[0.02]">
                    <AvatarCrop seed={parseInt(selectedPersonTarget.id, 10) || 50} alias={selectedPersonTarget.alias} status={isSearching ? 'tracked' : 'idle'} previewImagePath={selectedPersonTarget.previewImagePath} className="w-16 h-16 rounded-xl shrink-0 border border-zinc-800" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Active Person Target</span>
                      <span className="font-semibold text-sm text-zinc-100 block truncate mt-0.5">{selectedPersonTarget.alias}</span>
                      <div className="flex gap-3 text-[10px] font-mono text-zinc-400 mt-1.5">
                        <span>ID: <span className="text-zinc-300">{selectedPersonTarget.id}</span></span>
                      </div>
                    </div>
                  </div>
                )}

                {searchTrackingMode === 'face' && selectedFaceTarget && (
                  <div className="flex gap-4 items-center bg-zinc-950/40 p-3 rounded-xl border border-white/[0.02]">
                    <AvatarCrop seed={parseInt(selectedFaceTarget.id, 10) || 100} alias={selectedFaceTarget.alias} status={isSearching ? 'tracked' : 'idle'} className="w-16 h-16 rounded-xl shrink-0 border border-zinc-800" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Active Face Target</span>
                      <span className="font-semibold text-sm text-zinc-100 block truncate mt-0.5">{selectedFaceTarget.alias}</span>
                      <div className="flex gap-3 text-[10px] font-mono text-zinc-400 mt-1.5">
                        <span>ID: <span className="text-zinc-300">{selectedFaceTarget.id}</span></span>
                      </div>
                    </div>
                  </div>
                )}

                {searchTrackingMode === 'hybrid' && (
                  <div className="space-y-2">
                    {selectedPersonTarget && (
                      <div className="flex gap-4 items-center bg-zinc-950/40 p-2 rounded-xl border border-white/[0.02]">
                        <AvatarCrop seed={parseInt(selectedPersonTarget.id, 10) || 50} alias={selectedPersonTarget.alias} status={isSearching ? 'tracked' : 'idle'} previewImagePath={selectedPersonTarget.previewImagePath} className="w-10 h-10 rounded-xl shrink-0 border border-zinc-800" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-xs text-zinc-100 block truncate mt-0.5">{selectedPersonTarget.alias} (Person)</span>
                        </div>
                      </div>
                    )}
                    {selectedFaceTarget && (
                      <div className="flex gap-4 items-center bg-zinc-950/40 p-2 rounded-xl border border-white/[0.02]">
                        <AvatarCrop seed={parseInt(selectedFaceTarget.id, 10) || 100} alias={selectedFaceTarget.alias} status={isSearching ? 'tracked' : 'idle'} className="w-10 h-10 rounded-xl shrink-0 border border-zinc-800" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-xs text-zinc-100 block truncate mt-0.5">{selectedFaceTarget.alias} (Face)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-white/[0.06] pt-5 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-zinc-500 font-medium">Match Score Variance</span>
                    </div>
                    <span className="font-mono font-bold text-red-500">{searchSimilarityFeed[searchSimilarityFeed.length - 1]}% ReID</span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl h-24 flex items-end justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_16px] pointer-events-none" />
                    {searchSimilarityFeed.map((score, idx) => {
                      const normalizedHeight = ((score - 70) / 30) * 100;
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "w-3 rounded-t-xs transition-all duration-500 relative group",
                            !searchIsPlaying ? "bg-zinc-800" : isSearching ? "bg-red-500/40 hover:bg-red-400" : "bg-cyan-500/40 hover:bg-cyan-400"
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

                <div className="border-t border-white/[0.06] pt-4 space-y-4 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Search Status</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider",
                      isSearching ? "bg-red-950/40 text-red-400 border-red-900/50 animate-pulse" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    )}>
                      {isSearching ? 'CRIT_LOCK' : 'SYS_IDLE'}
                    </span>
                  </div>

                  <div className="pt-2">
                    {searchTrackingMode === 'hybrid' ? (
                      <div className="w-full text-center text-zinc-500 font-mono text-[10px] p-3 border border-zinc-800 rounded bg-zinc-900/50">
                        Hybrid backend support not yet implemented.
                      </div>
                    ) : isSearching ? (
                      <button
                        onClick={() => stopSearch(activeSelectedId as string)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-xl text-xs font-semibold cursor-pointer border border-red-900/50 transition-colors font-mono uppercase tracking-wider"
                      >
                        <Radar className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                        <span>Abort Active Search</span>
                      </button>
                    ) : ( 
                      <button
                        onClick={() => startSearch(activeSelectedId as string, searchTrackingMode)}
                        disabled={!activeSelectedId}
                        className={cn("w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider border-none", activeSelectedId ? "bg-cyan-500 hover:bg-cyan-600 text-zinc-950 cursor-pointer" : "bg-zinc-800 text-zinc-600 cursor-not-allowed")}
                      >
                        <Radar className="w-3.5 h-3.5 text-inherit" />
                        <span>Initialize Search</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
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
