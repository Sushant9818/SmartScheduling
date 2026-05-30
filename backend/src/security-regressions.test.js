import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import app from "./app.js";
import { getCorsOptions, getSocketCorsOptions } from "./config/cors.js";

async function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] == null) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function checkExpressCorsOrigin(options, origin) {
  return new Promise((resolve, reject) => {
    options.origin(origin, (err, allowed) => {
      if (err) reject(err);
      else resolve(allowed);
    });
  });
}

function checkSocketCorsOrigin(options, origin) {
  return new Promise((resolve, reject) => {
    options.origin(origin, (err, allowed) => {
      if (err) reject(err);
      else resolve(allowed);
    });
  });
}

function request(method, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const req = http.request(
        {
          method,
          host: "127.0.0.1",
          port,
          path,
          headers: { "content-type": "application/json" },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            server.close((closeErr) => {
              if (closeErr) reject(closeErr);
              else resolve({ statusCode: res.statusCode, body });
            });
          });
        }
      );

      req.on("error", (err) => {
        server.close(() => reject(err));
      });
      req.end("{}");
    });
  });
}

test("credentialed CORS only allows explicitly configured Vercel origins", async () => {
  await withEnv(
    {
      FRONTEND_URL: "https://smart-scheduling-eta.vercel.app",
      ALLOWED_ORIGINS: "https://preview-owner.vercel.app",
    },
    async () => {
      const expressCors = getCorsOptions();
      const socketCors = getSocketCorsOptions();

      assert.equal(
        await checkExpressCorsOrigin(expressCors, "https://smart-scheduling-eta.vercel.app"),
        true
      );
      assert.equal(
        await checkExpressCorsOrigin(expressCors, "https://preview-owner.vercel.app"),
        true
      );
      await assert.rejects(
        () => checkExpressCorsOrigin(expressCors, "https://attacker.vercel.app"),
        /CORS blocked origin/
      );
      await assert.rejects(
        () => checkSocketCorsOrigin(socketCors, "https://attacker.vercel.app"),
        /CORS blocked origin/
      );
    }
  );
});

test("legacy profile mutation and PII routes reject unauthenticated requests", async () => {
  const responses = await Promise.all([
    request("POST", "/api/therapists"),
    request("PUT", "/api/therapists/507f1f77bcf86cd799439011/availability"),
    request("POST", "/api/therapists/507f1f77bcf86cd799439011/time-off"),
    request("GET", "/api/clients"),
    request("GET", "/api/clients/507f1f77bcf86cd799439011"),
    request("PUT", "/api/clients/507f1f77bcf86cd799439011/preferences"),
  ]);

  for (const response of responses) {
    assert.equal(response.statusCode, 401, response.body);
  }
});
