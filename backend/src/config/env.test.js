import assert from "node:assert/strict";
import test from "node:test";

import { validateRequiredEnv } from "./env.js";

const ENV_KEYS = ["NODE_ENV", "JWT_SECRET", "REFRESH_TOKEN_SECRET", "MONGO_URI", "MONGODB_URI"];

function withEnv(vars, fn) {
  const previousEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const originalExit = process.exit;
  const originalError = console.error;
  const errors = [];

  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, vars);

  process.exit = (code) => {
    throw new Error(`process.exit(${code})`);
  };
  console.error = (...args) => {
    errors.push(args.join(" "));
  };

  try {
    return fn(errors);
  } finally {
    process.exit = originalExit;
    console.error = originalError;
    for (const key of ENV_KEYS) {
      delete process.env[key];
      if (previousEnv[key] !== undefined) {
        process.env[key] = previousEnv[key];
      }
    }
  }
}

test("validateRequiredEnv accepts MONGODB_URI when MONGO_URI is not set", () => {
  withEnv(
    {
      JWT_SECRET: "access-secret",
      REFRESH_TOKEN_SECRET: "refresh-secret",
      MONGODB_URI: "mongodb+srv://example/test",
    },
    () => {
      assert.doesNotThrow(() => validateRequiredEnv());
    }
  );
});

test("validateRequiredEnv reports both supported Mongo env names when missing", () => {
  withEnv(
    {
      NODE_ENV: "production",
      JWT_SECRET: "access-secret",
      REFRESH_TOKEN_SECRET: "refresh-secret",
    },
    (errors) => {
      assert.throws(() => validateRequiredEnv(), /process\.exit\(1\)/);
      assert.match(errors.join("\n"), /MONGO_URI or MONGODB_URI/);
    }
  );
});
