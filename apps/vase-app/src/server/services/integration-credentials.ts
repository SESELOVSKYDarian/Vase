import { prisma } from "@/lib/db/prisma";
import {
  buildCompatibilityConsumerSecret,
  parseApiCredential,
  verifySecretHash,
} from "@/lib/integrations/credentials";
import type { IntegrationScope } from "@/config/integrations";

export type BusinessIntegrationScope = IntegrationScope | "products:sync";

export async function introspectBusinessIntegrationCredential(input: {
  tenantSlug: string;
  token: string;
  scope: BusinessIntegrationScope;
  consumerSecret?: string | null;
}) {
  const parsedCredential = parseApiCredential(input.token);

  if (!parsedCredential) {
    throw new Error("UNAUTHORIZED");
  }

  const credential = await prisma.integrationApiCredential.findFirst({
    where: {
      keyId: parsedCredential.keyId,
      keyPrefix: parsedCredential.keyPrefix,
      status: "ACTIVE",
      revokedAt: null,
      tenant: {
        slug: input.tenantSlug,
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!credential || !verifySecretHash(parsedCredential.token, credential.tokenHash)) {
    throw new Error("UNAUTHORIZED");
  }

  if (credential.expiresAt && credential.expiresAt <= new Date()) {
    throw new Error("UNAUTHORIZED");
  }

  const scopes = Array.isArray(credential.scopes) ? credential.scopes.map(String) : [];

  if (!scopes.includes(input.scope)) {
    throw new Error("FORBIDDEN_SCOPE");
  }

  if (input.consumerSecret) {
    const expectedSecret = buildCompatibilityConsumerSecret({
      tenantId: credential.tenant.id,
      tokenValue: parsedCredential.token,
    });

    if (!expectedSecret || expectedSecret !== input.consumerSecret) {
      throw new Error("INVALID_CONSUMER_SECRET");
    }
  }

  return {
    tenantId: credential.tenant.id,
    tenantSlug: credential.tenant.slug,
    credentialId: credential.id,
    credentialName: credential.name,
    scope: input.scope,
  };
}
