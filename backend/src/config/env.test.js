import assert from "node:assert/strict";
import test from "node:test";

import { getMissingRequiredEnv } from "./env.js";

const requiredSecrets = {
  JWT_SECRET: "access-secret",
  REFRESH_TOKEN_SECRET: "refresh-secret",
};

test("accepts MONGODB_URI when MONGO_URI is not set", () => {
  assert.deepEqual(
    getMissingRequiredEnv({
      ...requiredSecrets,
      MONGODB_URI: "mongodb+srv://example.mongodb.net/smart-scheduling",
    }),
    []
  );
});

test("accepts MONGO_URI when MONGODB_URI is not set", () => {
  assert.deepEqual(
    getMissingRequiredEnv({
      ...requiredSecrets,
      MONGO_URI: "mongodb+srv://example.mongodb.net/smart-scheduling",
    }),
    []
  );
});

test("requires at least one Mongo connection variable", () => {
  assert.deepEqual(getMissingRequiredEnv(requiredSecrets), ["MONGO_URI or MONGODB_URI"]);
});
