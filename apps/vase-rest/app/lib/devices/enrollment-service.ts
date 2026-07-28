import {
  createHmac,
  randomBytes,
  sign as signAsymmetric,
  timingSafeEqual,
  verify as verifyAsymmetric,
} from "node:crypto";
import { db } from "../db";

type EnrollmentKind = "DEVICE" | "EDGE";
type EnrollmentRecord = {
  id: string;
  globalTenantId: string;
  branchId: string;
  kind: EnrollmentKind;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

export interface EnrollmentRepository {
  countActiveDevices(globalTenantId: string): Promise<number>;
  countActiveEdges(globalTenantId: string): Promise<number>;
  branchExists(globalTenantId: string, branchId: string): Promise<boolean>;
  saveEnrollment(input: {
    globalTenantId: string;
    branchId: string;
    kind: EnrollmentKind;
    name: string;
    codeHash: string;
    deviceLimit: number;
    edgeLimit: number;
    expiresAt: Date;
    actorId: string;
  }): Promise<{ id: string }>;
  findEnrollmentByCodeHash(codeHash: string): Promise<EnrollmentRecord | null>;
  complete(input: {
    enrollmentId: string;
    globalTenantId: string;
    branchId: string;
    kind: EnrollmentKind;
    certificateFingerprint: string;
  }): Promise<{
    installationId: string;
    globalTenantId: string;
    branchId: string;
    certificateFingerprint: string;
  }>;
}

export function hashEnrollmentCode(code: string, secret: string) {
  return createHmac("sha256", secret).update(code).digest("base64url");
}

function signPayload(payload: object, secret: string, privateKey?: string) {
  if (privateKey) {
    return signAsymmetric(
      null,
      Buffer.from(JSON.stringify(payload)),
      privateKey,
    ).toString("base64url");
  }
  return createHmac("sha256", secret)
    .update(JSON.stringify(payload)).digest("base64url");
}

export function verifyEnrollmentResponse(
  response: { payload: object; signature: string },
  verificationKey: string,
) {
  if (verificationKey.includes("PUBLIC KEY")) {
    return verifyAsymmetric(
      null,
      Buffer.from(JSON.stringify(response.payload)),
      verificationKey,
      Buffer.from(response.signature, "base64url"),
    );
  }
  const expected = Buffer.from(signPayload(response.payload, verificationKey));
  const candidate = Buffer.from(response.signature);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function createEnrollmentService(
  repository: EnrollmentRepository,
  config: {
    signingSecret: string;
    signingPrivateKey?: string;
    now?: () => Date;
    ttlMs?: number;
    syncBaseUrl?: string;
  },
) {
  if (config.signingSecret.length < 24) {
    throw new Error("REST_ENROLLMENT_SECRET_NOT_CONFIGURED");
  }
  return {
    async issue(input: {
      globalTenantId: string;
      branchId: string;
      kind: EnrollmentKind;
      name: string;
      deviceLimit: number;
      edgeLimit: number;
      actorId: string;
    }) {
      if (!await repository.branchExists(input.globalTenantId, input.branchId)) {
        throw new Error("REST_DEVICE_BRANCH_FORBIDDEN");
      }
      if (await repository.countActiveDevices(input.globalTenantId) >= input.deviceLimit) {
        throw new Error("REST_DEVICE_LIMIT_REACHED");
      }
      if (
        input.kind === "EDGE" &&
        await repository.countActiveEdges(input.globalTenantId) >= input.edgeLimit
      ) {
        throw new Error("REST_EDGE_LIMIT_REACHED");
      }
      const code = randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date(
        (config.now?.() ?? new Date()).getTime() + (config.ttlMs ?? 10 * 60 * 1000),
      );
      const enrollment = await repository.saveEnrollment({
        ...input,
        codeHash: hashEnrollmentCode(code, config.signingSecret),
        expiresAt,
      });
      return { enrollmentId: enrollment.id, code, expiresAt };
    },
    async complete(input: { code: string; certificateFingerprint: string }) {
      if (!/^SHA256:[A-Fa-f0-9]{16,128}$/.test(input.certificateFingerprint)) {
        throw new Error("REST_CERTIFICATE_FINGERPRINT_INVALID");
      }
      const enrollment = await repository.findEnrollmentByCodeHash(
        hashEnrollmentCode(input.code.trim().toUpperCase(), config.signingSecret),
      );
      if (!enrollment) throw new Error("REST_ENROLLMENT_NOT_FOUND");
      if (enrollment.revokedAt) throw new Error("REST_ENROLLMENT_REVOKED");
      if (enrollment.usedAt) throw new Error("REST_ENROLLMENT_USED");
      const now = config.now?.() ?? new Date();
      if (enrollment.expiresAt <= now) throw new Error("REST_ENROLLMENT_EXPIRED");
      const completed = await repository.complete({
        enrollmentId: enrollment.id,
        globalTenantId: enrollment.globalTenantId,
        branchId: enrollment.branchId,
        kind: enrollment.kind,
        certificateFingerprint: input.certificateFingerprint.toUpperCase(),
      });
      const payload = {
        globalTenantId: completed.globalTenantId,
        branchId: completed.branchId,
        installationId: completed.installationId,
        certificateFingerprint: completed.certificateFingerprint,
        capabilities: enrollment.kind === "EDGE"
          ? ["sync:push", "sync:pull", "printing:dispatch", "lan:coordinate"]
          : ["staff:authenticate", "orders:operate"],
        syncUrl: new URL(
          "/api/v1/edge/sync",
          config.syncBaseUrl ?? "https://rest.vase.ar",
        ).toString(),
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
      return {
        payload,
        signature: signPayload(payload, config.signingSecret, config.signingPrivateKey),
        algorithm: config.signingPrivateKey ? "Ed25519" : "HMAC-SHA256",
      };
    },
  };
}

export const prismaEnrollmentRepository: EnrollmentRepository = {
  countActiveDevices(globalTenantId) {
    return db.device.count({ where: { globalTenantId, status: "ACTIVE" } });
  },
  countActiveEdges(globalTenantId) {
    return db.edgeInstallation.count({ where: { globalTenantId, status: "ACTIVE" } });
  },
  async branchExists(globalTenantId, branchId) {
    return Boolean(await db.branch.findFirst({
      where: { id: branchId, globalTenantId, active: true },
      select: { id: true },
    }));
  },
  saveEnrollment(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
        select: { id: true },
      });
      return tx.deviceEnrollment.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          kind: input.kind,
          name: input.name,
          codeHash: input.codeHash,
          deviceLimit: input.deviceLimit,
          edgeLimit: input.edgeLimit,
          expiresAt: input.expiresAt,
          createdBy: input.actorId,
        },
        select: { id: true },
      });
    });
  },
  findEnrollmentByCodeHash(codeHash) {
    return db.deviceEnrollment.findUnique({
      where: { codeHash },
      select: {
        id: true,
        globalTenantId: true,
        branchId: true,
        kind: true,
        codeHash: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
      },
    }) as Promise<EnrollmentRecord | null>;
  },
  complete(input) {
    return db.$transaction(async (tx) => {
      const enrollment = await tx.deviceEnrollment.findUniqueOrThrow({
        where: { id: input.enrollmentId },
      });
      if (enrollment.usedAt || enrollment.revokedAt || enrollment.expiresAt <= new Date()) {
        throw new Error("REST_ENROLLMENT_INVALID");
      }
      if (await tx.device.count({
        where: { globalTenantId: input.globalTenantId, status: "ACTIVE" },
      }) >= enrollment.deviceLimit) {
        throw new Error("REST_DEVICE_LIMIT_REACHED");
      }
      if (input.kind === "EDGE" && await tx.edgeInstallation.count({
        where: { globalTenantId: input.globalTenantId, status: "ACTIVE" },
      }) >= enrollment.edgeLimit) {
        throw new Error("REST_EDGE_LIMIT_REACHED");
      }
      const device = await tx.device.create({
        data: {
          restTenantId: enrollment.restTenantId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          name: enrollment.name,
          kind: input.kind,
          certificateFingerprint: input.certificateFingerprint,
        },
      });
      let installationId = device.id;
      if (input.kind === "EDGE") {
        const edge = await tx.edgeInstallation.create({
          data: {
            restTenantId: enrollment.restTenantId,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            name: enrollment.name,
            certificateFingerprint: input.certificateFingerprint,
          },
        });
        installationId = edge.id;
      }
      await tx.deviceEnrollment.update({
        where: { id: enrollment.id },
        data: { usedAt: new Date() },
      });
      return {
        installationId,
        globalTenantId: input.globalTenantId,
        branchId: input.branchId,
        certificateFingerprint: input.certificateFingerprint,
      };
    });
  },
};
