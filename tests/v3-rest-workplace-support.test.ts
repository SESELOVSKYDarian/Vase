import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { restSupportRequestSchema } from "@vase/contracts";
import { createWorkplaceClient } from "../apps/vase-rest/app/lib/support/workplace-client";

describe("Rest Workplace support contract", () => {
  it("signs the exact strict payload and never sends a developer role", async () => {
    const secret = "support-signing-secret-with-32-bytes";
    const fetcher = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const body = String(init?.body);
      const timestamp = headers.get("x-vase-timestamp");
      const requestId = headers.get("x-vase-request-id");
      expect(JSON.parse(body)).not.toHaveProperty("role");
      expect(headers.get("x-vase-signature")).toBe(
        createHmac("sha256", secret)
          .update(`${timestamp}.${requestId}.${body}`)
          .digest("base64url"),
      );
      return Response.json({ ticketId: "ticket_1", status: "NEW" });
    });
    const request = restSupportRequestSchema.parse({
      requestId: "01c50170-9838-4a2d-b988-97372ff158cf",
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      requester: {
        globalUserId: "user_1",
        localStaffId: null,
        displayName: "Ada",
      },
      category: "INCIDENT",
      priority: "HIGH",
      title: "No imprime la comanda",
      description: "La impresora de cocina informa un error persistente.",
      context: {
        route: "/kitchen",
        edgeInstallationId: "edge_1",
        edgeLastSeenAt: "2026-07-28T15:00:00.000Z",
        appVersion: "3.0.0",
      },
      createdAt: "2026-07-28T15:01:00.000Z",
    });
    const result = await createWorkplaceClient({
      baseUrl: "https://workplace.internal",
      serviceToken: "service-token",
      signingSecret: secret,
      fetcher: fetcher as typeof fetch,
      now: () => new Date("2026-07-28T15:01:01.000Z"),
    }).createTicket(request);
    expect(result).toEqual({ ticketId: "ticket_1", status: "NEW" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("does not simulate success when Workplace is unavailable", async () => {
    await expect(createWorkplaceClient({
      baseUrl: "https://workplace.internal",
      serviceToken: "service-token",
      signingSecret: "support-signing-secret-with-32-bytes",
      fetcher: vi.fn(async () => { throw new Error("offline"); }),
    }).createTicket(restSupportRequestSchema.parse({
      requestId: "01c50170-9838-4a2d-b988-97372ff158cf",
      globalTenantId: "tenant_1",
      branchId: null,
      requester: {
        globalUserId: null,
        localStaffId: "staff_1",
        displayName: "Mozo",
      },
      category: "PRODUCT_QUESTION",
      priority: "MEDIUM",
      title: "Consulta sobre reservas",
      description: "Necesito asistencia para configurar las reservas del salón.",
      context: {
        route: null,
        edgeInstallationId: null,
        edgeLastSeenAt: null,
        appVersion: "3.0.0",
      },
      createdAt: new Date().toISOString(),
    }))).rejects.toThrow("REST_WORKPLACE_UNAVAILABLE");
  });
});
