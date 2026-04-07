import { headers } from "next/headers";
import type { IntegrationScope } from "@/config/integrations";
import { prisma } from "@/lib/db/prisma";
import { parseApiCredential, verifySecretHash } from "@/lib/integrations/credentials";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";

type IntegrationAuthResult = {
  tenantId: string;
  tenantSlug: string;
  credentialId: string;
  credentialName: string;
  scope: IntegrationScope;
  rateLimit: {
    remaining: number;
    resetAt: Date;
  };
  requestContext: Awaited<ReturnType<typeof getRequestContext>>;
};

export async function authenticateIntegrationRequest(
  tenantSlug: string,
  scope: IntegrationScope,
): Promise<IntegrationAuthResult> {
  const requestHeaders = await headers();
  const parsedCredential = parseApiCredential(
    requestHeaders.get("x-vase-api-key") ?? requestHeaders.get("authorization"),
  );

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
        slug: tenantSlug,
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

  const scopes = Array.isArray(credential.scopes) ? credential.scopes : [];

  if (!scopes.includes(scope)) {
    throw new Error("FORBIDDEN_SCOPE");
  }

  const rateLimit = await enforceRateLimit({
    scope: `integration:${credential.id}`,
    key: credential.id,
    limit: credential.requestsPerMinute,
    windowSeconds: 60,
  });
  const requestContext = await getRequestContext();

  await prisma.integrationApiCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    tenantId: credential.tenant.id,
    tenantSlug: credential.tenant.slug,
    credentialId: credential.id,
    credentialName: credential.name,
    scope,
    rateLimit,
    requestContext,
  };
}
