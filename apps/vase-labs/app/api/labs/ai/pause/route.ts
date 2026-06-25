import { NextResponse } from "next/server";
import { createRuntimeEntitlement, getAiAvailability } from "../../../../lib/billing";
import { createEntitlementFromUnknown, readJsonRecord } from "../../_shared";

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  const entitlement = createRuntimeEntitlement({
    ...createEntitlementFromUnknown(body.entitlement ?? body),
    status: "PAUSED",
  });

  return NextResponse.json({
    entitlement,
    availability: getAiAvailability(entitlement),
  });
}
