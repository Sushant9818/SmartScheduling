import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

test("debugCookies reports cookie metadata without exposing token values", async () => {
  let payload;
  const req = {
    headers: {
      cookie: "refreshToken=secret-refresh-token; other=value",
    },
    cookies: {
      refreshToken: "secret-refresh-token",
      other: "value",
    },
  };
  const res = {
    json(body) {
      payload = body;
      return body;
    },
  };

  await debugCookies(req, res);

  assert.deepEqual(payload, {
    cookieNames: ["refreshToken", "other"],
    hasRefreshToken: true,
  });
  assert.equal(JSON.stringify(payload).includes("secret-refresh-token"), false);
});
