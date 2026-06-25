import type { LabsChannel } from "@vase/contracts";
import { NextResponse } from "next/server";
import { canTenantUseChannel } from "../../../../lib/billing";
import { ALL_LABS_CHANNELS, createEntitlementFromUnknown, createJsonError, readJsonRecord } from "../../_shared";

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  const channel = body.channel;

  if (!ALL_LABS_CHANNELS.includes(channel as LabsChannel)) {
    return createJsonError("INVALID_CHANNEL");
  }

  return NextResponse.json(canTenantUseChannel(createEntitlementFromUnknown(body.entitlement), channel as LabsChannel));
}
