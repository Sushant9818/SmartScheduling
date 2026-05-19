import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

async function request(path, { method = "GET", body } = {}) {
  const options = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) options.body = JSON.stringify(body);
  return fetch(`${baseUrl}${path}`, options);
}

test("sensitive profile and scheduling routes reject anonymous requests", async (t) => {
  const objectId = "507f1f77bcf86cd799439011";
  const cases = [
    { method: "POST", path: "/api/clients", body: { name: "Client", email: "c@example.com" } },
    { method: "GET", path: "/api/clients" },
    { method: "GET", path: `/api/clients/${objectId}` },
    { method: "PUT", path: `/api/clients/${objectId}/preferences`, body: { preferences: {} } },
    { method: "POST", path: "/api/therapists", body: { name: "Therapist", email: "t@example.com" } },
    {
      method: "PUT",
      path: `/api/therapists/${objectId}/availability`,
      body: { weeklyAvailability: [] }
    },
    {
      method: "POST",
      path: `/api/therapists/${objectId}/time-off`,
      body: { start: "2026-01-01T00:00:00.000Z", end: "2026-01-02T00:00:00.000Z" }
    },
    {
      method: "POST",
      path: "/api/scheduling/suggest",
      body: {
        clientId: objectId,
        therapistId: objectId,
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-02T00:00:00.000Z"
      }
    }
  ];

  for (const testCase of cases) {
    await t.test(`${testCase.method} ${testCase.path}`, async () => {
      const res = await request(testCase.path, testCase);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.code, "NO_AUTH");
    });
  }
});
