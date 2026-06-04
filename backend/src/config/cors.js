/**
 * CORS for local dev and production (Vercel frontend → Render API).
 *
 * Render env:
 *   FRONTEND_URL=https://smart-scheduling-eta.vercel.app
 *   ALLOWED_ORIGINS=https://other-preview.vercel.app (optional, comma-separated)
 *
 * Keep this list explicit: credentialed CORS plus SameSite=None refresh cookies
 * would let any trusted origin call /api/auth/refresh and read access tokens.
 */
function parseAllowedOrigins() {
  const origins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  const frontend = process.env.FRONTEND_URL?.trim();
  if (frontend) origins.add(frontend.replace(/\/$/, ""));

  const extra = process.env.ALLOWED_ORIGINS?.trim();
  if (extra) {
    for (const o of extra.split(",")) {
      const t = o.trim().replace(/\/$/, "");
      if (t) origins.add(t);
    }
  }

  return origins;
}

function isOriginAllowed(origin, allowed) {
  const normalized = origin.replace(/\/$/, "");
  if (allowed.has(normalized)) return true;
  return false;
}

export function getCorsOptions() {
  const allowed = parseAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin, allowed)) return callback(null, true);
      console.warn("[cors] blocked origin:", origin);
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export function getSocketCorsOptions() {
  const allowed = parseAllowedOrigins();
  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin, allowed)) return callback(null, true);
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  };
}
