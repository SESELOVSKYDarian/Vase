import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { encryptSecret } from "@/lib/secrets/encryption";
import { readSecretKeyring } from "@/lib/secrets/keyring";

const providers = ["PEDIDOS_YA", "RAPPI", "GLOVO", "UBER_EATS"] as const;

async function owner(request: Request) {
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug:
      new URL(request.url).searchParams.get("tenant") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const context = await owner(request);
    const connections = await db.deliveryConnection.findMany({
      where: { globalTenantId: context.globalTenantId },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { provider: "asc" }],
    });
    return NextResponse.json({
      providers: providers.map((provider) => ({
        provider,
        availability: "PARTNER_APPROVAL_REQUIRED",
      })),
      connections: connections.map((connection) => ({
        id: connection.id,
        branch: connection.branch,
        provider: connection.provider,
        environment: connection.environment,
        status: connection.status,
        storeId: connection.storeId,
        hasClientId: Boolean(connection.clientIdCiphertext),
        hasClientSecret: Boolean(connection.clientSecretCiphertext),
        hasWebhookSecret: Boolean(connection.webhookSecretCiphertext),
        lastSuccessfulOperationAt: connection.lastSuccessfulOperationAt,
        lastError: connection.lastError,
        webhookPath: `/api/v1/webhooks/delivery/${connection.id}`,
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
      provider: z.enum(providers),
      environment: z.enum(["SANDBOX", "PRODUCTION"]),
      storeId: z.string().trim().min(1).max(200),
      clientId: z.string().trim().min(1).max(500).optional(),
      clientSecret: z.string().min(1).max(2_000).optional(),
      webhookSecret: z.string().min(1).max(2_000).optional(),
    }).strict().parse(await request.json());
    const branch = await db.branch.findFirst({
      where: {
        id: input.branchId,
        globalTenantId: context.globalTenantId,
        active: true,
      },
    });
    if (!branch) throw new Error("REST_BRANCH_NOT_FOUND");
    const existing = await db.deliveryConnection.findUnique({
      where: {
        branchId_provider: {
          branchId: branch.id,
          provider: input.provider,
        },
      },
    });
    if (!existing && (!input.clientId || !input.clientSecret)) {
      throw new Error("REST_DELIVERY_CREDENTIALS_REQUIRED");
    }
    const keyring = readSecretKeyring();
    const base = `${context.globalTenantId}:${branch.id}:delivery:${input.provider}`;
    const encrypt = (plaintext: string, suffix: string) => encryptSecret({
      plaintext,
      context: `${base}:${suffix}`,
      keyVersion: keyring.activeVersion,
      key: keyring.keys[keyring.activeVersion]!,
    });
    const data = {
      restTenantId: branch.restTenantId,
      globalTenantId: context.globalTenantId,
      environment: input.environment,
      storeId: input.storeId,
      status: "PENDING_APPROVAL",
      config: {
        adapter: "NOT_CERTIFIED",
        approvalOwner: "PROVIDER",
      } as Prisma.InputJsonValue,
      certificationEvidence: Prisma.JsonNull,
      lastError: null,
      ...(input.clientId
        ? { clientIdCiphertext: encrypt(input.clientId, "client-id") } : {}),
      ...(input.clientSecret
        ? { clientSecretCiphertext: encrypt(input.clientSecret, "client-secret") } : {}),
      ...(input.webhookSecret
        ? { webhookSecretCiphertext: encrypt(input.webhookSecret, "webhook-secret") } : {}),
    };
    const connection = await db.deliveryConnection.upsert({
      where: {
        branchId_provider: {
          branchId: branch.id,
          provider: input.provider,
        },
      },
      create: {
        ...data,
        branchId: branch.id,
        provider: input.provider,
      },
      update: data,
    });
    return NextResponse.json({
      status: connection.status,
      message: "REST_DELIVERY_PROVIDER_APPROVAL_REQUIRED",
    });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error
    ? error.message : "REST_DELIVERY_SETTINGS_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") ? 409 : 400,
  });
}
