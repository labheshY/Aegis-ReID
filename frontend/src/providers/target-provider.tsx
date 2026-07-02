"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Target, Camera, TrackingEvent, TrackerSettings } from '../types';
import { api } from '../services/api';
import { useUi } from './ui-provider';

interface TargetContextType {
  targets: Target[];
  cameras: Camera[];
  events: TrackingEvent[];
  activeTargetId: string | null;
  setActiveTargetId: (id: string | null) => void;
  activeSearchIds: string[];
  loading: boolean;
  error: string | null;
  refreshTargets: () => Promise<void>;
  acquireNewTarget: (alias: string, metadata?: any) => Promise<Target>;
  deleteTarget: (id: string) => Promise<void>;
  updateTargetDetails: (id: string, alias: string, metadata?: any) => Promise<void>;
  startSearch: (id: string, trackingMode: 'person' | 'face' | 'hybrid') => Promise<void>;
  stopSearch: (id: string) => Promise<void>;
  setCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
  clearEvents: () => void;
  // Search UI State
  searchCameras: string[];
  setSearchCameras: React.Dispatch<React.SetStateAction<string[]>>;
  searchSimilarityFeed: number[];
  setSearchSimilarityFeed: React.Dispatch<React.SetStateAction<number[]>>;
  searchIsPlaying: boolean;
  setSearchIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  searchTrackingMode: 'face' | 'person' | 'hybrid';
  setSearchTrackingMode: React.Dispatch<React.SetStateAction<'face' | 'person' | 'hybrid'>>;
}

const TargetContext = createContext<TargetContextType | undefined>(undefined);

