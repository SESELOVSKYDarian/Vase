import { expect, test } from "@playwright/test";

test("public product routes render core CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /vase/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /registr/i })).toBeVisible();

  await page.goto("/developers/api");
  await expect(page.getByRole("heading", { name: /api/i })).toBeVisible();
});

test("health endpoints respond in production smoke suite", async ({ request }) => {
  const live = await request.get("/api/health/live");
  const ready = await request.get("/api/health/ready");

  expect(live.ok()).toBeTruthy();
  expect(ready.ok()).toBeTruthy();
});
