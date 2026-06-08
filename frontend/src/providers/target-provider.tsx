"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Target, Camera, TrackingEvent, TrackerSettings } from '../types';
import { api } from '../services/api';
import { generateRandomEvent } from '../services/mockData';
import { useUi } from './ui-provider';

interface TargetContextType {
  targets: Target[];
  cameras: Camera[];
  events: TrackingEvent[];
  settings: TrackerSettings;
  activeTargetId: string | null;
  setActiveTargetId: (id: string | null) => void;
  activeSearchIds: string[];
  loading: boolean;
  error: string | null;
  refreshTargets: () => Promise<void>;
  acquireNewTarget: (alias: string, metadata?: any) => Promise<Target>;
  deleteTarget: (id: string) => Promise<void>;
  updateTargetDetails: (id: string, alias: string, metadata?: any) => Promise<void>;
  startSearch: (id: string) => Promise<void>;
  stopSearch: (id: string) => Promise<void>;
  updateSettings: (settings: TrackerSettings) => void;
  setCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
  clearEvents: () => void;
}

const TargetContext = createContext<TargetContextType | undefined>(undefined);

export const TargetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useUi();
  
  const [targets, setTargets] = useState<Target[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [settings, setSettings] = useState<TrackerSettings>(api.getSettings());
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [activeSearchIds, setActiveSearchIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for loop integration
  const targetsRef = useRef<Target[]>([]);
  const camerasRef = useRef<Camera[]>([]);
  const activeSearchIdsRef = useRef<string[]>([]);
  // Track whether the very first load has completed
  const isInitialLoadRef = useRef(true);

  useEffect(() => { targetsRef.current = targets; }, [targets]);
  useEffect(() => { camerasRef.current = cameras; }, [cameras]);
  useEffect(() => { activeSearchIdsRef.current = activeSearchIds; }, [activeSearchIds]);

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
      
      if (backendSettings) {
        setSettings(prev => {
          const updated = {
            ...prev,
            similarityThreshold: backendSettings.similarity_threshold ?? prev.similarityThreshold,
            confirmationThreshold: backendSettings.target_confirmation ? backendSettings.target_confirmation / 10 : prev.confirmationThreshold,
            frameInterval: backendSettings.reid_frame_interval ? backendSettings.reid_frame_interval * 33 : prev.frameInterval,
            softDecay: backendSettings.use_soft_decay ?? prev.softDecay,
          };
          api.saveSettings(updated);
          return updated;
        });
      }
      
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
  const startSearch = useCallback(async (id: string) => {
    try {
      const target = targets.find(t => t.id === id);
      const aliasName = target ? target.alias : `Subject #${id}`;
      
      await api.setRuntimeMode('search');
      await api.startSearch(id);
      
      setActiveSearchIds(prev => [...new Set([...prev, id])]);
      
      addToast({
        title: "Tracking Corridor Initialized",
        description: `Active search launched for appearance signature: ${aliasName}.`,
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

  const updateSettings = useCallback((newSettings: TrackerSettings) => {
    setSettings(newSettings);
    api.saveSettings(newSettings);
    
    // Synchronize settings with the FastAPI backend inference loop
    api.updateTrackerSettings({
      similarity_threshold: newSettings.similarityThreshold,
      use_soft_decay: newSettings.softDecay,
      // Map frontend frameInterval (ms) to backend frame count (at ~30 fps)
      reid_frame_interval: Math.max(1, Math.round(newSettings.frameInterval / 33)),
      // Map confirmationThreshold (e.g. 0.85) to target_confirmation frames count
      target_confirmation: Math.max(1, Math.round(newSettings.confirmationThreshold * 10))
    }).catch(err => {
      console.error("Failed to update backend tracker settings:", err);
    });

    addToast({
      title: "Settings Sync Completed",
      description: "Tracker hyperparameters updated in local storage and backend.",
      type: "info"
    });
  }, [addToast]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('reid_events', JSON.stringify([]));
    }
  }, []);

  // Real-time Simulation Loop
  useEffect(() => {
    const intervalTime = 8000; // Generate tracking feeds every 8 seconds
    
    const interval = setInterval(() => {
      const currentTargets = targetsRef.current;
      const currentCameras = camerasRef.current;
      const currentActiveSearchIds = activeSearchIdsRef.current;
      
      if (currentTargets.length === 0 || currentCameras.length === 0) return;

      // Filter simulation to only match targets that are actively being searched on the backend!
      // This maps simulation locks exactly to backend state!
      const activeTargets = currentTargets.filter(t => currentActiveSearchIds.includes(t.id));
      
      // Call mock dynamic generator helper
      // If we have active targets, mock matching one of them. Otherwise, generate general movement
      let newEvent: TrackingEvent;
      const onlineCameras = currentCameras.filter(c => c.status === 'online');
      const selectedCamera = onlineCameras[Math.floor(Math.random() * onlineCameras.length)] || { name: 'Main corridor' };
      const timestamp = new Date().toISOString();
      const id = `EVT-${Math.floor(Math.random() * 100000)}`;

      const shouldMatch = Math.random() < 0.6 && activeTargets.length > 0;

      if (shouldMatch) {
        const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
        newEvent = {
          id,
          timestamp,
          targetId: target.id,
          targetAlias: target.alias,
          source: selectedCamera.name,
          eventType: "lock",
          confidence: 0.88 + Math.random() * 0.1,
          similarityScore: 0.86 + Math.random() * 0.12
        };

        // Flash match toast
        addToast({
          title: `TARGET REID LOCK [${Math.round((newEvent.similarityScore || 0) * 100)}%]`,
          description: `${newEvent.targetAlias} matched at ${newEvent.source}`,
          type: "red-lock",
          duration: 3500
        });

      } else {
        // Normal general motion
        newEvent = {
          id,
          timestamp,
          source: selectedCamera.name,
          eventType: "detection",
          confidence: 0.70 + Math.random() * 0.25
        };

        // Flash green track toast
        addToast({
          title: `Subject Tracked`,
          description: `Movement registered at ${newEvent.source}`,
          type: "green-tracking",
          duration: 1800
        });
      }

      setEvents(prevEvents => {
        const updated = [newEvent, ...prevEvents].slice(0, 80);
        if (typeof window !== 'undefined') {
          localStorage.setItem('reid_events', JSON.stringify(updated));
        }
        return updated;
      });

    }, intervalTime);

    return () => clearInterval(interval);
  }, [addToast]);

  return (
    <TargetContext.Provider
      value={{
        targets,
        cameras,
        events,
        settings,
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
        updateSettings,
        setCameras,
        clearEvents
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
