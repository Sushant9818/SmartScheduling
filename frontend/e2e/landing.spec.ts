import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads home and shows main heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /schedule smarter/i })).toBeVisible();
    await expect(page.getByText("Smart Scheduling System")).toBeVisible();
  });

  test("navigates to login and register", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });
});
