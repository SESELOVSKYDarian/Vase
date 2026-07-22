import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncIntegrationProducts: vi.fn(),
  enqueueLabsCatalogSync: vi.fn(),
  processLabsCatalogOutbox: vi.fn(),
}));

vi.mock("../apps/vase-editor/server/src/services/integrationFtpImages.service.js", () => ({
  syncProductImagesFromFtp: vi.fn(),
}));
vi.mock("../apps/vase-editor/server/src/services/integrationManifest.js", () => ({
  buildProductSyncSchemaForRequest: vi.fn(),
  resolveServerBaseUrl: vi.fn(),
}));
vi.mock("../apps/vase-editor/server/src/services/integration.service.js", () => ({
  syncIntegrationProducts: mocks.syncIntegrationProducts,
}));
vi.mock("../apps/vase-editor/server/src/services/labsCatalogOutbox.js", () => ({
  enqueueLabsCatalogSync: mocks.enqueueLabsCatalogSync,
  processLabsCatalogOutbox: mocks.processLabsCatalogOutbox,
}));
vi.mock("../apps/vase-editor/server/src/services/uploadPublicUrl.js", () => ({
  resolveUploadsPublicBaseUrl: vi.fn(),
}));
vi.mock("../apps/vase-editor/server/src/services/uploadsService.js", () => ({
  buildProductUploadsUsername: vi.fn(),
  uploadBufferToUploadsService: vi.fn(),
}));

import { syncProductsController } from "../apps/vase-editor/server/src/controllers/integration.controller.js";

describe("Business public product sync contract", () => {
  it("keeps the ingestion response and treats Labs replication as an additive result", async () => {
    mocks.syncIntegrationProducts.mockResolvedValueOnce({ received: 1, created: 1, updated: 0 });
    mocks.enqueueLabsCatalogSync.mockResolvedValueOnce({ eventId: "event-1", productCount: 1 });
    mocks.processLabsCatalogOutbox.mockResolvedValueOnce(1);
    const response = responseRecorder();

    await syncProductsController({
      tenantId: "00000000-0000-0000-0000-000000000001",
      body: { products: [{ external_id: "erp-1", name: "Producto" }] },
      get: () => undefined,
    }, response.res, vi.fn());

    expect(mocks.syncIntegrationProducts).toHaveBeenCalledWith({
      tenantId: "00000000-0000-0000-0000-000000000001",
      items: [{ external_id: "erp-1", name: "Producto" }],
      sourceSystem: "erp",
    });
    expect(response.body).toEqual({
      received: 1,
      created: 1,
      updated: 0,
      labs_replication: { queued: true, eventId: "event-1", productCount: 1 },
    });
  });
});

function responseRecorder() {
  const state = { statusCode: 200, body: undefined as unknown };
  return {
    get body() { return state.body; },
    res: {
      status(code: number) { state.statusCode = code; return this; },
      json(body: unknown) { state.body = body; return this; },
    },
  };
}
