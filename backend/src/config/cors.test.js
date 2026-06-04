import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getCorsOptions, getSocketCorsOptions } from "./cors.js";

const ORIGINAL_ENV = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
};

afterEach(() => {
  if (ORIGINAL_ENV.FRONTEND_URL === undefined) {
    delete process.env.FRONTEND_URL;
  } else {
    process.env.FRONTEND_URL = ORIGINAL_ENV.FRONTEND_URL;
  }

  if (ORIGINAL_ENV.ALLOWED_ORIGINS === undefined) {
    delete process.env.ALLOWED_ORIGINS;
  } else {
    process.env.ALLOWED_ORIGINS = ORIGINAL_ENV.ALLOWED_ORIGINS;
  }
});

function checkOrigin(corsOptions, origin) {
  return new Promise((resolve) => {
    corsOptions.origin(origin, (err, allowed) => {
      resolve({ err, allowed });
    });
  });
}

describe("CORS origin allowlist", () => {
  it("allows configured frontend and extra origins", async () => {
    process.env.FRONTEND_URL = "https://smart-scheduling.example.com/";
    process.env.ALLOWED_ORIGINS = "https://preview.example.com/, https://admin.example.com";

    const corsOptions = getCorsOptions();

    assert.deepEqual(await checkOrigin(corsOptions, "https://smart-scheduling.example.com"), {
      err: null,
      allowed: true,
    });
    assert.deepEqual(await checkOrigin(corsOptions, "https://preview.example.com"), {
      err: null,
      allowed: true,
    });
    assert.deepEqual(await checkOrigin(corsOptions, "https://admin.example.com"), {
      err: null,
      allowed: true,
    });
  });

  it("rejects arbitrary Vercel app origins for credentialed requests", async () => {
    process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app";
    delete process.env.ALLOWED_ORIGINS;

    const corsOptions = getCorsOptions();
    const { err, allowed } = await checkOrigin(corsOptions, "https://attacker.vercel.app");

    assert.equal(allowed, undefined);
    assert.match(err.message, /CORS blocked origin: https:\/\/attacker\.vercel\.app/);
    assert.equal(corsOptions.credentials, true);
  });

  it("applies the same explicit allowlist to socket CORS", async () => {
    process.env.FRONTEND_URL = "https://smart-scheduling-eta.vercel.app";
    delete process.env.ALLOWED_ORIGINS;

    const socketCorsOptions = getSocketCorsOptions();
    const allowed = await checkOrigin(socketCorsOptions, "https://smart-scheduling-eta.vercel.app");
    const blocked = await checkOrigin(socketCorsOptions, "https://attacker.vercel.app");

    assert.deepEqual(allowed, { err: null, allowed: true });
    assert.equal(blocked.allowed, undefined);
    assert.match(blocked.err.message, /CORS blocked origin: https:\/\/attacker\.vercel\.app/);
    assert.equal(socketCorsOptions.credentials, true);
  });
});