export const TargetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useUi();
  
  const [targets, setTargets] = useState<Target[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [activeSearchIds, setActiveSearchIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search UI State Persistence
  const [searchCameras, setSearchCameras] = useState<string[]>(["CAM-01", "CAM-02", "CAM-03", "CAM-04"]);
  const [searchSimilarityFeed, setSearchSimilarityFeed] = useState<number[]>([92, 94, 91, 95, 94, 96, 93, 94, 95, 96]);
  const [searchIsPlaying, setSearchIsPlaying] = useState(true);
  const [searchTrackingMode, setSearchTrackingMode] = useState<'face' | 'person' | 'hybrid'>('person');

  // Track whether the very first load has completed
  const isInitialLoadRef = useRef(true);

  // Load and refresh state

  const loadData = useCallback(async () => {
    try {
      const fetchedTargets = await api.getTargets();
      const fetchedCameras = await api.getCameras();
      const activeRes = await api.getActiveSearches();
      
      let backendSettings = null;
      try {
        const settingsRes = await api.getTrackerSettings();
        if (settingsRes && settingsRes.success) {
          backendSettings = settingsRes.data;
        }
      } catch (settingsErr) {
        console.warn("Failed to fetch tracker settings from backend, using local defaults:", settingsErr);
      }

      const activeIds = activeRes.success ? activeRes.data.map((d: { target_id: string }) => d.target_id) : [];

      setTargets(fetchedTargets);
      setCameras(fetchedCameras);
      setActiveSearchIds(activeIds);

      
      setError(null);
    } catch (err: any) {
      console.error('Error polling data:', err);
      // Only surface the error banner on the very first load.
      // Subsequent poll failures are silent so the UI stays usable.
      if (isInitialLoadRef.current) {
        setError(err.message || 'Failed to connect to FastAPI backend');
      }
    } finally {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Periodic polling for target list & active searches (every 5 seconds)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [loadData]);

  // Periodic polling for events (synthesizing from matches)
  useEffect(() => {
    if (activeSearchIds.length === 0) return;
    const eventsInterval = setInterval(async () => {
      try {
        const res = await api.getSearchMatches();
        if (res.success && res.data && res.data.length > 0) {
          const currentTargetId = activeTargetId;
          const newEvents = res.data.map((match: any) => ({
            id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            targetId: currentTargetId ?? activeSearchIds[0] ?? 'unknown',
            targetAlias: match.alias || 'Unknown',
            source: match.camera_id || 'Unknown Camera',
            eventType: match.status === 'confirmed' ? 'lock' : 'detection',
            confidence: match.similarity || 0.8,
            similarityScore: match.similarity
          }));
          
          setEvents(prev => {
            const combined = [...newEvents, ...prev];
            return combined.slice(0, 100); // keep last 100 events
          });
        }
      } catch (err) {
        // silent fail
      }
    }, 2000);
    return () => clearInterval(eventsInterval);
  }, [activeTargetId, activeSearchIds]);

  const refreshTargets = useCallback(async () => {
    try {
      const fetchedTargets = await api.getTargets();
      setTargets(fetchedTargets);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Delete target
  const deleteTarget = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await api.deleteTarget(id);
      setTargets(prev => prev.filter(t => t.id !== id));
      setActiveSearchIds(prev => prev.filter(sid => sid !== id));
      if (activeTargetId === id) {
        setActiveTargetId(null);
      }
      addToast({
        title: "Target Purged Successfully",
        description: `Subject identifier ${id} has been deleted from backend database.`,
        type: "success"
      });
    } catch (err: any) {
      addToast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete target from server.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [activeTargetId, addToast]);

  // Update Target Alias (PUT /targets/:id)
  const updateTargetDetails = useCallback(async (id: string, alias: string, metadata?: any) => {
    try {
      setLoading(true);
      const updated = await api.updateTarget(id, { alias });
      setTargets(prev => prev.map(t => t.id === id ? updated : t));
      addToast({
        title: "Target Profile Updated",
        description: `Alias changed to "${alias}" on the backend database.`,
        type: "success"
      });
    } catch (err: any) {
      addToast({
        title: "Update Failed",
        description: err.message || "Failed to update target details.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Start Search (POST /search/start)
  const startSearch = useCallback(async (id: string, trackingMode: 'person' | 'face' | 'hybrid') => {
    try {
      const target = targets.find(t => t.id === id);
      const aliasName = target ? target.alias : `Subject #${id}`;
      
      await api.setRuntimeMode('search');
      await api.startSearch(id, trackingMode);
      
      setActiveSearchIds(prev => [...new Set([...prev, id])]);
      
      addToast({
        title: "Tracking Corridor Initialized",
        description: `Active ${trackingMode} search launched for appearance signature: ${aliasName}.`,
        type: "red-lock"
      });
    } catch (err: any) {
      addToast({
        title: "Search Activation Failed",
        description: err.message || "Could not communicate search start command.",
        type: "error"
      });
    }
  }, [targets, addToast]);

  // Stop Search (POST /search/stop)
  const stopSearch = useCallback(async (id: string) => {
    try {
      const target = targets.find(t => t.id === id);
      const aliasName = target ? target.alias : `Subject #${id}`;
      
      await api.stopSearch(id);
      await api.setRuntimeMode('idle');
      
      setActiveSearchIds(prev => prev.filter(sid => sid !== id));
      
      addToast({
        title: "Search Terminated",
        description: `Appearance matching stop command sent for: ${aliasName}.`,
        type: "info"
      });
    } catch (err: any) {
      addToast({
        title: "Search Stop Failed",
        description: err.message || "Could not communicate search stop command.",
        type: "error"
      });
    }
  }, [targets, addToast]);

  // Simulated capture stub to fulfill types
  const acquireNewTarget = useCallback(async (alias: string, metadata?: any) => {
    const newTarget = await api.acquireTarget({ alias });
    setTargets(prev => [newTarget, ...prev]);
    return newTarget;
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('reid_events', JSON.stringify([]));
    }
  }, []);

  return (
    <TargetContext.Provider
      value={{
        targets,
        cameras,
        events,
        activeTargetId,
        setActiveTargetId,
        activeSearchIds,
        loading,
        error,
        refreshTargets,
        acquireNewTarget,
        deleteTarget,
        updateTargetDetails,
        startSearch,
        stopSearch,
        setCameras,
        clearEvents,
        searchCameras,
        setSearchCameras,
        searchSimilarityFeed,
        setSearchSimilarityFeed,
        searchIsPlaying,
        setSearchIsPlaying,
        searchTrackingMode,
        setSearchTrackingMode
      }}
    >
      {children}
    </TargetContext.Provider>
  );
};

export const useTargets = () => {
  const context = useContext(TargetContext);
  if (!context) throw new Error('useTargets must be used within TargetProvider');
  return context;
};
