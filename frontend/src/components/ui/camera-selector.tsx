"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function CameraSelector({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getCameras().then((list) => {
      if (!mounted) return;
      setCameras(list);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="px-3 py-2 border rounded">
      <option value="">Default</option>
      {cameras.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
