import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  query: vi.fn(async (statement: string, params: unknown[] = []) => {
    if (statement.includes("from users where lower(email)")) {
      return {
        rowCount: 1,
        rows: [{
          id: "user-1",
          email: String(params[0]),
          role: "retail",
          status: "active",
          email_verified_at: new Date(),
          requires_email_verification: false,
        }],
      };
    }

    if (statement.includes("from user_tenants")) {
      return {
        rowCount: 1,
        rows: [{
          tenant_id: "tenant-1",
          role: "retail",
          status: "active",
        }],
      };
    }

    return { rowCount: 0, rows: [] };
  }),
}));

vi.mock("../apps/vase-editor/server/src/db.js", () => ({
  pool: database,
}));

import app from "../apps/vase-editor/server/src/app.js";

describe("Vase Editor storefront signup", () => {
  const servers: Server[] = [];

  afterEach(async () => {
    database.query.mockClear();
    vi.unstubAllGlobals();
    await Promise.all(
      servers.splice(0).map(
        (server) => new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
      ),
    );
  });

  it("normalizes the signup email with the resolved tenant id", async () => {
    const server = app.listen(0, "127.0.0.1");
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: "tenant-1",
        email: " Client@Example.com ",
        password: "password1",
        role: "retail",
        name: "Cliente Prueba",
        phone: "+54 223 555 1234",
        address: "Calle Falsa 123",
        country_code: "AR",
        country_label: "Argentina",
        province: "Buenos Aires",
        city: "Mar del Plata",
        postal_code: "7600",
        business_name: "Negocio Prueba",
        business_activity: "Consumo propio",
        cuil: "20-12345678-9",
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "user_exists" });
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("from users where lower(email)"),
      ["client@example.com"],
    );
  });

  it("loads the local storefront country catalog without a third-party request", async () => {
    vi.resetModules();
    vi.stubGlobal("window", {
      location: {
        hostname: "cliente.example",
        host: "cliente.example",
        origin: "https://cliente.example",
        pathname: "/signup",
        port: "",
      },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { loadCountries } = await import("../apps/vase-editor/web/src/utils/locations.js");
    await expect(loadCountries()).resolves.toContainEqual({ value: "AR", label: "Argentina" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("declares a valid variable-axis request for Material Symbols", async () => {
    const html = await readFile(
      new URL("../apps/vase-editor/web/index.html", import.meta.url),
      "utf8",
    );

    expect(html).toContain(
      "family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
    );
  });

  it("keeps the storefront password minimum aligned with the API", async () => {
    const signupPage = await readFile(
      new URL("../apps/vase-editor/web/src/pages/store/SignupPage.jsx", import.meta.url),
      "utf8",
    );

    expect(signupPage).toContain("formData.password.length < 8");
    expect(signupPage).toContain("La contrasena debe tener al menos 8 caracteres.");
  });
});
