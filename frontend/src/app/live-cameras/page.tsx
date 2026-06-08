"use client";

import React, { useState } from 'react';
import CameraSelector from '../../components/ui/camera-selector';
import { api } from '../../services/api';
import { useUi } from '../../providers/ui-provider';

export default function LiveCamerasPage() {
  const [cameraId, setCameraId] = useState<string | null>(null);

  // Activate camera when selection changes
  React.useEffect(() => {
    let mounted = true;
    if (!cameraId) return;
    (async () => {
      try {
        await fetch(`/api/v1/cameras/${cameraId}/activate`, { method: 'POST' });
        if (!mounted) return;
        // small delay to allow frames to flow
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error('Failed to activate camera', err);
      }
    })();
    return () => { mounted = false; };
  }, [cameraId]);

  const { addToast } = useUi();

  // click-to-acquire
  const onClickStream = async (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const dispW = rect.width;
    const dispH = rect.height;

    // Map to tracker resolution (default 640x360)
    const TRACKER_W = 640;
    const TRACKER_H = 360;

    const x = Math.round((clickX / dispW) * TRACKER_W);
    const y = Math.round((clickY / dispH) * TRACKER_H);

    try {
      const res = await api.startAcquisition({ x, y });
      addToast({ title: 'Acquisition Started', description: 'Acquisition started for clicked person', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Acquisition Failed', description: String(err.message || err), type: 'error' });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Live Cameras</h1>
        <CameraSelector value={cameraId} onChange={setCameraId} />
      </div>

      <div>
        <img onClick={onClickStream} src={api.getStreamUrlForCamera(cameraId)} alt="Live stream" style={{ width: '100%', maxWidth: 960, cursor: 'crosshair' }} />
      </div>
    </div>
  );
}
