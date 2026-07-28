import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { encryptSecret } from "@/lib/secrets/encryption";
import { readSecretKeyring } from "@/lib/secrets/keyring";

async function owner(request: Request) {
  const url = new URL(request.url);
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: url.searchParams.get("tenant") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const connections = await db.paymentProviderConnection.findMany({
      where: { globalTenantId: context.globalTenantId, provider: "MERCADO_PAGO" },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { branch: { name: "asc" } },
    });
    return NextResponse.json({
      connections: connections.map((connection) => ({
        id: connection.id,
        branch: connection.branch,
        status: connection.status,
        environment: connection.environment,
        providerAccount: connection.providerAccountId
          ? `••••${connection.providerAccountId.slice(-4)}` : null,
        hasWebhookSecret: Boolean(connection.webhookSecretCiphertext),
        tokenExpiresAt: connection.tokenExpiresAt,
        config: connection.config,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await owner(request);
    const input = z.object({
      branchId: z.string().min(1),
      webhookSecret: z.string().min(16).optional(),
      terminalId: z.string().max(120).optional(),
      externalPosId: z.string().max(120).optional(),
      qrMode: z.enum(["dynamic", "hybrid", "static"]).optional(),
    }).strict().parse(await request.json());
    const connection = await db.paymentProviderConnection.findFirst({
      where: {
        branchId: input.branchId,
        globalTenantId: context.globalTenantId,
        provider: "MERCADO_PAGO",
      },
    });
    if (!connection) throw new Error("REST_MP_CONNECTION_NOT_FOUND");
    const keyring = readSecretKeyring();
    const webhookSecretCiphertext = input.webhookSecret
      ? encryptSecret({
          plaintext: input.webhookSecret,
          context: `${context.globalTenantId}:${input.branchId}:mercado-pago:webhook`,
          keyVersion: keyring.activeVersion,
          key: keyring.keys[keyring.activeVersion]!,
        })
      : undefined;
    await db.paymentProviderConnection.update({
      where: { id: connection.id },
      data: {
        ...(webhookSecretCiphertext ? { webhookSecretCiphertext } : {}),
        config: {
          terminalId: input.terminalId || null,
          externalPosId: input.externalPosId || null,
          qrMode: input.qrMode ?? "dynamic",
          qrWebhookVerification: "CERTIFICATION_REQUIRED",
        },
      },
    });
    return NextResponse.json({ status: "SAVED" });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_MP_SETTINGS_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404 : 400,
  });
}

