import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

test("debugCookies returns metadata without exposing raw cookie values", async () => {
  const req = {
    headers: { cookie: "refreshToken=secret-refresh-token; theme=dark" },
    cookies: {
      refreshToken: "secret-refresh-token",
      theme: "dark",
    },
  };
  let payload;
  const res = {
    json(body) {
      payload = body;
      return body;
    },
  };

  await debugCookies(req, res);

  assert.deepEqual(payload, {
    cookieNames: ["refreshToken", "theme"],
    hasRefreshToken: true,
  });
  assert.equal(JSON.stringify(payload).includes("secret-refresh-token"), false);
  assert.equal(Object.hasOwn(payload, "cookieHeader"), false);
  assert.equal(Object.hasOwn(payload, "cookies"), false);
});
