"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import type { IntegrationScope } from "@/config/integrations";
import { prisma } from "@/lib/db/prisma";
import {
  generateApiCredential,
  generateWebhookSecret,
} from "@/lib/integrations/credentials";
import { assertSafeExternalUrl } from "@/lib/security/external-requests";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import {
  createIntegrationCredentialSchema,
  createIntegrationWebhookSchema,
  revokeIntegrationCredentialSchema,
  rotateIntegrationCredentialSchema,
  pauseIntegrationWebhookSchema,
} from "@/lib/validators/integrations";
import { createIntegrationAudit } from "@/server/services/integration-audit";
import { createSecurityEvent } from "@/server/services/security-events";

export type IntegrationActionState = {
  success?: string;
  error?: string;
  secret?: string;
};

function fieldValueList(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .map((value) => String(value))
    .filter(Boolean);
}

export async function createIntegrationCredentialAction(
  _: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    await enforceRateLimit({
      scope: "integration:credential:create",
      key: `${membership.tenantId}:${session.user.id}`,
      limit: 10,
      windowSeconds: 60 * 15,
    });
    const parsed = createIntegrationCredentialSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      requestsPerMinute: formData.get("requestsPerMinute"),
      scopes: fieldValueList(formData, "scopes"),
    });

    if (!parsed.success) {
      return {
        error: "Revisa nombre, scopes y limites antes de generar la credencial.",
      };
    }

    const generated = generateApiCredential(parsed.data.scopes);
    const credential = await prisma.integrationApiCredential.create({
      data: {
        tenantId: membership.tenantId,
        createdByUserId: session.user.id,
        name: parsed.data.name,
        keyId: generated.keyId,
        keyPrefix: generated.keyPrefix,
        tokenHash: generated.tokenHash,
        scopes: parsed.data.scopes as Prisma.InputJsonValue,
        requestsPerMinute: parsed.data.requestsPerMinute,
      },
    });

    await createIntegrationAudit({
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      action: "integration.credential_created",
      targetType: "integration_api_credential",
      targetId: credential.id,
      metadata: {
        scopes: parsed.data.scopes,
        requestsPerMinute: parsed.data.requestsPerMinute,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/integrations/api");
    return {
      success: "Credencial creada. Copia la API key ahora: no volvera a mostrarse completa.",
      secret: generated.displayToken,
    };
  } catch {
    return {
      error: "No pudimos crear la credencial ahora mismo.",
    };
  }
}

export async function rotateIntegrationCredentialAction(
  _: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = rotateIntegrationCredentialSchema.safeParse({
      credentialId: formData.get("credentialId"),
    });

    if (!parsed.success) {
      return { error: "No pudimos identificar la credencial a rotar." };
    }

    const current = await prisma.integrationApiCredential.findFirst({
      where: {
        id: parsed.data.credentialId,
        tenantId: membership.tenantId,
      },
    });

    if (!current) {
      return { error: "La credencial ya no existe." };
    }

    const next = generateApiCredential(
      Array.isArray(current.scopes) ? (current.scopes as IntegrationScope[]) : [],
    );

    await prisma.$transaction(async (tx) => {
      await tx.integrationApiCredential.update({
        where: { id: current.id },
        data: {
          status: "ROTATED",
          rotatedAt: new Date(),
        },
      });

      await tx.integrationApiCredential.create({
        data: {
          tenantId: membership.tenantId,
          createdByUserId: session.user.id,
          name: `${current.name} (rotada)`,
          keyId: next.keyId,
          keyPrefix: next.keyPrefix,
          tokenHash: next.tokenHash,
          scopes: current.scopes as Prisma.InputJsonValue,
          requestsPerMinute: current.requestsPerMinute,
        },
      });
    });

    await createIntegrationAudit({
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      action: "integration.credential_rotated",
      targetType: "integration_api_credential",
      targetId: current.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/integrations/api");
    return {
      success: "Credencial rotada. Usa la nueva API key desde ahora.",
      secret: next.displayToken,
    };
  } catch {
    return {
      error: "No pudimos rotar la credencial.",
    };
  }
}

export async function revokeIntegrationCredentialAction(
  _: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = revokeIntegrationCredentialSchema.safeParse({
      credentialId: formData.get("credentialId"),
    });

    if (!parsed.success) {
      return { error: "No pudimos identificar la credencial a revocar." };
    }

    await prisma.integrationApiCredential.updateMany({
      where: {
        id: parsed.data.credentialId,
        tenantId: membership.tenantId,
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    await createIntegrationAudit({
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      action: "integration.credential_revoked",
      targetType: "integration_api_credential",
      targetId: parsed.data.credentialId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/integrations/api");
    return {
      success: "Credencial revocada correctamente.",
    };
  } catch {
    return {
      error: "No pudimos revocar la credencial.",
    };
  }
}

export async function createIntegrationWebhookAction(
  _: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  let requestContext:
    | Awaited<ReturnType<typeof getRequestContext>>
    | undefined;
  let actorUserId: string | undefined;
  let tenantId: string | undefined;

  try {
    requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    actorUserId = session.user.id;
    tenantId = membership.tenantId;
    await enforceRateLimit({
      scope: "integration:webhook:create",
      key: `${membership.tenantId}:${session.user.id}`,
      limit: 10,
      windowSeconds: 60 * 15,
    });
    const parsed = createIntegrationWebhookSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      url: formData.get("url"),
      eventTypes: fieldValueList(formData, "eventTypes"),
    });

    if (!parsed.success) {
      return {
        error: "Revisa nombre, URL y eventos antes de registrar el webhook.",
      };
    }

    const webhookUrl = assertSafeExternalUrl(parsed.data.url);

    const generated = generateWebhookSecret();
    const webhook = await prisma.integrationWebhookEndpoint.create({
      data: {
        tenantId: membership.tenantId,
        createdByUserId: session.user.id,
        name: parsed.data.name,
        url: webhookUrl.toString(),
        secretHash: generated.secretHash,
        eventTypes: parsed.data.eventTypes as Prisma.InputJsonValue,
      },
    });

    await createIntegrationAudit({
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      action: "integration.webhook_created",
      targetType: "integration_webhook_endpoint",
      targetId: webhook.id,
      metadata: {
        eventTypes: parsed.data.eventTypes,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/integrations/api");
    return {
      success: "Webhook registrado. Copia el secreto firmado para validar entregas.",
      secret: generated.displaySecret,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "INVALID_EXTERNAL_URL",
        "EXTERNAL_URL_PROTOCOL_NOT_ALLOWED",
        "EXTERNAL_URL_PRIVATE_HOST",
        "EXTERNAL_URL_CREDENTIALS_NOT_ALLOWED",
      ].includes(error.message)
    ) {
      if (requestContext && tenantId) {
        await createSecurityEvent({
          event: "unsafe_webhook_url_rejected",
          severity: "high",
          actorUserId,
          tenantId,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: { reason: error.message },
        });
      }

      return {
        error: "La URL del webhook no es segura. Usa HTTPS publico y evita destinos internos o privados.",
      };
    }

    return {
      error: "No pudimos registrar el webhook.",
    };
  }
}

export async function pauseIntegrationWebhookAction(
  _: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = pauseIntegrationWebhookSchema.safeParse({
      webhookId: formData.get("webhookId"),
    });

    if (!parsed.success) {
      return {
        error: "No pudimos identificar el webhook a pausar.",
      };
    }

    await prisma.integrationWebhookEndpoint.updateMany({
      where: {
        id: parsed.data.webhookId,
        tenantId: membership.tenantId,
      },
      data: {
        status: "PAUSED",
      },
    });

    await createIntegrationAudit({
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      action: "integration.webhook_paused",
      targetType: "integration_webhook_endpoint",
      targetId: parsed.data.webhookId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/integrations/api");
    return {
      success: "Webhook pausado.",
    };
  } catch {
    return {
      error: "No pudimos pausar el webhook.",
    };
  }
}
