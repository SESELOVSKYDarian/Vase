import { NextResponse } from "next/server";
import { calculateRemainingMessages, calculateRemainingTokens, getAiAvailability } from "../../../lib/billing";
import { calculateAiBudget } from "../../../lib/ai-budget";
import { createEntitlementFromRequest, createEntitlementFromUnknown, readJsonRecord } from "../_shared";

function tokensPayload(entitlement: ReturnType<typeof createEntitlementFromUnknown>) {
  const budget = calculateAiBudget(entitlement);
  return {
    globalTenantId: entitlement.globalTenantId,
    tokensIncluded: entitlement.tokensIncluded,
    tokensUsed: entitlement.tokensUsed,
    extraTokens: entitlement.extraTokens,
    remainingTokens: calculateRemainingTokens(entitlement),
    remainingMessages: calculateRemainingMessages(entitlement),
    aiBudget: budget,
    availability: getAiAvailability(entitlement),
    renewsAt: entitlement.renewsAt,
  };
}

export function GET(request: Request) {
  return NextResponse.json(tokensPayload(createEntitlementFromRequest(request)));
}

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  return NextResponse.json(tokensPayload(createEntitlementFromUnknown(body.entitlement ?? body)));
}
