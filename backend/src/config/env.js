/**
 * Required environment variables for API startup.
 */
export function validateRequiredEnv() {
  const required = ["JWT_SECRET", "REFRESH_TOKEN_SECRET", "MONGO_URI"];
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error("[env] Missing required variables:", missing.join(", "));
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[env] Render → your service → Environment → Add each variable, then Save and deploy.\n" +
          "[env] Guide: backend/RENDER_ENV_SETUP.md (use 'Add from .env' with render.env)"
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
