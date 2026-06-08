"use client";

import React from "react";
import { cn, getPreviewImageUrl } from "../../lib/utils";

interface AvatarCropProps {
  seed: number;
  alias: string | null;
  status?: "tracked" | "idle" | "lost" | string;
  className?: string;
  confidence?: number;
  previewImagePath?: string;
}

export const AvatarCrop: React.FC<AvatarCropProps> = ({
  seed,
  alias,
  status = "idle",
  className,
  confidence,
  previewImagePath,
}) => {
  const displayAlias = alias || `Target ${seed}`;

  // Generate deterministically styled biometric nodes based on seed
  const points: { x: number; y: number }[] = [];
  const pointsCount = 8 + (seed % 6);

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2;
    const radiusX = 25 + Math.sin(seed * (i + 1)) * 8;
    const radiusY = 32 + Math.cos(seed + i) * 6;

    const offset = Math.sin(angle) > 0 ? 0 : -5;

    points.push({
      x: 50 + radiusX * Math.cos(angle),
      y: 45 + (radiusY + offset) * Math.sin(angle),
    });
  }

  const isTracked = status === "tracked";
  const isLost = status === "lost";

  const strokeColor = isTracked
    ? "stroke-red-500"
    : isLost
    ? "stroke-amber-500"
    : "stroke-zinc-300";

  const fillColor = isTracked
    ? "fill-red-500/10"
    : isLost
    ? "fill-amber-500/5"
    : "fill-zinc-100/50";

  const dotColor = isTracked
    ? "bg-red-500"
    : isLost
    ? "bg-amber-500"
    : "bg-zinc-400";

  return (
    <div
      className={cn(
        "relative aspect-square bg-zinc-950 overflow-hidden border border-zinc-800 rounded-lg select-none",
        className
      )}
    >
      {/* Real Image */}
      {previewImagePath && (
        <img
          src={getPreviewImageUrl(previewImagePath)}
          alt={displayAlias}
          className="absolute inset-0 w-full h-full object-cover object-top z-0"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      )}  

      {/* Grid Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none z-10" />

      {/* Thermal Scan Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent animate-[pulse_3s_infinite] pointer-events-none z-10" />

      {/* SVG Facial Landmark Map */}
      {!previewImagePath && (
      <svg
        className={cn(
          "w-full h-full p-6 relative z-10 transition-opacity duration-300",
          previewImagePath ? "opacity-25" : "opacity-100"
        )}
        viewBox="0 0 100 100"
      >
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          className={cn(
            "stroke-2 fill-none stroke-dasharray-[2_2] transition-colors duration-500",
            strokeColor,
            fillColor
          )}
          style={{ strokeDasharray: "3 2" }}
        />

        {points.map((p, idx) => {
          if (idx % 2 === 0 && idx < points.length - 2) {
            return (
              <line
                key={idx}
                x1={p.x}
                y1={p.y}
                x2={points[idx + 2].x}
                y2={points[idx + 2].y}
                className={cn("stroke-[0.5] opacity-50", strokeColor)}
              />
            );
          }
          return null;
        })}

        <line
          x1="50"
          y1="25"
          x2="50"
          y2="65"
          className={cn("stroke-[0.5] opacity-40", strokeColor)}
        />

        <line
          x1="30"
          y1="40"
          x2="70"
          y2="40"
          className={cn("stroke-[0.5] opacity-40", strokeColor)}
        />

        <circle
          cx="40"
          cy="38"
          r="1.5"
          className={cn(
            "fill-current",
            strokeColor.replace("stroke", "fill")
          )}
        />

        <circle
          cx="60"
          cy="38"
          r="1.5"
          className={cn(
            "fill-current",
            strokeColor.replace("stroke", "fill")
          )}
        />

        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="1"
            className={cn(
              "fill-current transition-colors duration-500",
              strokeColor.replace("stroke", "fill")
            )}
          />
        ))}

        <circle
          cx="50"
          cy="50"
          r="3"
          className={cn("stroke-[0.5] fill-none", strokeColor)}
        />
      </svg>
      )}

      {/* Surveillance Overlay */}
      <div className="absolute top-2 left-2 flex flex-col font-mono text-[8px] text-zinc-400 gap-0.5 pointer-events-none z-10">
        <span className="text-zinc-500">
          ID: {displayAlias.substring(0, 3).toUpperCase()}-{seed}
        </span>
        <span>REC: ON</span>
      </div>

      <div className="absolute bottom-2 right-2 flex flex-col font-mono text-[8px] text-zinc-400 items-end pointer-events-none z-10">
        {confidence ? (
          <span
            className={cn(
              isTracked ? "text-red-500" : "text-zinc-400"
            )}
          >
            CONF: {Math.round(confidence * 100)}%
          </span>
        ) : (
          <span className="text-zinc-500">RES: 128px</span>
        )}
      </div>

      {/* Corner Frame */}
      <div
        className={cn(
          "absolute inset-1.5 border pointer-events-none transition-colors duration-500 z-10",
          isTracked
            ? "border-red-500/20"
            : isLost
            ? "border-amber-500/20"
            : "border-zinc-800/40"
        )}
      >
        <div
          className={cn(
            "absolute top-0 left-0 w-2.5 h-2.5 border-t border-l",
            isTracked
              ? "border-red-500"
              : isLost
              ? "border-amber-500"
              : "border-zinc-700"
          )}
        />

        <div
          className={cn(
            "absolute top-0 right-0 w-2.5 h-2.5 border-t border-r",
            isTracked
              ? "border-red-500"
              : isLost
              ? "border-amber-500"
              : "border-zinc-700"
          )}
        />

        <div
          className={cn(
            "absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l",
            isTracked
              ? "border-red-500"
              : isLost
              ? "border-amber-500"
              : "border-zinc-700"
          )}
        />

        <div
          className={cn(
            "absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r",
            isTracked
              ? "border-red-500"
              : isLost
              ? "border-amber-500"
              : "border-zinc-700"
          )}
        />
      </div>

      {/* Status Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-1.5 py-0.5 bg-zinc-950/80 backdrop-blur-xs border border-zinc-800 rounded font-mono text-[7px] uppercase tracking-wide pointer-events-none z-10">
        <span className={cn("w-1 h-1 rounded-full", dotColor)} />
        <span className="text-zinc-300 font-bold">
          {status}
        </span>
      </div>
    </div>
  );
};