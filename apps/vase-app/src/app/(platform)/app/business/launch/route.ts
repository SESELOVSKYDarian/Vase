import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createBusinessLaunchUrl } from "@/lib/business/launch";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

function buildRedirectToSignIn(request: Request) {
  const url = new URL(request.url);
  const signInUrl = new URL("/signin", url.origin);
  signInUrl.searchParams.set("redirectTo", `${url.pathname}${url.search}`);
  return signInUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tenantSlug = String(requestUrl.searchParams.get("tenant") ?? "").trim() || undefined;

  try {
    const session = await requireUser();
    const membership = await getTenantMembership(session.user.id, tenantSlug);

    if (!membership) {
      return NextResponse.redirect(new URL("/app?business_access=forbidden", requestUrl.origin));
    }

    const launchUrl = await createBusinessLaunchUrl({ session, membership });
    return NextResponse.redirect(launchUrl);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.redirect(buildRedirectToSignIn(request));
    }

    if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
      return NextResponse.redirect(new URL("/verify-email", requestUrl.origin));
    }

    if (error instanceof Error && error.message === "BUSINESS_SSO_SECRET_MISSING") {
      return NextResponse.json({ error: "business_sso_secret_missing" }, { status: 503 });
    }

    return NextResponse.redirect(new URL("/app?business_access=forbidden", requestUrl.origin));
  }
}
