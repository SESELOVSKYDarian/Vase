import type { RestSessionContext } from "@vase/contracts";
import { createRestContextClient } from "./app-session-context";
import { readSharedRestSession } from "./shared-session";
import { provisionRestTenant } from "./tenant-provisioning";

export async function resolveRestOwnerRequest(input: {
  cookieHeader: string | null;
  requestedTenantSlug?: string;
}): Promise<RestSessionContext> {
  const session = await readSharedRestSession({
    cookieHeader: input.cookieHeader,
    secret: process.env.AUTH_SECRET,
  });
  const context = await createRestContextClient({
    appInternalUrl: process.env.APP_INTERNAL_URL ?? "",
    serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
    signingSecret: process.env.REST_CONTEXT_SIGNING_SECRET,
  }).resolve({
    globalUserId: session.globalUserId,
    requestedTenantSlug: input.requestedTenantSlug,
  });

  if (context.actor.id !== session.globalUserId) {
    throw new Error("REST_TENANT_FORBIDDEN");
  }
  await provisionRestTenant({ context });
  return context;
}
