import { defineConfig, devices } from "@playwright/test";
import path from "path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Keep browsers in the project so CI and local runs share the same path
process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH ??
  path.join(__dirname, "node_modules", ".playwright-browsers");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Prefer system Chrome when Playwright cache path differs (e.g. Cursor sandbox)
        ...(process.env.PW_USE_SYSTEM_CHROME === "1" ? { channel: "chrome" as const } : {}),
      },
    },
  ],
  webServer: {
    command: "npx next dev --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
