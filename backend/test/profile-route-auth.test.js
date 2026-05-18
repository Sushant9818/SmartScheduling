import assert from "node:assert/strict";
import test from "node:test";

import app from "../src/app.js";

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function request(server, method, path, body) {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("client profile routes reject anonymous access", async (t) => {
  const server = await startServer();
  t.after(() => closeServer(server));

  const routes = [
    ["POST", "/api/clients", { name: "Eve", email: "eve@example.com" }],
    ["GET", "/api/clients"],
    ["GET", "/api/clients/507f1f77bcf86cd799439011"],
    ["PUT", "/api/clients/507f1f77bcf86cd799439011/preferences", { preferences: {} }],
  ];

  for (const [method, path, body] of routes) {
    const res = await request(server, method, path, body);
    assert.equal(res.status, 401, `${method} ${path} should require authentication`);
  }
});

test("therapist profile routes reject anonymous access", async (t) => {
  const server = await startServer();
  t.after(() => closeServer(server));

  const routes = [
    ["GET", "/api/therapists"],
    ["GET", "/api/therapists/507f1f77bcf86cd799439011"],
    ["POST", "/api/therapists", { name: "Mallory", email: "mallory@example.com" }],
    [
      "PUT",
      "/api/therapists/507f1f77bcf86cd799439011/availability",
      { weeklyAvailability: [] },
    ],
    [
      "POST",
      "/api/therapists/507f1f77bcf86cd799439011/time-off",
      { start: "2026-05-18T09:00:00.000Z", end: "2026-05-18T10:00:00.000Z" },
    ],
  ];

  for (const [method, path, body] of routes) {
    const res = await request(server, method, path, body);
    assert.equal(res.status, 401, `${method} ${path} should require authentication`);
  }
});
