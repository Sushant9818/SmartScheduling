import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

function createJsonResponse() {
  return {
    body: undefined,
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("debugCookies reports cookie metadata without exposing cookie values", async () => {
  const req = {
    headers: {
      cookie: "refreshToken=super-secret-refresh-token; other=value",
    },
    cookies: {
      refreshToken: "super-secret-refresh-token",
      other: "value",
    },
  };
  const res = createJsonResponse();

  await debugCookies(req, res);

  assert.deepEqual(res.body, {
    cookieNames: ["refreshToken", "other"],
    hasRefreshToken: true,
  });
  assert.equal(JSON.stringify(res.body).includes("super-secret-refresh-token"), false);
  assert.equal(Object.hasOwn(res.body, "cookieHeader"), false);
  assert.equal(Object.hasOwn(res.body, "cookies"), false);
});
