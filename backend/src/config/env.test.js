import assert from "node:assert/strict";
import test from "node:test";

import { getMissingRequiredEnv } from "./env.js";

test("required env validation accepts MONGODB_URI as the Mongo connection string", () => {
  const missing = getMissingRequiredEnv({
    NODE_ENV: "production",
    JWT_SECRET: "access-secret",
    REFRESH_TOKEN_SECRET: "refresh-secret",
    MONGODB_URI: "mongodb+srv://user:pass@example.mongodb.net/smart-scheduling",
  });

  assert.deepEqual(missing, []);
});

test("required env validation reports the Mongo connection requirement when both aliases are absent", () => {
  const missing = getMissingRequiredEnv({
    NODE_ENV: "production",
    JWT_SECRET: "access-secret",
    REFRESH_TOKEN_SECRET: "refresh-secret",
  });

  assert.deepEqual(missing, ["MONGO_URI or MONGODB_URI"]);
});
