import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

test("debugCookies returns only cookie metadata", async () => {
  let payload;
  const req = {
    headers: { cookie: "refreshToken=secret-refresh-token; theme=dark" },
    cookies: {
      refreshToken: "secret-refresh-token",
      theme: "dark",
    },
  };
  const res = {
    json(body) {
      payload = body;
      return body;
    },
  };

  await debugCookies(req, res);

  assert.deepEqual(payload.cookieNames.sort(), ["refreshToken", "theme"]);
  assert.equal(payload.hasRefreshToken, true);
  assert.equal(Object.hasOwn(payload, "cookies"), false);
  assert.equal(Object.hasOwn(payload, "cookieHeader"), false);
  assert.equal(JSON.stringify(payload).includes("secret-refresh-token"), false);
});
