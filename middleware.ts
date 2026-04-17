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
  const pathname = request.nextUrl.pathname;
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
  response.headers.set("x-vase-pathname", request.nextUrl.pathname);
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
