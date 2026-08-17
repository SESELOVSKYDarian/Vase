import type { ManagementSessionContext } from "@vase/contracts";
import { deriveScopedServiceToken } from "@vase/internal-api";
import { createManagementAppContextClient } from "./app-context-client";
import { projectCentralManagementIdentity } from "./projection";
import { readSharedManagementSession } from "./shared-session";

export type ProjectedUser = Awaited<
  ReturnType<typeof projectCentralManagementIdentity>
>;

export function createManagementRequestContextResolver(input: {
  readSession: (
    cookieHeader: string | null,
  ) => Promise<{ globalUserId: string }>;
  resolveCentralContext: (
    globalUserId: string,
    requestedTenantSlug?: string,
  ) => Promise<ManagementSessionContext>;
  projectIdentity: (
    context: ManagementSessionContext,
  ) => Promise<ProjectedUser>;
}) {
  return {
    async resolve(
      cookieHeader: string | null,
      requestedTenantSlug?: string,
    ) {
      const session = await input.readSession(cookieHeader);
      const central = await input.resolveCentralContext(
        session.globalUserId,
        requestedTenantSlug,
      );
      const user = await input.projectIdentity(central);
      return { central, user };
    },
  };
}

const sharedAuthSecret = process.env.AUTH_SECRET?.trim();
const managementContextToken = sharedAuthSecret && sharedAuthSecret.length >= 16
  ? deriveScopedServiceToken(sharedAuthSecret, "management-session-context")
  : process.env.SERVICE_TO_SERVICE_TOKEN;

const managementAppContextClient = createManagementAppContextClient({
  appInternalUrl: process.env.APP_INTERNAL_URL || "https://app.vase.ar",
  serviceToken: managementContextToken,
});

export const managementRequestContext = createManagementRequestContextResolver({
  readSession: (cookieHeader) => readSharedManagementSession({
    cookieHeader,
    secret: process.env.AUTH_SECRET,
  }),
  resolveCentralContext: (globalUserId, requestedTenantSlug) =>
    managementAppContextClient.resolve(globalUserId, requestedTenantSlug),
  projectIdentity: projectCentralManagementIdentity,
});
