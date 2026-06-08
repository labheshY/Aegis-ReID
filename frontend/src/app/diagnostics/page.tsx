"use client";

import React, { useEffect, useState } from 'react';

export default function DiagnosticsPage() {
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const keys = Array.from(styles).filter((k) => k.startsWith('--'));
    const map: Record<string, string> = {};
    keys.forEach((k) => {
      map[k] = styles.getPropertyValue(k).trim();
    });
    setTokens(map);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto font-ui">
      <h1 className="font-display text-2xl mb-4">Design Tokens — Diagnostics</h1>
      <p className="text-sm text-[color:var(--fg-muted)] mb-6">Displays computed CSS custom properties from :root.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.keys(tokens).map((k) => (
          <div key={k} className="p-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-solid)]">
            <div className="text-xs text-[color:var(--fg-muted)] mb-1">{k}</div>
            <div className="font-mono text-sm text-[color:var(--fg)]">{tokens[k]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
