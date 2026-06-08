"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  Edit3, 
  Radar, 
  Clock, 
  Tag, 
  Database,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { AvatarCrop } from '../../components/ui/avatar-crop';
import { cn, formatDate } from '../../lib/utils';
import { Target } from '../../types';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/layout/page-header';

export default function TargetGalleryPage() {
  const router = useRouter();
  const { 
    targets, 
    cameras, 
    deleteTarget, 
    updateTargetDetails,
    activeSearchIds,
    startSearch,
    stopSearch
  } = useTargets();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Modal State
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editAlias, setEditAlias] = useState('');

  // Handle open details modal
  const handleOpenDetails = (target: Target) => {
    setSelectedTarget(target);
    setEditAlias(target.alias);
    setIsEditing(false);
  };

  // Handle Save
  const handleSaveDetails = async () => {
    if (!selectedTarget) return;
    
    await updateTargetDetails(selectedTarget.id, editAlias);
    
    // Update local modal target state
    setSelectedTarget({
      ...selectedTarget,
      alias: editAlias
    });
    setIsEditing(false);
  };

  // Filter camera names
  const uniqueCameras = Array.from(new Set(cameras.map(c => c.name)));

  // Filter and Sort Logic
  const filteredTargets = targets
    .filter(t => {
      const aliasStr = (t.alias ?? '');
      const idStr = String(t.id ?? '');
      const matchesSearch = aliasStr.toLowerCase().includes(searchQuery.toLowerCase()) || idStr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSource = true; // lastSource is not implemented
      return matchesSearch && matchesStatus && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'embeddings') {
        return b.embeddingsCount - a.embeddingsCount;
      }
      if (sortBy === 'alias-asc') {
        return (a.alias ?? '').localeCompare(b.alias ?? '');
      }
      if (sortBy === 'alias-desc') {
        return (b.alias ?? '').localeCompare(a.alias ?? '');
      }
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="Identity registry"
        title="Biometric Gallery"
        description="Persistent database of acquired subject models and ReID vector profiles."
        actions={
          <Button onClick={() => router.push('/acquisition')} className="shrink-0">
            <Plus className="w-4 h-4" />
            <span>Acquire New Target</span>
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 p-4 select-none">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl">
          <Search className="w-4 h-4 text-[color:var(--fg-muted)] shrink-0" />
          <Input placeholder="Search by alias, target ID, clothing..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[color:var(--glass)] border border-[color:var(--border)] rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-[color:var(--fg-muted)]" />
            <span className="text-[color:var(--fg-muted)] font-medium">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-zinc-200 cursor-pointer font-sans"
            >
              <option value="all">All Targets</option>
              <option value="tracked">Tracked</option>
              <option value="idle">Idle</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Camera Source */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[color:var(--glass)] border border-[color:var(--border)] rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-[color:var(--fg-muted)]" />
            <span className="text-[color:var(--fg-muted)] font-medium">Source:</span>
            <select 
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-zinc-850 cursor-pointer font-sans"
            >
              <option value="all">All Cameras</option>
              {uniqueCameras.map(cam => (
                <option key={cam} value={cam}>{cam}</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[color:var(--glass)] border border-[color:var(--border)] rounded-xl text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[color:var(--fg-muted)]" />
            <span className="text-[color:var(--fg-muted)] font-medium">Sort:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-zinc-850 cursor-pointer font-sans"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="embeddings">Embeddings Count</option>
              <option value="alias-asc">Alias (A-Z)</option>
              <option value="alias-desc">Alias (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Targets Grid */}
      {filteredTargets.length === 0 ? (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl py-20 text-center select-none flex flex-col items-center justify-center">
          <Database className="w-10 h-10 text-[color:var(--fg-muted)] mb-3" />
          <span className="text-sm font-semibold text-[color:var(--fg)]">No Profiles Registered</span>
          <span className="text-sm text-[color:var(--fg-muted)] mt-1">Try relaxing filters or run target acquisition.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTargets.map((target) => {
            const isActiveSearch = activeSearchIds.includes(target.id);
            return (
              <div 
                key={target.id}
                onClick={() => handleOpenDetails(target)}
                className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl hover:shadow-md transition-transform transform-gpu hover:scale-[1.01] cursor-pointer group flex flex-col"
              >
                {/* Surveillance profile image card */}
                <div className="p-4">
                  <AvatarCrop 
                    seed={parseInt(target.id, 10) || 50} 
                    alias={target.alias} 
                    status={isActiveSearch ? 'tracked' : 'idle'}
                    previewImagePath={target.previewImagePath}
                    className="w-full rounded-xl"
                  />
                </div>

                {/* Title Description details */}
                  <div className="px-5 pb-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-semibold text-sm text-[color:var(--fg)] truncate group-hover:text-[color:var(--fg)] transition-colors">
                        {target.alias}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold shrink-0">
                        {target.id}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 mt-3 text-[11px] text-[color:var(--fg-muted)] font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate">Created: {formatDate(target.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{target.embeddingsCount} template vectors</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions panel */}
                  <div className="mt-5 pt-3 border-t border-[color:var(--border)] flex items-center justify-between select-none">
                    {/* Search Trigger */}
                    <Button variant={isActiveSearch ? 'outline' : 'ghost'} onClick={(e) => { e.stopPropagation(); if (isActiveSearch) stopSearch(target.id); else startSearch(target.id); }} className="spring">
                      <Radar className={cn("w-3.5 h-3.5", isActiveSearch ? "text-red-500 animate-pulse" : "text-zinc-400")} />
                      <span>{isActiveSearch ? "Active Search" : "Live Search"}</span>
                    </Button>

                    {/* Delete Target details */}
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTarget(target.id); }} title="Purge template" className="spring spring-fast">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Target Modal details dialog */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 backdrop-blur-xs select-none">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-150">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Profile Details / ID: {selectedTarget.id}</span>
              </div>
              <button 
                onClick={() => setSelectedTarget(null)}
                className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-450 hover:text-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Biometrics Card & Main Details */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <AvatarCrop 
                  seed={parseInt(selectedTarget.id, 10) || 50} 
                  alias={selectedTarget.alias} 
                  status={activeSearchIds.includes(selectedTarget.id) ? 'tracked' : 'idle'}
                  previewImagePath={selectedTarget.previewImagePath}
                  className="w-28 h-28 rounded-xl shrink-0"
                />
                
                <div className="flex-1 space-y-4 w-full">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Alias Name</label>
                      <input 
                        type="text"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        className="w-full text-sm font-semibold px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900">{selectedTarget.alias}</h2>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created: {formatDate(selectedTarget.created_at)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                      <span className="text-[9px] font-bold text-zinc-400 block uppercase">Vector Embeddings</span>
                      <span className="font-bold text-zinc-800 mt-0.5 block">{selectedTarget.embeddingsCount} items</span>
                    </div>
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                      <span className="text-[9px] font-bold text-zinc-400 block uppercase">Status</span>
                      <span className="font-bold text-zinc-850 mt-0.5 block capitalize">{selectedTarget.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Fields Note */}
              <div className="border-t border-zinc-100 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-zinc-900 tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-450" />
                    <span>Visual Appearance Metadata</span>
                  </h3>
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors border-none cursor-pointer"
                    >
                      Edit Alias
                    </button>
                  )}
                </div>

                <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 text-xs text-zinc-500 leading-relaxed space-y-2">
                  <p>
                    This profile holds the biometric tracking history for target <strong>{selectedTarget.alias}</strong>.
                  </p>
                  <p className="text-[10px] text-zinc-400 italic">
                    Note: General appearance descriptors (such as clothing features, gender estimates, or age groups) are not implemented in the current backend neural network version.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-150 flex items-center justify-between select-none">
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    const isSearching = activeSearchIds.includes(selectedTarget.id);
                    if (isSearching) {
                      await stopSearch(selectedTarget.id);
                    } else {
                      await startSearch(selectedTarget.id);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer transition-colors",
                    activeSearchIds.includes(selectedTarget.id)
                      ? "border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                      : "border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700"
                  )}
                >
                  <Radar className={cn("w-3.5 h-3.5", activeSearchIds.includes(selectedTarget.id) ? "text-red-500 animate-pulse" : "text-zinc-450")} />
                  <span>
                    {activeSearchIds.includes(selectedTarget.id) ? "Stop Search" : "Start Search"}
                  </span>
                </button>
                
                <button
                  onClick={() => {
                    router.push(`/search?target=${selectedTarget.id}`);
                    setSelectedTarget(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>Go to Feed</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-2 text-zinc-500 hover:text-zinc-700 text-xs font-semibold border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveDetails}
                      className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold border-none cursor-pointer"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedTarget(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold border-none cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
