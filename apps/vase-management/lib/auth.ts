import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import {
  getCookieValue,
  managementTenantCookieName,
  normalizeManagementTenantSlug,
} from "@vase/auth";
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
    const tenantSlug = normalizeManagementTenantSlug(requestedTenantSlug);

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

export function resolveManagementTenantSelector(
  trustedHeader: string | null,
  cookieHeader: string | null,
): string | undefined {
  const headerTenant = normalizeManagementTenantSlug(trustedHeader);
  if (headerTenant) return headerTenant;

  try {
    return normalizeManagementTenantSlug(
      getCookieValue(cookieHeader, managementTenantCookieName),
    );
  } catch {
    return undefined;
  }
}

const resolveManagementAuth = createManagementAuthFacade({
  resolveContext: (cookieHeader, requestedTenantSlug) =>
    managementRequestContext.resolve(cookieHeader, requestedTenantSlug),
});

export async function auth() {
  noStore();
  const requestHeaders = headers();
  const cookieHeader = requestHeaders.get("cookie");

  return resolveManagementAuth(
    cookieHeader,
    resolveManagementTenantSelector(
      requestHeaders.get("x-vase-tenant-slug"),
      cookieHeader,
    ),
  );
}
