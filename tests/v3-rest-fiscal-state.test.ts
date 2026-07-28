import { describe, expect, it, vi } from "vitest";
import { createFiscalService } from "../apps/vase-rest/app/lib/fiscal/fiscal-service";

describe("Rest fiscal state", () => {
  it("serializes numbering and recovers an ambiguous authorization by consulting ARCA", async () => {
    const save = vi.fn(async (value) => value);
    const service = createFiscalService({
      findReceipt: async () => null,
      prepare: async () => ({
        documentId: "doc_1",
        connectionId: "connection_1",
        pointOfSale: 3,
        voucherType: 6,
        request: { total: "1210.00" },
      }),
      credentials: async () => ({ token: "token", sign: "sign", cuit: "30712345678" }),
      lastAuthorized: async () => 149,
      authorize: async () => { throw new Error("REST_ARCA_RESPONSE_AMBIGUOUS"); },
      consult: async (_prepared, number) => ({
        result: "A", cae: "74123456789012", caeExpiresAt: "20260807",
        voucherNumber: number,
      }),
      save,
      withSequenceLock: async (_prepared, operation) => operation(),
    });
    await expect(service.issue({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      documentType: "INVOICE_B", commandId: "fiscal_1", actorId: "cashier_1",
      recipientDocType: 99, recipientDocNumber: "0",
    })).resolves.toMatchObject({ cae: "74123456789012" });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      status: "AUTHORIZED",
      voucherNumber: 150,
    }));
  });

  it("never synthesizes a CAE for a rejected response", async () => {
    const service = createFiscalService({
      findReceipt: async () => null,
      prepare: async () => ({
        documentId: "doc_1", connectionId: "connection_1",
        pointOfSale: 3, voucherType: 6, request: {},
      }),
      credentials: async () => ({ token: "token", sign: "sign", cuit: "30712345678" }),
      lastAuthorized: async () => 9,
      authorize: async () => ({
        result: "R", voucherNumber: 10,
        observations: [{ code: 10016, message: "Fecha inválida" }],
      }),
      consult: vi.fn(),
      save: async (value) => value,
      withSequenceLock: async (_prepared, operation) => operation(),
    });
    const result = await service.issue({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      documentType: "INVOICE_B", commandId: "fiscal_2", actorId: "cashier_1",
      recipientDocType: 99, recipientDocNumber: "0",
    });
    expect(result).toMatchObject({ status: "REJECTED" });
    expect(result).not.toHaveProperty("cae");
  });
});
