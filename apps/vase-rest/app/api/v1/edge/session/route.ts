import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateEdgeRequest } from "@/lib/edge/edge-auth";
import {
  createPinAuthService,
  prismaPinAuthRepository,
} from "@/lib/staff/pin-auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const edge = await authenticateEdgeRequest(request);
    const input = z.object({
      employeeCode: z.string().min(2),
      pin: z.string().regex(/^\d{4,8}$/),
    }).strict().parse(await request.json());
    const device = await db.device.findFirst({
      where: {
        globalTenantId: edge.globalTenantId,
        branchId: edge.branchId,
        certificateFingerprint: edge.certificateFingerprint,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!device) throw new Error("REST_EDGE_DEVICE_NOT_FOUND");
    const result = await createPinAuthService(prismaPinAuthRepository, {
      sessionSecret: process.env.REST_STAFF_SESSION_SECRET ?? "",
    }).authenticate({
      globalTenantId: edge.globalTenantId,
      branchId: edge.branchId,
      deviceId: device.id,
      employeeCode: input.employeeCode,
      pin: input.pin,
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_EDGE_SESSION_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("MTLS") ? 401
        : code.includes("PIN_INVALID") ? 401
          : code.includes("LOCKED") ? 429
            : code.includes("FORBIDDEN") || code.includes("REVOKED") ? 403
              : code.includes("NOT_FOUND") ? 404 : 400,
      headers: { "cache-control": "no-store" },
    });
  }
}
