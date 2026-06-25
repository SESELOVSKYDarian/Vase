import { canTenantUseChannel } from "../../../lib/billing";
import { ALL_LABS_CHANNELS, createEntitlementFromRequest, createEntitlementFromUnknown, readJsonRecord } from "../_shared";
import { NextResponse } from "next/server";

function channelsPayload(entitlement: ReturnType<typeof createEntitlementFromUnknown>) {
  return {
    globalTenantId: entitlement.globalTenantId,
    plan: entitlement.plan,
    enabledChannels: entitlement.enabledChannels,
    channels: Object.fromEntries(
      ALL_LABS_CHANNELS.map((channel) => [channel, canTenantUseChannel(entitlement, channel)]),
    ),
  };
}

export function GET(request: Request) {
  return NextResponse.json(channelsPayload(createEntitlementFromRequest(request)));
}

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  return NextResponse.json(channelsPayload(createEntitlementFromUnknown(body.entitlement ?? body)));
}
