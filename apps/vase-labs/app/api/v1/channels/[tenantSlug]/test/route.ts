import { NextResponse } from "next/server";
import { decryptChannelSecret } from "../../../../../lib/channel-secrets";
import { labsPrisma } from "../../../../../lib/db";
import { diagnosticCheck, type ChannelDiagnosticResult } from "../../../../../lib/channel-diagnostic";
import { hasMessagingPermission, hasMetaChannelCredentials, resolveMetaAssetValidationState } from "../../../../../lib/channel-health";
import { createMetaGraphClient } from "../../../../../lib/meta-graph";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

const fatal = new Set([
  "META_TOKEN_INVALID",
  "META_PERMISSIONS_MISSING",
  "META_ASSET_NOT_AUTHORIZED",
  "CHANNEL_CREDENTIAL_MISSING",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug: channelId } = await params;
    const { assistant } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const channel = await labsPrisma.channel.findFirst({
      where: {
        id: channelId,
        assistantId: assistant.id,
        provider: "META_OFFICIAL",
        status: { in: ["CONNECTED", "PENDING", "ERROR"] },
      },
      include: {
        secrets: {
          where: { kind: { in: ["META_ACCESS_TOKEN", "META_APP_SECRET"] } },
          select: { kind: true, encryptedValue: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "CHANNEL_NOT_CONNECTED" }, { status: 404 });
    }

    const config = channel.config && typeof channel.config === "object" && !Array.isArray(channel.config)
      ? channel.config as Record<string, unknown>
      : {};
    const stored = (kind: string) => channel.secrets.find((secret) => secret.kind === kind)?.encryptedValue;
    const encryption = process.env.TOKEN_ENCRYPTION_SECRET?.trim();
    const tokenEncrypted = stored("META_ACCESS_TOKEN");
    const secretEncrypted = stored("META_APP_SECRET");
    let code: string | undefined;
    let token: string | undefined;
    let appSecret: string | undefined;

    try {
      if (!encryption) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
      if (!tokenEncrypted) throw new Error("CHANNEL_CREDENTIAL_MISSING");
      token = decryptChannelSecret(tokenEncrypted, encryption);
      appSecret = secretEncrypted
        ? decryptChannelSecret(secretEncrypted, encryption)
        : process.env.META_APP_SECRET?.trim();
    } catch (error) {
      code = error instanceof Error ? error.message : "CHANNEL_CREDENTIAL_MISSING";
    }

    const appId = (typeof config.metaAppId === "string" ? config.metaAppId.trim() : "")
      || process.env.META_APP_ID?.trim();
    if (!code && !appId) code = "META_APP_ID_MISSING";
    if (!code && !appSecret) code = "META_APP_SECRET_MISSING";

    let metaOk = false;
    if (!code && token && appSecret && appId) {
      try {
        await createMetaGraphClient({
          graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
          appId,
          appSecret,
        }).testConnection({
          channelType: channel.type,
          accessToken: token,
          providerAccountId: channel.providerAccountId,
        });
        metaOk = true;
      } catch (error) {
        code = error instanceof Error ? error.message : "META_GRAPH_REQUEST_FAILED";
      }
    }

    const credentials = hasMetaChannelCredentials({
      secretKinds: channel.secrets.map((secret) => secret.kind),
      config,
      fallbackAppId: process.env.META_APP_ID,
      fallbackAppSecret: process.env.META_APP_SECRET,
    });
    const assetState = resolveMetaAssetValidationState({
      providerAccountId: channel.providerAccountId,
      config,
      currentError: metaOk ? null : code ?? null,
    });
    const asset = assetState === "VALID";
    const webhook = Boolean(channel.webhookVerifiedAt);
    const subscription = Array.isArray(config.subscribedFields) && config.subscribedFields.length > 0;
    const messagingPermission = hasMessagingPermission(config);
    const checks = {
      credentials: diagnosticCheck(credentials, "Las credenciales están configuradas.", "CREDENTIALS_MISSING"),
      metaApi: diagnosticCheck(metaOk, "Vase pudo comunicarse correctamente con Meta.", code),
      asset: diagnosticCheck(asset, "El activo Meta está validado.", assetState === "PENDING" ? "ASSET_VALIDATION_PENDING" : assetState === "MISSING" ? "ASSET_MISSING" : "META_ASSET_NOT_AUTHORIZED"),
      webhook: diagnosticCheck(webhook, "El webhook está verificado.", "WEBHOOK_NOT_VERIFIED"),
      subscription: diagnosticCheck(subscription, "La suscripción de eventos está activa.", "SUBSCRIPTION_NOT_ACTIVE"),
      messagingPermission: diagnosticCheck(messagingPermission, "El permiso para mensajes está verificado.", "META_MESSAGING_PERMISSION_MISSING"),
    };
    const failures = Object.values(checks).filter((check) => !check.ok);
    const nextStatus = fatal.has(code ?? "")
      ? "ERROR"
      : credentials && metaOk && asset && webhook && subscription && messagingPermission
        ? "CONNECTED"
        : "PENDING";
    const result: ChannelDiagnosticResult = {
      ok: failures.length === 0,
      status: nextStatus,
      testedAt: new Date().toISOString(),
      summary: failures.length
        ? `Se detectaron ${failures.length} problema${failures.length === 1 ? "" : "s"}`
        : "El canal funciona correctamente",
      checks,
    };

    await labsPrisma.channel.update({
      where: { id: channel.id },
      data: {
        status: nextStatus,
        lastSyncedAt: new Date(),
        lastError: metaOk
          ? null
          : (code ?? failures.find((check) => check.code)?.code ?? "CHANNEL_TEST_FAILED").slice(0, 160),
        ...(fatal.has(code ?? "") ? { status: "ERROR" } : {}),
      },
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "CHANNEL_TEST_FAILED" }, { status: 500 });
  }
}
