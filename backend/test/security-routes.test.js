import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import app from "../src/app.js";

function request(method, path, { headers = {}, body } = {}) {
  const server = app.listen(0);
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request(
      {
        method,
        port,
        path,
        headers: {
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          server.close((closeErr) => {
            if (closeErr) return reject(closeErr);
            resolve({ statusCode: res.statusCode, body: data });
          });
        });
      }
    );

    req.on("error", (err) => {
      server.close(() => reject(err));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

test("client profile endpoints reject unauthenticated callers", async () => {
  const cases = [
    ["POST", "/api/clients", { name: "Injected Client" }],
    ["GET", "/api/clients"],
    ["GET", "/api/clients/507f1f77bcf86cd799439011"],
    ["PUT", "/api/clients/507f1f77bcf86cd799439011/preferences", { preferences: {} }],
  ];

  for (const [method, path, body] of cases) {
    const res = await request(method, path, { body });
    assert.equal(res.statusCode, 401, `${method} ${path}`);
    assert.match(res.body, /NO_AUTH|Missing Authorization header/);
  }
});

test("therapist mutation endpoints reject unauthenticated callers", async () => {
  const therapistId = "507f1f77bcf86cd799439011";
  const cases = [
    ["POST", "/api/therapists", { name: "Injected Therapist" }],
    ["PUT", `/api/therapists/${therapistId}/availability`, { weeklyAvailability: [] }],
    ["POST", `/api/therapists/${therapistId}/time-off`, { start: "2026-01-01", end: "2026-01-02" }],
  ];

  for (const [method, path, body] of cases) {
    const res = await request(method, path, { body });
    assert.equal(res.statusCode, 401, `${method} ${path}`);
    assert.match(res.body, /NO_AUTH|Missing Authorization header/);
  }
});

test("slot suggestions reject unauthenticated callers", async () => {
  const res = await request("POST", "/api/scheduling/suggest", {
    body: {
      clientId: "507f1f77bcf86cd799439011",
      therapistId: "507f191e810c19729de860ea",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-07T00:00:00.000Z",
    },
  });

  assert.equal(res.statusCode, 401);
  assert.match(res.body, /NO_AUTH|Missing Authorization header/);
});

test("auth debug cookie echo endpoint is not exposed", async () => {
  const secretCookie = "refreshToken=leaked-refresh-token";
  const res = await request("GET", "/api/auth/debug-cookies", {
    headers: { Cookie: secretCookie },
  });

  assert.equal(res.statusCode, 404);
  assert.doesNotMatch(res.body, /leaked-refresh-token/);
});
