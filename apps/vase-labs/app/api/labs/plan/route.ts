import { NextResponse } from "next/server";
import { createEntitlementFromRequest, createEntitlementFromUnknown, readJsonRecord } from "../_shared";

function planPayload(entitlement: ReturnType<typeof createEntitlementFromUnknown>) {
  return {
    globalTenantId: entitlement.globalTenantId,
    plan: entitlement.plan,
    status: entitlement.status,
    tokenPack: entitlement.tokenPack,
    renewsAt: entitlement.renewsAt,
  };
}

export function GET(request: Request) {
  return NextResponse.json(planPayload(createEntitlementFromRequest(request)));
}

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  return NextResponse.json(planPayload(createEntitlementFromUnknown(body.entitlement ?? body)));
}
