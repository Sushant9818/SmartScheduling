import type { NextConfig } from "next";

/**
 * Expose VITE_API_URL to the client as NEXT_PUBLIC_VITE_API_URL (Next.js does not use import.meta.env).
 * On Vercel you can set either VITE_API_URL or NEXT_PUBLIC_API_BASE_URL — see frontend/lib/config.ts.
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VITE_API_URL:
      process.env.VITE_API_URL?.trim() ||
      process.env.NEXT_PUBLIC_VITE_API_URL?.trim() ||
      "",
  },
};

export default nextConfig;
