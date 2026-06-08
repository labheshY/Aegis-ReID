  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  export function formatTime(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  export function formatDate(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getPreviewImageUrl(
  path: string | null | undefined
): string {
  if (!path) return "";
  if (path.startsWith("/")) return path;
  return `/${path}`;
}