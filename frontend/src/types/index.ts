export interface Target {
  id: string;
  alias: string;
  created_at: string;
  embeddingsCount: number;
  previewImagePath: string;
  status: string;
}

export interface Camera {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline';
  resolution: string;
  fps: number;
}

export interface TrackingEvent {
  id: string;
  timestamp: string;
  targetId?: string;
  targetAlias?: string;
  source: string;
  eventType: 'lock' | 'detection' | 'lost' | 'acquired';
  confidence: number;
  similarityScore?: number;
}

export interface TrackerSettings {
  similarityThreshold: number;
  confirmationThreshold: number;
  frameInterval: number; // ms
  softDecay: boolean;
  acquisitionMode: 'automatic' | 'manual';
  searchMode: 'local' | 'distributed';
}

export interface SystemOverview {
  generated_at: number;
  counts: {
    registered_targets: number;
    active_searches: number;
    online_cameras: number;
    total_cameras: number;
    active_tracks: number;
    total_embeddings: number;
  };
  tracker: {
    running: boolean;
    mode: string;
    frame_count: number;
    active_tracks_count: number;
  };
  gpu: {
    available: boolean;
    device_name: string | null;
    memory_used_gb: number | null;
    memory_total_gb: number | null;
  };
  storage: {
    embeddings_used_gb: number;
    volume_total_gb: number | null;
    volume_free_gb: number | null;
  };
}
