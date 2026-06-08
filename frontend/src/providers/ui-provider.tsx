"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'alert' | 'red-lock' | 'green-tracking';
  duration?: number;
}

interface UiContextType {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  fullscreenCameraId: string | null;
  setFullscreenCameraId: (id: string | null) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [fullscreenCameraId, setFullscreenCameraId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen for Cmd+K or Ctrl+K to toggle command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 4000;
    
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <UiContext.Provider
      value={{
        commandPaletteOpen,
        setCommandPaletteOpen,
        fullscreenCameraId,
        setFullscreenCameraId,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
      
      {/* Toast Render Area */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className="pointer-events-auto flex flex-col p-4 bg-white border border-zinc-200 rounded-xl shadow-lg cursor-pointer transform transition-all duration-300 hover:translate-y-[-2px] border-l-4 overflow-hidden relative"
            style={{
              borderLeftColor: 
                toast.type === 'success' ? '#10b981' : // emerald
                toast.type === 'error' ? '#ef4444' : // red
                toast.type === 'red-lock' ? '#dc2626' : // target lock (red)
                toast.type === 'green-tracking' ? '#22c55e' : // general tracking (green)
                toast.type === 'alert' ? '#f59e0b' : // yellow
                '#a1a1aa' // zinc-400
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-zinc-950 flex items-center gap-2">
                  {toast.type === 'red-lock' && (
                    <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}
                  {toast.type === 'green-tracking' && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                  {toast.title}
                </h4>
                {toast.description && (
                  <p className="mt-1 text-xs text-zinc-500 font-normal leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(toast.id);
                }}
                className="text-zinc-400 hover:text-zinc-600 transition-colors text-xs font-mono font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </UiContext.Provider>
  );
};

export const useUi = () => {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used within UiProvider');
  return context;
};
