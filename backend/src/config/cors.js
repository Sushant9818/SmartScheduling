/**
 * CORS for local dev and production (Vercel frontend → Render API).
 * Set FRONTEND_URL in Render env (e.g. https://smart-scheduling-eta.vercel.app).
 * Optional ALLOWED_ORIGINS=comma,separated,urls for extra preview domains.
 */
function parseAllowedOrigins() {
  const origins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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

  return [...origins];
}

export function getCorsOptions() {
  const allowed = parseAllowedOrigins();

  return {
    origin(origin, callback) {
      // Same-origin or non-browser (no Origin header)
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowed.includes(normalized)) return callback(null, true);
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
    origin: allowed,
    credentials: true,
  };
}
