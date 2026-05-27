/**
 * Required environment variables for API startup.
 */
export function validateRequiredEnv() {
  const required = ["JWT_SECRET", "REFRESH_TOKEN_SECRET"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (!process.env.MONGO_URI?.trim() && !process.env.MONGODB_URI?.trim()) {
    missing.push("MONGO_URI or MONGODB_URI");
  }

  if (missing.length > 0) {
    console.error("[env] Missing required variables:", missing.join(", "));
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[env] Fix: cd backend && npm run setup:render-env\n" +
          "[env]     Edit render.env (set MONGO_URI), then Render → Environment → Add from .env\n" +
          "[env]     Guide: backend/TROUBLESHOOTING_DEPLOY.md"
      );
    } else {
      console.error("[env] Local: copy backend/.env.example to backend/.env and fill values.");
    }
    process.exit(1);
  }

  if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    console.error("[env] JWT_SECRET and REFRESH_TOKEN_SECRET must be different.");
    process.exit(1);
  }
}
