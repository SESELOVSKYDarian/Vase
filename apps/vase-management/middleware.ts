import {
  localAuthCookieName,
  managementTenantCookieName,
  normalizeManagementTenantSlug,
  sharedAuthCookieName,
} from "@vase/auth";
import { NextRequest, NextResponse } from "next/server";

const tenantCookieMaxAge = 60 * 60 * 24 * 365;
const sessionCookieNames = [sharedAuthCookieName, localAuthCookieName];
const numericChunkPattern = /^\d+$/;
const VASE_APP_PUBLIC_URL = process.env.VASE_APP_PUBLIC_URL || "https://app.vase.ar";

function isSessionCookieName(name: string) {
  return sessionCookieNames.some((baseName) => {
    if (name === baseName) return true;

    const suffix = name.slice(baseName.length + 1);
    return name.startsWith(`${baseName}.`) && numericChunkPattern.test(suffix);
  });
}

function setTenantCookie(response: NextResponse, tenantSlug: string) {
  response.cookies.set(managementTenantCookieName, tenantSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: tenantCookieMaxAge,
  });
}

export default function middleware(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const hasSessionCookie = cookies.some(({ name }) => isSessionCookieName(name));
  const queryTenantSlug = normalizeManagementTenantSlug(
    request.nextUrl.searchParams.get("tenant"),
  );
  const cookieTenantSlug = normalizeManagementTenantSlug(
    request.cookies.get(managementTenantCookieName)?.value,
  );
  const tenantSlug = queryTenantSlug ?? cookieTenantSlug;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-vase-tenant-slug");
  if (tenantSlug) requestHeaders.set("x-vase-tenant-slug", tenantSlug);

  let response: NextResponse;
  if (!hasSessionCookie) {
    const signInUrl = new URL(
      "/signin",
      VASE_APP_PUBLIC_URL,
    );
    signInUrl.searchParams.set("redirectTo", request.nextUrl.toString());
    response = NextResponse.redirect(signInUrl);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (queryTenantSlug) setTenantCookie(response, queryTenantSlug);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
