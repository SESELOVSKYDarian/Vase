import { type NextRequest, NextResponse } from "next/server";
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
  buildLabsHostRedirectUrl,
  getDefaultPlatformPathForHost,
  isPlatformHost,
  resolveEditorHost,
} from "@/lib/security/platform-hosts";

const { auth } = NextAuth(authConfig);

export default auth((request: NextRequest) => {
  const authRequest = request as NextRequest & {
    auth?: {
      user?: {
        isEmailVerified?: boolean;
      };
    } | null;
  };
  
  const url = request.nextUrl;
  const hostname = (request.headers.get("host") || "").trim().toLowerCase();
  const pathname = url.pathname;

  // 1. Identificar los hosts internos de plataforma para no tratarlos como storefronts
  const editorHost = resolveEditorHost();
  const isBaseDomain = isPlatformHost(hostname);
  const isEditorDomain = hostname === editorHost;
  const defaultPlatformPath = getDefaultPlatformPathForHost(hostname);
  const labsHostRedirectUrl = buildLabsHostRedirectUrl({
    hostname,
    url: request.url,
  });

  if (labsHostRedirectUrl) {
    return NextResponse.redirect(new URL(labsHostRedirectUrl));
  }

  if (defaultPlatformPath !== "/app" && (pathname === "/" || pathname === "/app")) {
    return NextResponse.redirect(new URL(defaultPlatformPath, request.url));
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
    return NextResponse.rewrite(new URL(`/sites/${hostname}${pathname}`, request.url));
  }

  // 4. Lógica de Autenticación y Sesión (App estándar)
  const isSignedIn = hasActiveSession(authRequest.auth);
  const isEmailVerified = Boolean(authRequest.auth?.user?.isEmailVerified);
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
    return NextResponse.redirect(new URL(authPageRedirectPath, request.url));
  }

  if (protectedAppRedirectPath) {
    return NextResponse.redirect(new URL(protectedAppRedirectPath, request.url));
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
