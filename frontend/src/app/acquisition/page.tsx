"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
 ScanFace, 
 Play, 
 Camera, 
 RotateCcw, 
 UserPlus, 
 CheckCircle2, 
 Activity,
 Maximize2
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { AvatarCrop } from '../../components/ui/avatar-crop';
import CameraSelector from '../../components/ui/camera-selector';
import { cn } from '../../lib/utils'; 
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function TargetAcquisitionPage() {
 const router = useRouter();
 const { refreshTargets } = useTargets();
 
 // Acquisition States: 'idle' | 'selecting' | 'collecting' | 'completed'
 const [step, setStep] = useState<'idle' | 'selecting' | 'collecting' | 'completed'>('idle');
 const [tracks, setTracks] = useState<any[]>([]);
 const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

 // Forms
 const [alias, setAlias] = useState('');
 const [gender, setGender] = useState('Male');
 const [age, setAge] = useState('20-30');
 const [clothingUpper, setClothingUpper] = useState('');
 const [clothingLower, setClothingLower] = useState('');
 const [notes, setNotes] = useState('');
 
 // Simulation Progress
 const [progress, setProgress] = useState(0);
 const [progressStatus, setProgressStatus] = useState('');
 const [acquiredTargetId, setAcquiredTargetId] = useState<string | null>(null);
 const [acquiredSeed, setAcquiredSeed] = useState(50);
 
 // Canvas-based Camera Feed Ref
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const imageRef = useRef<HTMLImageElement>(null);
 const videoRef = useRef<HTMLVideoElement>(null);
 const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
 const [selectedCameraName, setSelectedCameraName] = useState<string | null>(null);
 const [availableCameras, setAvailableCameras] = useState<any[]>([]);

 useEffect(() => {
   return () => {
     api.setRuntimeMode('idle').catch(() => {});
   };
 }, []);

 // start local webcam when no camera selected
 useEffect(() => {
   let mounted = true;
   async function startLocal() {
     if (selectedCamera) return;
     try {
       const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
       if (!mounted) return;
       const v = videoRef.current;
       if (v) v.srcObject = s;
     } catch (err) {
       console.warn('Local camera unavailable', err);
     }
   }
   startLocal();
   return () => {
     mounted = false;
     try {
       const v = videoRef.current;
       const s = v?.srcObject as MediaStream | undefined;
       s?.getTracks().forEach((t) => t.stop());
       if (v) v.srcObject = null;
     } catch (e) {}
   };
 }, [selectedCamera]);

 useEffect(() => {
   let mounted = true;
   api.getCameras().then((list) => { if (!mounted) return; setAvailableCameras(list); });
   return () => { mounted = false; };
 }, []);

 useEffect(() => {
   if (!selectedCamera) {
     setSelectedCameraName(null);
     return;
   }
   const cam = availableCameras.find((c) => c.id === selectedCamera);
   setSelectedCameraName(cam ? cam.name : selectedCamera);
 }, [selectedCamera, availableCameras]);

 useEffect(() => {
   const loadTracks = async () => {
     try {
       const result = await api.getActiveTracks();
       setTracks(
         Object.entries(result.data).map(([id, track]: any) => ({
           id,
           ...track,
         }))
       );
     } catch (err) {
       console.error(err);
     }
   };
   loadTracks();
   const interval = setInterval(loadTracks, 1000);
   return () => clearInterval(interval);
 }, []);

 // Live feed canvas rendering loop
 useEffect(() => {
   const canvas = canvasRef.current;
   if (!canvas) return;
   const ctx = canvas.getContext('2d');
   if (!ctx) return;
   
   // Set canvas render-buffer width/height to match its display layout size once
   const rect = canvas.getBoundingClientRect();
   if (canvas.width !== rect.width || canvas.height !== rect.height) {
     canvas.width = rect.width;
     canvas.height = rect.height;
   }
   
   const width = canvas.width;
   const height = canvas.height;
   let animationFrameId: number;

   const render = () => {
     ctx.clearRect(0, 0, width, height);

     // Draw crosshairs center
     ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
     ctx.beginPath();
     ctx.arc(width / 2, height / 2, 40, 0, Math.PI * 2);
     ctx.stroke();

     tracks.forEach((track) => {
       const isSelected = selectedTrackId === String(track.id);
       
       // Render bounding box
       ctx.strokeStyle = isSelected ? '#ef4444' : 'rgba(34, 197, 94, 0.6)';
       ctx.lineWidth = isSelected ? 2 : 1.5;
       
       const [x1, y1, x2, y2] = track.bbox;
       
       // Coordinate Scaling Factors (Mapping 640x360 backend stream bounds to dynamic Canvas layout)
       const scaleX = width / 640;
       const scaleY = height / 360;
       
       const x = x1 * scaleX;
       const y = y1 * scaleY;
       const w = (x2 - x1) * scaleX;
       const h = (y2 - y1) * scaleY;
       
       // Draw partial bounding corners for high-tech aesthetic
       const cornerLen = 14;
       
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

       // Draw facial scanning mesh line inside the box
       if (isSelected) {
         ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
         ctx.beginPath();
         ctx.moveTo(x, y + (h / 2) + Math.sin(Date.now() / 150) * (h / 2));
         ctx.lineTo(x + w, y + (h / 2) + Math.sin(Date.now() / 150) * (h / 2));
         ctx.stroke();
       }

       // Render crosshair biometric dots on centers
       ctx.fillStyle = isSelected ? '#ef4444' : '#22c55e';
       ctx.beginPath();
       ctx.arc(x + w / 2, y + h / 2, 2.5, 0, Math.PI * 2);
       ctx.fill();

       // Label tag
       ctx.font = '9px monospace';
       ctx.fillStyle = isSelected ? '#ef4444' : '#22c55e';
       const labelText = isSelected ? `[ LOCKED: ID ${track.id} ]` : `ID ${track.id}`;
       ctx.fillText(labelText, x, y - 6);
     });

     // Camera overlay markings
     ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
     ctx.font = '10px monospace';
     ctx.fillText("CAM-01 [ACTIVE_FEED]", 20, 30);
     ctx.fillText("FPS: 30.0", 20, 45);
     
     // Timestamp
     ctx.fillText(new Date().toLocaleTimeString(), width - 100, 30);
     
     // Pulse record dot
     if (Math.floor(Date.now() / 600) % 2 === 0) {
       ctx.fillStyle = '#ef4444';
       ctx.beginPath();
       ctx.arc(width - 120, 26, 4, 0, Math.PI * 2);
       ctx.fill();
     }

     animationFrameId = requestAnimationFrame(render);
   };

   render();

   return () => {
     cancelAnimationFrame(animationFrameId);
   };
 }, [tracks, selectedTrackId]);

 // Click on stream to capture a backend track by point
 const handleStreamClick = (e: React.MouseEvent<HTMLCanvasElement>) => { 
   if (step === "collecting" || step === "completed") return;
   const canvas = canvasRef.current;
   if (!canvas) return;

   const rect = canvas.getBoundingClientRect();
   
   // Normalized coordinates relative to canvas layout element boundary
   const clickX = ((e.clientX - rect.left) / rect.width) * 640;
   const clickY = ((e.clientY - rect.top) / rect.height) * 360;

   const selected = tracks.find((track) => {
     const [x1, y1, x2, y2] = track.bbox;
     return (
       clickX >= x1 &&
       clickX <= x2 &&
       clickY >= y1 &&
       clickY <= y2
     );
   });

   if (!selected) return;
   setSelectedTrackId(String(selected.id));
   setAcquiredSeed(Number(selected.id));
   setAlias(`Track_${selected.id}`);
   setStep("selecting");
 };

 // Start Collection Trigger
 const handleStartAcquisition = async () => {
   if (!alias.trim() || !selectedTrackId) return;
   try {
     await api.startAcquisition({
       track_id: selectedTrackId ? Number(selectedTrackId) : undefined,
       alias
     });
     setStep('collecting');
     setProgress(0);
     setProgressStatus('Initializing facial extraction networks...');
   } catch (err: any) {
     console.error('Acquisition start failed', err);
     setProgressStatus(err?.message ?? 'Failed to start acquisition');
   }
 };

 const saveAcquiredTarget = useCallback(async () => {
   const status = await api.getAcquisitionStatus();
   const targetId = status?.data?.payload?.target_id;
   setAcquiredTargetId(targetId ? String(targetId) : null);
   await refreshTargets();
   setStep('completed');
 }, [refreshTargets]);

 // Embedding collection status polling
 useEffect(() => {
   if (step !== 'collecting') return;
   const timer = setInterval(() => {
     api.getAcquisitionStatus().then((status) => {
       const data = status.data;
       const count = data.embeddings_count ?? 0;
       const required = data.required_embeddings ?? 1;
       setProgress(Math.min(100, Math.round((count / required) * 100)));
       setProgressStatus(`Collecting embeddings: ${count}/${required}`);
       if (data.complete) {
          clearInterval(timer);
          saveAcquiredTarget();
          return;
        }

        if (!data.active) {
          clearInterval(timer);

          setProgressStatus(
            count > 0
              ? `Acquisition stopped (${count} embeddings collected)`
              : 'Acquisition timed out'
          );

          setSelectedTrackId(null);
          setStep('idle');

          return;
}
     }).catch(() => {
       setProgressStatus('Waiting for acquisition status...');
     });
   }, 250);
   return () => clearInterval(timer);
 }, [saveAcquiredTarget, step]);

 const handleReset = () => {
   api.stopAcquisition().catch(() => {});
   setAlias('');
   setClothingUpper('');
   setClothingLower('');
   setNotes('');
   setProgress(0);
      setSelectedTrackId(null);
   setStep('idle');
 };

 return (
   <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full font-ui">
     {/* Header */}
     <div className="flex flex-col gap-1 select-none">
       <h1 className="text-3xl font-display font-semibold text-[color:var(--fg)] tracking-[var(--tracking-tight)]">Biometric Acquisition</h1>
       <p className="text-sm text-[color:var(--fg-muted)]">Capture, register, and save new subject identities directly from active camera feeds.</p>
     </div>
     
     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
       {/* Left Side: Live Feed Canvas */}
       <div className="lg:col-span-8 space-y-4">
         <div className="bg-[color:var(--bg-elevated)] border border-[color:var(--border)] rounded-2xl overflow-hidden relative select-none micro-shadow">
           {/* Aspect lock wrapper */}
           <div className="aspect-[16/10] w-full relative">
             {/* Camera badge */}
             <div className="absolute top-4 left-4 bg-[color:var(--surface)]/80 text-xs text-[color:var(--fg)] px-3 py-1.5 rounded-full z-20 select-none backdrop-blur-sm border border-[color:var(--border)]">
               {selectedCameraName ?? (selectedCamera ? selectedCamera : 'Default Feed')}
             </div>
             
             <img
               ref={imageRef}
               src={api.getStreamUrlForCamera(selectedCamera)}
               alt="Live acquisition stream"
               className={cn(
                 "w-full h-full object-contain block",
                 step !== 'collecting' && step !== 'completed' ? 'cursor-crosshair' : 'cursor-not-allowed opacity-80'
               )}
             />
             
             <canvas
               ref={canvasRef}
               onClick={handleStreamClick}
               className="absolute inset-0 w-full h-full z-10"
             />
             
             {!selectedCamera && (
               <video 
                 ref={videoRef} 
                 autoPlay 
                 muted 
                 playsInline 
                 className={cn(
                   "w-full h-full object-contain block absolute inset-0", 
                   step !== 'collecting' && step !== 'completed' ? 'cursor-crosshair' : 'cursor-not-allowed opacity-80'
                 )} 
               />
             )}
             
             {/* Grid calibration Overlay */}
             <div className="absolute inset-0 border border-red-500/10 pointer-events-none" />
           </div>
           
           {/* Instruction Banner overlay */}
           {(step === 'idle' || step === 'selecting') && (
             <div className="absolute bottom-6 left-6 right-6 bg-[color:var(--surface)]/90 backdrop-blur-sm border border-[color:var(--border)] p-3 rounded-xl flex items-center justify-between text-sm text-[color:var(--fg-muted)] z-20">
               <div className="flex items-center gap-3">
                 <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                 <span className="font-ui font-semibold">STATUS: LIVE BACKEND STREAM</span>
               </div>
               <span className="text-sm">Click on a detected person to lock a target.</span>
             </div>
           )}
         </div>
         
         <div className="flex justify-between text-xs text-zinc-500 font-mono select-none px-2">
           <span>CALIBRATION: STABLE</span>
           <span>MODEL: RESNET-50 BACKBONE</span>
         </div>
       </div>
       
       {/* Right Side: Configuration Sidebar panel */}
       <div className="lg:col-span-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 min-h-[460px] flex flex-col justify-between">
         <div className="mb-4">
           <label className="text-[10px] font-semibold text-[color:var(--fg-muted)] uppercase">Select Camera</label>
           <div className="mt-3">
             <CameraSelector value={selectedCamera} onChange={(id) => { setSelectedCamera(id); setSelectedCameraName(id); }} />
           </div>
         </div>
         
         {/* STEP 1: Idle instructions */}
         {step === 'idle' && (
           <div className="flex-1 flex flex-col items-center justify-center text-center py-12 select-none">
             <ScanFace className="w-12 h-12 text-[color:var(--fg-muted)] mb-4 quiet-fade-in" />
             <h3 className="font-display font-semibold text-sm text-[color:var(--fg)]">Awaiting Target Selection</h3>
             <p className="text-sm text-[color:var(--fg-muted)] mt-2 max-w-[320px] leading-relaxed">
               Click a detected bounding box on the camera stream to isolate a subject and extract biometric templates.
             </p>
           </div>
         )}
         
         {/* STEP 2: Selected and editing alias info */}
         {step === 'selecting' && (
           <div className="space-y-5 flex-1 flex flex-col justify-between h-full">
             <div>
               <h3 className="font-semibold text-xs text-zinc-400 uppercase tracking-wider font-mono">Capture Register</h3>
               <div className="mt-4 flex gap-4 items-center">
                 <AvatarCrop seed={acquiredSeed} alias="Capture" status="tracked" className="w-16 h-16 rounded-xl" />
                 <div>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase">Selected Target</span>
                   <span className="block font-mono font-bold text-sm text-zinc-800">Subject #ID-{acquiredSeed}</span>
                 </div>
               </div>
               
               <div className="space-y-4 mt-6 text-xs select-none">
                 {/* Alias */}
                 <div className="space-y-1.5">
                   <Input label="Subject Alias Name" placeholder="e.g. John Doe / Unknown Subject #02" value={alias} onChange={(e) => setAlias(e.target.value)} />
                 </div>
                 
                 {/* Attributes */}
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Age Class</label>
                     <select value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800">
                       <option>Under 20</option>
                       <option>20-30</option>
                       <option>30-40</option>
                       <option>40-50</option>
                       <option>Over 50</option>
                     </select>
                   </div>
                   
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Gender Est.</label>
                     <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800">
                       <option>Male</option>
                       <option>Female</option>
                       <option>Other</option>
                     </select>
                   </div>
                 </div>
                 
                 {/* Clothes */}
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Upper Garment</label>
                     <input type="text" placeholder="Blue Hoodie" value={clothingUpper} onChange={(e) => setClothingUpper(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800" />
                   </div>
                   
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Lower Garment</label>
                     <input type="text" placeholder="Jeans" value={clothingLower} onChange={(e) => setClothingLower(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800" />
                   </div>
                 </div>
                 
                 {/* Notes */}
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase">Security Notes</label>
                   <textarea placeholder="Observation details..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-sans text-zinc-800" />
                 </div>
               </div>
             </div>
             
             {/* Action */}
             <div className="flex items-center gap-3 pt-6 border-t border-zinc-100 select-none">
               <Button className="w-1/2 flex items-center justify-center gap-1.5" variant="ghost" onClick={handleReset}>
                 <RotateCcw className="w-3.5 h-3.5" />
                 <span>Release Lock</span>
               </Button>
               <Button className="w-1/2 flex items-center justify-center gap-1.5" onClick={handleStartAcquisition} disabled={!alias.trim() || !selectedTrackId}>
                 <UserPlus className="w-3.5 h-3.5" />
                 <span>Acquire Target</span>
               </Button>
             </div>
           </div>
         )}
         
         {/* STEP 3: Progress indicators */}
         {step === 'collecting' && (
           <div className="flex-1 flex flex-col justify-center select-none py-6 space-y-6">
             <div className="flex flex-col items-center justify-center">
               <div className="relative w-16 h-16 flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-4 border-zinc-100" />

                 {/* Attributes */}
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Age Class</label>
                     <select 
                       value={age} 
                       onChange={(e) => setAge(e.target.value)} 
                       className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800"
                     >
                       <option>Under 20</option>
                       <option>20-30</option>
                       <option>30-40</option>
                       <option>40-50</option>
                       <option>Over 50</option>
                     </select>
                   </div>
                   
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Gender Est.</label>
                     <select 
                       value={gender} 
                       onChange={(e) => setGender(e.target.value)} 
                       className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800"
                     >
                       <option>Male</option>
                       <option>Female</option>
                       <option>Other</option>
                     </select>
                   </div>
                 </div>
                 
                 {/* Clothes */}
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Upper Garment</label>
                     <input 
                       type="text" 
                       placeholder="Blue Hoodie" 
                       value={clothingUpper} 
                       onChange={(e) => setClothingUpper(e.target.value)} 
                       className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800" 
                     />
                   </div>
                   
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-bold text-zinc-400 uppercase">Lower Garment</label>
                     <input 
                       type="text" 
                       placeholder="Jeans" 
                       value={clothingLower} 
                       onChange={(e) => setClothingLower(e.target.value)} 
                       className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-800" 
                     />
                   </div>
                 </div>
                 
                 {/* Notes */}
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-zinc-400 uppercase">Security Notes</label>
                   <textarea 
                     placeholder="Observation details..." 
                     rows={2} 
                     value={notes} 
                     onChange={(e) => setNotes(e.target.value)} 
                     className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-sans text-zinc-800" 
                   />
                 </div>
               </div>
             </div>
             
             {/* Action Control Blocks */}
             <div className="flex items-center gap-3 pt-6 border-t border-zinc-100 select-none">
               <Button className="w-1/2 flex items-center justify-center gap-1.5" variant="ghost" onClick={handleReset}>
                 <RotateCcw className="w-3.5 h-3.5" />
                 <span>Release Lock</span>
               </Button>
               <Button className="w-1/2 flex items-center justify-center gap-1.5" onClick={handleStartAcquisition} disabled={!alias.trim() || !selectedTrackId}>
                 <UserPlus className="w-3.5 h-3.5" />
                 <span>Acquire Target</span>
               </Button>
             </div>
           </div>
         )}
         
         {/* STEP 3: Progress Embedding Vector Accumulation Indicators */}
         {step === 'collecting' && (
           <div className="flex-1 flex flex-col justify-center select-none py-6 space-y-6">
             <div className="flex flex-col items-center justify-center">
               <div className="relative w-16 h-16 flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-4 border-zinc-100" />
                 <div className="absolute inset-0 rounded-full border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                 <Activity className="w-6 h-6 text-red-500 animate-pulse" />
               </div>
               <h3 className="font-bold text-sm text-zinc-900 mt-4">Collecting Embeddings</h3>
               <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider mt-1">Acquiring: {alias}</span>
             </div>
             
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-mono">
                 <span className="text-zinc-500">Vector Accumulation</span>
                 <span className="font-bold text-zinc-800">{progress}%</span>
               </div>
               <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                 <div className="h-full bg-red-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
               </div>
               <p className="text-[10px] font-mono text-zinc-400 text-center leading-relaxed italic mt-3 min-h-[30px]">
                 {progressStatus}
               </p>
             </div>
           </div>
         )}
         
         {/* STEP 4: Completed Registration Status View */}
         {step === 'completed' && (
           <div className="flex-1 flex flex-col justify-between select-none h-full">
             <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
               <CheckCircle2 className="w-14 h-14 text-emerald-500 mb-4 animate-[bounce_1s_1]" />
               <h3 className="font-bold text-base text-zinc-900">Acquisition Completed</h3>
               <p className="text-xs text-zinc-500 mt-2 max-w-[240px] leading-relaxed">
                 Subject &apos;{alias}&apos; registered successfully as code <span className="font-mono font-bold text-zinc-800">{acquiredTargetId}</span>.
               </p>
               <div className="mt-6 p-4 border border-zinc-150 rounded-2xl w-full bg-zinc-50/50 flex gap-4 items-center text-left">
                 <AvatarCrop seed={acquiredSeed} alias={alias} status="tracked" className="w-12 h-12 rounded-xl shrink-0" />
                 <div className="min-w-0 flex-1">
                   <span className="text-[9px] font-bold text-zinc-400 block uppercase">Vector Record Saved</span>
                   <span className="font-bold text-xs text-zinc-800 block truncate">{alias}</span>
                   <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">{acquiredTargetId} | 10 embeddings</span>
                 </div>
               </div>
             </div>
             
             <div className="flex items-center gap-3 pt-6 border-t border-zinc-100">
               <Button className="w-1/2 flex items-center justify-center gap-1.5" variant="ghost" onClick={handleReset}>
                 <RotateCcw className="w-3.5 h-3.5" />
                 <span>Reset Camera</span>
               </Button>
               <Button className="w-1/2 flex items-center justify-center gap-1.5" onClick={() => router.push('/targets')}>
                 <ScanFace className="w-3.5 h-3.5" />
                 <span>Go to Gallery</span>
               </Button>
             </div>
           </div>
         )}
       </div>
     </div>
   </div>
 );
}
