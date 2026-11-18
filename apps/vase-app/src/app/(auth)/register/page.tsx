import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthHeading } from "@/components/auth/auth-heading";
import { authLink } from "@/components/auth/auth-ui";
import { RegisterForm } from "@/components/auth/register-form";
import { hasActiveSession } from "@/lib/auth/session";

export default async function RegisterPage() {
  const session = await auth();

  if (hasActiveSession(session) && session?.user) {
    redirect(session.user.isEmailVerified ? "/app" : "/verify-email");
  }

  return (
    <section className="w-full max-w-[38rem]">
      <AuthHeading title="Creá tu cuenta" description="En cuatro pasos te armamos una propuesta a tu medida." />

      <RegisterForm />

      <p className="mt-8 text-center text-sm text-[#5b6660]">
        ¿Ya tenés cuenta?{" "}
        <Link href="/signin" className={authLink}>
          Entrá acá
        </Link>
      </p>
    </section>
  );
}
