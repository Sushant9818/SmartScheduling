import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

test("debugCookies returns cookie metadata without exposing token values", async () => {
  let responseBody;
  const req = {
    headers: {
      cookie: "refreshToken=raw-refresh-token; other=value",
    },
    cookies: {
      refreshToken: "raw-refresh-token",
      other: "value",
    },
  };
  const res = {
    json(body) {
      responseBody = body;
      return body;
    },
  };

  await debugCookies(req, res);

  assert.deepEqual(responseBody, {
    cookieNames: ["refreshToken", "other"],
    hasRefreshToken: true,
  });
  assert.equal(JSON.stringify(responseBody).includes("raw-refresh-token"), false);
});
