import Link from "next/link";
import { peekAuthToken } from "@/lib/auth/tokens";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const resetToken = token ? await peekAuthToken(token, "PASSWORD_RESET") : null;
  const isValid = Boolean(resetToken && !resetToken.consumedAt && resetToken.expiresAt > new Date());

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(214,201,186,0.5),_transparent_35%),linear-gradient(180deg,#F8F5F0_0%,#EFE7DC_100%)] px-6 py-10">
      <div className="w-full max-w-md rounded-[36px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_90%,transparent)] p-8 shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.24em] text-[var(--muted-soft)] uppercase">
            Seguridad
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Restablecer contrasena
          </h1>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Usa una contrasena robusta y unica para proteger tu tenant y tu cuenta.
          </p>
        </div>

        <div className="mt-8">
          {isValid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4 rounded-3xl border border-[#E6C1B8] bg-[#FFF4F1] p-5 text-sm leading-7 text-[#8A3C2B]">
              <p>El enlace de recuperacion no es valido o ya vencio.</p>
              <Link href="/forgot-password" className="font-semibold text-[var(--accent)]">
                Solicitar un nuevo enlace
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
