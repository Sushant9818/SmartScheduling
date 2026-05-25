/**
 * Required environment variables for API startup.
 */
function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getMissingRequiredEnv(env = process.env) {
  const missing = ["JWT_SECRET", "REFRESH_TOKEN_SECRET"].filter(
    (key) => !hasValue(env[key])
  );

  if (!hasValue(env.MONGO_URI) && !hasValue(env.MONGODB_URI)) {
    missing.push("MONGO_URI or MONGODB_URI");
  }

  return missing;
}

export function validateRequiredEnv(env = process.env) {
  const missing = getMissingRequiredEnv(env);

  if (missing.length > 0) {
    console.error("[env] Missing required variables:", missing.join(", "));
    if (env.NODE_ENV === "production") {
      console.error(
        "[env] Fix: cd backend && npm run setup:render-env\n" +
          "[env]     Edit render.env (set MONGO_URI or MONGODB_URI), then use\n" +
          "[env]     Render → Environment → Add from .env\n" +
          "[env]     Guide: backend/TROUBLESHOOTING_DEPLOY.md"
      );
    } else {
      console.error(
        "[env] Local: copy backend/.env.example to backend/.env and fill values."
      );
    }
    process.exit(1);
  }

  if (env.JWT_SECRET === env.REFRESH_TOKEN_SECRET) {
    console.error("[env] JWT_SECRET and REFRESH_TOKEN_SECRET must be different.");
    process.exit(1);
  }
}
