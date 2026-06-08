"use client";

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import CameraSelector from '../../components/ui/camera-selector';

export default function UIShowcase() {
  const [cameraId, setCameraId] = useState<string | null>(null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">UI Showcase</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Buttons">
          <div className="flex gap-3">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
          </div>
        </Card>

        <Card title="Inputs">
          <div className="space-y-3">
            <Input label="Name" placeholder="Full name" />
            <Input label="Email" placeholder="you@example.com" />
          </div>
        </Card>

        <Card title="Camera Selector">
          <CameraSelector value={cameraId} onChange={setCameraId} />
        </Card>
      </div>
    </div>
  );
}
