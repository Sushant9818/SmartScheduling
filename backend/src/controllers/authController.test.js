import assert from "node:assert/strict";
import test from "node:test";

import { debugCookies } from "./authController.js";

test("debugCookies returns cookie metadata without raw token values", async () => {
  let responseBody;
  const req = {
    headers: {
      cookie: "refreshToken=secret-refresh-token; theme=dark",
    },
    cookies: {
      refreshToken: "secret-refresh-token",
      theme: "dark",
    },
  };
  const res = {
    json(body) {
      responseBody = body;
      return body;
    },
  };

  await debugCookies(req, res);

  assert.deepEqual(Object.keys(responseBody).sort(), ["cookieNames", "hasRefreshToken"]);
  assert.deepEqual(responseBody.cookieNames.sort(), ["refreshToken", "theme"]);
  assert.equal(responseBody.hasRefreshToken, true);
  assert.doesNotMatch(JSON.stringify(responseBody), /secret-refresh-token/);
  assert.equal(Object.hasOwn(responseBody, "cookies"), false);
  assert.equal(Object.hasOwn(responseBody, "cookieHeader"), false);
});
