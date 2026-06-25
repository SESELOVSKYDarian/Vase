import type { LabsChannel } from "@vase/contracts";
import { NextResponse } from "next/server";
import { registerTokenConsumption, type RegisterTokenConsumptionInput } from "../../../lib/billing";
import { createEntitlementFromUnknown, createJsonError, readJsonRecord } from "../_shared";

function createUsageInput(input: unknown): RegisterTokenConsumptionInput | null {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  if (typeof record.channel !== "string") {
    return null;
  }

  return {
    channel: record.channel as LabsChannel,
    inputTokens: typeof record.inputTokens === "number" ? record.inputTokens : 0,
    outputTokens: typeof record.outputTokens === "number" ? record.outputTokens : 0,
    conversationId: typeof record.conversationId === "string" ? record.conversationId : undefined,
    messageId: typeof record.messageId === "string" ? record.messageId : undefined,
    assistantId: typeof record.assistantId === "string" ? record.assistantId : undefined,
    occurredAt: typeof record.occurredAt === "string" ? record.occurredAt : undefined,
  };
}

export async function POST(request: Request) {
  const body = await readJsonRecord(request);
  const usage = createUsageInput(body.usage);

  if (!usage) {
    return createJsonError("INVALID_USAGE");
  }

  try {
    return NextResponse.json(registerTokenConsumption(createEntitlementFromUnknown(body.entitlement), usage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "TOKEN_USAGE_REJECTED";
    return createJsonError(message, 409);
  }
}
