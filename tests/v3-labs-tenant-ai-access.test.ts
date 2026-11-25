// La IA de Labs se pausa cuando la app dice que la prueba venció; si la app no contesta, sigue andando.
import { describe, expect, it, vi } from "vitest";
import { createTenantAiAccessChecker } from "../apps/vase-labs/app/lib/tenant-ai-access";

const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

describe("Labs: acceso a la IA según la prueba gratis", () => {
  it("pausa la IA si la app dice que no, y guarda la respuesta 5 minutos", async () => {
    const fetcher = vi.fn(() => reply({ aiAllowed: false }));
    const check = createTenantAiAccessChecker({ appInternalUrl: "http://app", serviceToken: "t", fetcher: fetcher as unknown as typeof fetch });
    expect(await check("tenant-1")).toBe(false);
    expect(await check("tenant-1")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("deja usar la IA si la app falla o no está configurada", async () => {
    const failing = createTenantAiAccessChecker({ appInternalUrl: "http://app", serviceToken: "t", fetcher: (() => Promise.reject(new Error("red"))) as unknown as typeof fetch });
    expect(await failing("tenant-1")).toBe(true);
    const notConfigured = createTenantAiAccessChecker({ appInternalUrl: undefined, serviceToken: undefined });
    expect(await notConfigured("tenant-1")).toBe(true);
  });
});
