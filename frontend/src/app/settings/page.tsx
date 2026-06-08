"use client";

import React, { useState } from 'react';
import { 
  Sliders, 
  Cpu, 
  Server, 
  RotateCcw, 
  Save, 
  HelpCircle,
  ToggleLeft
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { TrackerSettings } from '../../types';
import { Button } from '../../components/ui/button';

export default function SettingsPage() {
  const { settings, updateSettings } = useTargets();

  // Local component form states
  const [similarityThreshold, setSimilarityThreshold] = useState(settings.similarityThreshold);
  const [confirmationThreshold, setConfirmationThreshold] = useState(settings.confirmationThreshold);
  const [frameInterval, setFrameInterval] = useState(settings.frameInterval);
  const [softDecay, setSoftDecay] = useState(settings.softDecay);
  const [acquisitionMode, setAcquisitionMode] = useState(settings.acquisitionMode);
  const [searchMode, setSearchMode] = useState(settings.searchMode);

  const handleSave = () => {
    const updated: TrackerSettings = {
      similarityThreshold,
      confirmationThreshold,
      frameInterval,
      softDecay,
      acquisitionMode,
      searchMode
    };
    updateSettings(updated);
  };

  const handleReset = () => {
    setSimilarityThreshold(0.82);
    setConfirmationThreshold(0.85);
    setFrameInterval(250);
    setSoftDecay(true);
    setAcquisitionMode('manual');
    setSearchMode('local');
  };

  return (
    <div className="flex-1 p-8 space-y-8 max-w-4xl mx-auto w-full font-ui">
      {/* Header */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">System Configuration</h1>
        <p className="text-sm text-zinc-500">Tune similarity parameters, detection rates, and vector indexing engines.</p>
      </div>

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* Card 1: ReID Hyperparameters */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 select-none">
          <div className="flex items-center gap-3 border-b border-[color:var(--border)] pb-4 mb-5">
            <Sliders className="w-4 h-4 text-[color:var(--fg-muted)]" />
            <h3 className="font-display font-semibold text-sm text-[color:var(--fg)]">ReID Hyperparameters</h3>
          </div>

          <div className="space-y-6 text-sm text-[color:var(--fg-muted)]">
            {/* Slider 1: Similarity Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-850">Similarity Threshold</span>
                <span className="font-mono font-bold text-zinc-950">{Math.round(similarityThreshold * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.50" 
                max="0.99" 
                step="0.01"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950"
              />
              <p className="text-[10px] text-zinc-400">Minimum cosine similarity score required to trigger a tentative person match.</p>
            </div>

            {/* Slider 2: Confirmation Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-850">Lock Confirmation Threshold</span>
                <span className="font-mono font-bold text-zinc-950">{Math.round(confirmationThreshold * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.50" 
                max="0.99" 
                step="0.01"
                value={confirmationThreshold}
                onChange={(e) => setConfirmationThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950"
              />
              <p className="text-[10px] text-zinc-400">Threshold required over consecutive frames to trigger a confirmed security LOCK notification.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Inference Pipeline Rates */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 select-none">
          <div className="flex items-center gap-3 border-b border-[color:var(--border)] pb-4 mb-5">
            <Cpu className="w-4 h-4 text-[color:var(--fg-muted)]" />
            <h3 className="font-display font-semibold text-sm text-[color:var(--fg)]">Inference & Capture Pipeline</h3>
          </div>

          <div className="space-y-6 text-sm text-[color:var(--fg-muted)]">
            {/* Slider 3: Frame Interval */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-850">Frame Inference Interval</span>
                <span className="font-mono font-bold text-zinc-950">{frameInterval} ms</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="1000" 
                step="50"
                value={frameInterval}
                onChange={(e) => setFrameInterval(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950"
              />
              <p className="text-[10px] text-zinc-400">Speed at which video frames are sent to the CNN embedding pipeline. Lower is more real-time, higher conserves GPU compute.</p>
            </div>

            {/* Toggle: Soft Decay */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-850 block">Soft Decay Lock Retention</span>
                <span className="text-[10px] text-zinc-400 block max-w-[420px]">
                  Gradually decay matching confidence when target disappears from frame, rather than severing lock immediately.
                </span>
              </div>
              <button
                onClick={() => setSoftDecay(!softDecay)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                style={{ backgroundColor: softDecay ? '#18181b' : '#e4e4e7' }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                  style={{ transform: softDecay ? 'translateX(20px)' : 'translateX(0px)' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Indexing & Acquisition modes */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 select-none">
          <div className="flex items-center gap-3 border-b border-[color:var(--border)] pb-4 mb-5">
            <Server className="w-4 h-4 text-[color:var(--fg-muted)]" />
            <h3 className="font-display font-semibold text-sm text-[color:var(--fg)]">Acquisition & Search Indexing</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[color:var(--fg-muted)] select-none">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 block uppercase">Acquisition Mode</label>
              <select 
                value={acquisitionMode} 
                onChange={(e) => setAcquisitionMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-semibold text-zinc-800"
              >
                <option value="manual">Manual Trigger Only</option>
                <option value="automatic">Automatic (On Untracked Subject)</option>
              </select>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Determine if the system automatically launches embedding accumulation on unrecognized subjects or waits for user click logs.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 block uppercase">Vector Index Engine</label>
              <select 
                value={searchMode} 
                onChange={(e) => setSearchMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-semibold text-zinc-800"
              >
                <option value="local">Local Flat L2 (InMemory)</option>
                <option value="distributed">Distributed Cosine HNSW (Milvus / Qdrant)</option>
              </select>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Algorithm model for querying features. Distributed indexing is future-proof and supports billions of vector identities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Action Buttons */}
      <div className="flex items-center justify-end gap-3 select-none pt-4">
        <Button variant="ghost" onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2.5 spring-fast">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </Button>
        <Button onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2.5 spring">
          <Save className="w-3.5 h-3.5" />
          <span>Apply Configurations</span>
        </Button>
      </div>
    </div>
  );
}
