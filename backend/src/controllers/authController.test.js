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

test("debugCookies returns cookie metadata without exposing raw cookie values", async () => {
  const req = {
    headers: {
      cookie: "refreshToken=secret-refresh-token; theme=dark",
    },
    cookies: {
      refreshToken: "secret-refresh-token",
      theme: "dark",
    },
  };
  const res = createJsonResponse();

  await debugCookies(req, res);

  assert.deepEqual(res.body, {
    cookieNames: ["refreshToken", "theme"],
    hasRefreshToken: true,
  });
  assert.equal(JSON.stringify(res.body).includes("secret-refresh-token"), false);
  assert.equal(Object.hasOwn(res.body, "cookies"), false);
  assert.equal(Object.hasOwn(res.body, "cookieHeader"), false);
});
