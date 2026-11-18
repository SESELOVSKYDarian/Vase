import Link from "next/link";
import { CheckCircle2, MailCheck, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { AuthHeading } from "@/components/auth/auth-heading";
import { authPrimaryButton, authSecondaryButton } from "@/components/auth/auth-ui";
import { ResendVerificationByEmailForm } from "@/components/auth/resend-verification-by-email-form";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { getRequestContext } from "@/lib/security/request";
import { verifyEmailToken } from "@/server/services/auth-onboarding";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string; email?: string; sent?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const session = await auth();
  const token = params.token;
  const email = params.email;
  const sent = params.sent === "1";
  const requestContext = await getRequestContext();
  const verificationResult = token
    ? await verifyEmailToken(token, requestContext)
    : session?.user?.isEmailVerified
      ? { ok: true as const, user: null }
      : null;
  const verified = Boolean(verificationResult?.ok);
  const showPendingState = !token && !verified;

  const Icon = verified ? CheckCircle2 : showPendingState ? MailCheck : TriangleAlert;
  const iconTone = verified || showPendingState ? "bg-[#e6f0e6] text-[#3B633D]" : "bg-[#fbf1e1] text-[#8A6B2D]";

  return (
    <section className="w-full max-w-[28rem]">
      <span className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl ${iconTone}`}>
        <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <AuthHeading
        title={verified ? "¡Listo! Tu correo está confirmado" : showPendingState ? "Revisá tu correo" : "Este enlace no funciona"}
        description={
          verified
            ? "Ya podés entrar a tu cuenta."
            : showPendingState
              ? sent
                ? `Te mandamos un enlace${email ? ` a ${email}` : ""}. Abrilo para confirmar tu cuenta y después entrá.`
                : "Para entrar a tu cuenta primero confirmá tu correo con el enlace que te mandamos."
              : "Ya se usó o venció. Pedí uno nuevo y listo."
        }
      />

      <div className="space-y-5">
        {!verified && session?.user ? <ResendVerificationForm /> : null}
        {!verified && !session?.user ? <ResendVerificationByEmailForm email={email} /> : null}

        {verified ? (
          <Link href="/signin" className={authPrimaryButton}>
            Entrar
          </Link>
        ) : (
          <>
            <p className="text-sm leading-6 text-[#66736b]">¿No te llegó? Fijate en spam o promociones.</p>
            <Link href="/signin" className={`${authSecondaryButton} w-full`}>
              Ya lo confirmé, entrar
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
