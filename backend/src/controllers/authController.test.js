import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

test("debugCookies returns cookie metadata without leaking values", () => {
  const req = {
    headers: {
      cookie: "refreshToken=super-secret-refresh-token; theme=dark",
    },
    cookies: {
      refreshToken: "super-secret-refresh-token",
      theme: "dark",
    },
  };

  let body;
  const res = {
    json(payload) {
      body = payload;
      return payload;
    },
  };

  debugCookies(req, res);

  assert.deepEqual(body, {
    cookieNames: ["refreshToken", "theme"],
    hasRefreshToken: true,
  });
  assert.equal(Object.hasOwn(body, "cookieHeader"), false);
  assert.equal(Object.hasOwn(body, "cookies"), false);
  assert.equal(JSON.stringify(body).includes("super-secret-refresh-token"), false);
});
