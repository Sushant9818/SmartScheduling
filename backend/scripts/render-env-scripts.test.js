import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);

function createFakeCurl() {
  const dir = mkdtempSync(path.join(tmpdir(), "render-curl-"));
  const logPath = path.join(dir, "curl.log");
  const curlPath = path.join(dir, "curl");
  writeFileSync(
    curlPath,
    `#!/usr/bin/env bash
printf 'CALL\\n' >> "$CURL_LOG"
for arg in "$@"; do
  printf '%s\\n' "$arg" >> "$CURL_LOG"
done
printf '{}\\n'
`,
    { mode: 0o755 }
  );
  return { dir, logPath };
}

function curlCalls(logPath) {
  return readFileSync(logPath, "utf8")
    .split("CALL\n")
    .filter(Boolean)
    .map((call) => call.trim().split("\n").filter(Boolean));
}

function scriptEnv(fakeCurl) {
  return {
    ...process.env,
    PATH: `${fakeCurl.dir}${path.delimiter}${process.env.PATH}`,
    CURL_LOG: fakeCurl.logPath,
    RENDER_API_KEY: "rnd_test",
    RENDER_SERVICE_ID: "srv_test",
  };
}

test("set-render-mongo-uri updates only the MONGO_URI env var endpoint", () => {
  const fakeCurl = createFakeCurl();
  const script = path.join(scriptsDir, "set-render-mongo-uri.sh");
  const uri = "mongodb+srv://user:pass@example.mongodb.net/smart-scheduling";

  const result = spawnSync("bash", [script, uri], {
    cwd: path.join(scriptsDir, "..", ".."),
    env: scriptEnv(fakeCurl),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const calls = curlCalls(fakeCurl.logPath);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes("https://api.render.com/v1/services/srv_test/env-vars/MONGO_URI"));
  assert.ok(!calls[0].includes("https://api.render.com/v1/services/srv_test/env-vars"));
  assert.ok(calls[0].includes(`{"key":"MONGO_URI","value":"${uri}"}`));
  assert.ok(calls[1].includes("https://api.render.com/v1/services/srv_test/deploys"));
});

test("push-render-env updates each listed env var without bulk replacing all vars", () => {
  const fakeCurl = createFakeCurl();
  const envFile = path.join(fakeCurl.dir, "render.env");
  writeFileSync(
    envFile,
    [
      "NODE_ENV=production",
      "MONGO_URI=mongodb+srv://user:pass@example.mongodb.net/smart-scheduling",
      "JWT_SECRET=access-secret",
      "REFRESH_TOKEN_SECRET=refresh-secret",
      "",
    ].join("\n")
  );

  const script = path.join(scriptsDir, "push-render-env.sh");
  const result = spawnSync("bash", [script, envFile], {
    cwd: path.join(scriptsDir, "..", ".."),
    env: scriptEnv(fakeCurl),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const calls = curlCalls(fakeCurl.logPath);
  assert.equal(calls.length, 5);

  const envUpdateCalls = calls.slice(0, 4);
  for (const call of envUpdateCalls) {
    assert.ok(!call.includes("https://api.render.com/v1/services/srv_test/env-vars"));
  }
  assert.ok(envUpdateCalls[0].includes("https://api.render.com/v1/services/srv_test/env-vars/NODE_ENV"));
  assert.ok(envUpdateCalls[1].includes("https://api.render.com/v1/services/srv_test/env-vars/MONGO_URI"));
  assert.ok(envUpdateCalls[2].includes("https://api.render.com/v1/services/srv_test/env-vars/JWT_SECRET"));
  assert.ok(envUpdateCalls[3].includes("https://api.render.com/v1/services/srv_test/env-vars/REFRESH_TOKEN_SECRET"));
  assert.ok(calls[4].includes("https://api.render.com/v1/services/srv_test/deploys"));
});
