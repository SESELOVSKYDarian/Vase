import { describe, expect, it, vi } from "vitest";
import {
  createEnrollmentService,
  hashEnrollmentCode,
  verifyEnrollmentResponse,
} from "../apps/vase-rest/app/lib/devices/enrollment-service";

describe("Rest secure device enrollment", () => {
  const secret = "edge-enrollment-secret-with-32-characters";

  it("issues one-time codes without persisting plaintext and completes branch-bound enrollment", async () => {
    const saveEnrollment = vi.fn(async (input) => ({
      id: "enrollment_1",
      ...input,
    }));
    const complete = vi.fn(async (input) => ({
      installationId: "edge_1",
      globalTenantId: input.globalTenantId,
      branchId: input.branchId,
      certificateFingerprint: input.certificateFingerprint,
    }));
    const service = createEnrollmentService({
      countActiveDevices: async () => 0,
      countActiveEdges: async () => 0,
      branchExists: async () => true,
      saveEnrollment,
      findEnrollmentByCodeHash: async (codeHash) => ({
        id: "enrollment_1",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        kind: "EDGE",
        codeHash,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        revokedAt: null,
      }),
      complete,
    }, { signingSecret: secret });

    const issued = await service.issue({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      kind: "EDGE",
      name: "Edge cocina",
      deviceLimit: 5,
      edgeLimit: 1,
      actorId: "owner_1",
    });
    expect(issued.code).toMatch(/^[A-Z0-9]{8}$/);
    expect(saveEnrollment).toHaveBeenCalledWith(expect.objectContaining({
      codeHash: expect.not.stringMatching(issued.code),
    }));

    const response = await service.complete({
      code: issued.code,
      certificateFingerprint: "SHA256:ABCDEF0123456789",
    });
    expect(response.payload.branchId).toBe("branch_1");
    expect(response.payload.syncUrl).toContain("/api/v1/edge/sync");
    expect(verifyEnrollmentResponse(response, secret)).toBe(true);
  });

  it("rejects expired, replayed, revoked and cross-branch/limit enrollment", async () => {
    const base = {
      id: "enrollment_1",
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      kind: "EDGE" as const,
      codeHash: hashEnrollmentCode("ABCDEFGH", secret),
      expiresAt: new Date(Date.now() - 1),
      usedAt: null,
      revokedAt: null,
    };
    const repository = {
      countActiveDevices: async () => 5,
      countActiveEdges: async () => 1,
      branchExists: async () => false,
      saveEnrollment: vi.fn(),
      findEnrollmentByCodeHash: async () => base,
      complete: vi.fn(),
    };
    const service = createEnrollmentService(repository, { signingSecret: secret });
    await expect(service.issue({
      globalTenantId: "tenant_1",
      branchId: "foreign_branch",
      kind: "DEVICE",
      name: "Caja",
      deviceLimit: 5,
      edgeLimit: 1,
      actorId: "owner_1",
    })).rejects.toThrow("REST_DEVICE_BRANCH_FORBIDDEN");
    await expect(service.complete({
      code: "ABCDEFGH",
      certificateFingerprint: "SHA256:ABCDEF0123456789",
    })).rejects.toThrow("REST_ENROLLMENT_EXPIRED");

    repository.findEnrollmentByCodeHash = async () => ({
      ...base,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });
    await expect(service.complete({
      code: "ABCDEFGH",
      certificateFingerprint: "SHA256:ABCDEF0123456789",
    })).rejects.toThrow("REST_ENROLLMENT_USED");
  });
});
