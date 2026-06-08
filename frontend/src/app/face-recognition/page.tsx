"use client";

import React, { useRef, useState, useEffect } from 'react';
import CameraSelector from '../../components/ui/camera-selector';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../services/api';
import { useUi } from '../../providers/ui-provider';

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
  const { addToast } = useUi();

  useEffect(() => {
    fetchProfiles();
  }, []);

  // start local webcam when no camera selected
  useEffect(() => {
    let mounted = true;
    async function startLocal() {
      if (selectedCamera) return;
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
    return () => {
      mounted = false;
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      } catch (e) {}
    };
  }, [selectedCamera]);

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
    <div className="p-8">
      <h1 className="text-2xl font-bold">Face Recognition</h1>
      <p className="text-sm text-zinc-500 mb-6">Enroll faces by uploading an image or capturing from a live camera feed.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Upload Image</h3>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
            <div className="mt-2">
              <Input label="Alias" placeholder="Optional alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
            </div>
            <div className="mt-3">
              <Button disabled={loading || !file} onClick={uploadSingle}>{loading ? 'Uploading...' : 'Enroll Image'}</Button>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Capture From Live Camera</h3>
            <div className="flex items-center gap-3 mb-3">
              <CameraSelector value={selectedCamera} onChange={setSelectedCamera} />
              <span className="text-xs text-zinc-500">Select camera to capture from</span>
            </div>
            <div className="aspect-[16/9] bg-zinc-100 rounded overflow-hidden mb-3">
              {selectedCamera ? (
                <img ref={imgRef} src={api.getStreamUrlForCamera(selectedCamera)} alt="live" className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="mb-2">
                <Input label="Alias" placeholder="Optional alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
              </div>
              <Button disabled={loading} onClick={captureFromStream}>{loading ? 'Capturing...' : 'Capture & Enroll'}</Button>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Profiles</h3>
            <div className="space-y-2">
              {profiles.length === 0 && <div className="text-xs text-zinc-500">No profiles enrolled yet.</div>}
              {profiles.map((p) => (
                <div key={p.id} className="border rounded p-2">
                  <div className="font-bold">{p.alias || p.id}</div>
                  <div className="text-xs text-zinc-500">Method: {p.method}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
