import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";
import { requireTenantAccess } from "../../../../../lib/tenant-route-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(request, tenantSlug);
  if (!access.ok) return access.response;
  const assistant = await (labsPrisma as any).assistant.findUnique({
    where: { tenantSlug },
    select: { globalTenantId: true },
  });
  const entitlement = assistant
    ? await (labsPrisma as any).labsEntitlement.findUnique({
        where: { globalTenantId: assistant.globalTenantId },
        select: { tokensUsed: true },
      })
    : null;
  const tokenUsage = assistant
    ? await (labsPrisma as any).tokenUsage.aggregate({
        where: { globalTenantId: assistant.globalTenantId },
        _sum: { totalTokens: true },
      })
    : null;

  return NextResponse.json({
    usage: entitlement
      ? {
          tokensUsed: entitlement.tokensUsed,
          tokenUsageTotal: Number(tokenUsage?._sum.totalTokens ?? 0),
        }
      : null,
  });
}
