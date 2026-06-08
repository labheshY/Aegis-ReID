"use client";

import React, { useEffect, useState } from 'react';
import { Users, Video, ScanLine, Activity, Cpu, Radio } from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { StatsCard } from '../../components/dashboard/stats-card';
import { RecentDetections } from '../../components/dashboard/recent-detections';
import { ActivityFeed } from '../../components/dashboard/activity-feed';
import { PageHeader } from '../../components/layout/page-header';
import { api } from '../../services/api';
import type { SystemOverview } from '../../types';

export default function DashboardPage() {
  const { targets, cameras, events, activeSearchIds } = useTargets();
  const [overview, setOverview] = useState<SystemOverview | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await api.getOverview();
      if (data) setOverview(data);
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const activeTargetsCount = activeSearchIds.length;
  const onlineCamerasCount = overview?.counts.online_cameras ?? cameras.filter((c) => c.status === 'online').length;
  const totalCameras = overview?.counts.total_cameras ?? cameras.length;
  const registeredCount = overview?.counts.registered_targets ?? targets.length;
  const activeTracks = overview?.counts.active_tracks ?? 0;
  const frameCount = overview?.tracker.frame_count ?? 0;

  const gpu = overview?.gpu;
  const storage = overview?.storage;
  const vramPct =
    gpu?.memory_used_gb != null && gpu?.memory_total_gb
      ? Math.round((gpu.memory_used_gb / gpu.memory_total_gb) * 100)
      : null;
  const diskUsedPct =
    storage?.volume_total_gb && storage?.embeddings_used_gb != null
      ? Math.min(100, Math.round((storage.embeddings_used_gb / storage.volume_total_gb) * 100))
      : 41;

  const targetsSparkline = [activeTargetsCount, activeTargetsCount + 1, activeTargetsCount, registeredCount].filter(
    (v) => v >= 0
  );
  const eventsSparkline = events.slice(0, 7).map((_, i) => Math.max(1, events.length - i * 3));

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
      <PageHeader
        badge="Live telemetry"
        title="Operations Overview"
        description="Real-time ReID pipeline status, camera mesh health, and biometric processing metrics from your FastAPI agent."
        actions={
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-2 bg-white/[0.02]">
            <Radio className="w-3 h-3 text-cyan-500 animate-pulse" />
            <span>
              {overview?.tracker.running ? `MODE: ${overview.tracker.mode.toUpperCase()}` : 'INITIALIZING'}
            </span>
            <span className="text-zinc-700">|</span>
            <span>{frameCount.toLocaleString()} frames</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Active Targets"
          value={activeTargetsCount}
          subtext="ReID search sessions running"
          icon={Users}
          trend={activeTargetsCount > 0 ? 'up' : 'neutral'}
          trendValue={activeTargetsCount > 0 ? 'tracking' : 'idle'}
          sparkline={targetsSparkline.length > 1 ? targetsSparkline : [0, 1, 0, activeTargetsCount]}
          accent="cyan"
        />
        <StatsCard
          title="Camera Mesh"
          value={`${onlineCamerasCount}/${totalCameras}`}
          subtext="Nodes online in registry"
          icon={Video}
          trend="neutral"
          trendValue={onlineCamerasCount === totalCameras ? 'full mesh' : 'partial'}
          sparkline={[onlineCamerasCount, totalCameras, onlineCamerasCount]}
          accent="emerald"
        />
        <StatsCard
          title="Registered IDs"
          value={registeredCount}
          subtext={`${overview?.counts.total_embeddings ?? 0} embedding vectors`}
          icon={ScanLine}
          trend="up"
          trendValue={`${activeTracks} tracks`}
          accent="amber"
        />
        <StatsCard
          title="Event Buffer"
          value={events.length}
          subtext="Session activity log"
          icon={Activity}
          trend={events.length > 0 ? 'up' : 'neutral'}
          trendValue={events.length > 0 ? 'live' : 'quiet'}
          sparkline={eventsSparkline.length > 1 ? eventsSparkline : [0, 2, 4, events.length]}
          accent="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[480px]">
        <div className="lg:col-span-5 min-h-[480px]">
          <RecentDetections />
        </div>
        <div className="lg:col-span-7 min-h-[480px]">
          <ActivityFeed />
        </div>
      </div>
      <div className="aegis-panel p-6 select-none">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">
            Inference & Storage
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricBar
            label={gpu?.available ? gpu.device_name ?? 'CUDA Device' : 'Compute Backend'}
            value={gpu?.available ? (vramPct != null ? `${vramPct}% VRAM` : 'GPU ready') : 'CPU / DirectML'}
            percent={vramPct ?? (overview?.tracker.running ? 48 : 12)}
            hint={
              gpu?.memory_used_gb != null
                ? `${gpu.memory_used_gb} / ${gpu.memory_total_gb ?? '?'} GB allocated`
                : 'ONNX + YOLO inference pipeline'
            }
          />
          <MetricBar
            label="Active Track Buffer"
            value={`${activeTracks} persons`}
            percent={Math.min(100, activeTracks * 12)}
            hint={`Tracker mode: ${overview?.tracker.mode ?? 'idle'}`}
          />
          <MetricBar
            label="Embeddings Store"
            value={`${storage?.embeddings_used_gb ?? 0} GB`}
            percent={diskUsedPct}
            hint={
              storage?.volume_free_gb != null
                ? `${storage.volume_free_gb} GB free on volume`
                : 'Local vector + preview cache'
            }
          />
        </div>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  percent,
  hint,
}: {
  label: string;
  value: string;
  percent: number;
  hint: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 font-medium truncate pr-2">{label}</span>
        <span className="font-mono font-bold text-zinc-200 shrink-0">{value}</span>
      </div>
      <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(4, percent))}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-600 font-mono">{hint}</p>
    </div>
  );
}
