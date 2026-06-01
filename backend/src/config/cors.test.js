import assert from "node:assert/strict";
import test from "node:test";

import { getCorsOptions, getSocketCorsOptions } from "./cors.js";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

function checkHttpOrigin(origin) {
  const options = getCorsOptions();
  return new Promise((resolve) => {
    options.origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

function checkSocketOrigin(origin) {
  const options = getSocketCorsOptions();
  return new Promise((resolve) => {
    options.origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

test.afterEach(resetEnv);

test("credentialed CORS allows only configured Vercel origins", async () => {
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app/";
  process.env.ALLOWED_ORIGINS = "https://trusted-preview.vercel.app";

  const production = await checkHttpOrigin("https://smart-scheduling-eta.vercel.app");
  assert.equal(production.err, null);
  assert.equal(production.allowed, true);

  const trustedPreview = await checkHttpOrigin("https://trusted-preview.vercel.app");
  assert.equal(trustedPreview.err, null);
  assert.equal(trustedPreview.allowed, true);
});

test("credentialed CORS rejects unconfigured Vercel origins", async () => {
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app";
  process.env.ALLOWED_ORIGINS = "";

  const http = await checkHttpOrigin("https://attacker-controlled.vercel.app");
  assert.match(http.err.message, /CORS blocked origin/);
  assert.equal(http.allowed, undefined);

  const socket = await checkSocketOrigin("https://attacker-controlled.vercel.app");
  assert.match(socket.err.message, /CORS blocked origin/);
  assert.equal(socket.allowed, undefined);
});
