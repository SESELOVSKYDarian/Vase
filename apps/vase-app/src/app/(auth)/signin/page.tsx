import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { AuthHeading } from "@/components/auth/auth-heading";
import { authLink } from "@/components/auth/auth-ui";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthPageRedirectPath } from "@/lib/auth/protected-app-redirect";
import { normalizeVaseRedirectTarget } from "@/lib/auth/redirect-target";
import { hasActiveSession } from "@/lib/auth/session";
import { getDefaultPlatformPathForHost } from "@/lib/security/platform-hosts";

type SignInPageProps = {
  searchParams: Promise<{ reset?: string; redirectTo?: string; callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const defaultRedirectTo = getDefaultPlatformPathForHost(requestHeaders.get("host") ?? "");
  const redirectTo = normalizeVaseRedirectTarget(
    params.redirectTo ?? params.callbackUrl ?? defaultRedirectTo,
  );
  const session = await auth();
  const authPageRedirectPath = getAuthPageRedirectPath({
    pathname: "/signin",
    redirectTo,
    isSignedIn: hasActiveSession(session),
    isEmailVerified: Boolean(session?.user?.isEmailVerified),
  });

  if (authPageRedirectPath) {
    redirect(authPageRedirectPath as Route);
  }

  return (
    <section className="w-full max-w-[26rem]">
      <AuthHeading title="Hola de nuevo" description="Entrá con tu correo para seguir con tu negocio." />

      <SignInForm resetSuccess={params.reset === "success"} redirectTo={redirectTo} />

      <p className="mt-8 text-center text-sm text-[#5b6660]">
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/register" className={authLink}>
          Creá una
        </Link>
      </p>
    </section>
  );
}
