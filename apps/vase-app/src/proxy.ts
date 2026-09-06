import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import {
  getAuthPageRedirectPath,
  getProtectedAppRedirectPath,
} from "@/lib/auth/protected-app-redirect";
import { hasActiveSession } from "@/lib/auth/session";
import { resolveLocale } from "@/lib/i18n/locale";
import { shouldDisablePlatformCache } from "@/lib/security/platform-cache";
import { getCanonicalOrigin } from "@/lib/security/origin";
import {
  buildAdminCanonicalUrl,
  buildPublicRequestUrl,
  isAdminHost,
  resolveAdminAccessDecision,
} from "@/lib/security/admin-host-routing";
import {
  buildDefaultPlatformRedirectUrl,
  buildLabsHostRedirectUrl,
  buildPublicSiteRedirectUrl,
  getDefaultPlatformPathForHost,
  isPlatformHost,
  resolveRequestHostname,
  resolveLabsHostRequest,
  resolveEditorHost,
} from "@/lib/security/platform-hosts";

const { auth } = NextAuth(authConfig);

export default auth((request: NextRequest) => {
  const authRequest = request as NextRequest & {
    auth?: {
      user?: {
        isEmailVerified?: boolean;
        platformRole?: string;
      };
    } | null;
  };
  
  const url = request.nextUrl;
  const hostname = resolveRequestHostname({
    forwardedHost: request.headers.get("x-forwarded-host"),
    host: request.headers.get("host"),
  });
  const pathname = url.pathname;
  const publicRequestUrl = buildPublicRequestUrl({
    url: request.url,
    hostname,
    protocol: (
      request.headers.get("x-forwarded-proto") ||
      (process.env.NODE_ENV === "production" ? "https" : url.protocol.replace(":", ""))
    ).split(",")[0].trim(),
  });
  const isSignedIn = hasActiveSession(authRequest.auth);
  const isEmailVerified = Boolean(authRequest.auth?.user?.isEmailVerified);

  const adminHostDecision = resolveAdminAccessDecision({
    hostname,
    url: publicRequestUrl,
    isSignedIn,
    isEmailVerified,
    platformRole: authRequest.auth?.user?.platformRole,
  });

  if (adminHostDecision.type === "redirect") {
    return NextResponse.redirect(adminHostDecision.url);
  }

  if (adminHostDecision.type === "reject") {
    return NextResponse.json(
      { error: adminHostDecision.status === 403 ? "forbidden" : "not_found" },
      { status: adminHostDecision.status },
    );
  }

  if (adminHostDecision.type === "rewrite") {
    const response = NextResponse.rewrite(adminHostDecision.url);
    const locale = resolveLocale(request.headers);
    response.headers.set("x-vase-locale", locale);
    response.headers.set("x-vase-pathname", pathname);
    response.headers.set("x-vase-email-verified", "true");
    response.headers.set("x-vase-canonical-origin", new URL(publicRequestUrl).origin);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }

  const adminCanonicalUrl = buildAdminCanonicalUrl({ url: publicRequestUrl });
  if (!isAdminHost(hostname) && adminCanonicalUrl) {
    return NextResponse.redirect(adminCanonicalUrl);
  }

  // 1. Identificar los hosts internos de plataforma para no tratarlos como storefronts
  const editorHost = resolveEditorHost();
  const isBaseDomain = isPlatformHost(hostname);
  const isEditorDomain = hostname === editorHost;
  const defaultPlatformPath = getDefaultPlatformPathForHost(hostname);
  const defaultPlatformRedirectUrl = buildDefaultPlatformRedirectUrl({
    hostname,
    url: publicRequestUrl,
  });
  const labsHostRedirectUrl = buildLabsHostRedirectUrl({
    hostname,
    url: publicRequestUrl,
  });
  const labsHostDecision = resolveLabsHostRequest({
    hostname,
    url: publicRequestUrl,
  });
  const publicSiteRedirectUrl = buildPublicSiteRedirectUrl({
    hostname,
    url: publicRequestUrl,
  });

  if (defaultPlatformRedirectUrl) {
    return NextResponse.redirect(new URL(defaultPlatformRedirectUrl));
  }

  if (labsHostRedirectUrl) {
    return NextResponse.redirect(new URL(labsHostRedirectUrl));
  }

  if (labsHostDecision.type === "redirect") {
    return NextResponse.redirect(labsHostDecision.url);
  }

  if (labsHostDecision.type === "reject") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (publicSiteRedirectUrl) {
    return NextResponse.redirect(publicSiteRedirectUrl);
  }

  if (defaultPlatformPath !== "/app" && (pathname === "/" || pathname === "/app")) {
    return NextResponse.redirect(new URL(defaultPlatformPath, publicRequestUrl));
  }

  // 2. Definir rutas reservadas que NO deben ser reescritas al storefront
  const isReservedPath = 
    pathname.startsWith("/app") || 
    pathname.startsWith("/api") ||
    pathname.includes(".") || // Archivos estáticos
    [
      "/signin",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email"
    ].includes(pathname);

  // 3. Lógica de Ruteo Multi-tenant (Wix-style)
  if (!isBaseDomain && !isEditorDomain && !isReservedPath) {
    // Si no es el dominio base y no es una ruta reservada, reescribimos al storefront
    // El host completo se pasa como parámetro para que la página decida qué sitio cargar
    return NextResponse.rewrite(new URL(`/sites/${hostname}${pathname}`, publicRequestUrl));
  }

  // 4. Lógica de Autenticación y Sesión (App estándar)
  const authPageRedirectPath = getAuthPageRedirectPath({
    pathname,
    redirectTo: defaultPlatformPath,
    isSignedIn,
    isEmailVerified,
  });
  const protectedAppRedirectPath = getProtectedAppRedirectPath({
    pathname,
    search: url.search,
    isSignedIn,
    isEmailVerified,
  });

  if (authPageRedirectPath) {
    return NextResponse.redirect(new URL(authPageRedirectPath, getCanonicalOrigin()));
  }

  if (protectedAppRedirectPath) {
    return NextResponse.redirect(new URL(protectedAppRedirectPath, getCanonicalOrigin()));
  }

  const response = NextResponse.next();
  const locale = resolveLocale(request.headers);
  response.headers.set("x-vase-locale", locale);
  response.headers.set("x-vase-pathname", pathname);
  response.headers.set(
    "x-vase-email-verified",
    authRequest.auth?.user?.isEmailVerified ? "true" : "false",
  );
  response.headers.set("x-vase-canonical-origin", getCanonicalOrigin());

  if (shouldDisablePlatformCache(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  if (!request.cookies.get("vase-locale")) {
    response.cookies.set("vase-locale", locale, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
