import type { ManagementSessionContext } from "@vase/contracts";
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

const managementAppContextClient = createManagementAppContextClient({
  appInternalUrl: process.env.APP_INTERNAL_URL || "https://app.vase.ar",
  serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
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
