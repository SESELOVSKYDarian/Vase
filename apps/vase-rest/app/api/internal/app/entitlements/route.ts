import { restEntitlementSchema } from "@vase/contracts";
import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prismaRestTenantProvisioningRepository } from "@/lib/tenant-provisioning";

const payloadSchema = z.object({
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1),
  entitlement: restEntitlementSchema,
}).strict();

export async function POST(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );
    const payload = payloadSchema.parse(await request.json());
    const tenant = await prismaRestTenantProvisioningRepository
      .upsertTenantWithEntitlement({
        globalTenantId: payload.entitlement.globalTenantId,
        name: payload.tenantName,
        slug: payload.tenantSlug,
        entitlement: payload.entitlement,
      });
    return NextResponse.json({ tenant });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_ENTITLEMENT_SYNC_FAILED";
    return NextResponse.json(
      { error: code },
      { status: code === "FORBIDDEN" ? 403 : code.includes("parse") ? 400 : 422 },
    );
  }
}
