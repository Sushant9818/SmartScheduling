/**
 * Centralized API base URL for all frontend HTTP calls.
 *
 * Set on Vercel (Production + Preview):
 *   VITE_API_URL=https://your-service.onrender.com/api
 *   — or —
 *   NEXT_PUBLIC_API_BASE_URL=https://your-service.onrender.com/api
 *
 * Local dev: copy frontend/.env.example → .env.local (defaults to http://localhost:5000/api).
 */

const DEV_FALLBACK = "http://localhost:5000/api";

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

function readEnvUrl(): string | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_VITE_API_URL,
  ];
  for (const value of candidates) {
    if (value && typeof value === "string" && value.trim()) {
      return normalizeApiBaseUrl(value);
    }
  }
  return undefined;
}

function getApiBaseUrl(): string {
  const fromEnv = readEnvUrl();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK;
  }

  return "";
}

export const API_BASE_URL = getApiBaseUrl();

/** True when a production build has no Render API URL configured. */
export function isProductionApiMisconfigured(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "production") return false;
  if (!API_BASE_URL) return true;
  return (
    API_BASE_URL.includes("localhost") ||
    API_BASE_URL.includes("127.0.0.1")
  );
}
