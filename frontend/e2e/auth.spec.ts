import { test, expect } from "@playwright/test";

const CLIENT = {
  email: "client@test.com",
  password: "Client123!",
};

test.describe("Authentication", () => {
  test("redirects unauthenticated user from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("client can log in with mock credentials and reach dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(CLIENT.email);
    await page.getByLabel("Password").fill(CLIENT.password);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
  });

  test("register page shows form with client role default", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /^register$/i })).toBeVisible();
  });
});

test.describe("Role-based access", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(CLIENT.email);
    await page.getByLabel("Password").fill(CLIENT.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("client can open therapist directory", async ({ page }) => {
    await page.getByRole("link", { name: /therapists/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/therapists/);
    await expect(page.getByRole("heading", { name: /therapist directory/i })).toBeVisible();
  });
});
