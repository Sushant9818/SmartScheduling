import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getCorsOptions } from "./cors.js";

const ORIGINAL_ENV = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function checkOrigin(origin) {
  return new Promise((resolve) => {
    getCorsOptions().origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

describe("CORS origin allowlist", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("rejects arbitrary Vercel subdomains", async () => {
    delete process.env.FRONTEND_URL;
    delete process.env.ALLOWED_ORIGINS;

    const { err, allowed } = await checkOrigin("https://attacker-project.vercel.app");

    assert.match(err.message, /CORS blocked origin/);
    assert.equal(allowed, undefined);
  });

  it("allows explicitly configured Vercel deployments", async () => {
    process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app/";
    process.env.ALLOWED_ORIGINS = "https://preview-smart-scheduling.vercel.app";

    assert.deepEqual(await checkOrigin("https://smart-scheduling-eta.vercel.app"), {
      err: null,
      allowed: true,
    });
    assert.deepEqual(await checkOrigin("https://preview-smart-scheduling.vercel.app"), {
      err: null,
      allowed: true,
    });
  });
});
