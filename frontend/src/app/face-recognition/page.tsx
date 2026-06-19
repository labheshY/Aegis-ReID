"use client";

import React, { useRef, useState, useEffect } from 'react';
import CameraSelector from '../../components/ui/camera-selector';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../services/api';
import { useUi } from '../../providers/ui-provider';
import { PageHeader } from '../../components/layout/page-header';
import { cn } from '../../lib/utils';
import { 
Database,
Loader2,
UploadCloud,
X,
Camera,
VideoOff,
Aperture,
ShieldAlert,
User,
Trash2
} from 'lucide-react';

export default function FaceRecognitionPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [alias, setAlias] = useState('');
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [flashAlert, setFlashAlert] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const { addToast } = useUi();
  // 1. Core mode toggle selection state ('upload' vs 'capture')
  const [enrollmentMode, setEnrollmentMode] = useState<'upload' | 'capture'>('capture');

  // 2. 5-Point biometric angle tracking suite
  const biometricSteps = [
    { id: 'front', label: 'Frontal Scan' },
    { id: 'left', label: 'Left Profile' },
    { id: 'right', label: 'Right Profile' },
    { id: 'up', label: 'Tilt Up' },
    { id: 'down', label: 'Tilt Down' }
  ];
  const [currentStepIdx, setCurrentStepIdx] = useState(0); // tracks 0 to 4
  const [capturedAngles, setCapturedAngles] = useState<Record<string, string>>({}); // stores transient preview strings

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Start local webcam when no camera or an explicit offline node is targeted
  useEffect(() => {
    let mounted = true;

    async function startLocal() {
      // MODIFIED: If a camera is selected or explicitly set to 'off', bypass initialization
      if (selectedCamera && selectedCamera !== '') return;
      
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = s;
        if (!mounted) return;
        const v = videoRef.current;
        if (v) v.srcObject = s;
      } catch (err) {
        console.warn('Local camera unavailable', err);
      }
    }

    startLocal();

    // CLEANUP RUNTIME ENGINE: Fires instantly when selectedCamera drops to 'off' or unmounts
    return () => {
      mounted = false;
      try {
        if (localStreamRef.current) {
          // Scans and stops every physical hardware track to turn off the webcam light
          localStreamRef.current.getTracks().forEach((t) => {
            t.stop();
            t.enabled = false; // Force-locks the hardware shutter closed
          });
          localStreamRef.current = null;
        }
        
        // Secondary safety check: Wipe the HTML source object element directly
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      } catch (e) {
        console.error("Stream shutdown intercept failed:", e);
      }
    };
  }, [selectedCamera]); // Monitors state changes to cycle power smoothly


  useEffect(() => {
    // If the operator selects the 'off' node, shut down hardware lenses instantly
    if (!selectedCamera || selectedCamera === 'off') {
      
      // 1. Scan the native video element, stop the tracks, and cut hardware power
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => {
            track.stop();         // Kills the physical power line to the webcam lens
            track.enabled = false; // Locks the digital frame shutter closed
          });
        }
        videoRef.current.srcObject = null; // Clear out the source object reference
      }

      // 2. Also check and clear your active stream pointer if you initialized one
      if (activeStreamRef?.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
    }
  }, [selectedCamera]); // Fires cleanly every time the dropdown is changed

  const handleModeChange = (mode: 'upload' | 'capture') => {
    setEnrollmentMode(mode);

    if (mode === 'upload') {
      // Shuts down hardware streams by pushing the explicit 'off' node parameter
      setSelectedCamera('off');
      setCurrentStepIdx(0);
      setFlashAlert(false);
    } else if (mode === 'capture') {
      // --- FEATURE ADDITION: RESET COMPONENT VALUE STATE INTO VACANT STRINGS ---
      // This forces your startLocal() useEffect to fire up your physical webcam lens immediately
      setSelectedCamera('');
      setCurrentStepIdx(0); // Optional: sets biometric steps back to point 1 on fresh mount
    }
  };

  async function fetchProfiles() {
    try {
      const res = await fetch('/api/v1/faces');
      const json = await res.json();
      setProfiles(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function uploadSingle() {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('alias', alias || file.name);
      const res = await fetch('/api/v1/faces/enroll/single', { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) {
        await fetchProfiles();
        addToast({ title: 'Enrollment successful', description: `Profile ${json.data.id} created`, type: 'success' });
      } else {
        addToast({ title: 'Enrollment failed', description: String(json?.detail || json), type: 'error' });
      }
    } catch (err) {
      addToast({ title: 'Enrollment error', description: String(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function captureFromStream() {
    setLoading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!selectedCamera) {
        // use local webcam video
        const v = videoRef.current;
        if (!v) throw new Error('No local video');
        canvas.width = v.videoWidth || 640;
        canvas.height = v.videoHeight || 360;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      } else {
        const img = imgRef.current;
        if (!img) throw new Error('No image stream');
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 360;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg'));
      if (!blob) throw new Error('Capture failed');
      const form = new FormData();
      form.append('file', blob, 'capture.jpg');
      form.append('alias', alias || `capture-${Date.now()}`);
      const res = await fetch('/api/v1/faces/enroll/single', { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) {
        await fetchProfiles();
        addToast({ title: 'Enrollment successful', description: `Profile ${json.data.id} created`, type: 'success' });
      } else {
        addToast({ title: 'Enrollment failed', description: String(json?.detail || json), type: 'error' });
      }
    } catch (err) {
      addToast({ title: 'Enrollment error', description: String(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="FACE ENROLLMENT"
        title="Facial Identity Registration"
        description="Enroll faces by uploading an image or capturing from a live camera feed."
      />
      {/* 1. REGISTRY INTAKE MODE SELECTOR SWITCH */}
      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 max-w-sm">
        <button
          type="button"
          onClick={() => handleModeChange('capture')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer",
            enrollmentMode === 'capture'
              ? "bg-cyan-500 text-zinc-950 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Live Camera Scan
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('upload')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer",
            enrollmentMode === 'upload'
              ? "bg-cyan-500 text-zinc-950 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Static File Upload
        </button>
      </div>

      {/* MAIN INTAKE TARGETING ROW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* ========================================================
            COLUMN A (1/3): FILE PAYLOAD ENROLLMENT MODULE
            ======================================================== */}
        <div className={cn("lg:col-span-1 transition-all duration-300", enrollmentMode !== 'upload' && "opacity-30 pointer-events-none filter grayscale saturate-50")}>
          <div className="aegis-panel p-6 h-full flex flex-col justify-between select-none">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-5">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Enroll Target Image</h3>
            </div>

            <div className="space-y-4 text-sm flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Source Image Payload</label>
                  <label 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault(); setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all font-mono text-xs duration-200 min-h-[120px]",
                      isDragging 
                        ? "border-cyan-400 bg-cyan-500/10 text-cyan-300 scale-[0.99]" 
                        : file ? "border-cyan-500/40 bg-cyan-950/10 text-cyan-400" : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-500"
                    )}
                  >
                    <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="hidden" />
                    {file ? (
                      <div className="space-y-1 w-full truncate px-2">
                        <span className="font-bold block text-[10px] uppercase text-cyan-500">Payload Staged</span>
                        <span className="block truncate text-zinc-300">{file.name}</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5 mb-1.5 opacity-60" />
                        <span>Drop image or click to browse</span>
                      </>
                    )}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Subject Alias</label>
                  <input 
                    type="text" placeholder="e.g. UNKNOWN-01 (Optional)" value={alias} onChange={(e) => setAlias(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl outline-none font-mono text-zinc-300 text-xs placeholder:text-zinc-700 focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 mt-auto">
                {file && !loading && (
                  <button
                    type="button" onClick={() => { setFile(null); setAlias(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider font-mono cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button" disabled={loading || !file} onClick={uploadSingle}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-mono border-none shadow-sm",
                    loading || !file ? "bg-zinc-900 text-zinc-600 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-600 text-zinc-950 cursor-pointer"
                  )}
                >
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Syncing...</span></> : <><Database className="w-3.5 h-3.5" /><span>Enroll Sig</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN B (2/3): MULTI-ANGLE LIVE CAMERA SCAN BIOMETRIC FIELD
            ======================================================== */}
        <div className={cn("lg:col-span-2 transition-all duration-300", enrollmentMode !== 'capture' && "opacity-30 pointer-events-none filter grayscale saturate-50")}>
          <div className="aegis-panel p-6 h-full flex flex-col justify-between select-none">
            
            {/* INLINE ROW ARRANGEMENT: Left text, Right side shrunken drop down */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4 gap-4">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Biometric Stream Core</h3>
              </div>
              
              <div className="flex items-center gap-2">
                {/* FIXED STATUS BADGE: Shows LIVE when empty (local webcam) or when an external camera is picked */}
                <span className={cn(
                  "text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors",
                  selectedCamera === 'off'
                    ? "bg-red-950/40 text-red-400 border-red-900/40"
                    : "bg-cyan-950/40 text-cyan-400 border-cyan-900/40 animate-pulse" // Added a soft pulsing beacon glow for live feeds
                )}>
                  {selectedCamera === 'off' ? 'OFFLINE' : 'LIVE'}
                </span>
                <div className="w-44 max-w-xs scale-95 origin-right pointer-events-auto">
                  <CameraSelector value={selectedCamera} onChange={setSelectedCamera} />
                </div>
              </div>
            </div>

            {/* 5-STEP ORIENTATION PIPELINE INTERACTIVE TRACKER BAR */}
            <div className="grid grid-cols-5 gap-2 mb-4 font-mono text-[9px]">
              {biometricSteps.map((step, idx) => {
                const isCompleted = idx < currentStepIdx;
                const isActive = idx === currentStepIdx;
                return (
                  <div 
                    key={step.id}
                    className={cn(
                      "border p-2 rounded-lg transition-all flex flex-col justify-between h-14",
                      isCompleted ? "border-emerald-900/60 bg-emerald-950/10 text-emerald-400" :
                      isActive ? "border-cyan-500/40 bg-cyan-950/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.05)]" :
                      "border-zinc-900 bg-zinc-950/30 text-zinc-600"
                    )}
                  >
                    <span className="font-bold block uppercase truncate">{step.label}</span>
                    <span className="block text-right text-[8px] opacity-70">
                      {isCompleted ? "✓ DONE" : isActive ? "▶ READY" : "STDBY"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 text-sm flex-1 flex flex-col justify-between">
              {/* Video Matrix Feed Viewport - Changed from aspect-[16/9] to aspect-[4/3] to reduce width */}
              <div className="aspect-[4/3] md:max-h-[220px] bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden relative group mx-auto w-full max-w-md">
                {/* Aesthetic HUD Overlay Tracking Info */}
                <div className="absolute top-2 left-3 flex font-mono text-[8px] text-zinc-500 uppercase tracking-widest pointer-events-none z-10 gap-2 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>SCANNING_VECTOR // LIVE_STREAM</span>
                </div>

                {/* Guide overlay telling the person which way to look */}
                <div className="absolute inset-x-0 bottom-3 text-center z-10 pointer-events-none px-4">
                  <span className="bg-zinc-950/90 border border-cyan-500/30 px-2.5 py-1 rounded-md text-[9px] font-mono text-cyan-400 uppercase tracking-widest block truncate">
                    Position Face: [ {biometricSteps[currentStepIdx]?.label} ]
                  </span>
                </div>

                {enrollmentMode === 'capture' && (
                  selectedCamera ? (
                    <img 
                      ref={imgRef} 
                      src={api.getStreamUrlForCamera(selectedCamera)} 
                      alt="live stream" 
                      className="w-full h-full object-cover opacity-85 brightness-95" 
                    />
                  ) : (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover opacity-80" 
                    />
                  )
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* Subject Configuration Details & Buttons */}
              <div className="flex items-end gap-4 mt-auto pt-2">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Subject Name Signature
                    </label>
                    {currentStepIdx === 5 && !alias.trim() && (
                      <span className="text-[8px] font-mono text-red-400 uppercase tracking-tight animate-pulse">
                        * Required to embed
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder={currentStepIdx === 5 ? "Alias required for database..." : "e.g. VISITOR-X (Optional during scans)"} 
                    value={alias} 
                    onChange={(e) => {
                      setAlias(e.target.value);
                      if (e.target.value.trim()) setFlashAlert(false); // Clear flash when user starts typing
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 bg-zinc-950 border rounded-lg outline-none font-mono text-zinc-300 text-xs transition-all duration-200 pointer-events-auto",
                      flashAlert && !alias.trim()
                        ? "border-red-500 bg-red-950/20 text-red-200 animate-pulse ring-1 ring-red-500/30"
                        : currentStepIdx === 5 && !alias.trim()
                          ? "border-amber-500/40 focus:border-amber-400" 
                          : "border-zinc-800 focus:border-cyan-500/50"
                    )}
                  />
                </div>

                {/* High Precision Action Buttons */}
                <div className="flex gap-2 shrink-0 pointer-events-auto">
                  {currentStepIdx > 0 && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setCurrentStepIdx(prev => Math.max(0, prev - 1));
                        setFlashAlert(false);
                      }}
                      className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors cursor-pointer h-[30px]"
                    >
                      Back
                    </button>
                  )}
                  
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (currentStepIdx < 5) {
                        // Normal capture cycle (Captures 1 to 5)
                        setCurrentStepIdx(prev => prev + 1);
                      } else {
                        // Final Core Processing Block (Triggered when clicking "Create Embedding")
                        if (!alias.trim()) {
                          setFlashAlert(true); // Fire the warning animations
                          
                          // Subtle timeout ensures the alert modal doesn't immediately freeze the screen before the frame renders the flash color change
                          setTimeout(() => {
                            alert("⚠️ HARD LOCKOUT: Subject Name Signature is mandatory to compile and write biometric embeddings to the database grid.");
                          }, 50);
                          return;
                        }

                        // Validation Passed -> Clear flash, trigger mock embedding generation
                        setFlashAlert(false);
                        setLoading(true);
                        
                        setTimeout(() => {
                          setLoading(false);
                          setCurrentStepIdx(0); // Reset whole lifecycle back to snapshot 1
                          setAlias('');
                          
                          if (typeof setProfiles === 'function') {
                            setProfiles(prev => [
                              ...prev,
                              { id: `ID-${Math.floor(1000 + Math.random() * 9000)}`, alias: alias, method: "live" }
                            ]);
                          }
                        }, 1500);
                      }
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border-none transition-all shadow-sm h-[30px] flex items-center gap-1.5 select-none",
                      loading
                        ? "bg-zinc-900 text-zinc-600 cursor-not-allowed" 
                        : flashAlert && !alias.trim()
                          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" // Flashes red alert if clicked when empty
                          : currentStepIdx === 5 && !alias.trim()
                            ? "bg-amber-500 hover:bg-amber-600 text-zinc-950 cursor-pointer" // Changes to warning amber color on step 5 if empty
                            : "bg-cyan-500 hover:bg-cyan-600 text-zinc-950 cursor-pointer"
                    )}
                  >
                    <Aperture className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    <span>
                      {loading 
                        ? "Generating Vectors..." 
                        : currentStepIdx === 5 
                          ? "Create Embedding" 
                          : `Capture (${currentStepIdx + 1}/5)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
);
}
