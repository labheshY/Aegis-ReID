"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  Radar, 
  Database,
  Calendar,
  X,
  FileText,
  ScanFace,
  ChevronDown
} from 'lucide-react';
import { useTargets } from '../../providers/target-provider';
import { AvatarCrop } from '../../components/ui/avatar-crop';
import { cn, formatDate } from '../../lib/utils';
import { Target } from '../../types';
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
    stopSearch
  } = useTargets();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [activeMenu, setActiveMenu] = useState<'status' | 'source' | 'sort' | null>(null);
  
  // Face Profiles State
  const [faceProfiles, setFaceProfiles] = useState<any[]>([]);

  // Modal State
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editAlias, setEditAlias] = useState('');

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

  // Filter and Sort Logic for ReID
  const filteredTargets = targets
    .filter(t => {
      const aliasStr = t.alias ? String(t.alias).toLowerCase() : '';
      const idStr = t.id ? String(t.id).toLowerCase() : '';
      const searchLower = (searchQuery || '').toLowerCase();
      
      const matchesSearch = aliasStr.includes(searchLower) || idStr.includes(searchLower);
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

  // Filter Logic for Face Profiles
  const filteredFaceProfiles = faceProfiles.filter(f => {
    const aliasStr = f.alias ? String(f.alias).toLowerCase() : '';
    const idStr = f.id ? String(f.id).toLowerCase() : '';
    const searchLower = (searchQuery || '').toLowerCase();
    return aliasStr.includes(searchLower) || idStr.includes(searchLower);
  });

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="Identity registry"
        title="Biometric Gallery"
        description="Persistent database of acquired subject models and ReID vector profiles."
        actions={
          <Button
            onClick={() =>    router.push('/acquisition')} 
            className="inline-flex items-center justify-center w-44 h-8 pl-1.5 pr-4 py-0 rounded-full text-xs font-semibold shrink-0 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-300 tracking-wide whitespace-nowrap -mt-[1px] pl-1.5">
            Acquire New Target
            </span>
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row items-center gap-3 p-4 select-none w-full">
        {/* Search Inputs Section */}
        <div className="flex-1 flex items-center gap-3 w-full h-8 px-3 bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-inner">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input 
            type="text"
            placeholder="Search by alias, target ID, clothing..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-transparent border-none outline-none text-xs font-medium text-zinc-200 placeholder-zinc-500"
          />
        </div>

        {/* Filter Actions Section */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* 1. Status Filter */}
          <div className="relative">
            <button 
              onClick={() => setActiveMenu(activeMenu === 'status' ? null : 'status')}
              className="flex items-center gap-1.5 px-3 h-8 w-40 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer shadow-sm"
            >
              <Filter className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 font-medium shrink-0">Status:</span>
              <span className="text-[11px] font-semibold text-cyan-400 capitalize flex-1 text-left truncate">
                {statusFilter}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
            </button>

            {activeMenu === 'status' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                <div className="absolute right-0 mt-1.5 w-40 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl z-50 p-1.5">
                  {['all', 'tracked', 'idle', 'lost'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setStatusFilter(opt); setActiveMenu(null); }}
                      className={cn(
                        "flex w-full items-center justify-between p-2 rounded-md text-xs font-medium transition-colors text-left capitalize cursor-pointer",
                        statusFilter === opt ? "bg-[#1e293b] text-cyan-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
                      )}
                    >
                      <span>{opt === 'all' ? 'All Targets' : opt}</span>
                      {statusFilter === opt && <span className="w-1 h-1 rounded-full bg-cyan-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 2. Source Filter */}
          <div className="relative">
            <button 
              onClick={() => setActiveMenu(activeMenu === 'source' ? null : 'source')}
              className="flex items-center gap-1.5 px-3 h-8 w-40 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer shadow-sm"
            >
              <Filter className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 font-medium shrink-0">Source:</span>
              <span className="text-[11px] font-semibold text-cyan-400 flex-1 text-left truncate">
                {sourceFilter === 'all' ? 'All' : sourceFilter}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
            </button>

            {activeMenu === 'source' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                <div className="absolute right-0 mt-1.5 w-40 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl z-50 p-1.5">
                  <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    <button
                      onClick={() => { setSourceFilter('all'); setActiveMenu(null); }}
                      className={cn(
                        "flex w-full items-center justify-between p-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer",
                        sourceFilter === 'all' ? "bg-[#1e293b] text-cyan-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
                      )}
                    >
                      <span>All Cameras</span>
                      {sourceFilter === 'all' && <span className="w-1 h-1 rounded-full bg-cyan-400" />}
                    </button>
                    {uniqueCameras.map((cam) => (
                      <button
                        key={cam}
                        onClick={() => { setSourceFilter(cam); setActiveMenu(null); }}
                        className={cn(
                          "flex w-full items-center justify-between p-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer",
                          sourceFilter === cam ? "bg-[#1e293b] text-cyan-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
                        )}
                      >
                        <span className="truncate">{cam}</span>
                        {sourceFilter === cam && <span className="w-1 h-1 rounded-full bg-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. Sorting Filter */}
          <div className="relative">
            <button 
              onClick={() => setActiveMenu(activeMenu === 'sort' ? null : 'sort')}
              className="flex items-center gap-1.5 px-3 h-8 w-40 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer shadow-sm"
            >
              <ArrowUpDown className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 font-medium shrink-0">Sort:</span>
              <span className="text-[11px] font-semibold text-cyan-400 flex-1 text-left truncate">
                {sortBy === 'newest' && 'Newest'}
                {sortBy === 'oldest' && 'Oldest'}
                {sortBy === 'embeddings' && 'Embeddings'}
                {sortBy === 'alias-asc' && 'A-Z'}
                {sortBy === 'alias-desc' && 'Z-A'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
            </button>

            {activeMenu === 'sort' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                <div className="absolute right-0 mt-1.5 w-40 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl z-50 p-1.5">
                  {[
                    { id: 'newest', label: 'Newest First' },
                    { id: 'oldest', label: 'Oldest First' },
                    { id: 'embeddings', label: 'Embeddings Count' },
                    { id: 'alias-asc', label: 'Alias (A-Z)' },
                    { id: 'alias-desc', label: 'Alias (Z-A)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id); setActiveMenu(null); }}
                      className={cn(
                        "flex w-full items-center justify-between p-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer",
                        sortBy === opt.id ? "bg-[#1e293b] text-cyan-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
                      )}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <span className="w-1 h-1 rounded-full bg-cyan-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* ReID Targets Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 px-2">
            <Radar className="w-5 h-5 text-cyan-400" />
            ReID Targets
          </h2>
          {filteredTargets.length === 0 ? (
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl py-20 text-center select-none flex flex-col items-center justify-center">
              <Database className="w-10 h-10 text-[color:var(--fg-muted)] mb-3" />
              <span className="text-sm font-semibold text-[color:var(--fg)]">No ReID Profiles Registered</span>
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
                    className="group/card bg-[#0b1220]/60 border border-[#141c2c] hover:border-[#1e2d42] rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/[0.01] cursor-pointer flex flex-col"
                  >
                    <div className="p-4 pb-0">
                      <div className="relative w-full bg-[#070b14] rounded-xl overflow-hidden border border-[#162235]/60 group-hover/card:border-[#22344f] transition-all duration-300">
                        <AvatarCrop 
                          seed={parseInt(target.id, 10) || 50} 
                          alias={target.alias} 
                          status={isActiveSearch ? 'tracked' : 'idle'}
                          previewImagePath={target.previewImagePath}
                          className="w-full rounded-xl opacity-85 group-hover/card:opacity-100 group-hover/card:scale-[1.02] transition-all duration-500 ease-out"
                        />
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 border-b border-[#141c2c]/80 pb-2">
                          <h3 className="font-display font-bold text-sm text-zinc-200 truncate group-hover/card:text-white transition-colors tracking-tight">
                            {target.alias}
                          </h3>
                          <span className="text-[9px] font-mono font-bold text-sky-400/80 bg-sky-950/30 border border-sky-900/30 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                            ID: {target.id}
                          </span>
                        </div>
                        <div className="space-y-2 mt-3 text-[11px] text-zinc-400 font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-sky-400/90 shrink-0" />
                            <span className="text-zinc-500 font-medium">Created:</span>
                            <span className="text-zinc-400 font-mono text-[12px]">{formatDate(target.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Database className="w-3.5 h-3.5 text-sky-400/90 shrink-0 drop-shadow-[0_0_4px_rgba(56,189,248,0.15)]" />
                            <span className="text-zinc-500 font-medium">Vector Sets:</span>
                            <span className="text-zinc-400 font-mono text-[12px]">
                              {target.embeddingsCount} <span className="text-[10px]  font-mono font-bold uppercase tracking-wider ml-0.5">templates</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 pt-3 border-t border-[#141c2c]/80 flex items-center justify-between select-none">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isActiveSearch) stopSearch(target.id); 
                            else router.push(`/search?mode=person&targetId=${target.id}`); 
                          }} 
                          className={cn(
                            "group/btn inline-flex items-center justify-center h-8 px-4 border text-[11px] font-semibold tracking-wide rounded-full transition-all duration-200 cursor-pointer gap-1.5",
                            isActiveSearch 
                              ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.04)]" 
                              : "border-[#162235] bg-[#070b14] text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/20 hover:border-emerald-900/50"
                          )}
                        >
                          <Radar className={cn(
                            "w-3.5 h-3.5 shrink-0 transition-colors duration-200", 
                            isActiveSearch ? "text-emerald-400 animate-pulse" : "text-zinc-500 group-hover/btn:text-emerald-400"
                          )} />
                          <span className={cn(
                            "transition-colors duration-200",
                            isActiveSearch ? "text-emerald-400" : "group-hover/btn:text-emerald-400"
                          )}>
                            {isActiveSearch ? "Active Search" : "Live Search"}
                          </span>
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteTarget(target.id); 
                          }} 
                          title="Purge template" 
                          className="group/delete inline-flex items-center justify-center w-8 h-8 border border-[#162235] bg-[#070b14] hover:bg-rose-950/20 hover:border-rose-900/50 text-zinc-500 hover:text-rose-400 rounded-full transition-all duration-200 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 transition-colors duration-200" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Face Registry Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 px-2">
            <ScanFace className="w-5 h-5 text-indigo-400" />
            Face Registry Targets
          </h2>
          {filteredFaceProfiles.length === 0 ? (
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl py-20 text-center select-none flex flex-col items-center justify-center">
              <Database className="w-10 h-10 text-[color:var(--fg-muted)] mb-3" />
              <span className="text-sm font-semibold text-[color:var(--fg)]">No Face Profiles Registered</span>
              <span className="text-sm text-[color:var(--fg-muted)] mt-1">Enroll a face to use biometric identity search.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFaceProfiles.map((face) => {
                // Determine if this face ID is actively being searched. (Using same activeSearchIds logic if applicable)
                const isActiveSearch = activeSearchIds.includes(face.id);
                return (
                  <div 
                    key={face.id}
                    className="group/card bg-[#0b1220]/60 border border-[#141c2c] hover:border-[#1e2d42] rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/[0.01] cursor-pointer flex flex-col"
                  >
                    <div className="p-4 pb-0">
                      <div className="relative w-full bg-[#070b14] rounded-xl overflow-hidden border border-[#162235]/60 group-hover/card:border-[#22344f] transition-all duration-300">
                        <AvatarCrop 
                          seed={parseInt(face.id, 10) || 100} 
                          alias={face.alias} 
                          status={isActiveSearch ? 'tracked' : 'idle'}
                          className="w-full rounded-xl opacity-85 group-hover/card:opacity-100 group-hover/card:scale-[1.02] transition-all duration-500 ease-out"
                        />
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 border-b border-[#141c2c]/80 pb-2">
                          <h3 className="font-display font-bold text-sm text-zinc-200 truncate group-hover/card:text-white transition-colors tracking-tight">
                            {face.alias}
                          </h3>
                          <span className="text-[9px] font-mono font-bold text-indigo-400/80 bg-indigo-950/30 border border-indigo-900/30 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                            ID: {face.id}
                          </span>
                        </div>
                      </div>
                      <div className="mt-5 pt-3 border-t border-[#141c2c]/80 flex items-center justify-between select-none">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isActiveSearch) stopSearch(face.id); 
                            else router.push(`/search?mode=face&targetId=${face.id}`); 
                          }} 
                          className={cn(
                            "group/btn inline-flex items-center justify-center h-8 px-4 border text-[11px] font-semibold tracking-wide rounded-full transition-all duration-200 cursor-pointer gap-1.5",
                            isActiveSearch 
                              ? "border-indigo-900/60 bg-indigo-950/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.04)]" 
                              : "border-[#162235] bg-[#070b14] text-zinc-400 hover:text-indigo-400 hover:bg-indigo-950/20 hover:border-indigo-900/50"
                          )}
                        >
                          <ScanFace className={cn(
                            "w-3.5 h-3.5 shrink-0 transition-colors duration-200", 
                            isActiveSearch ? "text-indigo-400 animate-pulse" : "text-zinc-500 group-hover/btn:text-indigo-400"
                          )} />
                          <span className={cn(
                            "transition-colors duration-200",
                            isActiveSearch ? "text-indigo-400" : "group-hover/btn:text-indigo-400"
                          )}>
                            {isActiveSearch ? "Active Search" : "Live Search"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Target Modal details dialog */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090d16]/80 backdrop-blur-sm select-none">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#141b2b]">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wide">
                  Profile Details / ID: {selectedTarget.id}
                </span>
              </div>
              <Button 
                onClick={() => setSelectedTarget(null)}
                className="p-1 hover:bg-[#1e293b] rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="relative group shrink-0">
                  <AvatarCrop 
                    seed={parseInt(selectedTarget.id, 10) || 50} 
                    alias={selectedTarget.alias} 
                    status={activeSearchIds.includes(selectedTarget.id) ? 'tracked' : 'idle'}
                    previewImagePath={selectedTarget.previewImagePath}
                    className="w-28 h-28 rounded-xl shrink-0 border border-[#1e293b] shadow-md group-hover:border-zinc-700/50 transition-colors"
                  />
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Target Identity Alias</label>
                      <input 
                        type="text"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        className="w-full text-xs font-semibold px-3 h-8 bg-[#090d16] border border-[#1e293b] text-zinc-200 rounded-lg outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-zinc-100 tracking-tight leading-tight">
                        {selectedTarget.alias}
                      </h2>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Registered: {formatDate(selectedTarget.created_at)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#090d16]/60 p-3 rounded-xl border border-[#141b2b] flex flex-col justify-between h-14">
                      <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Vector Set</span>
                      <span className="font-bold text-cyan-400 text-xs mt-0.5 block tracking-wide">
                        {selectedTarget.embeddingsCount} <span className="text-[10px] font-medium text-zinc-500 font-sans">profiles</span>
                      </span>
                    </div>
                    <div className="bg-[#090d16]/60 p-3 rounded-xl border border-[#141b2b] flex flex-col justify-between h-14">
                      <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Pipeline Node</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          selectedTarget.status === 'tracked' ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                        )} />
                        <span className={cn(
                          "font-bold text-xs capitalize tracking-wide",
                          selectedTarget.status === 'tracked' ? "text-emerald-400" : "text-zinc-300"
                        )}>
                          {selectedTarget.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#141b2b] pt-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>Visual Appearance Descriptors</span>
                  </h3>
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-cyan-400 transition-colors border-none cursor-pointer"
                    >
                      Edit Alias
                    </button>
                  )}
                </div>

                <div className="bg-[#090d16]/60 border border-[#1e293b]/70 rounded-xl p-4 text-xs text-zinc-400 leading-relaxed space-y-2.5">
                  <p>
                    This neural profile registers active biometric signature history mapping and re-identification vectors for subject <strong className="text-zinc-200 font-semibold">{selectedTarget.alias}</strong>.
                  </p>
                  <div className="h-[1px] w-full bg-[#1e293b]/50 my-1" />
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    <span className="text-[10px] font-bold text-amber-500/80 tracking-wider uppercase font-mono mr-1.5">[System Limit]:</span>
                    Soft biometric semantic descriptors (e.g., specific clothing features, demographic categorizations, or age profiles) are offline under the active neural engine version.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#090d16] border-t border-[#141b2b] flex items-center justify-between select-none">
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    const isSearching = activeSearchIds.includes(selectedTarget.id);
                    if (isSearching) {
                      await stopSearch(selectedTarget.id);
                    } else {
                      await startSearch(selectedTarget.id, 'person');
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-4 py-0 border rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0",
                    activeSearchIds.includes(selectedTarget.id)
                      ? "border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40"
                      : "border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] text-zinc-300 hover:text-zinc-100"
                  )}
                >
                  <Radar className={cn("w-3.5 h-3.5 shrink-0", activeSearchIds.includes(selectedTarget.id) ? "text-rose-400 animate-pulse" : "text-zinc-500")} />
                  <span>
                    {activeSearchIds.includes(selectedTarget.id) ? "Stop Search" : "Start Search"}
                  </span>
                </Button>
                
                <Button
                  onClick={() => {
                    router.push(`/search?mode=person&targetId=${selectedTarget.id}`);
                    setSelectedTarget(null);
                  }}
                  className="flex items-center gap-1.5 h-8 px-4 py-0 border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] text-zinc-300 hover:text-zinc-100 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                >
                  <span>Go to Feed</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={() => setIsEditing(false)}
                      className="h-8 px-3.5 py-0 text-zinc-500 hover:text-zinc-300 text-xs font-semibold border-none cursor-pointer bg-transparent shadow-none hover:shadow-none hover:scale-100"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveDetails}
                      className="h-8 px-4 py-0 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-400 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setSelectedTarget(null)}
                    className="h-8 px-4 py-0 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-zinc-300 hover:text-zinc-100 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
