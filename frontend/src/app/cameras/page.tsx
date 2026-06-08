"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useUi } from '../../providers/ui-provider';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function CamerasPage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [form, setForm] = useState({ id: '', name: '', source: '' });
  const [mode, setMode] = useState<'rtsp' | 'ip'>('rtsp');
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
      // build rtsp from ip/credentials
      if (!ip) {
        addToast({ title: 'Validation', description: 'IP address is required', type: 'error' });
        return;
      }
      const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
      const p = port ? `:${port}` : '';
      const pth = path.startsWith('/') ? path : `/${path}`;
      source = `rtsp://${auth}${ip}${p}${pth}`;
    }

    // ensure id
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

      // Test camera before keeping it
      const testRes = await fetch(`/api/v1/cameras/${encodeURIComponent(camId)}/test`);
      const testJson = await testRes.json();
      if (testJson?.success) {
        // Activate camera
        await fetch(`/api/v1/cameras/${encodeURIComponent(camId)}/activate`, { method: 'POST' });
        addToast({ title: 'Camera Activated', description: `Camera ${payload.name || camId} activated and added`, type: 'success' });
      } else {
        // remove camera if test failed
        await fetch(`/api/v1/cameras/${encodeURIComponent(camId)}`, { method: 'DELETE' });
        addToast({ title: 'Camera Test Failed', description: testJson?.message || 'Unable to receive frame', type: 'error' });
      }
    } catch (err: any) {
      addToast({ title: 'Camera Add Error', description: String(err.message || err), type: 'error' });
    } finally {
      const list = await api.getCameras();
      setCameras(list);
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/v1/cameras/${id}`, { method: 'DELETE' });
    setCameras(await api.getCameras());
    addToast({ title: 'Camera Removed', description: `Camera ${id} removed`, type: 'info' });
  };

  const testCamera = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/cameras/${id}/test`);
      const payload = await res.json();
      if (payload.success) addToast({ title: 'Camera Test', description: payload.message || 'Frame received', type: 'success' });
      else addToast({ title: 'Camera Test', description: payload.message || 'No frame', type: 'error' });
    } catch (err: any) {
      addToast({ title: 'Camera Test Failed', description: String(err.message || err), type: 'error' });
    }
  };

  const activate = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/cameras/${id}/activate`, { method: 'POST' });
      const payload = await res.json();
      if (payload.success) {
        addToast({ title: 'Camera Activated', description: payload.message || `Activated ${id}`, type: 'success' });
      } else {
        addToast({ title: 'Activation Failed', description: JSON.stringify(payload), type: 'error' });
      }
    } catch (err: any) {
      addToast({ title: 'Activation Error', description: String(err.message || err), type: 'error' });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Camera Management</h1>

      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <Input placeholder="id" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          <Input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="ml-2">
            <label className="text-xs">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="px-2 py-1 border ml-2">
              <option value="rtsp">RTSP URL</option>
              <option value="ip">IP + Credentials</option>
            </select>
          </div>
        </div>

        {mode === 'rtsp' ? (
            <div className="flex items-center gap-2">
            <Input placeholder="rtsp://..." value={rtspUrl} onChange={(e) => setRtspUrl(e.target.value)} className="w-80" disabled={adding} />
            <Button onClick={addCamera} disabled={adding}>{adding ? 'Adding...' : 'Add Camera'}</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input placeholder="IP" value={ip} onChange={(e) => setIp(e.target.value)} disabled={adding} />
            <Input placeholder="port" value={port} onChange={(e) => setPort(e.target.value)} className="w-20" disabled={adding} />
            <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={adding} />
            <Input placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" disabled={adding} />
            <Input placeholder="path (e.g. /h264)" value={path} onChange={(e) => setPath(e.target.value)} className="w-40" disabled={adding} />
            <Button onClick={addCamera} disabled={adding}>{adding ? 'Adding...' : 'Add Camera'}</Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {cameras.map((c) => (
          <div key={c.id} className="flex items-center justify-between border p-3 rounded">
            <div>
              <div className="font-bold">{c.name} <span className="text-xs text-zinc-400 ml-2">{c.id}</span></div>
              <div className="text-xs text-zinc-500">{c.source}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => testCamera(c.id)}>Test</Button>
              <Button variant="ghost" onClick={() => activate(c.id)}>Activate</Button>
              <Button variant="ghost" onClick={() => remove(c.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
