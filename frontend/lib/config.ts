/**
 * Centralized API configuration. No hardcoded URLs in app code.
 *
 * - Single source: process.env.NEXT_PUBLIC_API_BASE_URL (set in .env.local).
 * - Place .env.local in the frontend root (same folder as package.json).
 * - API_BASE_URL must include /api (e.g. http://localhost:5001/api for Node backend).
 * - Paths in lib/api.ts are relative without /api (e.g. /auth/me, /health, /sessions).
 *
 * Backend port is in backend/.env (PORT=5001). Keep this default in sync.
 */
function getApiBaseUrl(): string {
  if (typeof process === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (env && typeof env === "string" && env.trim()) return env.trim();
  return "http://localhost:5001/api";
}

export const API_BASE_URL = getApiBaseUrl();
