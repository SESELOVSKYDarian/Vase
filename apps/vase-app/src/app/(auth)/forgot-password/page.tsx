import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <section className="w-full max-w-[26rem]">
      <AuthHeading title="¿Olvidaste tu contraseña?" description="Escribí tu correo y te mandamos un enlace para crear una nueva." />

      <ForgotPasswordForm />

      <Link
        href="/signin"
        className="mt-8 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-[#3B633D] underline-offset-4 hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a entrar
      </Link>
    </section>
  );
}
