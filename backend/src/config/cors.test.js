import assert from "node:assert/strict";
import test from "node:test";

import { getCorsOptions, getSocketCorsOptions } from "./cors.js";

async function withOriginEnv(env, fn) {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  try {
    if ("FRONTEND_URL" in env) process.env.FRONTEND_URL = env.FRONTEND_URL;
    else delete process.env.FRONTEND_URL;

    if ("ALLOWED_ORIGINS" in env) process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;
    else delete process.env.ALLOWED_ORIGINS;

    await fn();
  } finally {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;

    if (originalAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
  }
}

function checkOrigin(originHandler, origin) {
  return new Promise((resolve) => {
    originHandler(origin, (error, allowed) => {
      resolve({ error, allowed });
    });
  });
}

test("HTTP CORS rejects unconfigured Vercel origins when credentials are enabled", async () => {
  await withOriginEnv(
    {
      FRONTEND_URL: "https://smart-scheduling-eta.vercel.app",
      ALLOWED_ORIGINS: "",
    },
    async () => {
      const options = getCorsOptions();
      assert.equal(options.credentials, true);

      const result = await checkOrigin(options.origin, "https://attacker-preview.vercel.app");

      assert.match(result.error?.message, /CORS blocked origin/);
      assert.equal(result.allowed, undefined);
    }
  );
});

test("HTTP CORS allows only explicitly configured Vercel origins", async () => {
  await withOriginEnv(
    {
      FRONTEND_URL: "https://smart-scheduling-eta.vercel.app/",
      ALLOWED_ORIGINS: "https://trusted-preview.vercel.app/",
    },
    async () => {
      const options = getCorsOptions();

      const production = await checkOrigin(options.origin, "https://smart-scheduling-eta.vercel.app");
      const trustedPreview = await checkOrigin(options.origin, "https://trusted-preview.vercel.app");

      assert.equal(production.error, null);
      assert.equal(production.allowed, true);
      assert.equal(trustedPreview.error, null);
      assert.equal(trustedPreview.allowed, true);
    }
  );
});

test("Socket.IO CORS also rejects unconfigured Vercel origins", async () => {
  await withOriginEnv(
    {
      FRONTEND_URL: "https://smart-scheduling-eta.vercel.app",
      ALLOWED_ORIGINS: "",
    },
    async () => {
      const options = getSocketCorsOptions();
      const result = await checkOrigin(options.origin, "https://attacker-preview.vercel.app");

      assert.match(result.error?.message, /CORS blocked origin/);
      assert.equal(result.allowed, undefined);
    }
  );
});
