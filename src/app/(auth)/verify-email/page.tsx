import Link from "next/link";
import { auth } from "@/auth";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { getRequestContext } from "@/lib/security/request";
import { verifyEmailToken } from "@/server/services/auth-onboarding";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const session = await auth();
  const token = params.token;
  const requestContext = await getRequestContext();
  const verificationResult = token
    ? await verifyEmailToken(token, requestContext)
    : session?.user?.isEmailVerified
      ? { ok: true as const, user: null }
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(214,201,186,0.5),_transparent_35%),linear-gradient(180deg,#F8F5F0_0%,#EFE7DC_100%)] px-6 py-10">
      <div className="w-full max-w-lg rounded-[36px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_90%,transparent)] p-8 shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.24em] text-[var(--muted-soft)] uppercase">
            Verificacion de email
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {verificationResult?.ok ? "Email verificado" : "Verifica tu email"}
          </h1>
          <p className="text-sm leading-7 text-[var(--muted)]">
            {verificationResult?.ok
              ? "Tu cuenta ya puede operar con una identidad confirmada."
              : "Necesitamos confirmar tu email para fortalecer seguridad, comunicacion y recuperacion de acceso."}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {verificationResult?.ok ? (
            <div className="rounded-3xl border border-[#C6D9C9] bg-[#F3FAF4] p-5 text-sm leading-7 text-[#305A36]">
              Verificacion completada correctamente.
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E6D6BF] bg-[#FBF6EE] p-5 text-sm leading-7 text-[#6E5842]">
              El enlace no es valido, ya fue utilizado o vencio.
            </div>
          )}

          {!verificationResult?.ok && session?.user ? <ResendVerificationForm /> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Ir al panel
            </Link>
            <Link
              href="/signin"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-[var(--foreground)]"
            >
              Iniciar sesion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
