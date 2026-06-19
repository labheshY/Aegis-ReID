"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  ScanSearch,
  Radar,
  UserSearch,
  Camera,
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { PageHeader } from "../../components/layout/page-header";
import { cn } from "../../lib/utils"
import { api } from '../../services/api';
import { fromBackend, toBackend } from "@/lib/settingsMapper";
import { useUi } from '../../providers/ui-provider';


export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [exposeByteTrack, setExposeByteTrack] = useState(false);
  const { addToast } = useUi();
  const update = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await api.updateSettings(
        toBackend(settings)
      );

      addToast({
        title: 'Configuration Updated',
        description: 'Runtime parameters have been synchronized successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: 'Save Failed',
        description: 'Unable to apply configuration changes. Please try again.',
        type: 'error'
      });
    }
  };

  const handleReset = async () => {
    try {
      const defaults = await api.resetSettings();

      setSettings(fromBackend(defaults));

      addToast({
        title: 'Configuration Restored',
        description: 'System parameters reverted to default operational profile.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: 'Reset Failed',
        description: 'Unable to restore default settings.',
        type: 'error'
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await api.getSettings();

    setSettings(
      fromBackend(data)
    );
  };

  if (!settings) {
    return (
      <div className="p-6 text-zinc-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="CONTROL CENTER"
        title="System Configuration"
        description="Configure detection, tracking, re-identification, and runtime parameters."
      />

      <section className="aegis-panel p-6 select-none">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <ScanSearch className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="font-semibold text-sm text-zinc-100 tracking-tight">Detection Engine Configuration</h2>
              <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Core Heuristics // Neural Weight Thresholds</p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Balanced Master Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm font-mono items-stretch">
          
          {/* MODULE 1: CONFIDENCE CONTROL (Left Side - Row 1) */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
            <div className="w-full">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
                  Detection Confidence
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
                  {Math.round((settings.minBoxConfidence || 0) * 100)}%
                </span>
              </div>
              
              <SettingSlider
                value={settings.minBoxConfidence}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => update("minBoxConfidence", v)}
              />
            </div>
            
            {/* Help text locked to the bottom-left */}
            <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
              Minimum confidence score required for valid detections.
            </div>
          </div>

          {/* MODULE 2: DIMENSION CONTROL BLOCK (Right Side - Row 1) */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
            <div className="space-y-3 w-full">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
                Bounding Box Size Constraints
              </label>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-4 w-full">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight shrink-0">Min Width</span>
                  <div className="relative flex items-center w-full max-w-[140px] shrink-0">
                    <SettingNumber value={settings.minBoxWidth} onChange={(v) => update("minBoxWidth", v)} />
                    <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">PX</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 w-full">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight shrink-0">Min Height</span>
                  <div className="relative flex items-center w-full max-w-[140px] shrink-0">
                    <SettingNumber value={settings.minBoxHeight} onChange={(v) => update("minBoxHeight", v)} />
                    <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">PX</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Help text locked to the bottom-left */}
            <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02] mt-3">
              Filters out bounding targets below set dimensions.
            </div>
          </div>

          {/* MODULE 3: INPUT RESOLUTION DROPDOWN (Left Side - Row 2) */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
            <div className="flex items-center justify-between gap-4 w-full mb-3">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
                Input Resolution
              </label>

              <div className="relative w-full max-w-[140px] shrink-0 flex items-center">
                <select
                  value={settings.inputResolution || '640x360'}
                  onChange={(e) => update("inputResolution", e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-zinc-300 text-xs cursor-pointer focus:border-cyan-500/50 transition-colors appearance-none"
                >
                  <option value="320x180">320×180</option>
                  <option value="416x234">416×234</option>
                  <option value="640x360">640×360</option>
                  <option value="640x640">640×640</option>
                </select>
                <div className="absolute right-3.5 pointer-events-none flex items-center">
                  <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                </div>
              </div>
            </div>
            
            {/* High-Visibility Help text at the bottom left */}
            <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left leading-normal">
              <span className="text-cyan-500 font-bold">▲ Core Alert:</span> Higher resolution improves accuracy but increases processing time.
            </div>
          </div>

          {/* MODULE 4: DETECTION FRAME INTERVAL STEPPER (Right Side - Row 2) */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
            <div className="flex items-center justify-between gap-4 w-full mb-3">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
                Detection Frame Interval
              </label>

              <div className="relative flex items-center w-full max-w-[140px] shrink-0">
                <SettingNumber
                  value={settings.detectionFrameInterval || 1}
                  min={1}
                  max={10}
                  step={1}
                  onChange={(v) => update("detectionFrameInterval", v)}
                />
                <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">FRM</div>
              </div>
            </div>
            
            {/* High-Visibility Help text at the bottom left */}
            <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left leading-normal">
              <span className="text-cyan-500 font-bold">▲ Core Alert:</span> Run object detection every N frames.
            </div>
          </div>
          
        </div>
      </section>

      <section className="aegis-panel p-6 select-none mt-6">
  {/* Header Section with Custom ByteTrack Toggle Switch */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
    <div className="flex items-center gap-2">
      <Radar className="w-4 h-4 text-cyan-400" />
      <div>
        <h2 className="font-semibold text-sm text-zinc-100 tracking-tight">Tracking Engine Configuration</h2>
        <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Track Lifecycle & Identity Persistence</p>
      </div>
    </div>

    {/* Expose Custom ByteTrack Toggle Button */}
    <div className="flex items-center gap-3 bg-zinc-950/80 px-3 py-1.5 border border-zinc-900 rounded-xl pointer-events-auto">
      <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
        Expose Custom ByteTrack.yaml
      </span>
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          checked={exposeByteTrack}
          onChange={(e) => setExposeByteTrack(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-8 h-4.5 bg-zinc-900 border border-zinc-800 rounded-full transition-all peer-checked:bg-cyan-950/40 peer-checked:border-cyan-500/50" />
        <div className="absolute top-[2px] left-[2px] w-2.5 h-2.5 bg-zinc-600 rounded-full transition-all peer-checked:translate-x-3.5 peer-checked:bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
      </label>
    </div>
  </div>

  {/* Main Balanced High Density Master Grid Layout */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm font-mono items-stretch">
    
    {/* MODULE 1: TARGET CONFIRMATION FRAMES */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors max-w-[200px]">
          Target Confirmation Frames
        </label>
        
        <div className="relative flex items-center w-full max-w-[140px] shrink-0">
          <SettingNumber
            value={settings.targetConfirmation || 8}
            min={1}
            max={30}
            step={1}
            onChange={(v) => update("targetConfirmation", v)}
          />
          <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">FRM</div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Number of consecutive detections required before confirming a target.
      </div>
    </div>

    {/* MODULE 2: TRACK BUFFER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors max-w-[200px]">
          Track Buffer
        </label>
        
        <div className="relative flex items-center w-full max-w-[140px] shrink-0">
          <SettingNumber
            value={settings.trackBuffer || 60}
            min={10}
            max={120}
            step={1}
            onChange={(v) => update("trackBuffer", v)}
          />
          <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">FRM</div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02] leading-normal">
        Frames a lost track remains active. <span className="text-zinc-600">(10: Aggressive // 60: Default // 120: Persistent)</span>
      </div>
    </div>

    {/* MODULE 3: MATCH THRESHOLD SLIDER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Match Threshold
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {(settings.matchThreshold || 0.90).toFixed(2)}
          </span>
        </div>
        <SettingSlider
          value={settings.matchThreshold || 0.90}
          min={0.50}
          max={0.99}
          step={0.01}
          onChange={(v) => update("matchThreshold", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left leading-normal">
        <span className="text-cyan-500 font-bold">▲ Association Index:</span> Lower = More new IDs // Higher = More track persistence
      </div>
    </div>

    {/* MODULE 4: HIGH CONFIDENCE THRESHOLD (Conditional Lockout) */}
    <div className={cn(
      "bg-zinc-950/40 border rounded-xl p-4 flex flex-col justify-between min-h-[135px] transition-all duration-300",
      exposeByteTrack 
        ? "border-zinc-900 group hover:border-zinc-800/80 pointer-events-auto opacity-100" 
        : "border-zinc-950 opacity-25 pointer-events-none filter blur-[0.2px]"
    )}>
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            High Confidence Threshold
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {(settings.track_high_thresh || 0.50).toFixed(2)}
          </span>
        </div>
        <SettingSlider
          value={settings.track_high_thresh || 0.50}
          min={0.30}
          max={0.95}
          step={0.05}
          onChange={(v) => update("track_high_thresh", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left">
        <span className="text-cyan-500 font-bold">▲ byte_thresh:</span> Minimum confidence for primary track association.
      </div>
    </div>

    {/* MODULE 5: LOW CONFIDENCE THRESHOLD (Conditional Lockout) */}
    <div className={cn(
      "bg-zinc-950/40 border rounded-xl p-4 flex flex-col justify-between min-h-[135px] transition-all duration-300",
      exposeByteTrack 
        ? "border-zinc-900 group hover:border-zinc-800/80 pointer-events-auto opacity-100" 
        : "border-zinc-950 opacity-25 pointer-events-none filter blur-[0.2px]"
    )}>
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Low Confidence Threshold
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {(settings.track_low_thresh || 0.25).toFixed(2)}
          </span>
        </div>
        <SettingSlider
          value={settings.track_low_thresh || 0.25}
          min={0.10}
          max={0.80}
          step={0.05}
          onChange={(v) => update("track_low_thresh", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left">
        <span className="text-amber-500 font-bold">▲ distant_target:</span> Confidence for secondary association. Distant targets.
      </div>
    </div>

    {/* MODULE 6: NEW TRACK THRESHOLD (Conditional Lockout) */}
    <div className={cn(
      "bg-zinc-950/40 border rounded-xl p-4 flex flex-col justify-between min-h-[135px] transition-all duration-300",
      exposeByteTrack 
        ? "border-zinc-900 group hover:border-zinc-800/80 pointer-events-auto opacity-100" 
        : "border-zinc-950 opacity-25 pointer-events-none filter blur-[0.2px]"
    )}>
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            New Track Threshold
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {(settings.new_track_thresh || 0.45).toFixed(2)}
          </span>
        </div>
        <SettingSlider
          value={settings.new_track_thresh || 0.45}
          min={0.10}
          max={0.95}
          step={0.05}
          onChange={(v) => update("new_track_thresh", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left">
        <span className="text-cyan-500 font-bold">▲ initialize_thresh:</span> Confidence required before creating a new track.
      </div>
    </div>

  </div>
</section>


      <section className="aegis-panel p-6 select-none mt-6">
  {/* Header Section */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
    <div className="flex items-center gap-2">
      <UserSearch className="w-4 h-4 text-cyan-400" />
      <div>
        <h2 className="font-semibold text-sm text-zinc-100 tracking-tight">Identity Matching Configuration</h2>
        <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Re-Identification & Similarity Scoring</p>
      </div>
    </div>
  </div>

  {/* Main Balanced 3-Row, 2-Column Master Grid Layout */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm font-mono items-stretch">
    
    {/* MODULE 1: SIMILARITY THRESHOLD SLIDER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Similarity Threshold
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {Math.round((settings.similarity_threshold || 0.70) * 100)}%
          </span>
        </div>
        <SettingSlider
          value={settings.similarity_threshold || 0.70}
          min={0.30}
          max={0.95}
          step={0.01}
          onChange={(v) => update("similarity_threshold", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Minimum similarity score required to classify a track as a known target.
      </div>
    </div>

    {/* MODULE 2: MAXIMUM EMBEDDINGS STEPPER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors max-w-[200px]">
          Maximum Embeddings
        </label>
        
        <div className="relative flex items-center w-full max-w-[140px] shrink-0">
          <SettingNumber
            value={settings.max_embeddings || 10}
            min={3}
            max={50}
            step={1}
            onChange={(v) => update("max_embeddings", v)}
          />
          <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">VEC</div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Maximum reference embeddings stored per identity.
      </div>
    </div>

    {/* MODULE 3: REID FRAME INTERVAL STEPPER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors max-w-[200px]">
          ReID Frame Interval
        </label>
        
        <div className="relative flex items-center w-full max-w-[140px] shrink-0">
          <SettingNumber
            value={settings.reid_frame_interval || 3}
            min={1}
            max={20}
            step={1}
            onChange={(v) => update("reid_frame_interval", v)}
          />
          <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">FRM</div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Run re-identification every N frames.
      </div>
    </div>

    {/* MODULE 4: ACQUISITION FRAME INTERVAL STEPPER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors max-w-[200px]">
          Acquisition Frame Interval
        </label>
        
        <div className="relative flex items-center w-full max-w-[140px] shrink-0">
          <SettingNumber
            value={settings.acquisition_frame_interval || 5}
            min={1}
            max={20}
            step={1}
            onChange={(v) => update("acquisition_frame_interval", v)}
          />
          <div className="absolute right-3.5 pointer-events-none text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-wider">FRM</div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Collect embeddings every N frames during acquisition.
      </div>
    </div>

    {/* MODULE 5: SOFT DECAY TOGGLE SWITCH */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Soft Decay
          </label>
          <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-tight">
            Status: {settings.use_soft_decay ? (
              <span className="text-cyan-400">ENABLED</span>
            ) : (
              <span className="text-zinc-500">DISABLED</span>
            )}
          </span>
        </div>

        {/* Custom Cyberpunk Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.use_soft_decay || false}
            onChange={(e) => update("use_soft_decay", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-950 border border-zinc-800 rounded-full transition-all peer-checked:bg-cyan-950/40 peer-checked:border-cyan-500/50" />
          <div className="absolute top-[3px] left-[3px] w-3 h-3 bg-zinc-700 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
        </label>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Gradually reduce confidence of inactive tracks over time.
      </div>
    </div>

    {/* MODULE 6: SOFT DECAY RATE SLIDER (Conditional Lockout) */}
    <div className={cn(
      "bg-zinc-950/40 border rounded-xl p-4 flex flex-col justify-between min-h-[135px] transition-all duration-300",
      settings.use_soft_decay 
        ? "border-zinc-900 group hover:border-zinc-800/80 pointer-events-auto opacity-100" 
        : "border-zinc-950 opacity-25 pointer-events-none filter blur-[0.2px]"
    )}>
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Soft Decay Rate
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {(settings.soft_decay_rate || 0.20).toFixed(2)}
          </span>
        </div>
        <SettingSlider
          value={settings.soft_decay_rate || 0.20}
          min={0.00}
          max={1.00}
          step={0.05}
          onChange={(v) => update("soft_decay_rate", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left leading-normal">
        <span className="text-cyan-500 font-bold">▲ Attenuation Speed:</span> Rate at which stale identity confidence decays.
      </div>
    </div>

  </div>
</section>

      <section className="aegis-panel p-6 select-none mt-6">
  {/* Header Section */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
    <div className="flex items-center gap-2">
      <Camera className="w-4 h-4 text-cyan-400" />
      <div>
        <h2 className="font-semibold text-sm text-zinc-100 tracking-tight">Face Recognition</h2>
        <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Facial Identification & Verification</p>
      </div>
    </div>
  </div>

  {/* Main Balanced 2-Row, 2-Column Master Grid Layout */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm font-mono items-stretch">
    
    {/* MODULE 1: FACE MATCHING THRESHOLD SLIDER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Face Matching Threshold
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {Math.round((settings.face_threshold || 0.70) * 100)}%
          </span>
        </div>
        <SettingSlider
          value={settings.face_threshold || 0.70}
          min={0.30}
          max={0.95}
          step={0.01}
          onChange={(v) => update("face_threshold", v)}
        />
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Minimum similarity score required to consider a face match valid.
      </div>
    </div>

    {/* MODULE 2: HYBRID FACE WEIGHT SLIDER */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
            Hybrid Face Weight
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 px-2 py-0.5 rounded-[4px]">
            {(settings.hybrid_face_weight || 0.50).toFixed(2)}
          </span>
        </div>
        <SettingSlider
          value={settings.hybrid_face_weight || 0.50}
          min={0.00}
          max={1.00}
          step={0.05}
          onChange={(v) => update("hybrid_face_weight", v)}
        />
      </div>
      
      {/* High-Visibility Help text at the bottom left */}
      <div className="pt-2 text-[9px] text-zinc-400 font-medium uppercase tracking-wider border-t border-white/[0.04] text-left leading-normal">
        <span className="text-cyan-500 font-bold">▲ Crucial Balance:</span> 0.0 = ReID Only // 0.5 = Balanced // 1.0 = Face Only
      </div>
    </div>

    {/* MODULE 3: FACE MODEL DROPDOWN */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full mb-3">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
          Face Model
        </label>

        {/* Custom Styled Select Wrapper */}
        <div className="relative w-full max-w-[140px] shrink-0 flex items-center">
          <select
            value={settings.face_model || 'FaceNet'}
            onChange={(e) => update("face_model", e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-zinc-300 text-xs cursor-pointer focus:border-cyan-500/50 transition-colors appearance-none"
          >
            <option value="FaceNet">FaceNet</option>
            <option value="ArcFace">ArcFace</option>
            <option value="VGGFace">VGGFace</option>
          </select>
          <div className="absolute right-3.5 pointer-events-none flex items-center">
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Embedding model used for facial feature extraction.
      </div>
    </div>

    {/* MODULE 4: FACE DETECTOR DROPDOWN */}
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between group hover:border-zinc-800/80 transition-colors pointer-events-auto min-h-[135px]">
      <div className="flex items-center justify-between gap-4 w-full mb-3">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block group-hover:text-cyan-400 transition-colors">
          Face Detector
        </label>

        {/* Custom Styled Select Wrapper */}
        <div className="relative w-full max-w-[140px] shrink-0 flex items-center">
          <select
            value={settings.face_detector || 'Haar'}
            onChange={(e) => update("face_detector", e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-zinc-300 text-xs cursor-pointer focus:border-cyan-500/50 transition-colors appearance-none"
          >
            <option value="Haar">Haar</option>
            <option value="MTCNN">MTCNN</option>
            <option value="RetinaFace">RetinaFace</option>
          </select>
          <div className="absolute right-3.5 pointer-events-none flex items-center">
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </div>
        </div>
      </div>
      <div className="pt-2 text-[9px] text-zinc-500 uppercase tracking-tight font-medium border-t border-white/[0.02]">
        Algorithm used to locate faces before recognition.
      </div>
    </div>

  </div>
</section>

      <div className="space-y-6">
        {/* ========================================================
            BOTTOM FOOTER CONTROL SYSTEM: MASTER ACTION BUTTON STRIP
            ======================================================== */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-white/[0.04] pointer-events-auto font-mono">
          {/* Ghost/Muted Reset defaults action */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          {/* Primary Apply configuration action button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 rounded-xl text-xs font-bold transition-all uppercase tracking-wider border-none shadow-sm cursor-pointer shadow-cyan-500/5 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingSlider({ value, min, max, step, onChange }: any) {
  return (
    <div className="relative flex items-center w-full py-2 pointer-events-auto">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-2 bg-zinc-950 border border-zinc-800 rounded-lg outline-none cursor-pointer appearance-none transition-colors
          
          /* Webkit Browsers (Chrome, Safari, Edge) Track & Thumb */
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:active:scale-125
          
          /* Firefox Track & Thumb */
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-cyan-400
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:transition-transform
          [&::-moz-range-thumb]:active:scale-125
        "
      />
    </div>
  );
}


// Place this helper function component near the top or bottom of your page.tsx file
function SettingNumber({ label, value, onChange, min = 0, max = 9999, step = 1 }) {
  const increment = () => {
    const nextVal = (value || 0) + step;
    if (nextVal <= max) onChange(nextVal);
  };

  const decrement = () => {
    const nextVal = (value || 0) - step;
    if (nextVal >= min) onChange(nextVal);
  };

  return (
    <div className="relative flex items-center w-full group/input">
      {/* 1. Core Dark Numerical Input Track */}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full pl-3 pr-12 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-zinc-300 text-xs placeholder:text-zinc-700 focus:border-cyan-500/50 transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      {/* 2. Custom Cyberpunk Up/Down Stepper Column */}
      <div className="absolute right-9 flex flex-col border-l border-zinc-800 h-[calc(100%-2px)] justify-between my-[1px]">
        {/* Up Arrow Stepper */}
        <button
          type="button"
          onClick={increment}
          className="flex items-center justify-center w-6 h-1/2 hover:bg-zinc-900 border-b border-zinc-900/40 text-zinc-500 hover:text-cyan-400 transition-colors cursor-pointer rounded-tr-lg"
        >
          <ChevronUp className="w-2.5 h-2.5" />
        </button>

        {/* Down Arrow Stepper */}
        <button
          type="button"
          onClick={decrement}
          className="flex items-center justify-center w-6 h-1/2 hover:bg-zinc-900 text-zinc-500 hover:text-cyan-400 transition-colors cursor-pointer rounded-br-lg"
        >
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
