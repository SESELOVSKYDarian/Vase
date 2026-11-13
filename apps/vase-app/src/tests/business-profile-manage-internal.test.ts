import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/services/audit-log", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/server/services/business-profile", () => ({ notifyBusinessProfileChanged: vi.fn() }));
vi.mock("@/server/services/business-profile-edit", () => ({
  updateBusinessContact: vi.fn(),
  saveBusinessBranch: vi.fn(),
  deleteBusinessBranch: vi.fn(),
}));

const { createBusinessProfileManageHandler } = await import("@/app/api/internal/business/business-profile/manage/handler");

const allow = () => {};
const deny = () => {
  throw new Error("FORBIDDEN");
};

function post(body: unknown) {
  return new Request("https://app.vase.ar/api/internal/business/business-profile/manage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const branch = { action: "saveBranch", globalTenantId: "t1", actorUserId: "u1", data: { name: "Centro", address: "Florida 300", phone: "", hours: "Lun a sáb de 9 a 18", isMain: false } };

describe("editar Mi negocio desde otro producto", () => {
  it("rechaza llamadas sin el token interno", async () => {
    const run = vi.fn();
    const handler = createBusinessProfileManageHandler({ authorize: deny, isOwner: async () => true, run, afterChange: vi.fn() });
    expect((await handler(post(branch))).status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });

  it("solo deja cambiar al Dueño de esa cuenta", async () => {
    const run = vi.fn();
    const isOwner = vi.fn(async () => false);
    const handler = createBusinessProfileManageHandler({ authorize: allow, isOwner, run, afterChange: vi.fn() });
    const response = await handler(post(branch));
    expect(response.status).toBe(403);
    expect(isOwner).toHaveBeenCalledWith("t1", "u1");
    expect(run).not.toHaveBeenCalled();
  });

  it("rechaza pedidos mal armados", async () => {
    const run = vi.fn();
    const handler = createBusinessProfileManageHandler({ authorize: allow, isOwner: async () => true, run, afterChange: vi.fn() });
    expect((await handler(post({ action: "dropTables", globalTenantId: "t1", actorUserId: "u1", data: {} }))).status).toBe(400);
    expect((await handler(post({ ...branch, globalTenantId: "" }))).status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("guarda en la cuenta pedida y avisa solo si salió bien", async () => {
    const run = vi.fn(async () => ({ ok: true as const, message: "Sucursal guardada." }));
    const afterChange = vi.fn(async () => {});
    const handler = createBusinessProfileManageHandler({ authorize: allow, isOwner: async () => true, run, afterChange });
    const response = await handler(post(branch));
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith("t1", expect.objectContaining({ action: "saveBranch", data: expect.objectContaining({ name: "Centro" }) }));
    expect(afterChange).toHaveBeenCalledWith("t1", "u1", "saveBranch");

    run.mockResolvedValueOnce({ ok: false, message: "Completá nombre y dirección." } as never);
    afterChange.mockClear();
    const bad = await handler(post(branch));
    expect(bad.status).toBe(422);
    expect(afterChange).not.toHaveBeenCalled();
  });
});
