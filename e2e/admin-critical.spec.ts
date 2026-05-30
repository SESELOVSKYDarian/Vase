import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

async function signInAsAdmin(page: Page) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel(/Contrase/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesi/i }).click();
  await page.waitForURL(/\/app(\/admin)?/);
}

test.describe("admin critical flows", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E.");

  test("admin pages navigation does not have dead links", async ({ page }) => {
    await signInAsAdmin(page);

    await page.goto("/app/admin");
    await expect(page.getByRole("heading", { name: /Admin|Inicio/i })).toBeVisible();

    const routes = [
      "/app/admin/clients",
      "/app/admin/tickets",
      "/app/admin/meetings",
      "/app/admin/finance",
      "/app/admin/customizations",
      "/app/admin/modules",
      "/app/admin/faqs",
      "/app/admin/audit",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.ok(), `Route failed: ${route}`).toBeTruthy();
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("clients page modal-first actions open correctly", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app/admin/clients");

    await page.getByRole("button", { name: /Registrar pago/i }).click();
    await expect(page.getByText(/Registrar pago/i).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /\+ Usuario/i }).click();
    await expect(page.getByText(/Crear usuario cliente|Crear cliente/i).first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("meetings page create modal opens and closes", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app/admin/meetings");

    await page.getByRole("button", { name: /Nueva reunión/i }).click();
    await expect(page.getByText(/Nueva reunión/i).first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("tickets page manage modal opens for first row or shows empty state", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/app/admin/tickets");

    const manageButton = page.getByRole("button", { name: /Gestionar/i }).first();
    if (await manageButton.isVisible()) {
      await manageButton.click();
      await expect(page.getByText(/Ticket:/i).first()).toBeVisible();
      await page.keyboard.press("Escape");
    } else {
      await expect(page.getByText(/No hay tickets/i)).toBeVisible();
    }
  });
});
