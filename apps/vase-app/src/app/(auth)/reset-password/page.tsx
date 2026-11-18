import Link from "next/link";
import { peekAuthToken } from "@/lib/auth/tokens";
import { AuthHeading } from "@/components/auth/auth-heading";
import { authPrimaryButton } from "@/components/auth/auth-ui";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; mode?: string; redirectTo?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const mode = params.mode ?? "";
  const redirectTo = params.redirectTo ?? "/app";
  const resetToken = token ? await peekAuthToken(token, "PASSWORD_RESET") : null;
  const isValid = Boolean(resetToken && !resetToken.consumedAt && resetToken.expiresAt > new Date());
  const isForced = mode === "forced";
  const postResetRedirect = isForced
    ? `/signin?reset=success&redirectTo=${encodeURIComponent(redirectTo)}`
    : "/signin?reset=success";

  return (
    <section className="w-full max-w-[26rem]">
      <AuthHeading
        title={isForced ? "Cambiá tu contraseña" : "Creá una contraseña nueva"}
        description={
          isForced
            ? "Tu contraseña es temporal. Elegí una nueva para seguir."
            : "Después de guardarla vas a poder entrar con ella."
        }
      />

      {isValid ? (
        <ResetPasswordForm token={token} redirectTo={postResetRedirect} />
      ) : (
        <div className="space-y-5">
          <div role="alert" className="rounded-xl border border-[#efcfc6] bg-[#fff6f3] px-4 py-3 text-sm leading-6 text-[#8A3C2B]">
            Este enlace ya se usó o venció.
          </div>
          <Link href="/forgot-password" className={authPrimaryButton}>
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </section>
  );
}
