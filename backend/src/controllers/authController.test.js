import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { debugCookies } from "./authController.js";

function createJsonResponse() {
  return {
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("auth debug cookie endpoint", () => {
  it("returns cookie metadata without exposing cookie values", async () => {
    const req = {
      headers: {
        cookie: "refreshToken=refresh.jwt.value; other=value",
      },
      cookies: {
        refreshToken: "refresh.jwt.value",
        other: "value",
      },
    };
    const res = createJsonResponse();

    await debugCookies(req, res);

    assert.deepEqual(res.body, {
      cookieNames: ["refreshToken", "other"],
      hasRefreshToken: true,
    });
    assert.equal(JSON.stringify(res.body).includes("refresh.jwt.value"), false);
  });
});
