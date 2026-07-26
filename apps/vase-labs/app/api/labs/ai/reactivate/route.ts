import { NextResponse } from "next/server";
import { createRuntimeEntitlement, getAiAvailability } from "../../../../lib/billing";
import { createEntitlementFromUnknown, readJsonRecord } from "../../_shared";

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  const current = createEntitlementFromUnknown(body.entitlement ?? body);
  const entitlement = createRuntimeEntitlement({
    ...current,
    status: "ACTIVE",
  });

  return NextResponse.json({
    entitlement,
    availability: getAiAvailability(entitlement),
  });
}
