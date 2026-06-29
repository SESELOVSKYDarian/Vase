type ProtectedAppRedirectInput = {
  pathname: string;
  search: string;
  isSignedIn: boolean;
  isEmailVerified: boolean;
};

type AuthPageRedirectInput = {
  pathname: string;
  redirectTo: string;
  isSignedIn: boolean;
  isEmailVerified: boolean;
};

type AppIndexRedirectInput = {
  platformRole: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
  tenantRole: "OWNER" | "MANAGER" | "MEMBER" | null;
};

const authPages = new Set(["/signin", "/register", "/forgot-password", "/reset-password"]);

export function getProtectedAppRedirectPath({
  pathname,
  search,
  isSignedIn,
  isEmailVerified,
}: ProtectedAppRedirectInput) {
  if (!pathname.startsWith("/app")) {
    return null;
  }

  if (isSignedIn && isEmailVerified) {
    return null;
  }

  if (isSignedIn) {
    return "/verify-email";
  }

  const redirectTo = `${pathname}${search}`;
  return `/signin?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export function getAuthPageRedirectPath({
  pathname,
  redirectTo,
  isSignedIn,
  isEmailVerified,
}: AuthPageRedirectInput) {
  if (!authPages.has(pathname) || !isSignedIn) {
    return null;
  }

  if (!isEmailVerified) {
    return "/verify-email";
  }

  return redirectTo || "/app";
}

export function getAppIndexRedirectPath({
  platformRole,
  tenantRole,
}: AppIndexRedirectInput) {
  if (platformRole === "SUPER_ADMIN") return "/app/admin";
  if (platformRole === "SUPPORT") return "/app/support";
  if (platformRole === "DEVELOPER") return "/app/developer";
  if (tenantRole === "MANAGER") return "/app/manager";
  if (tenantRole === "MEMBER") return "/app/member";
  return null;
}
