import { type NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { hasActiveSession } from "@/lib/auth/session";
import { resolveLocale } from "@/lib/i18n/locale";
import { getCanonicalOrigin } from "@/lib/security/origin";

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
  const hostname = request.headers.get("host") || "";
  const pathname = url.pathname;

  // 1. Identificar el dominio base
  const baseDomain = process.env.NODE_ENV === "production" ? "vase.ar" : "localhost:3000";
  const isBaseDomain = hostname === baseDomain || hostname === `www.${baseDomain}`;

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
  if (!isBaseDomain && !isReservedPath) {
    // Si no es el dominio base y no es una ruta reservada, reescribimos al storefront
    // El host completo se pasa como parámetro para que la página decida qué sitio cargar
    return NextResponse.rewrite(new URL(`/sites/${hostname}${pathname}`, request.url));
  }

  // 4. Lógica de Autenticación y Sesión (App estándar)
  const isAuthPage = [
    "/signin",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);
  const isSignedIn = hasActiveSession(authRequest.auth);

  if (isSignedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const response = NextResponse.next();
  const locale = resolveLocale(request.headers);
  const isSensitivePlatformPath =
    pathname.startsWith("/app/admin") ||
    pathname.startsWith("/app/support") ||
    pathname.startsWith("/app/owner") ||
    pathname.startsWith("/api/");

  response.headers.set("x-vase-locale", locale);
  response.headers.set("x-vase-pathname", pathname);
  response.headers.set(
    "x-vase-email-verified",
    authRequest.auth?.user?.isEmailVerified ? "true" : "false",
  );
  response.headers.set("x-vase-canonical-origin", getCanonicalOrigin());

  if (isSensitivePlatformPath) {
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
