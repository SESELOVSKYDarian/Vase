import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const rows = await (labsPrisma as any).$queryRaw<Array<{ tokensUsed: number; tokenUsageTotal: bigint | number | null }>>`
    SELECT e."tokensUsed", SUM(t."totalTokens") AS "tokenUsageTotal"
    FROM "Assistant" a
    JOIN "LabsEntitlement" e ON e."globalTenantId" = a."globalTenantId"
    LEFT JOIN "TokenUsage" t ON t."globalTenantId" = a."globalTenantId"
    WHERE a."tenantSlug" = ${tenantSlug}
    GROUP BY e."tokensUsed"
    LIMIT 1
  `;
  const row = rows[0];

  return NextResponse.json({
    usage: row
      ? {
          tokensUsed: row.tokensUsed,
          tokenUsageTotal: Number(row.tokenUsageTotal ?? 0),
        }
      : null,
  });
}
