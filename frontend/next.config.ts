import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
console.log("BACKEND_URL:", BACKEND_URL);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/v1/* calls to the FastAPI backend.
        // This removes CORS issues since the browser only talks to Next.js.
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        // Proxy preview images served by the backend (e.g. /data/previews/…)
        source: "/data/:path*",
        destination: `${BACKEND_URL}/data/:path*`,
      },
      {
        // Proxy preview images served by the backend at /previews/
        source: "/previews/:path*",
        destination: `${BACKEND_URL}/previews/:path*`,
      },
    ];
  },
};

export default nextConfig;
