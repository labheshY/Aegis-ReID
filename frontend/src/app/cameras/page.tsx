"use client";

import React, { useEffect, useState } from 'react';
import { Server, Video, Trash2, CheckCircle2, Play, Plus, Network, TerminalSquare } from 'lucide-react';
import { api } from '../../services/api';
import { useUi } from '../../providers/ui-provider';
import { PageHeader } from '../../components/layout/page-header';
import { cn } from '../../lib/utils';

type CameraMode = 'rtsp' | 'ip';
type CameraRow = {
  id: string;
  name?: string;
  source?: string;
  status?: string; // status might be available if we fetch it or it's added
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [form, setForm] = useState({ id: '', name: '', source: '' });
  const [mode, setMode] = useState<CameraMode>('rtsp');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('554');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [path, setPath] = useState('/');
  const [rtspUrl, setRtspUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const { addToast } = useUi();

  useEffect(() => {
    api.getCameras().then(setCameras);
  }, []);

  const addCamera = async () => {
    let source = form.source;
    if (mode === 'rtsp') {
      source = rtspUrl || form.source;
    } else {
      if (!ip) {
        addToast({ title: 'Validation', description: 'IP address is required', type: 'error' });
        return;
      }
      const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
      const p = port ? `:${port}` : '';
      const pth = path.startsWith('/') ? path : `/${path}`;
      source = `rtsp://${auth}${ip}${p}${pth}`;
    }

    const idToUse = form.id && form.id.trim() ? form.id.trim() : `cam-${Date.now().toString().slice(-6)}`;
    const payload = { ...form, id: idToUse, source, enabled: true };

    setAdding(true);
    try {
      const res = await fetch('/api/v1/cameras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create camera');
      }
      const created = await res.json();

      const camId = created?.data?.id || idToUse;

      const testRes = await fetch(`/api/v1/cameras/${encodeURIComponent(camId)}/test`);
      const testJson = await testRes.json();
      if (testJson?.success) {
        await fetch(`/api/v1/cameras/${encodeURIComponent(camId)}/activate`, { method: 'POST' });
        addToast({ title: 'Camera Activated', description: `Camera ${payload.name || camId} activated and added`, type: 'success' });
      } else {
        addToast({ title: 'Camera Added', description: testJson?.message || 'Saved, but no frame was received yet', type: 'info' });
      }
    } catch (err: unknown) {
      addToast({ title: 'Camera Add Error', description: errorMessage(err), type: 'error' });
    } finally {
      const list = await api.getCameras();
      setCameras(list);
      setAdding(false);
      // Reset form on success
      setForm({ id: '', name: '', source: '' });
      setRtspUrl('');
      setIp('');
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/v1/cameras/${id}`, { method: 'DELETE' });
    setCameras(await api.getCameras());
    addToast({ title: 'Node Removed', description: `Camera ${id} removed from registry`, type: 'info' });
  };

  const testCamera = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/cameras/${id}/test`);
      const payload = await res.json();
      if (payload.success) addToast({ title: 'Node Diagnostic', description: payload.message || 'Frame received successfully', type: 'success' });
      else addToast({ title: 'Node Diagnostic', description: payload.message || 'No frame received', type: 'error' });
    } catch (err: unknown) {
      addToast({ title: 'Diagnostic Failed', description: errorMessage(err), type: 'error' });
    }
  };

  const activate = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/cameras/${id}/activate`, { method: 'POST' });
      const payload = await res.json();
      if (payload.success) {
        addToast({ title: 'Node Activated', description: payload.message || `Activated stream for ${id}`, type: 'success' });
      } else {
        addToast({ title: 'Activation Failed', description: JSON.stringify(payload), type: 'error' });
      }
    } catch (err: unknown) {
      addToast({ title: 'Activation Error', description: errorMessage(err), type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 font-ui">
      <PageHeader
        badge="Infrastructure"
        title="Camera Node Registry"
        description="Manage the mesh network of surveillance feeds. Add RTSP streams or IP camera credentials to bind them to the ReID engine."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Add Camera Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="aegis-panel p-6 select-none">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-5">
              <Network className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-zinc-100 tracking-tight">Provision New Node</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Node ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. CAM-05" 
                  value={form.id} 
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl outline-none font-mono text-zinc-300 placeholder:text-zinc-700 focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Display Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Lobby Entrance" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl outline-none font-medium text-zinc-300 placeholder:text-zinc-700 focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Protocol Mode</label>
                <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                  <button
                    onClick={() => setMode('rtsp')}
                    className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer", mode === 'rtsp' ? "bg-zinc-800 text-zinc-100 border border-zinc-700" : "text-zinc-500 hover:text-zinc-300 border border-transparent")}
                  >
                    Raw RTSP
                  </button>
                  <button
                    onClick={() => setMode('ip')}
                    className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer", mode === 'ip' ? "bg-zinc-800 text-zinc-100 border border-zinc-700" : "text-zinc-500 hover:text-zinc-300 border border-transparent")}
                  >
                    IP / Auth
                  </button>
                </div>
              </div>

              {mode === 'rtsp' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Stream URL</label>
                  <input 
                    type="text" 
                    placeholder="rtsp://192.168.1.100:554/stream1" 
                    value={rtspUrl} 
                    onChange={(e) => setRtspUrl(e.target.value)}
                    disabled={adding}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl outline-none font-mono text-zinc-300 placeholder:text-zinc-700 focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">IP Address</label>
                      <input 
                        type="text" 
                        placeholder="192.168.1.10" 
                        value={ip} 
                        onChange={(e) => setIp(e.target.value)} 
                        disabled={adding} 
                        className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-xs text-zinc-300 focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Port</label>
                      <input 
                        type="text" 
                        placeholder="554" 
                        value={port} 
                        onChange={(e) => setPort(e.target.value)} 
                        disabled={adding} 
                        className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-xs text-zinc-300 focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Username</label>
                      <input 
                        type="text" 
                        placeholder="admin" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        disabled={adding} 
                        className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-xs text-zinc-300 focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        disabled={adding} 
                        className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-xs text-zinc-300 focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Path</label>
                    <input 
                      type="text" 
                      placeholder="/h264/stream" 
                      value={path} 
                      onChange={(e) => setPath(e.target.value)} 
                      disabled={adding} 
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg outline-none font-mono text-xs text-zinc-300 focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={addCamera}
                disabled={adding}
                className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {adding ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" /> Provisioning...</span>
                ) : (
                  <><Plus className="w-4 h-4" /> Provision Node</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Camera List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-zinc-400 tracking-tight uppercase">Active Registry</h3>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">{cameras.length} NODES TOTAL</span>
          </div>

          {cameras.length === 0 ? (
            <div className="aegis-panel py-16 flex flex-col items-center justify-center text-zinc-500 text-center select-none">
              <Server className="w-10 h-10 mb-4 opacity-50" />
              <span className="font-semibold text-zinc-300">Registry Empty</span>
              <span className="text-xs mt-1">Provision a new camera node to begin tracking.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {cameras.map((c) => (
                <div key={c.id} className="aegis-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-start gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100 truncate">{c.name || 'Unnamed Node'}</span>
                        <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-widest">{c.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-zinc-500 truncate">
                        <TerminalSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => testCamera(c.id)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                      title="Diagnostic Test"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => activate(c.id)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                      title="Activate Stream"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1" />
                    <button 
                      onClick={() => remove(c.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Remove Node"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
