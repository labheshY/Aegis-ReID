import { Target, Camera, TrackerSettings, SystemOverview } from '../types';
import { DEFAULT_CAMERAS, DEFAULT_SETTINGS } from './mockData';

// Allow overriding the API base URL in development via NEXT_PUBLIC_API_BASE_URL.
// If not set, use the relative proxy path handled by Next.js (`/api/v1`).
const _envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const BASE_URL = _envBase ? _envBase.replace(/\/$/, '') : '/api/v1';
export type RuntimeMode = 'idle' | 'acquisition' | 'search';
export interface ActiveTrack {
  bbox: [number, number, number, number];
  confidence: number;
}

class ApiClient {
  async pingHealth(): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/health/ready`, { cache: 'no-store' });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.success === true || body?.ready === true;
  }

  async getOverview(): Promise<SystemOverview | null> {
    const res = await fetch(`${BASE_URL}/overview`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  }

  // GET /targets
  async getTargets(): Promise<Target[]> {
    const res = await fetch(`${BASE_URL}/targets`);
    if (!res.ok) throw new Error('Failed to fetch targets from API');
    return res.json();
  }

  // GET /targets/:id
  async getTargetById(id: string): Promise<Target> {
    const res = await fetch(`${BASE_URL}/targets/${id}`);
    if (!res.ok) throw new Error(`Target ${id} not found`);
    return res.json();
  }

  // DELETE /targets/:id
  async deleteTarget(id: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/targets/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete target ${id}`);
    return true;
  }

  // PUT /targets/:id
  async updateTarget(id: string, updates: Partial<Target>): Promise<Target> {
    const res = await fetch(`${BASE_URL}/targets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Failed to update target ${id}`);
    return res.json();
  }

  // POST /search/start
  async startSearch(targetId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/search/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetId })
    });
    if (!res.ok) throw new Error(`Failed to start search for target ${targetId}`);
    return res.json();
  }

  // POST /search/stop
  async stopSearch(targetId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/search/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetId })
    });
    if (!res.ok) throw new Error(`Failed to stop search for target ${targetId}`);
    return res.json();
  }

  // GET /search/active
  async getActiveSearches(): Promise<{ success: boolean; data: { target_id: string; started_at: string; status: string }[] }> {
    const res = await fetch(`${BASE_URL}/search/active`);
    if (!res.ok) throw new Error('Failed to fetch active searches');
    return res.json();
  }

  // GET /runtime/mode
  async getRuntimeMode(): Promise<{ success: boolean; mode: RuntimeMode }> {
    const res = await fetch(`${BASE_URL}/runtime/mode`);
    if (!res.ok) throw new Error('Failed to fetch runtime mode');
    return res.json();
  }

  // POST /runtime/mode
  async setRuntimeMode(mode: RuntimeMode): Promise<{ success: boolean; data: { mode: RuntimeMode } }> {
    const res = await fetch(`${BASE_URL}/runtime/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) throw new Error(`Failed to set runtime mode to ${mode}`);
    return res.json();
  }

  getStreamUrl(): string {
    return `${BASE_URL}/stream/video`;
  }

  getStreamUrlForCamera(cameraId: string | null): string {
    const base = `${BASE_URL}/stream/video`;
    if (!cameraId) return base;
    return `${base}?camera_id=${encodeURIComponent(cameraId)}`;
  }

  async getTracks(): Promise<{ success: boolean; data: Record<string, ActiveTrack> }> {
    const res = await fetch(`${BASE_URL}/tracks`);
    if (!res.ok) throw new Error('Failed to fetch active tracks');
    return res.json();
  }

  async startAcquisition(data: { track_id?: number; x?: number; y?: number; alias?: string }) {
    const res = await fetch(`${BASE_URL}/acquisition/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let errText = 'Failed to start acquisition';
      try {
        const payload = await res.json();
        if (payload?.detail) errText = payload.detail;
        else if (payload?.message) errText = payload.message;
      } catch (e) {
        try { errText = await res.text(); } catch (e) {}
      }
      throw new Error(errText);
    }
    return res.json();
  }

  async stopAcquisition() {
    const res = await fetch(`${BASE_URL}/acquisition/stop`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to stop acquisition');
    return res.json();
  }

  async getAcquisitionStatus() {
    const res = await fetch(`${BASE_URL}/acquisition/status`);
    if (!res.ok) throw new Error('Failed to fetch acquisition status');
    return res.json();
  }

  async getTrackerSettings() {
    const res = await fetch(`${BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch tracker settings');
    return res.json();
  }

  async updateTrackerSettings(settings: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update tracker settings');
    return res.json();
  }

  // Dummy target acquisition to satisfy types/imports
  async acquireTarget(data: { alias: string }): Promise<Target> {
    const mockTarget: Target = {
      id: String(Math.floor(100 + Math.random() * 900)),
      alias: data.alias,
      created_at: new Date().toISOString(),
      embeddingsCount: 10,
      previewImagePath: "",
      status: "updated"
    };
    return mockTarget;
  }

  // Helper to fetch online cameras
  async getCameras(): Promise<Camera[]> {
    try {
      const res = await fetch(`${BASE_URL}/cameras`);
      if (!res.ok) return DEFAULT_CAMERAS;
      const payload = await res.json();
      return payload.data ?? DEFAULT_CAMERAS;
    } catch (err) {
      return DEFAULT_CAMERAS;
    }
  }

  async getActiveTracks() {
    const response = await fetch(
      `${BASE_URL}/acquisition/tracks`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch active tracks");
    }

    return response.json();
  }
  // Settings sync
  getSettings(): TrackerSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const settings = localStorage.getItem('reid_settings');
    return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
  }

  saveSettings(settings: TrackerSettings) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('reid_settings', JSON.stringify(settings));
  }
}

export const api = new ApiClient();
