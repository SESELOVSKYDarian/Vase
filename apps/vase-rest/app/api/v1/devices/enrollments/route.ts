import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEnrollmentService,
  prismaEnrollmentRepository,
} from "@/lib/devices/enrollment-service";
import { resolveRestOwnerRequest } from "@/lib/request-context";

const inputSchema = z.object({
  branchId: z.string().min(1),
  kind: z.enum(["DEVICE", "EDGE"]),
  name: z.string().trim().min(2).max(100),
}).strict();

export async function POST(request: Request) {
  try {
    const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
    const context = await resolveRestOwnerRequest({
      cookieHeader: request.headers.get("cookie"),
      requestedTenantSlug: tenant,
    });
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
    const code = error instanceof Error ? error.message : "REST_ENROLLMENT_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("LIMIT") || code.includes("FORBIDDEN") ? 403 : 400,
    });
  }
}
