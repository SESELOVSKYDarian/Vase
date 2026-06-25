import { getLabsPlanLimits, type LabsChannel, type LabsPlan, type TokenPack } from "@vase/contracts";
import { NextResponse } from "next/server";
import { createRuntimeEntitlement, type LabsRuntimeEntitlement, type LabsRuntimeStatus } from "../../lib/billing";

export const ALL_LABS_CHANNELS: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

const labsPlans: LabsPlan[] = ["STARTER", "GROWTH", "PRO"];
const tokenPacks: TokenPack[] = ["BASIC", "MEDIUM", "PRO"];
const serviceStatuses: LabsRuntimeStatus[] = ["ACTIVE", "TRIAL", "PAUSED", "SUSPENDED", "EXPIRED", "CANCELLED"];

function parseNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePlan(value: unknown): LabsPlan {
  return labsPlans.includes(value as LabsPlan) ? (value as LabsPlan) : "STARTER";
}

function parseStatus(value: unknown): LabsRuntimeStatus {
  return serviceStatuses.includes(value as LabsRuntimeStatus) ? (value as LabsRuntimeStatus) : "ACTIVE";
}

function parseTokenPack(value: unknown): TokenPack | null {
  return tokenPacks.includes(value as TokenPack) ? (value as TokenPack) : null;
}

function parseChannels(value: unknown, plan: LabsPlan): LabsChannel[] {
  if (Array.isArray(value)) {
    return value.filter((channel): channel is LabsChannel => ALL_LABS_CHANNELS.includes(channel as LabsChannel));
  }

  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((channel) => channel.trim())
      .filter((channel): channel is LabsChannel => ALL_LABS_CHANNELS.includes(channel as LabsChannel));
  }

  return [...getLabsPlanLimits(plan).includedChannels];
}

export function createJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function createEntitlementFromUnknown(input: unknown): LabsRuntimeEntitlement {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const plan = parsePlan(record.plan);
  const defaults = getLabsPlanLimits(plan);

  return createRuntimeEntitlement({
    globalTenantId: typeof record.globalTenantId === "string" ? record.globalTenantId : "tenant_demo",
    plan,
    status: parseStatus(record.status),
    enabledChannels: parseChannels(record.enabledChannels, plan),
    tokenPack: parseTokenPack(record.tokenPack),
    tokensIncluded: parseNumber(record.tokensIncluded, defaults.monthlyTokenLimit),
    tokensUsed: parseNumber(record.tokensUsed, 0),
    extraTokens: parseNumber(record.extraTokens, 0),
    currentPeriodStart: typeof record.currentPeriodStart === "string" ? record.currentPeriodStart : null,
    renewsAt: typeof record.renewsAt === "string" ? record.renewsAt : null,
  });
}

export function createEntitlementFromRequest(request: Request): LabsRuntimeEntitlement {
  const params = new URL(request.url).searchParams;

  return createEntitlementFromUnknown({
    globalTenantId: params.get("globalTenantId") ?? undefined,
    plan: params.get("plan") ?? undefined,
    status: params.get("status") ?? undefined,
    enabledChannels: params.get("enabledChannels") ?? undefined,
    tokenPack: params.get("tokenPack") ?? undefined,
    tokensIncluded: params.get("tokensIncluded") ?? undefined,
    tokensUsed: params.get("tokensUsed") ?? undefined,
    extraTokens: params.get("extraTokens") ?? undefined,
    currentPeriodStart: params.get("currentPeriodStart") ?? undefined,
    renewsAt: params.get("renewsAt") ?? undefined,
  });
}

export async function readJsonRecord(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
