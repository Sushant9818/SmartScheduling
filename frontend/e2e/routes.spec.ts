import { test, expect } from "@playwright/test";

/** Smoke test: public routes return 200 (no Vercel-style 404). */
const publicRoutes = ["/", "/login", "/register", "/access-denied"];

for (const path of publicRoutes) {
  test(`GET ${path} returns page content (not 404)`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).not.toContainText("This page could not be found");
  });
}
