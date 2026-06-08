import { Target, Camera, TrackingEvent, TrackerSettings } from '../types';

// Fallback mock targets (only used if API is unavailable).
// These match the production Target interface exactly.
export const DEFAULT_TARGETS: Target[] = [
  {
    id: "TRK-092",
    alias: "David Miller",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    embeddingsCount: 154,
    previewImagePath: "",
    status: "updated"
  },
  {
    id: "TRK-104",
    alias: "Sarah Connor",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    embeddingsCount: 88,
    previewImagePath: "",
    status: "updated"
  },
  {
    id: "TRK-211",
    alias: "Unknown Subject #03",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    embeddingsCount: 42,
    previewImagePath: "",
    status: "updated"
  },
  {
    id: "TRK-302",
    alias: "Elena Rostova",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    embeddingsCount: 210,
    previewImagePath: "",
    status: "updated"
  },
  {
    id: "TRK-415",
    alias: "Marcus Vance",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    embeddingsCount: 64,
    previewImagePath: "",
    status: "updated"
  }
];

export const DEFAULT_CAMERAS: Camera[] = [
  {
    id: "CAM-01",
    name: "Main Gate / Access Control",
    url: "mock://cam-01",
    status: "online",
    resolution: "1920x1080",
    fps: 30
  },
  {
    id: "CAM-02",
    name: "Parking Structure East",
    url: "mock://cam-02",
    status: "online",
    resolution: "1920x1080",
    fps: 24
  },
  {
    id: "CAM-03",
    name: "Lobby & Main Reception",
    url: "mock://cam-03",
    status: "online",
    resolution: "1920x1080",
    fps: 30
  },
  {
    id: "CAM-04",
    name: "Loading Dock & Freight",
    url: "mock://cam-04",
    status: "online",
    resolution: "1920x1080",
    fps: 15
  },
  {
    id: "CAM-05",
    name: "Executive Suite Hallway",
    url: "mock://cam-05",
    status: "online",
    resolution: "1280x720",
    fps: 30
  },
  {
    id: "CAM-06",
    name: "Server Room Entry (Aux)",
    url: "mock://cam-06",
    status: "offline",
    resolution: "1280x720",
    fps: 0
  }
];

export const DEFAULT_EVENTS: TrackingEvent[] = [
  {
    id: "EVT-1001",
    timestamp: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    targetId: "TRK-092",
    targetAlias: "David Miller",
    source: "Main Gate (Cam 1)",
    eventType: "lock",
    confidence: 0.942,
    similarityScore: 0.961
  },
  {
    id: "EVT-1002",
    timestamp: new Date(Date.now() - 480000).toISOString(), // 8 mins ago
    source: "Parking Lot B (Cam 2)",
    eventType: "detection",
    confidence: 0.812
  },
  {
    id: "EVT-1003",
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
    targetId: "TRK-211",
    targetAlias: "Unknown Subject #03",
    source: "Loading Dock (Cam 4)",
    eventType: "lost",
    confidence: 0.65
  },
  {
    id: "EVT-1004",
    timestamp: new Date(Date.now() - 120000).toISOString(), // 2 mins ago
    targetId: "TRK-104",
    targetAlias: "Sarah Connor",
    source: "Lobby Elevator (Cam 3)",
    eventType: "lock",
    confidence: 0.887,
    similarityScore: 0.915
  },
  {
    id: "EVT-1005",
    timestamp: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
    targetId: "TRK-302",
    targetAlias: "Elena Rostova",
    source: "Executive Suite (Cam 5)",
    eventType: "lock",
    confidence: 0.978,
    similarityScore: 0.985
  }
];

export const DEFAULT_SETTINGS: TrackerSettings = {
  similarityThreshold: 0.82,
  confirmationThreshold: 0.85,
  frameInterval: 250, // ms
  softDecay: true,
  acquisitionMode: "manual",
  searchMode: "local"
};

// Generator utilities for tracking simulator loops
export function generateRandomEvent(targets: Target[], cameras: Camera[]): TrackingEvent {
  const onlineCameras = cameras.filter(c => c.status === 'online');
  const selectedCamera = onlineCameras[Math.floor(Math.random() * onlineCameras.length)];
  
  // 40% chance of locking on a known target, 40% chance of general untracked person detection, 10% target lost, 10% target acquired
  const roll = Math.random();
  const timestamp = new Date().toISOString();
  
  if (roll < 0.4 && targets.length > 0) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    const similarity = 0.80 + Math.random() * 0.19;
    return {
      id: `EVT-${Math.floor(Math.random() * 100000)}`,
      timestamp,
      targetId: target.id,
      targetAlias: target.alias,
      source: selectedCamera.name,
      eventType: "lock",
      confidence: 0.85 + Math.random() * 0.14,
      similarityScore: similarity
    };
  } else if (roll < 0.8) {
    return {
      id: `EVT-${Math.floor(Math.random() * 100000)}`,
      timestamp,
      source: selectedCamera.name,
      eventType: "detection",
      confidence: 0.70 + Math.random() * 0.25
    };
  } else if (roll < 0.9 && targets.length > 0) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      id: `EVT-${Math.floor(Math.random() * 100000)}`,
      timestamp,
      targetId: target.id,
      targetAlias: target.alias,
      source: selectedCamera.name,
      eventType: "lost",
      confidence: 0.50 + Math.random() * 0.20
    };
  } else {
    // Acquire event simulation
    const target = targets[Math.floor(Math.random() * targets.length)];
    return {
      id: `EVT-${Math.floor(Math.random() * 100000)}`,
      timestamp,
      targetId: target?.id,
      targetAlias: target?.alias,
      source: selectedCamera.name,
      eventType: "acquired",
      confidence: 0.95
    };
  }
}
