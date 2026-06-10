import assert from "node:assert/strict";
import test from "node:test";

import { validateRequiredEnv } from "./env.js";

const ENV_KEYS = [
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "MONGO_URI",
  "MONGODB_URI",
  "NODE_ENV",
];

function withPatchedProcess(env, fn) {
  const originalEnv = {};
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    if (Object.hasOwn(env, key)) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  }

  const originalExit = process.exit;
  const originalError = console.error;
  process.exit = ((code) => {
    throw new Error(`process.exit(${code})`);
  });
  console.error = () => {};

  try {
    return fn();
  } finally {
    process.exit = originalExit;
    console.error = originalError;
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  }
}

test("validateRequiredEnv accepts MONGODB_URI when MONGO_URI is absent", () => {
  assert.doesNotThrow(() =>
    withPatchedProcess(
      {
        JWT_SECRET: "access-secret",
        REFRESH_TOKEN_SECRET: "refresh-secret",
        MONGODB_URI: "mongodb+srv://example/db",
        NODE_ENV: "production",
      },
      validateRequiredEnv
    )
  );
});

test("validateRequiredEnv exits when neither Mongo URI env name is present", () => {
  assert.throws(
    () =>
      withPatchedProcess(
        {
          JWT_SECRET: "access-secret",
          REFRESH_TOKEN_SECRET: "refresh-secret",
          NODE_ENV: "production",
        },
        validateRequiredEnv
      ),
    /process\.exit\(1\)/
  );
});

test("validateRequiredEnv rejects matching access and refresh secrets", () => {
  assert.throws(
    () =>
      withPatchedProcess(
        {
          JWT_SECRET: "same-secret",
          REFRESH_TOKEN_SECRET: "same-secret",
          MONGO_URI: "mongodb+srv://example/db",
        },
        validateRequiredEnv
      ),
    /process\.exit\(1\)/
  );
});
