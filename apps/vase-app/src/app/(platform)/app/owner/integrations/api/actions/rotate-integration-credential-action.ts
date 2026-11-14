"use server";

// Parte de actions.ts: createIntegrationCredentialAction, rotateIntegrationCredentialAction, revokeIntegrationCredentialAction.
import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { type IntegrationScope } from "@/config/integrations";
import { prisma } from "@/lib/db/prisma";
import { buildCompatibilityConsumerSecret, generateApiCredential } from "@/lib/integrations/credentials";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { createIntegrationCredentialSchema, revokeIntegrationCredentialSchema, rotateIntegrationCredentialSchema } from "@/lib/validators/integrations";
import { createIntegrationAudit } from "@/server/services/integration-audit";
import { IntegrationActionState, fieldValueList } from "./integration-action-state";

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
      compatibilitySecret: buildCompatibilityConsumerSecret({
        tenantId: membership.tenantId,
        tokenValue: generated.displayToken,
      }) ?? undefined,
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
      compatibilitySecret: buildCompatibilityConsumerSecret({
        tenantId: membership.tenantId,
        tokenValue: next.displayToken,
      }) ?? undefined,
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
