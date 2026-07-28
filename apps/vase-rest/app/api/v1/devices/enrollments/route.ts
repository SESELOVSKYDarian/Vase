import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEnrollmentService,
  prismaEnrollmentRepository,
} from "@/lib/devices/enrollment-service";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { db } from "@/lib/db";

const inputSchema = z.object({
  branchId: z.string().min(1),
  kind: z.enum(["DEVICE", "EDGE"]),
  name: z.string().trim().min(2).max(100),
}).strict();

async function owner(request: Request) {
  const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: tenant,
  });
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const [devices, edges, enrollments] = await Promise.all([
      db.device.findMany({
        where: { globalTenantId: context.globalTenantId },
        select: {
          id: true, branchId: true, name: true, kind: true, status: true,
          lastSeenAt: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.edgeInstallation.findMany({
        where: { globalTenantId: context.globalTenantId },
        select: {
          id: true, branchId: true, name: true, status: true, agentVersion: true,
          lastSeenAt: true, pendingEventCount: true, failedPrintJobCount: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.deviceEnrollment.findMany({
        where: {
          globalTenantId: context.globalTenantId,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true, branchId: true, kind: true, name: true, expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return NextResponse.json({ devices, edges, enrollments });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const input = inputSchema.parse(await request.json());
    const enrollment = await createEnrollmentService(prismaEnrollmentRepository, {
      signingSecret: process.env.REST_ENROLLMENT_SIGNING_SECRET ?? "",
      signingPrivateKey: process.env.REST_EDGE_SIGNING_PRIVATE_KEY_B64
        ? Buffer.from(process.env.REST_EDGE_SIGNING_PRIVATE_KEY_B64, "base64").toString("utf8")
        : undefined,
      syncBaseUrl: process.env.REST_PUBLIC_URL ?? "https://rest.vase.ar",
    }).issue({
      ...input,
      globalTenantId: context.globalTenantId,
      deviceLimit: context.entitlement.limits.devices,
      edgeLimit: context.entitlement.limits.edgeInstallations,
      actorId: context.actor.id,
    });
    return NextResponse.json({ enrollment }, {
      status: 201,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await owner(request);
    const input = z.object({
      target: z.enum(["DEVICE", "EDGE", "ENROLLMENT"]),
      id: z.string().min(1),
    }).strict().parse(await request.json());
    const changed = await db.$transaction(async (tx) => {
      if (input.target === "ENROLLMENT") {
        return tx.deviceEnrollment.updateMany({
          where: {
            id: input.id,
            globalTenantId: context.globalTenantId,
            usedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }
      if (input.target === "EDGE") {
        const edge = await tx.edgeInstallation.findFirst({
          where: { id: input.id, globalTenantId: context.globalTenantId },
          select: { certificateFingerprint: true },
        });
        if (!edge) return { count: 0 };
        await tx.edgeInstallation.updateMany({
          where: { id: input.id, globalTenantId: context.globalTenantId },
          data: { status: "REVOKED" },
        });
        const devices = await tx.device.findMany({
          where: {
            globalTenantId: context.globalTenantId,
            certificateFingerprint: edge.certificateFingerprint,
          },
          select: { id: true },
        });
        await tx.device.updateMany({
          where: { id: { in: devices.map((device) => device.id) } },
          data: { status: "REVOKED" },
        });
        await tx.staffSession.updateMany({
          where: {
            globalTenantId: context.globalTenantId,
            deviceId: { in: devices.map((device) => device.id) },
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        return { count: 1 };
      }
      const result = await tx.device.updateMany({
        where: { id: input.id, globalTenantId: context.globalTenantId },
        data: { status: "REVOKED" },
      });
      if (result.count) {
        await tx.staffSession.updateMany({
          where: {
            globalTenantId: context.globalTenantId,
            deviceId: input.id,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }
      return result;
    });
    if (changed.count !== 1) throw new Error("REST_DEVICE_NOT_FOUND");
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_ENROLLMENT_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("LIMIT") || code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404 : 400,
  });
}
