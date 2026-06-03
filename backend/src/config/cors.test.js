import assert from "node:assert/strict";
import test from "node:test";

import { getCorsOptions, getSocketCorsOptions } from "./cors.js";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of ["FRONTEND_URL", "ALLOWED_ORIGINS"]) {
    if (ORIGINAL_ENV[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = ORIGINAL_ENV[key];
    }
  }
}

function checkExpressOrigin(origin) {
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

test("credentialed CORS rejects unconfigured Vercel origins", async () => {
  resetEnv();
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app";
  process.env.ALLOWED_ORIGINS = "";

  const expressResult = await checkExpressOrigin("https://evil.vercel.app");
  assert.match(expressResult.err.message, /CORS blocked origin/);
  assert.equal(expressResult.allowed, undefined);

  const socketResult = await checkSocketOrigin("https://evil.vercel.app");
  assert.match(socketResult.err.message, /CORS blocked origin/);
  assert.equal(socketResult.allowed, undefined);
});

test("credentialed CORS allows explicitly configured frontend origins", async () => {
  resetEnv();
  process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app/";
  process.env.ALLOWED_ORIGINS = "https://preview.example.com, https://trusted.vercel.app/";

  assert.deepEqual(
    await checkExpressOrigin("https://smart-scheduling-eta.vercel.app"),
    { err: null, allowed: true }
  );
  assert.deepEqual(
    await checkExpressOrigin("https://trusted.vercel.app"),
    { err: null, allowed: true }
  );
  assert.deepEqual(
    await checkSocketOrigin("https://preview.example.com"),
    { err: null, allowed: true }
  );
});

test("credentialed CORS continues to allow local development origins", async () => {
  resetEnv();

  assert.deepEqual(
    await checkExpressOrigin("http://localhost:3000"),
    { err: null, allowed: true }
  );
  assert.deepEqual(
    await checkSocketOrigin("http://127.0.0.1:5173"),
    { err: null, allowed: true }
  );
});
