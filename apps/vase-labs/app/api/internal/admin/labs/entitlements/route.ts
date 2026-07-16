import { assertServiceToken } from "@vase/internal-api";
import { labsChannelLimitsSchema, labsChannelSchema, labsPlanSchema, labsServiceStatusSchema, tokenPackSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { labsEntitlementsService } from "../../../../../lib/labs-entitlements-service";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function assertInternalRequest(request: Request) {
  assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
}

function parseChannels(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.map((channel) => labsChannelSchema.parse(channel));
}

async function readJson(request: Request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  try {
    assertInternalRequest(request);
    const globalTenantId = new URL(request.url).searchParams.get("globalTenantId");

    if (!globalTenantId) {
      return jsonError("GLOBAL_TENANT_ID_REQUIRED", 400);
    }

    const entitlement = await labsEntitlementsService.getEntitlement(globalTenantId);
    return NextResponse.json({ entitlement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    return jsonError(message, message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403);
  }
}

export async function POST(request: Request) {
  try {
    assertInternalRequest(request);
    const body = await readJson(request);
    const globalTenantId = typeof body.globalTenantId === "string" ? body.globalTenantId : "";

    if (!globalTenantId) {
      return jsonError("GLOBAL_TENANT_ID_REQUIRED", 400);
    }

    const entitlement = await labsEntitlementsService.upsertEntitlement({
      globalTenantId,
      plan: labsPlanSchema.parse(body.plan),
      status: labsServiceStatusSchema.parse(body.status),
      enabledChannels: parseChannels(body.enabledChannels),
      channelLimits: body.channelLimits ? labsChannelLimitsSchema.parse(body.channelLimits) : undefined,
      tokenPack: body.tokenPack === null || body.tokenPack === undefined ? null : tokenPackSchema.parse(body.tokenPack),
      tokensIncluded: typeof body.tokensIncluded === "number" ? body.tokensIncluded : undefined,
      tokensUsed: typeof body.tokensUsed === "number" ? body.tokensUsed : undefined,
      extraTokens: typeof body.extraTokens === "number" ? body.extraTokens : undefined,
      currentPeriodStart: typeof body.currentPeriodStart === "string" ? body.currentPeriodStart : null,
      renewsAt: typeof body.renewsAt === "string" ? body.renewsAt : null,
    });

    return NextResponse.json({ entitlement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status = message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : message === "FORBIDDEN" ? 403 : 400;
    return jsonError(message, status);
  }
}
