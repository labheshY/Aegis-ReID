"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export type BackendConnection = "connected" | "degraded" | "offline";

export function useBackendHealth(pollMs = 8000) {
  const [status, setStatus] = useState<BackendConnection>("offline");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const ping = useCallback(async () => {
    const start = performance.now();
    try {
      const ok = await api.pingHealth();
      const ms = Math.round(performance.now() - start);
      setLatencyMs(ms);
      setStatus(ok ? "connected" : "degraded");
    } catch {
      setLatencyMs(null);
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    ping();
    const id = setInterval(ping, pollMs);
    return () => clearInterval(id);
  }, [ping, pollMs]);

  return { status, latencyMs, refresh: ping };
}
