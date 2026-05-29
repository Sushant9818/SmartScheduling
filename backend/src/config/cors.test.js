import assert from "node:assert/strict";
import test from "node:test";

import { getCorsOptions, getSocketCorsOptions } from "./cors.js";

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.FRONTEND_URL;
  delete process.env.ALLOWED_ORIGINS;
}

function checkHttpOrigin(origin) {
  return new Promise((resolve) => {
    getCorsOptions().origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

function checkSocketOrigin(origin) {
  return new Promise((resolve) => {
    getSocketCorsOptions().origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

test.afterEach(resetEnv);

test("allows configured frontend and explicit preview origins", async () => {
  resetEnv();
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app/";
  process.env.ALLOWED_ORIGINS = "https://preview-smart-scheduling.vercel.app";

  assert.deepEqual(await checkHttpOrigin("https://smart-scheduling-eta.vercel.app"), {
    err: null,
    allowed: true,
  });
  assert.deepEqual(await checkHttpOrigin("https://preview-smart-scheduling.vercel.app"), {
    err: null,
    allowed: true,
  });
});

test("blocks unconfigured Vercel origins for credentialed HTTP CORS", async () => {
  resetEnv();
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app";

  const { err, allowed } = await checkHttpOrigin("https://attacker-controlled.vercel.app");

  assert.equal(allowed, undefined);
  assert.match(err.message, /CORS blocked origin/);
});

test("blocks unconfigured Vercel origins for credentialed socket CORS", async () => {
  resetEnv();
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app";

  const { err, allowed } = await checkSocketOrigin("https://attacker-controlled.vercel.app");

  assert.equal(allowed, undefined);
  assert.match(err.message, /CORS blocked origin/);
});
