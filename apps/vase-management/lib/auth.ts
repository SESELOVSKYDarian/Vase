import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { managementRequestContext } from "./central-session/request-context";

type ManagementRequestContext = Awaited<
  ReturnType<typeof managementRequestContext.resolve>
>;

type ManagementAuthResult =
  | (ManagementRequestContext & { error?: undefined })
  | {
      user: null;
      central: null;
      error: "MANAGEMENT_NOT_ENTITLED";
    }
  | null;

const unauthenticatedCodes = new Set([
  "MANAGEMENT_SESSION_REQUIRED",
  "MANAGEMENT_SESSION_INVALID",
  "MANAGEMENT_SESSION_EXPIRED",
]);

export function createManagementAuthFacade(input: {
  resolveContext(
    cookieHeader: string | null,
    requestedTenantSlug?: string,
  ): Promise<ManagementRequestContext>;
}) {
  return async function managementAuthFacade(
    cookieHeader: string | null,
    requestedTenantSlug?: string,
  ): Promise<ManagementAuthResult> {
    const tenantSlug = requestedTenantSlug?.trim() || undefined;

    try {
      const context = await input.resolveContext(cookieHeader, tenantSlug);
      return { user: context.user, central: context.central };
    } catch (error) {
      if (
        error instanceof Error
        && error.message === "MANAGEMENT_NOT_ENTITLED"
      ) {
        return {
          user: null,
          central: null,
          error: "MANAGEMENT_NOT_ENTITLED" as const,
        };
      }

      if (
        error instanceof Error
        && unauthenticatedCodes.has(error.message)
      ) {
        return null;
      }

      throw error;
    }
  };
}

const resolveManagementAuth = createManagementAuthFacade({
  resolveContext: (cookieHeader, requestedTenantSlug) =>
    managementRequestContext.resolve(cookieHeader, requestedTenantSlug),
});

export async function auth() {
  noStore();
  const requestHeaders = headers();

  return resolveManagementAuth(
    requestHeaders.get("cookie"),
    requestHeaders.get("x-vase-tenant-slug") ?? undefined,
  );
}
