import assert from "node:assert/strict";
import test from "node:test";

import { getCorsOptions, getSocketCorsOptions } from "./cors.js";

function checkOrigin(options, origin) {
  return new Promise((resolve) => {
    options.origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

test("CORS allows only configured Vercel origins", async (t) => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;

  t.after(() => {
    if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousFrontendUrl;

    if (previousAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
  });

  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app/";
  process.env.ALLOWED_ORIGINS = "https://explicit-preview.vercel.app";

  const corsOptions = getCorsOptions();

  assert.deepEqual(await checkOrigin(corsOptions, undefined), { err: null, allowed: true });
  assert.deepEqual(await checkOrigin(corsOptions, "https://smart-scheduling-eta.vercel.app"), {
    err: null,
    allowed: true,
  });
  assert.deepEqual(await checkOrigin(corsOptions, "https://explicit-preview.vercel.app"), {
    err: null,
    allowed: true,
  });

  const blocked = await checkOrigin(corsOptions, "https://attacker.vercel.app");
  assert.match(blocked.err.message, /CORS blocked origin/);
  assert.equal(blocked.allowed, undefined);
});

test("Socket.IO CORS rejects unconfigured Vercel origins", async (t) => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;

  t.after(() => {
    if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousFrontendUrl;

    if (previousAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
  });

  delete process.env.FRONTEND_URL;
  delete process.env.ALLOWED_ORIGINS;

  const blocked = await checkOrigin(getSocketCorsOptions(), "https://attacker.vercel.app");
  assert.match(blocked.err.message, /CORS blocked origin/);
  assert.equal(blocked.allowed, undefined);
});
